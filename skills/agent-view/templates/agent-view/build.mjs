#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Writes the agent view as static files, for sites that serve a folder:
//
//   /llms.txt  /llms-full.txt  /profile.json  /work/<slug>.md  /agents/index.html
//
//   node agent-view/build.mjs --out public    Astro, Next.js, Vite… (the static folder)
//   node agent-view/build.mjs --out .         plain HTML served from the project root
//
//   --no-page              skip /agents (when the framework renders it)
//   --head a.html b.html   refresh the block between <!-- agent-view:head -->
//                          and <!-- /agent-view:head --> in these files
//                          (write <!-- agent-view:head jsonld --> on the
//                          homepage to add the schema.org data there too)
//   --force                overwrite files this script didn't write
//   --print robots         print the robots.txt lines and stop
//
// Run it before the site's own build (package.json "prebuild"), so it runs on
// the host with the host's settings: the guest book is only described once its
// storage is connected there. Generated files belong in .gitignore.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getView, guestbookOpen } from "./view.mjs";
import { agentsPage } from "./page.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const values = (name) => {
  const at = args.indexOf(name);
  if (at < 0) return [];
  const out = [];
  for (let i = at + 1; i < args.length && !args[i].startsWith("--"); i++) out.push(args[i]);
  return out;
};

const view = await getView();

if (values("--print")[0] === "robots") {
  const r = view.robots();
  console.log(["User-agent: *", "Allow: /", r.signal, "", r.pointer].filter((l) => l !== null).join("\n"));
  process.exit(0);
}

const outArg = values("--out")[0];
if (!outArg) {
  console.error("Say where to write: node agent-view/build.mjs --out public   (or --out . for a plain HTML site)");
  process.exit(1);
}
const out = path.resolve(outArg);
const manifestFile = path.join(here, ".last-build.json");
const previous = (() => {
  try {
    return JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  } catch {
    return { files: [] };
  }
})();
const ours = new Set(previous.files.map((f) => path.resolve(here, f)));

const files = view.files().map((f) => ({ file: path.join(out, f.path), body: f.body }));
if (!flag("--no-page")) files.push({ file: path.join(out, view.settings.paths.page, "index.html"), body: agentsPage(view) });

// Never overwrite something the person wrote themselves.
const theirs = files.filter(({ file, body }) => fs.existsSync(file) && !ours.has(file) && fs.readFileSync(file, "utf8") !== body);
if (theirs.length && !flag("--force")) {
  console.error(`These files already exist and weren't written by agent-view:\n${theirs.map((t) => `  ${path.relative(process.cwd(), t.file)}`).join("\n")}\nMove them, change paths in agent-view/config.mjs, or run again with --force to replace them.`);
  process.exit(1);
}

for (const { file, body } of files) {
  if (!file.startsWith(out + path.sep)) throw new Error(`refusing to write outside ${out}: ${file}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}

// Remove files from the last build that are gone now (a project taken out).
const now = new Set(files.map((f) => f.file));
for (const old of ours) if (!now.has(old) && old.startsWith(out + path.sep) && fs.existsSync(old)) fs.rmSync(old);
fs.writeFileSync(manifestFile, JSON.stringify({ files: [...now].map((f) => path.relative(here, f)) }, null, 2) + "\n");

// Head tags in hand-written HTML pages.
const START = /([ \t]*)<!--\s*agent-view:head(\s+jsonld)?\s*-->[\s\S]*?<!--\s*\/agent-view:head\s*-->/;
for (const page of values("--head")) {
  const html = fs.readFileSync(page, "utf8");
  const m = html.match(START);
  if (!m) {
    console.warn(`  ${page}: no <!-- agent-view:head --> … <!-- /agent-view:head --> markers, skipped`);
    continue;
  }
  const pad = m[1];
  const tags = view.headTags({ jsonLd: Boolean(m[2]) }).split("\n").map((l) => pad + l).join("\n");
  const block = `${pad}<!-- agent-view:head${m[2] ? " jsonld" : ""} -->\n${tags}\n${pad}<!-- /agent-view:head -->`;
  const next = html.replace(START, block);
  if (next !== html) fs.writeFileSync(page, next);
}

console.log(
  `agent-view: wrote ${files.length} files to ${path.relative(process.cwd(), out) || "."} · ${view.work.length} case studies · guest book ${
    guestbookOpen ? "open" : view.settings.guestbook.enabled === false ? "switched off in config" : "closed (storage not connected)"
  }`,
);
