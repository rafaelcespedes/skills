#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Checks the shared code without a server: the text helpers, the files'
// format, robots.txt for every reading choice, the head-tag rewrite, the
// guest book's cleaning and the review page's password. Run it after any
// change to templates/door-policy/ (verify.mjs then checks a running site).
//
//   node <skill>/scripts/selftest.mjs                     the skill's own templates
//   node <skill>/scripts/selftest.mjs --project <site>    a site's door-policy/ copy
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const at = process.argv.indexOf("--project");
const DIR = at > 0 ? path.resolve(process.argv[at + 1], "door-policy") : path.join(here, "..", "templates", "door-policy");
const PASSWORD = "café-contraseña-ñ";
process.env.GUESTBOOK_MEMORY = "1";
process.env.GUESTBOOK_ADMIN_PASSWORD = PASSWORD;
delete process.env.KV_REST_API_URL;
delete process.env.UPSTASH_REDIS_REST_URL;
const imp = (f) => import(pathToFileURL(path.join(DIR, f)).href);

const core = await imp("core.mjs");
const { settings } = await imp("settings.mjs");
const { withDefaults } = await imp("settings.mjs");
const rules = await imp("guestbook/rules.mjs");
const handlers = await imp("guestbook/handlers.mjs");
const negotiate = await imp("negotiate.mjs");
const store = await imp("guestbook/store.mjs");
const { lede, toMd, createAgentView, AI_CRAWLERS, AI_ROBOTS_TXT, TRAINING_TOKEN, parseRobots } = core;

let passed = 0;
const failed = [];
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed.push(name);
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}
async function atest(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed.push(name);
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}
// the review page and check-in tests need the guest book switched on in
// config.mjs (a site's copy may have it off: then they're skipped)
let skippedGb = 0;
const gtest = settings.guestbook.enabled === false
  ? async (name) => {
      skippedGb++;
      console.log(`  - ${name}: skipped, the guest book is switched off in config.mjs`);
    }
  : atest;
const ok = (c, m) => {
  if (!c) throw new Error(m);
};

const base = { site: "https://example.com", owner: { name: "Ana Ruiz" } };
const S = (extra = {}) => withDefaults({ ...base, ...extra });
const content = {
  person: { name: "Ana Ruiz", summary: "Designer in Lisbon.", image: "/img/Ana.JPG", about: ["I make [tools](/tools) for people.", "<p>Second <strong>paragraph</strong>.</p>"] },
  work: [
    { slug: "lumen", title: "Lumen [beta]", year: 2025, summary: "1.2M people use it monthly. It ships weekly.", caseStudy: "See the [demo](/demo) and ![shot](/img/shot.png).", media: ["/img/lumen.jpg?w=2", "/img/Cover.PNG"], url: "/work/lumen" },
    { slug: "quiet", title: "Quiet", media: [] },
  ],
  writing: [{ title: "On craft", url: "/writing/on-craft", summary: "An essay." }],
  sections: [{ title: "Talks", items: [{ title: "Config 2025", url: "https://example.org/talk" }] }],
};
const view = (extra = {}, opts = {}) => createAgentView(S(extra), content, opts);

