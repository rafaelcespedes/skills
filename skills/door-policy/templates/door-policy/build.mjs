#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Writes the agent view as static files, for sites that serve a folder:
//
//   /llms.txt  /llms-full.txt  /profile.json  /work/<slug>.md  /agents/index.html
//   ("no-ai": /llms.txt and /agents/index.html only)
//
//   node door-policy/build.mjs --out public    Astro, Next.js, Vite… (the static folder)
//   node door-policy/build.mjs --out .         plain HTML served from the project root
//
//   --no-page              skip /agents (when the framework renders it)
//   --head a.html b.html   refresh the block between <!-- door-policy:head -->
//                          and <!-- /door-policy:head --> in these files
//                          (write <!-- door-policy:head jsonld --> on the
//                          homepage to add the schema.org data there too). A
//                          page whose address is a project's url also gets
//                          the link to that project's markdown.
//   --robots robots.txt    write the reading choice into this robots.txt,
//                          between "# door-policy:robots" and
//                          "# /door-policy:robots" (added at the end the first
//                          time). Everything outside the markers is kept.
//                          For a "no" to training (and "no-ai") it also writes
//                          .well-known/tdmrep.json beside it (W3C TDMRep),
//                          and removes that file again when the "no" goes.
//   --robots-only          with --robots and reading "no-ai": the robots.txt
//                          block (and tdmrep.json) and nothing else, for
//                          people who want no agent files and no page. The
//                          block then doesn't point to /agents. Files an
//                          earlier build wrote are removed, and any --head
//                          pages get the No AI tags (no links to files).
//   --force                overwrite files this script didn't write
//   --print robots         print the robots.txt block for the reading choice
//                          in config.mjs, and stop
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

const robotsOnly = flag("--robots-only");
if (robotsOnly && view.reading !== "no-ai") {
  console.error('--robots-only is for reading: "no-ai" only: the other choices point agents to files.');
  process.exit(1);
}

if (values("--print")[0] === "robots") {
  console.log(view.robots().text);
  process.exit(0);
}

// robots.txt: only the block between the markers is ours
const robotsArg = values("--robots")[0];
if (args.includes("--robots") && !robotsArg) {
  console.error("Say which file: --robots robots.txt (or public/robots.txt)");
  process.exit(1);
}
if (robotsArg) {
  const file = path.resolve(robotsArg);
  const before = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const { text, warnings } = view.robotsFile(before, { alone: robotsOnly });
  for (const w of warnings) console.warn(`door-policy: ! ${w}`);
  if (text !== before) {
    const a = new Set(before.split("\n"));
    const b = new Set(text.split("\n"));
    const removed = [...a].filter((l) => l && !b.has(l));
    const added = [...b].filter((l) => l && !a.has(l));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    console.log(`door-policy: ${path.relative(process.cwd(), file)} updated (${added.length} lines added, ${removed.length} removed)`);
    for (const l of removed.slice(0, 8)) console.log(`  - ${l}`);
    for (const l of added.slice(0, 8)) console.log(`  + ${l}`);
    if (removed.length + added.length > 16) console.log("  …");
  } else console.log(`door-policy: ${path.relative(process.cwd(), file)} already up to date`);

  // W3C TDMRep, at the root the robots.txt sits in
  const tdmFile = path.join(path.dirname(file), ".well-known", "tdmrep.json");
  const tdm = view.tdmrep();
  const isOurs = (t) => {
    try {
      const j = JSON.parse(t);
      return Array.isArray(j) && j.length === 1 && j[0].location === "/" && Object.keys(j[0]).length === 2;
    } catch {
      return false;
    }
  };
  const tdmBefore = fs.existsSync(tdmFile) ? fs.readFileSync(tdmFile, "utf8") : null;
  if (tdm && tdmBefore !== tdm) {
    if (tdmBefore != null && !isOurs(tdmBefore) && !flag("--force")) {
      console.error(`${path.relative(process.cwd(), tdmFile)} already exists and wasn't written by door-policy. Merge it by hand, or run again with --force to replace it.`);
      process.exit(1);
    }
    fs.mkdirSync(path.dirname(tdmFile), { recursive: true });
    fs.writeFileSync(tdmFile, tdm);
    console.log(`door-policy: ${path.relative(process.cwd(), tdmFile)} written (text and data mining rights reserved)`);
  } else if (!tdm && tdmBefore != null && isOurs(tdmBefore)) {
    fs.rmSync(tdmFile);
    console.log(`door-policy: ${path.relative(process.cwd(), tdmFile)} removed (no "no" to training any more)`);
  }
}

