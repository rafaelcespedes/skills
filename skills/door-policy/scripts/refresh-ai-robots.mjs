#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Refreshes the snapshot of the community list of AI crawlers, ai.robots.txt
// (https://github.com/ai-robots-txt/ai.robots.txt, MIT licence), that
// door-policy/ai-robots.mjs holds. robots.txt names these crawlers only for
// "No AI at all" and for a "no" to training (references/reading.md).
//
//   node <skill>/scripts/refresh-ai-robots.mjs                  the skill's template
//   node <skill>/scripts/refresh-ai-robots.mjs --project .      a site's door-policy/ copy
//   node <skill>/scripts/refresh-ai-robots.mjs --from robots.json   from a file you downloaded
//
// Then rebuild the site, so robots.txt picks up the new names.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : null;
};
const project = opt("--project");
const target = project ? path.resolve(project, "door-policy", "ai-robots.mjs") : path.join(here, "..", "templates", "door-policy", "ai-robots.mjs");

const REPO = "ai-robots-txt/ai.robots.txt";
const from = opt("--from");
const list = from ? JSON.parse(fs.readFileSync(from, "utf8")) : await (await fetch(`https://raw.githubusercontent.com/${REPO}/main/robots.json`)).json();
let commit = "unknown";
try {
  const c = await (await fetch(`https://api.github.com/repos/${REPO}/commits/main`, { headers: { accept: "application/vnd.github+json" } })).json();
  if (c.sha) commit = c.sha.slice(0, 7);
} catch {
  /* offline: the date still says when */
}

// Left out on purpose: search engines and link previews, which every mode
// keeps welcome, and the shared training token, which has a group of its own.
const KEEP_WELCOME = ["Applebot", "Bravebot", "PetalBot", "facebookexternalhit"];
const LEFT_OUT = new Set(["__usage_ai-training", ...KEEP_WELCOME].map((t) => t.toLowerCase()));
// Agents that fetch for a person, search tools and coding agents: named for
// "No AI at all", but not for a "no" to training alone.
const READER = /assistant|agent|\bsearch|answer|\buser|prompt|quer(y|ies)|coding/i;

const names = Object.entries(list)
  .filter(([token]) => token && !LEFT_OUT.has(token.toLowerCase()) && !/[\r\n#]/.test(token))
  .map(([token, v]) => {
    const fn = `${v.function || ""}`;
    const reader = READER.test(fn) && !/train/i.test(fn);
    return { token, kind: reader ? "reader" : "training" };
  });

const day = new Date().toISOString().slice(0, 10);
const body = `// ─────────────────────────────────────────────────────────────────────────────
// A snapshot of ai.robots.txt, the community list of AI crawlers:
// https://github.com/${REPO} (MIT licence, © ai.robots.txt contributors).
// Taken ${day} (commit ${commit}). Refresh it with:
//   node <skill>/scripts/refresh-ai-robots.mjs --project .
//
// robots.txt names these only for "No AI at all" (every name) and for a "no"
// to training ("training" names). Files first and "anything" use the curated
// AI_CRAWLERS list in core.mjs. Left out: search engines and link previews
// (${KEEP_WELCOME.join(", ")}), which every mode keeps welcome.
//   kind  training   collects or sells data, or its purpose is unclear
//         reader     fetches for a person, searches, or codes
// Generated; don't edit by hand.
// ─────────────────────────────────────────────────────────────────────────────

export const AI_ROBOTS_TXT = {
  source: "https://github.com/${REPO}",
  license: "MIT",
  taken: "${day}",
  commit: "${commit}",
  names: [
${names.map((n) => `    { token: ${JSON.stringify(n.token)}, kind: "${n.kind}" },`).join("\n")}
  ],
};
`;
fs.writeFileSync(target, body);
console.log(`door-policy: ${path.relative(process.cwd(), target)} refreshed: ${names.length} names (${names.filter((n) => n.kind === "training").length} training), commit ${commit}, ${day}`);