console.log("\nText helpers");
test("lede never drops text and keeps numbers, versions and abbreviations whole", () => {
  for (const t of ["1.2M people use it monthly. More here.", "I designed the 1.0 app, then v2.0.", "I worked with the U.S. Forest Service on maps.", "Visit example.com for more.", "Small things, e.g. this one.", "Born in St. Louis in 1990."]) {
    const out = lede(t, 40);
    ok(t.replace(/\s+/g, " ").startsWith(out.replace(/…$/, "")), `"${t}" → "${out}"`);
    ok(out.length <= 41, `too long: "${out}"`);
  }
  ok(lede("1.2M people use it monthly. It ships weekly.") === "1.2M people use it monthly. It ships weekly.", lede("1.2M people use it monthly. It ships weekly."));
  ok(lede("One. Two is longer than the limit allows here.", 10) === "One.", lede("One. Two is longer than the limit allows here.", 10));
  ok(lede("A single sentence that is far too long for the limit", 20).endsWith("…"), "no ellipsis on a cut");
  // a cut at an abbreviation would read as a whole, wrong sentence
  for (const [t, max] of [["Made for the U.S. Forest Service across eleven states.", 30], ["Born in St. Louis in 1990. Moved later.", 20], ["I worked with the U.S. Forest Service on maps.", 40]]) {
    const out = lede(t, max);
    ok(out.endsWith("…") && !/(U\.S\.|St\.)$/.test(out), `"${t}" at ${max} → "${out}"`);
  }
});
test("toMd keeps images (absolute) and figure captions", () => {
  const md = toMd('<figure><img src="/a.jpg" alt="A cat"><figcaption>The <em>cat</em>.</figcaption></figure><p>After</p>', "https://example.com");
  ok(md.includes("![A cat](https://example.com/a.jpg)"), md);
  ok(md.includes("*The cat.*"), md);
});