const outArg = values("--out")[0];
if (robotsOnly && !robotsArg) {
  console.error("--robots-only needs --robots robots.txt (or public/robots.txt)");
  process.exit(1);
}
if (!outArg && robotsArg && !robotsOnly) process.exit(0);
if (!outArg && !robotsOnly) {
  console.error("Say where to write: node door-policy/build.mjs --out public   (or --out . for a plain HTML site)");
  process.exit(1);
}
const out = path.resolve(outArg || ".");
const manifestFile = path.join(here, ".last-build.json");
// a copy from before the rename keeps its list in agent-view/ (same layout)
const previous = (() => {
  for (const f of [manifestFile, path.join(here, "..", "agent-view", ".last-build.json")]) {
    try {
      return JSON.parse(fs.readFileSync(f, "utf8"));
    } catch {}
  }
  return { files: [] };
})();
const ours = new Set(previous.files.map((f) => path.resolve(here, f)));

// --robots-only writes no files, and removes the ones an earlier build wrote
const files = robotsOnly ? [] : view.files().map((f) => ({ file: path.join(out, f.path), body: f.body }));
if (!robotsOnly && !flag("--no-page")) files.push({ file: path.join(out, view.settings.paths.page, "index.html"), body: agentsPage(view) });

// Never overwrite something the person wrote themselves.
const theirs = files.filter(({ file, body }) => fs.existsSync(file) && !ours.has(file) && fs.readFileSync(file, "utf8") !== body);
if (theirs.length && !flag("--force")) {
  console.error(`These files already exist and weren't written by door-policy:\n${theirs.map((t) => `  ${path.relative(process.cwd(), t.file)}`).join("\n")}\nMove them, change paths in door-policy/config.mjs, or run again with --force to replace them.`);
  process.exit(1);
}

for (const { file, body } of files) {
  if (!file.startsWith(out + path.sep)) throw new Error(`refusing to write outside ${out}: ${file}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}

// Remove files from the last build that are gone now (a project taken out).
const now = new Set(files.map((f) => f.file));
const removed = [];
for (const old of ours) {
  // the list only holds files this script wrote; --robots-only clears all of them
  if (now.has(old) || !(robotsOnly || old.startsWith(out + path.sep)) || !fs.existsSync(old)) continue;
  fs.rmSync(old);
  removed.push(old);
  // and the folder it was in, once empty (agents/, work/)
  const dir = path.dirname(old);
  if (dir !== out && dir.startsWith(out + path.sep) && !fs.readdirSync(dir).length) fs.rmdirSync(dir);
}
fs.writeFileSync(manifestFile, JSON.stringify({ files: [...now].map((f) => path.relative(here, f)) }, null, 2) + "\n");

// Head tags in hand-written HTML pages.
// (markers from before the rename, "agent-view:head", are rewritten too)
const START = /([ \t]*)<!--\s*(?:door-policy|agent-view):head(\s+jsonld)?\s*-->[\s\S]*?<!--\s*\/(?:door-policy|agent-view):head\s*-->/;
for (const page of values("--head")) {
  const html = fs.readFileSync(page, "utf8");
  const m = html.match(START);
  if (!m) {
    console.warn(`  ${page}: no <!-- door-policy:head --> … <!-- /door-policy:head --> markers, skipped`);
    continue;
  }
  const pad = m[1];
  // the page's address, from where it sits in the --out folder
  const rel = path.relative(out, path.resolve(page)).split(path.sep).join("/");
  const at = `/${rel}`.replace(/(^|\/)index\.html$/, "$1").replace(/\.html$/, "").replace(/(.)\/$/, "$1");
  const project = view.work.find((w) => w.url && new URL(w.url).origin === view.settings.site && new URL(w.url).pathname.replace(/\.html$/, "").replace(/(.)\/$/, "$1") === at);
  const tags = view.headTags({ jsonLd: Boolean(m[2]), work: project?.slug }).split("\n").map((l) => pad + l).join("\n");
  const block = `${pad}<!-- door-policy:head${m[2] ? " jsonld" : ""} -->\n${tags}\n${pad}<!-- /door-policy:head -->`;
  // a function, so "$1" or "$&" in the content is written as it is
  const next = html.replace(START, () => block);
  if (next !== html) fs.writeFileSync(page, next);
}

if (robotsOnly) {
  console.log(`door-policy: robots.txt only${removed.length ? ` · removed ${removed.length} files from an earlier build: ${removed.map((f) => path.relative(process.cwd(), f)).join(", ")}` : ""}`);
  process.exit(0);
}
console.log(
  `door-policy: wrote ${files.length} files to ${path.relative(process.cwd(), out) || "."} · ${view.work.length} case studies · guest book ${
    guestbookOpen ? "open" : view.settings.guestbook.enabled === false ? "switched off in config" : "closed (storage not connected)"
  }`,
);