console.log("\nFiles");
test("llms.txt: after the first section, only link items (llmstxt.org)", () => {
  for (const reading of ["anything", "files-first", "no-ai"]) {
    const txt = view({ reading }, { guestbookOpen: true }).llmsTxt();
    const lines = txt.split("\n");
    const i = lines.findIndex((l) => l.startsWith("## "));
    const bad = lines.slice(i < 0 ? lines.length : i).filter((l) => l.trim() && !l.startsWith("## ") && !/^- \[(?:\\.|[^\]\\])+\]\([^)\s]+\)(: .*)?$/.test(l));
    ok(!bad.length, `${reading}: ${bad[0]}`);
  }
  const txt = view().llmsTxt();
  ok(txt.includes("[Lumen \\[beta\\]]("), "brackets in a title aren't escaped");
  ok(txt.includes("## Talks") && txt.includes("[Config 2025](https://example.org/talk)"), "content.sections missing");
  ok(!txt.includes("## Experience"), "experience belongs in llms-full.txt");
  ok(txt.includes("1.2M people use it monthly"), "the lede lost text");
});
test("A site with no work doesn't promise case studies", () => {
  const v = createAgentView(S(), { person: { name: "Ana Ruiz" } });
  ok(!/case stud/i.test(v.llmsTxt()), v.llmsTxt());
});
test("llms-full.txt: about keeps its links, absolute; the guest book comes after the work", () => {
  const full = view({}, { guestbookOpen: true }).llmsFull();
  ok(full.includes("[tools](https://example.com/tools)"), "about lost its link");
  ok(full.indexOf("## Work") < full.indexOf("## Guest book"), "guest book before the work");
  ok(full.includes("[demo](https://example.com/demo)") && full.includes("![shot](https://example.com/img/shot.png)"), "relative links in the case study");
});
test("A case study's markdown lists only the media its text doesn't show, under the right heading", () => {
  const md = view().workMarkdown(view().work[0]);
  ok(!md.includes("- https://example.com/img/shot.png"), "an embedded image is listed again");
  ok(/## Images\n\n- https:\/\/example\.com\/img\/lumen\.jpg\?w=2\n- https:\/\/example\.com\/img\/Cover\.PNG/.test(md), md);
  ok(!/and video/.test(md), "says 'and video' with no video");
  ok(view().robots().text.includes("Allow: /img/shot.png$"), "an embedded image isn't allowed in robots.txt");
});
test("A project with no images doesn't promise images", () => {
  const v = view();
  ok(v.workMarkdown(v.work[1]).includes("No written case study yet.\n"), v.workMarkdown(v.work[1]));
  ok(!v.workMarkdown(v.work[1]).includes("images below"), "promises images");
});
test("Two projects with the same slug (any case) stop the build", () => {
  let err = "";
  try {
    createAgentView(S(), { person: { name: "A" }, work: [{ slug: "a" }, { slug: "A" }] });
  } catch (e) {
    err = e.message;
  }
  ok(/share the slug/.test(err), err || "no error");
});
test("Statements: one wording, the training choice said in every file", () => {
  const v = view({ contentSignal: { aiTrain: "no" } });
  const t = core.trainingStatement(v.settings);
  ok(v.statement.startsWith(core.readingStatement(v.settings)), "statement doesn't start with the settings-only part");
  ok(v.llmsTxt().includes(`- AI training: ${t}`) && v.llmsFull().includes(`- AI training: ${t}`), "training line missing");
  ok(v.profile().readingPreference.training === "no", "profile.json has no training");
  ok(v.settings.page.intro.join(" ").includes(t), "the /agents intro doesn't say it");
  ok(!view().llmsTxt().includes("AI training"), "training stated while unset");
});
test("The guest book name is used as written", () => {
  const v = view({ guestbook: { name: "Libro de visitas" } }, { guestbookOpen: true });
  ok(v.llmsFull().includes("called “Libro de visitas”") && !v.llmsFull().includes("libro de visitas"), "lowercased");
});

console.log("\nHead tags");
test("describedby and the markdown twin; nothing in no-ai but the Bing preferences", () => {
  const v = view();
  ok(v.headTags().includes('rel="describedby" href="/llms.txt"'), "no describedby");
  ok(v.headTags({ work: "lumen" }).includes('type="text/markdown" href="/work/lumen.md"'), "no markdown alternate");
  const n = view({ reading: "no-ai" }).headTags();
  ok(!n.includes("llms.txt") && n.includes("ai-training:disallow") && n.includes("ai-grounding:disallow"), n);
});
test("build.mjs --head writes $-sequences as they are, once", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "door-policy-selftest-"));
  try {
    fs.cpSync(DIR, path.join(tmp, "door-policy"), { recursive: true, filter: (src) => !src.endsWith(".last-build.json") });
    fs.writeFileSync(path.join(tmp, "door-policy", "config.mjs"), `export default { site: "https://example.com", owner: { name: "Ana Ruiz" } };\n`);
    fs.writeFileSync(path.join(tmp, "door-policy", "content.mjs"), `export async function loadContent() { return { person: { name: "Ana Ruiz", summary: "$1 $2 $' $& raised $2.5M for $$ things." } }; }\n`);
    fs.writeFileSync(path.join(tmp, "index.html"), "<html><head>\n  <!-- door-policy:head jsonld -->\n  <!-- /door-policy:head -->\n</head><body>Hi</body></html>\n");
    for (let i = 0; i < 2; i++) execFileSync(process.execPath, ["door-policy/build.mjs", "--out", ".", "--head", "index.html"], { cwd: tmp, stdio: "pipe" });
    const html = fs.readFileSync(path.join(tmp, "index.html"), "utf8");
    ok((html.match(/<!-- door-policy:head jsonld -->/g) || []).length === 1 && (html.match(/<!-- \/door-policy:head -->/g) || []).length === 1, "marker pair duplicated");
    ok((html.match(/<body>/g) || []).length === 1, "the page body was duplicated");
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    ok(ld["@graph"][0].description.includes("$1 $2 $' $& raised $2.5M"), ld["@graph"][0].description);
    // --robots keeps what's outside the markers, and a full block stays full
    fs.writeFileSync(path.join(tmp, "robots.txt"), "# mine\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nDisallow: /drafts/\n\nSitemap: https://example.com/sitemap.xml\n");
    for (let i = 0; i < 2; i++) execFileSync(process.execPath, ["door-policy/build.mjs", "--robots", "robots.txt"], { cwd: tmp, stdio: "pipe" });
    const robots = fs.readFileSync(path.join(tmp, "robots.txt"), "utf8");
    ok(robots.startsWith("# mine\nUser-agent: GPTBot\nDisallow: /\n") && robots.includes("Sitemap: https://example.com/sitemap.xml"), "the person's own lines changed");
    ok((robots.match(/# door-policy:robots/g) || []).length === 1, "the block was added twice");
    const named = parseRobots(robots).filter((g) => g.agents.includes("GPTBot"));
    ok(named.every((g) => !g.rules.some((r) => r.key === "allow")), "GPTBot was given Allow lines, which would loosen its full block");
    ok(named.some((g) => g.rules.some((r) => r.key === "content-signal")), "GPTBot gets no Content-Signal");
    // switching to robots.txt alone removes the earlier files and the head links
    execFileSync(process.execPath, ["door-policy/build.mjs", "--out", ".", "--head", "index.html"], { cwd: tmp, stdio: "pipe" });
    ok(fs.existsSync(path.join(tmp, "llms-full.txt")), "the full build wrote no llms-full.txt");
    fs.writeFileSync(path.join(tmp, "door-policy", "config.mjs"), `export default { site: "https://example.com", owner: { name: "Ana Ruiz" }, reading: "no-ai" };\n`);
    execFileSync(process.execPath, ["door-policy/build.mjs", "--robots", "robots.txt", "--robots-only", "--head", "index.html"], { cwd: tmp, stdio: "pipe" });
    const left = ["llms.txt", "llms-full.txt", "profile.json", "agents/index.html"].filter((f) => fs.existsSync(path.join(tmp, f)));
    ok(!left.length, `--robots-only left ${left.join(", ")}`);
    ok(!/llms\.txt|profile\.json/.test(fs.readFileSync(path.join(tmp, "index.html"), "utf8")), "the head still links to the files");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

console.log("\nrobots.txt");
const groupFor = (r, token) => r.groups.find((g) => g.agents.includes(token));
test("No to training: training crawlers kept out in every mode, plus the shared token", () => {
  for (const reading of ["anything", "files-first"]) {
    const r = view({ reading, contentSignal: { aiTrain: "no" } }).robots();
    for (const c of AI_CRAWLERS.filter((x) => x.kind === "training")) ok(groupFor(r, c.token)?.rules[0] === "Disallow: /", `${reading}: ${c.token} isn't kept out`);
    ok(groupFor(r, TRAINING_TOKEN)?.rules.includes("Disallow: /"), `${reading}: no ${TRAINING_TOKEN} group`);
    if (reading === "files-first") ok(groupFor(r, "OAI-SearchBot").rules.includes("Allow: /llms.txt"), "search crawlers lost the files");
  }
  ok(!view().robots().text.includes(TRAINING_TOKEN), "the training token appears without a training no");
});
test("Media rules name each listed image exactly (query and case kept), never a file type; the portrait counts", () => {
  const t = view().robots().text;
  for (const l of ["Allow: /img/lumen.jpg?w=2$", "Allow: /img/Cover.PNG$", "Allow: /img/Ana.JPG$"]) ok(t.includes(l), `missing ${l}`);
  ok(!/Allow: \/\*\./.test(t), "an extension wildcard would reach images of locked work");
});
test("Files first: agents a person sent may open the homepage; crawlers may not", () => {
  const r = view().robots();
  for (const c of AI_CRAWLERS) {
    const g = groupFor(r, c.token);
    ok(g, `${c.token} isn't named`);
    ok(g.rules.includes("Allow: /$") === (c.kind === "user-fetch"), `${c.token} (${c.kind}): Allow: /$ ${g.rules.includes("Allow: /$") ? "given" : "missing"}`);
  }
  ok(groupFor(r, "Claude-User").rules.indexOf("Allow: /$") < groupFor(r, "Claude-User").rules.indexOf("Disallow: /"), "order");
  ok(!view({ reading: "anything" }).robots().text.includes("Allow: /$"), "anything doesn't need it");
});
test("The community list (ai.robots.txt): every name in no-ai, training names for a no; never in files first alone; search and previews left out", () => {
  ok(AI_ROBOTS_TXT.names.length > 100 && AI_ROBOTS_TXT.taken && AI_ROBOTS_TXT.license === "MIT", "snapshot missing or undated");
  const has = (r, t) => r.groups.some((g) => g.agents.some((a) => a.toLowerCase() === t.toLowerCase()));
  const noAi = view({ reading: "no-ai" }).robots();
  const ff = view().robots();
  const ffNo = view({ contentSignal: { aiTrain: "no" } }).robots();
  for (const n of AI_ROBOTS_TXT.names) {
    ok(has(noAi, n.token), `no-ai: ${n.token} not named`);
    if (n.kind === "training") ok(has(ffNo, n.token), `training no: ${n.token} not named`);
  }
  ok(!/ai\.robots\.txt/.test(ff.text), "files first names the community list");
  for (const t of ["Applebot", "facebookexternalhit", "Googlebot", "bingbot"]) ok(!noAi.groups.some((g) => g.agents.includes(t)), `${t} is kept out`);
  const names = noAi.groups.flatMap((g) => g.agents.map((a) => a.toLowerCase()));
  ok(names.length === new Set(names).size, "a name appears twice");
  ok(noAi.groups.every((g) => g.agents.includes(TRAINING_TOKEN) || g.rules.some((r) => r.startsWith("Content-Signal"))), "a group without the Content-Signal line");
  ok(/MIT licence\), taken \d{4}-\d{2}-\d{2}/.test(noAi.text), "the snapshot isn't credited and dated in robots.txt");
});
test("A no to training (and no-ai): Content Signals Policy text, TDMRep file and tag; none otherwise", () => {
  for (const extra of [{ contentSignal: { aiTrain: "no" } }, { reading: "no-ai" }]) {
    const v = view(extra);
    ok(v.robots().text.includes("RESERVATIONS OF RIGHTS UNDER ARTICLE 4") && v.robots().text.includes("not a lock"), "no preamble");
    ok(JSON.parse(v.tdmrep())[0]["tdm-reservation"] === 1, "no tdmrep");
    ok(v.headTags().includes('<meta name="tdm-reservation" content="1">'), "no tdm meta");
  }
  const v = view();
  ok(!v.robots().text.includes("ARTICLE 4") && v.tdmrep() === null && !v.headTags().includes("tdm-"), "reservation without a no");
});
test("A robots.txt that keeps every crawler out: no AI crawler is named with an Allow", () => {
  for (const reading of ["anything", "files-first", "no-ai"]) {
    const { text, warnings } = view({ reading }, { guestbookOpen: true }).robotsFile("User-agent: *\nDisallow: /\n");
    const groups = parseRobots(text);
    ok(groups.every((g) => g.agents.includes("*") || !g.rules.some((r) => r.key === "allow")), `${reading}: an AI crawler got Allow lines`);
    ok(warnings.some((w) => /every crawler out/.test(w)), "no warning");
  }
});
test("A full block written as /* (or /*$) is kept too, for one crawler and for every crawler", () => {
  for (const reading of ["anything", "files-first", "no-ai"]) {
    const one = view({ reading }).robotsFile("User-agent: GPTBot\nDisallow: /*\n\nUser-agent: *\nDisallow: /drafts/\n");
    const named = parseRobots(one.text).filter((g) => g.agents.includes("GPTBot"));
    ok(named.every((g) => !g.rules.some((r) => r.key === "allow")), `${reading}: GPTBot was given Allow lines`);
    ok(one.warnings.some((w) => /blocks GPTBot completely/.test(w)), `${reading}: no warning for GPTBot`);
    const all = view({ reading }, { guestbookOpen: true }).robotsFile("User-agent: *\nDisallow: /*$\n");
    ok(parseRobots(all.text).every((g) => g.agents.includes("*") || !g.rules.some((r) => r.key === "allow")), `${reading}: an AI crawler got Allow lines under "Disallow: /*$"`);
    ok(all.warnings.some((w) => /every crawler out/.test(w)), `${reading}: no warning for *`);
  }
});
test("Keep-out-but-the-homepage (Allow: /$) counts as a full block; No AI and a training no still name crawlers to keep them out", () => {
  const ff = view({ contentSignal: { aiTrain: "no" } }).robotsFile("User-agent: *\nDisallow: /\nAllow: /$\n");
  const g = parseRobots(ff.text);
  ok(g.every((x) => x.agents.includes("*") || !x.rules.some((r) => r.key === "allow")), "an AI crawler got Allow lines");
  ok(g.some((x) => x.agents.includes("GPTBot") && x.rules.some((r) => r.key === "disallow" && r.value === "/")), "training crawlers fell back to the homepage exception");
  ok(ff.warnings.some((w) => /every crawler out except the homepage/.test(w)), ff.warnings.join(" | "));
  const na = view({ reading: "no-ai" }).robotsFile("User-agent: *\nDisallow: /\nAllow: /$\n");
  ok(parseRobots(na.text).some((x) => x.agents.includes("Claude-User") && x.rules.some((r) => r.key === "disallow" && r.value === "/")), "no-ai left agents under the homepage exception");
});
test("The person's own Allow for a crawler the block keeps out is named in a warning", () => {
  const w = view({ contentSignal: { aiTrain: "no" } }).robotsFile("User-agent: GPTBot\nAllow: /\n").warnings;
  ok(w.some((x) => /lets GPTBot read \/ .*no to training can't override/.test(x)), w.join(" | "));
  const ff = view().robotsFile("User-agent: ClaudeBot\nAllow: /llms.txt\nAllow: /work/\n").warnings;
  ok(ff.some((x) => /ClaudeBot read \/work\/ /.test(x)) && !ff.some((x) => /\/llms\.txt/.test(x)), ff.join(" | "));
  ok(!view({ reading: "anything" }).robotsFile("User-agent: GPTBot\nAllow: /\n").warnings.length, "anything warned");
});
test("A block from before the rename (agent-view markers) is replaced, not doubled", () => {
  const old = "User-agent: *\nDisallow: /drafts/\n\n# agent-view:robots (old)\nUser-agent: GPTBot\nAllow: /\n# /agent-view:robots\n";
  const { text } = view().robotsFile(old);
  ok(!text.includes("agent-view") && (text.match(/# door-policy:robots/g) || []).length === 1 && text.startsWith("User-agent: *\nDisallow: /drafts/"), text.slice(0, 200));
});
test("The guest book is reachable in files first only when open, and robots.txt never names it while closed", () => {
  ok(view({}, { guestbookOpen: true }).robots().text.includes("Allow: /api/guestbook"), "no Allow for the guest book");
  ok(!/guestbook/.test(view().robots().text), "closed, but named");
  ok(!/guestbook/.test(view({ reading: "no-ai" }, { guestbookOpen: true }).robots().text), "no-ai invites agents to sign");
});

console.log("\nNo AI at all, and the settings");
test("No AI publishes llms.txt alone, with no pointers to other files", () => {
  const v = view({ reading: "no-ai" }, { guestbookOpen: true });
  ok(v.files().length === 1 && v.files()[0].path === "/llms.txt", v.files().map((f) => f.path).join(", "));
  ok(!/profile\.json|llms-full/.test(v.llmsTxt()), "llms.txt points to files that aren't there");
  ok(v.llmsTxt().includes("agent (the agent's name)"), "the guest book fields aren't in llms.txt");
  ok(v.settings.page.title === "About AI on this site", v.settings.page.title);
  ok(!v.llmsTxt().includes("- AI training:") && /train on/.test(v.llmsTxt()), "training said twice, or not at all");
  ok(S({ reading: "no-ai" }).guestbook.enabled === false && S({ reading: "no-ai", guestbook: { enabled: true } }).guestbook.enabled === true && S().guestbook.enabled === true, "the guest book default doesn't follow the reading choice");
  ok(Object.keys(v.settings.guestbook.uses).join() === "overview,nothing", Object.keys(v.settings.guestbook.uses).join());
  ok((v.settings.page.intro.join(" ").match(/asks that/g) || []).length === 1, "the intro says 'asks that' twice");
});
test("Every combination of answers builds; AI answers follow the reading choice", () => {
  for (const reading of ["anything", "files-first", "no-ai"]) for (const aiTrain of [null, "yes", "no"]) for (const aiInput of ["yes", "no", undefined]) for (const search of ["yes", "no", null]) {
    const st = S({ reading, contentSignal: { aiTrain, aiInput, search } });
    ok(st.contentSignal.aiInput === (reading === "no-ai" ? "no" : "yes"), `${reading}: aiInput ${st.contentSignal.aiInput}`);
    createAgentView(st, content).files();
  }
});

console.log("\nMarkdown on request");
test("Accept parsing: only a clear preference for markdown counts", () => {
  const yes = ["text/markdown", "text/markdown, text/html", "text/markdown, text/html, */*", "text/html;q=0.5, text/markdown", "TEXT/MARKDOWN;q=0.9, text/*;q=0.8", "text/markdown, */*;q=0.1"];
  const no = ["", "*/*", "text/html", "text/html, text/markdown", "text/*", "text/markdown;q=0, text/html", "text/markdown;q=0.5, text/html", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "text/plain"];
  for (const a of yes) ok(negotiate.prefersMarkdown(a), `"${a}" should prefer markdown`);
  for (const a of no) ok(!negotiate.prefersMarkdown(a), `"${a}" shouldn't`);
});
test("Which file answers which page", () => {
  ok(negotiate.markdownFor("/") === "/llms.txt", "home");
  ok(negotiate.markdownFor("/work/lumen") === "/work/lumen.md" && negotiate.markdownFor("/work/lumen/") === "/work/lumen.md" && negotiate.markdownFor("/work/lumen.html") === "/work/lumen.md", "work page");
  for (const p of ["/work/lumen.md", "/about", "/work/a/b", "/work/../x", "/agents"]) ok(negotiate.markdownFor(p) === null, p);
});

console.log("\nGuest book");
test("Every known AI agent the guest book counts is also asked in robots.txt", () => {
  const tokens = new Set(AI_CRAWLERS.map((x) => x.token.toLowerCase()));
  const missing = rules.KNOWN.filter((k) => k.ai !== false && !tokens.has(k.token.toLowerCase())).map((k) => k.token);
  ok(!missing.length, missing.join(", "));
});
test("Signature-Agent is matched by hostname only", () => {
  const h = (v) => new Headers({ "signature-agent": v });
  ok(rules.agentName(h('"https://chatgpt.com"')) === "ChatGPT agent", "chatgpt.com not matched");
  ok(rules.agentName(h('"https://evil.example/chatgpt.com"')) === null, "a path fooled it");
  ok(rules.agentName(h('"https://chatgpt.com.evil.example"')) === null, "a lookalike host fooled it");
});
test("clean() strips tag characters, fillers, variation selectors and mark stacks; keeps line breaks", () => {
  const out = rules.clean(`a\u{E0049}\u{E0067}bㅤc️d e\tf x${"́".repeat(10)}`, 500);
  ok(out === `abcd\ne f x${"́".repeat(3)}`, JSON.stringify(out));
  ok(rules.validate({ agent: "ㅤ​", purpose: "answering" }).errors, "an invisible agent name passed");
  ok(rules.validate({ agent: ["a"], purpose: "answering" }).errors, "a list passed as the agent");
  const e = rules.validate({ agent: "Cl\nau\u2028de", purpose: "answering", on_behalf_of: "Ana\nRuiz", note: "two\nlines" }).entry;
  ok(e.agent === "Cl au de" && e.onBehalfOf === "Ana Ruiz" && e.note === "two\nlines", JSON.stringify(e));
});
test("The public view has no id; the receipt does", () => {
  const e = { id: "abcdefghjkmn", agent: "A", purpose: "other", used: [], note: null, onBehalfOf: "P", createdAt: new Date().toISOString() };
  ok(!("id" in rules.publicView(e)) && !("onBehalfOf" in rules.publicView(e)), "public view leaks");
  ok(rules.receiptView(e).id === e.id, "receipt has no id");
});
await gtest("The review page takes a password with accents, as browsers send it (UTF-8)", async () => {
  const auth = (p) => ({ authorization: `Basic ${Buffer.from(`owner:${p}`, "utf8").toString("base64")}` });
  const good = await handlers.admin(new Request("https://example.com/guestbook/admin", { headers: auth(PASSWORD) }));
  ok(good.status === 200, `status ${good.status}`);
  ok(good.headers.get("x-frame-options") === "DENY", "can be framed");
  const bad = await handlers.admin(new Request("https://example.com/guestbook/admin", { headers: auth("cafe-contrasena-n") }));
  ok(bad.status === 401, `wrong password got ${bad.status}`);
  const lower = await handlers.admin(new Request("https://example.com/guestbook/admin", { headers: { authorization: auth(PASSWORD).authorization.replace("Basic", "basic") } }));
  ok(lower.status === 200, `"basic" in lowercase got ${lower.status}`);
});
await gtest("The review page answers 400, not 500, to a post that isn't a form", async () => {
  const headers = { authorization: `Basic ${Buffer.from(`owner:${PASSWORD}`, "utf8").toString("base64")}`, "sec-fetch-site": "same-origin" };
  for (const [type, body] of [["application/json", '{"action":"approve"}'], [null, null]]) {
    const r = await handlers.admin(new Request("https://example.com/guestbook/admin", { method: "POST", headers: type ? { ...headers, "content-type": type } : headers, body }));
    ok(r.status === 400, `${type || "no body"}: ${r.status}`);
  }
});
await gtest("The review page shows the real total past 100", async () => {
  const ids = Array.from({ length: 240 }, () => rules.newId());
  await store.redis(...ids.map((id) => ["SET", `gb:e:${id}`, JSON.stringify({ id, agent: "Flood", purpose: "other", used: [], note: null, visibility: "public", status: "pending", createdAt: new Date().toISOString() })]), ["LPUSH", "gb:pending", ...ids]);
  const auth = { authorization: `Basic ${Buffer.from(`owner:${PASSWORD}`, "utf8").toString("base64")}` };
  const body = await (await handlers.admin(new Request("https://example.com/guestbook/admin", { headers: auth }))).text();
  ok(/Waiting for your OK \(showing the newest 100 of 240\)/.test(body), (body.match(/Waiting for your OK[^<]*/) || [""])[0]);
});
await gtest("Check-ins: one address counts once per name and day", async () => {
  const reqFrom = (ip) => new Request("https://example.com/llms.txt", { headers: { "x-forwarded-for": ip } });
  for (let i = 0; i < 5; i++) await rules.recordCheckIn("Claude", reqFrom("2001:db8::1"));
  await rules.recordCheckIn("Claude", reqFrom("2001:db8::2"));
  const res = await handlers.guestbook(new Request("https://example.com/api/guestbook"));
  const data = await res.json();
  ok(data.checkIns.find((c) => c.agent === "Claude")?.visits === 2, JSON.stringify(data.checkIns));
});

console.log(`\n${passed} passed · ${failed.length} failed${skippedGb ? ` · ${skippedGb} skipped (guest book off)` : ""}`);
process.exit(failed.length ? 1 : 0);
