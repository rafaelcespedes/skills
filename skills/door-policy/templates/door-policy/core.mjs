// ─────────────────────────────────────────────────────────────────────────────
// The agent view: turns the site's content into what AI agents read, and
// states the site's door policy (how the owner would like AI to read it).
//
//   /llms.txt          the short version (llmstxt.org format)
//   /llms-full.txt     everything in one file, case studies included
//   /profile.json      the same as structured data
//   /work/<slug>.md    one case study per file (the folder is paths.work)
//   head tags          <link rel="alternate">, <link rel="describedby">,
//                      schema.org JSON-LD and the reservation tags
//   robots.txt         the block for the reading choice (robots(), robotsFile())
//   tdmrep.json        W3C TDMRep, for a "no" to training (tdmrep())
//
// "No AI at all" publishes only /llms.txt: who the person is, how to reach
// them, and the wish.
//
// Pure functions: no file system, no framework. view.mjs feeds it; build.mjs
// or the framework's endpoints serve what it returns. Don't edit this file:
// settings live in config.mjs and content in content.mjs.
//
// Never pass guest book notes in here. Agents get counts and fixed names
// only, so one visitor can't plant text for the next.
// ─────────────────────────────────────────────────────────────────────────────

import { AI_ROBOTS_TXT } from "./ai-robots.mjs";

const SLUG = /^[a-z0-9][a-z0-9_-]*$/i;

/* ── AI crawlers and agents ───────────────────────────────────────────────────
   By the name robots.txt rules use for them. The reading choice in config.mjs
   is stated to each of these in robots.txt. Search engines (Googlebot,
   Bingbot) aren't here: they keep reading the pages for search results.

     kind           training    collects pages to train models
                    search      builds an index for an AI search or answer tool
                    user-fetch  opens a page because a person asked it to
                    mixed       more than one of these
     followsRobots  yes         the vendor says it follows robots.txt
                    may-not     the vendor says robots.txt may not apply
                    unverified  no vendor statement found
     tool           the product people know it as, for the /agents page

   Each line names where the vendor documents it. Add a name when a new one
   matters; scripts/selftest.mjs checks every guest book name is here too. */
const OPENAI = "https://developers.openai.com/api/docs/bots";
const ANTHROPIC = "https://support.claude.com/en/articles/8896518";
const PERPLEXITY = "https://docs.perplexity.ai/guides/bots";
const GOOGLE = "https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers";
const GOOGLE_SPECIAL = "https://developers.google.com/crawling/docs/crawlers-fetchers/google-special-case-crawlers";
const GOOGLE_USER = "https://developers.google.com/crawling/docs/crawlers-fetchers/google-user-triggered-fetchers";
const META = "https://developers.facebook.com/docs/sharing/webmasters/web-crawlers";
const AMAZON = "https://developer.amazon.com/amazonbot";
const MISTRAL = "https://docs.mistral.ai/robots";
const c = (token, kind, followsRobots, source, tool = null) => ({ token, kind, followsRobots, source, tool });

export const AI_CRAWLERS = [
  c("GPTBot", "training", "yes", OPENAI),
  c("OAI-SearchBot", "search", "yes", OPENAI),
  c("ChatGPT-User", "user-fetch", "may-not", OPENAI, "ChatGPT"),
  c("ClaudeBot", "training", "yes", ANTHROPIC),
  c("anthropic-ai", "training", "unverified", ANTHROPIC), // legacy name, harmless to keep
  c("Claude-SearchBot", "search", "yes", ANTHROPIC),
  c("Claude-User", "user-fetch", "yes", ANTHROPIC, "Claude"),
  c("Claude-Web", "user-fetch", "unverified", ANTHROPIC), // legacy name, harmless to keep
  c("Claude-Agent", "user-fetch", "unverified", ANTHROPIC),
  c("PerplexityBot", "search", "yes", PERPLEXITY),
  c("Perplexity-User", "user-fetch", "may-not", PERPLEXITY, "Perplexity"),
  c("Google-Extended", "training", "yes", GOOGLE), // also Gemini Apps grounding
  c("Google-CloudVertexBot", "mixed", "unverified", GOOGLE_SPECIAL),
  c("Google-Agent", "user-fetch", "may-not", GOOGLE_USER, "Google's agents"),
  c("Google-GeminiNotebook", "user-fetch", "may-not", GOOGLE_USER, "Google's agents"),
  c("Applebot-Extended", "training", "yes", "https://support.apple.com/en-us/119829"), // model training only, not Siri or Spotlight
  c("meta-externalagent", "training", "yes", META),
  c("meta-webindexer", "search", "yes", META),
  c("meta-externalfetcher", "user-fetch", "may-not", META, "Meta AI"),
  c("Amazonbot", "mixed", "yes", AMAZON),
  c("Amzn-SearchBot", "search", "yes", AMAZON),
  c("Amzn-User", "user-fetch", "may-not", AMAZON, "Alexa"),
  c("CCBot", "training", "yes", "https://commoncrawl.org/ccbot"),
  c("Bytespider", "training", "unverified", "https://www.bytedance.com/"), // no vendor page found
  c("cohere-ai", "user-fetch", "unverified", "https://cohere.com/"), // no vendor page found
  c("cohere-training-data-crawler", "training", "unverified", "https://cohere.com/"), // no vendor page found
  c("MistralAI-User", "user-fetch", "unverified", MISTRAL),
  c("MistralAI-Index", "search", "unverified", MISTRAL),
  c("MistralAI-Training", "training", "yes", MISTRAL),
  c("DuckAssistBot", "user-fetch", "yes", "https://duckduckgo.com/duckduckgo-help-pages/results/duckassistbot"), // fetches live for DuckAssist answers
  c("YouBot", "search", "unverified", "https://about.you.com/youbot/"),
];

/** The shared training opt-out token (Bing; Google from 2027): its own group. */
export const TRAINING_TOKEN = "__usage_ai-training";

/** The community list (ai.robots.txt, MIT), named only for "no-ai" (every
 *  name) and for a "no" to training (its training names), leaving out any
 *  name the curated list above already covers. */
export { AI_ROBOTS_TXT };

/** Cloudflare's Content Signals Policy (CC0), quoted as published, with its
 *  rights reservation under EU Directive 2019/790 Article 4. A comment at the
 *  top of the block for a "no" to training and for "no-ai". */
export const CONTENT_SIGNALS_POLICY = `# As a condition of accessing this website, you agree to
# abide by the following content signals:

# (a)  If a content-signal = yes, you may collect content
# for the corresponding use.
# (b)  If a content-signal = no, you may not collect content
# for the corresponding use.
# (c)  If the website operator does not include a content
# signal for a corresponding use, the website operator
# neither grants nor restricts permission via content signal
# with respect to the corresponding use.

# The content signals and their meanings are:

# search: building a search index and providing search
# results (e.g., returning hyperlinks and short excerpts
# from your website's contents).  Search does not include
# providing AI-generated search summaries.
# ai-input: inputting content into one or more AI models
# (e.g., retrieval augmented generation, grounding, or other
# real-time taking of content for generative AI search
# answers).
# ai-train: training or fine-tuning AI models.

# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS
# RESERVATIONS OF RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN
# UNION DIRECTIVE 2019/790 ON COPYRIGHT AND RELATED RIGHTS
# IN THE DIGITAL SINGLE MARKET.`;

/** The owner's wish about how agents read the site, as one statement of
 *  preference. It asks; it never commands (careful agents treat commands in
 *  page content as prompt injection). The same words go in every agent file
 *  and on the visible page. With no `listed`, it's the part that depends on
 *  settings alone (scripts/verify.mjs checks the files start with it). */
export function readingStatement(S, { projects = 0, writing = 0 } = {}) {
  const s = S.owner.short;
  const listed = [projects && "side projects", writing && "writing"].filter(Boolean).join(" and ");
  return {
    anything: `${s} is happy for AI agents and tools to read the site's pages and these files.`,
    "files-first": `${s} asks that AI agents and tools read these files rather than the site's pages, and robots.txt says the same. The files hold the work shown on the pages.${
      listed ? ` ${listed[0].toUpperCase()}${listed.slice(1)} ${projects && writing ? "are" : projects ? "are" : "is"} listed with a summary and a link.` : ""
    }`,
    "no-ai": `${s} asks that AI agents and tools not read, use or train on this site, and robots.txt says the same. For an agent that comes anyway, this file holds only who ${s} is and how to get in touch.`,
  }[S.reading || "files-first"];
}

/** The owner's stance on AI training, when they've stated one. */
export function trainingStatement(S) {
  const s = S.owner.short;
  return { no: `${s} asks that this site not be used to train AI models (robots.txt says the same).`, yes: `${s} is happy for this site to be used to train AI models (robots.txt says the same).` }[S.contentSignal?.aiTrain] || null;
}

/** Build day (UTC), so agents can tell how fresh the files are. */
export const today = () => new Date().toISOString().slice(0, 10);

/* ── Text helpers (also handy in content.mjs adapters) ───────────────────── */

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", mdash: "—", ndash: "–", hellip: "…" };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
    e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENTITIES[e.toLowerCase()] ?? m,
  );
const attr = (tag, name) => (tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i")) || [])[2] || "";
const stripTags = (s) => s.replace(/<[^>]+>/g, "").trim();

/** HTML → markdown. Paragraphs, headings, lists, links, images, figure
 *  captions, bold and italics survive; every other tag is dropped. Relative
 *  links become absolute when `site` is given. */
export function toMd(html = "", site = "") {
  const abs = (u) => (!site || /^(https?:|mailto:|tel:|data:|#)/.test(u) ? u : site + (u.startsWith("/") ? u : `/${u}`));
  return decode(
    String(html)
      .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, n, t) => `\n\n${"#".repeat(Math.max(2, +n))} ${stripTags(t)}\n\n`)
      .replace(/<img\b[^>]*>/gi, (tag) => (attr(tag, "src") ? `\n\n![${attr(tag, "alt").replace(/[[\]]/g, "")}](${abs(attr(tag, "src"))})\n\n` : ""))
      .replace(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/gi, (_, t) => (stripTags(t) ? `\n*${stripTags(t)}*\n\n` : ""))
      .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, t) => `\n- ${t.trim()}`)
      .replace(/<\/(p|div|section|ul|ol|blockquote|figure)>/gi, "\n\n")
      .replace(/<a\b[^>]*?href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi, (_, __, href, text) => `[${stripTags(text)}](${abs(href)})`)
      .replace(/<(b|strong)>([\s\S]*?)<\/\1>/gi, (_, __, t) => (t.trim() ? `**${t.trim()}**` : ""))
      .replace(/<(i|em)>([\s\S]*?)<\/\1>/gi, (_, __, t) => (t.trim() ? `*${t.trim()}*` : ""))
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Markdown (or HTML) → plain text, for one-line summaries and JSON. */
export const plain = (s = "") =>
  toMd(s)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*?([^*]+)\*\*?/g, "$1")
    .replace(/^#+\s*/gm, "");

/** The first sentence or two, kept under `max` characters. Never drops text
 *  from the middle: the result is always the start of the input. A sentence
 *  ends at . ! or ? followed by a space and a capital, a digit or an opening
 *  quote, so "1.2M", "v2.0" and "e.g. this" stay whole. */
const ABBREVIATION = /(?:\b\p{L}\.){2,}$|\b(?:St|Mt|Mr|Mrs|Ms|Dr|Prof|Jr|Sr|vs|etc|Inc|Ltd|Co|No|Ave|Fig|approx)\.$/u;
export function lede(text = "", max = 260) {
  const src = String(text).replace(/\s+/g, " ").trim();
  if (!src) return "";
  const cutAtWord = () => {
    const cut = src.slice(0, max);
    const at = cut.lastIndexOf(" ");
    return `${(at > 0 ? cut.slice(0, at) : cut).replace(/[\s,;:–—-]+$/, "")}…`;
  };
  const parts = src.split(/(?<=[.!?]["”’)]*)\s+(?=[\p{Lu}\p{N}“"‘(¿¡])/u);
  let out = "";
  for (const part of parts) {
    const next = out ? `${out} ${part}` : part;
    if (next.length > max) break;
    out = next;
  }
  if (!out) out = src.length <= max ? src : cutAtWord();
  // a cut that lands on an abbreviation ("the U.S.", "St.") would read as a
  // whole, wrong sentence: cut at a word instead, which says it's cut
  if (out !== src && ABBREVIATION.test(out)) return cutAtWord();
  // backstop: whatever happened above, never return something that isn't
  // the start of the text
  return src.startsWith(out.replace(/…$/, "")) ? out : cutAtWord();
}

/* ── The view ─────────────────────────────────────────────────────────────── */

const list = (x) => (Array.isArray(x) ? x : []);
const compact = (o) =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && !v.length) && !(typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length)),
  );
/** Link text and targets that can't break a markdown link. */
const linkText = (t) => plain(String(t ?? "")).replace(/[[\]\\]/g, "\\$&");
const linkUrl = (u) => String(u).replace(/[()\s]/g, encodeURIComponent);

/** robots.txt as groups: [{ agents, rules: [{ key, value }] }]. */
export function parseRobots(text = "") {
  const groups = [];
  let g = null;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line || !line.includes(":")) continue;
    const key = line.slice(0, line.indexOf(":")).trim().toLowerCase();
    const value = line.slice(line.indexOf(":") + 1).trim();
    if (key === "user-agent") {
      if (!g || g.rules.length) groups.push((g = { agents: [], rules: [] }));
      g.agents.push(value);
    } else if (g) g.rules.push({ key, value });
  }
  return groups;
}

/**
 * @param settings  from settings.mjs
 * @param content   from content.mjs (see references/content.md for the shape)
 * @param opts.guestbookOpen  true only when the guest book is enabled AND its
 *                            storage is connected; otherwise it's never mentioned
 */
export function createAgentView(settings, content = {}, { guestbookOpen = false, updated = today() } = {}) {
  const S = settings;
  const SITE = S.site;
  const reading = S.reading || "files-first";
  const noAi = reading === "no-ai";
  // "no-ai": the minimum. Only llms.txt, with who the person is, how to reach
  // them and the wish. Handing over every case study would make the use they
  // asked against easier.
  if (noAi) content = { person: { ...content.person, about: [] } };
  const abs = (u) => (!u ? null : /^(https?:|mailto:)/.test(u) ? u : SITE + (u.startsWith("/") ? u : `/${u}`));
  // root-relative markdown links and images, made absolute so a downloaded
  // file still works
  const mdAbs = (md) => String(md).replace(/(\]\()(\/(?!\/)[^)\s]*)/g, (_, a, p) => `${a}${SITE}${p}`);
  const excluded = new Set(S.exclude);
  const keep = (x) => x && !x.hidden && !x.draft && !x.locked && !x.private && !excluded.has(x.slug);

  const p = content.person || {};
  const fallback = [p.role && p.organization ? `${p.role} at ${p.organization}` : p.role, p.location && `based in ${p.location}`].filter(Boolean).join(", ");
  const person = {
    name: p.name || S.owner.name,
    summary: p.summary ? plain(p.summary) : fallback ? `${fallback}.` : null,
    location: p.location || null,
    role: p.role || null,
    organization: p.organization || null,
    since: p.since || null,
    image: abs(p.image),
    email: p.email || null,
    links: Object.fromEntries(Object.entries(p.links || {}).filter(([, u]) => u).map(([k, u]) => [k, abs(u)])),
    about: list(p.about).map(plain).filter(Boolean),
    aboutMd: list(p.about).map((x) => mdAbs(toMd(x, SITE))).filter(Boolean),
  };
  if (!person.name) throw new Error("door-policy content: person.name is missing.");

  const seenSlugs = new Map();
  const work = list(content.work)
    .filter(keep)
    .map((w) => {
      if (!SLUG.test(w.slug || "")) throw new Error(`door-policy content: work slug "${w.slug}" must be letters, digits, dashes or underscores.`);
      // compared in lowercase, so macOS and Vercel behave the same
      const key = w.slug.toLowerCase();
      if (seenSlugs.has(key)) throw new Error(`door-policy content: two projects share the slug "${w.slug}"${seenSlugs.get(key) !== w.slug ? ` ("${seenSlugs.get(key)}" differs only in case)` : ""}.`);
      seenSlugs.set(key, w.slug);
      return {
        slug: w.slug,
        title: w.title || w.slug,
        year: w.year ? String(w.year) : null,
        disciplines: list(w.disciplines),
        roles: list(w.roles),
        credits: list(w.credits),
        summary: w.summary ? plain(w.summary) : null,
        caseStudy: w.caseStudy ? mdAbs(w.caseStudy) : null,
        media: [...new Set(list(w.media).map(abs).filter(Boolean))],
        url: abs(w.url),
        markdown: `${SITE}${S.paths.work}/${w.slug}.md`,
      };
    });
  const projects = list(content.projects).filter(keep).map((x) => compact({ slug: x.slug, title: x.title || x.slug, kind: list(x.kind), summary: x.summary ? plain(x.summary) : null, url: abs(x.url) }));
  const writing = list(content.writing).filter(keep).map((x) => compact({ slug: x.slug, title: x.title || x.slug, date: x.date || null, summary: x.summary ? plain(x.summary) : null, url: abs(x.url) }));
  const extraSections = list(content.sections)
    .filter((s) => s && s.title)
    .map((s) => ({ title: plain(s.title), items: list(s.items).filter(keep).map((x) => compact({ title: x.title, summary: x.summary ? plain(x.summary) : null, url: abs(x.url) })).filter((x) => x.title) }))
    .filter((s) => s.items.length);
  const experience = list(content.experience).map((e) => compact({ role: e.role, organization: e.organization, place: e.place, dates: e.dates, description: e.description ? plain(e.description) : null }));
  const skills = Object.fromEntries(Object.entries(content.skills || {}).filter(([, v]) => list(v).length));
  const recognition = list(content.recognition);
  const education = list(content.education).map((e) => compact({ school: e.school, field: e.field, years: e.years }));
  const clients = list(content.clients);

  const statement = readingStatement(S, { projects: projects.length, writing: writing.length });
  const training = trainingStatement(S);
  const trainNo = S.contentSignal?.aiTrain === "no";

  const g = S.guestbook;
  // "Guest book" reads as a phrase; any other name is quoted as written
  const called = /^guest ?book$/i.test(g.name) ? "" : `, called “${g.name}”`;
  const pageUrl = `${SITE}${S.paths.page}`;
  const links = compact({
    site: SITE,
    ...Object.fromEntries(Object.entries(person.links).map(([k, u]) => [k.toLowerCase().replace(/[^a-z0-9]+/g, "-"), u])),
    email: person.email && `mailto:${person.email}`,
    contactForm: abs(S.contact.form),
    agentView: pageUrl,
    guestbook: guestbookOpen ? `${pageUrl}#guestbook` : null,
    llms: `${SITE}/llms.txt`,
    // "no-ai" publishes llms.txt alone
    llmsFull: noAi ? null : `${SITE}/llms-full.txt`,
    profile: noAi ? null : `${SITE}/profile.json`,
  });

  /* ── /profile.json ─────────────────────────────────────────────────────── */

  const fields = () => ({
    agent: `required · the agent's name, e.g. "Claude"`,
    purpose: `required · one of: ${Object.keys(g.purposes).join(", ")}`,
    used: `optional · any of: ${Object.keys(g.uses).join(", ")}`,
    note: `optional · up to ${g.noteMax} characters`,
    on_behalf_of: "optional · who the agent works for; never shown publicly",
    visibility: `optional · public (the default; shown once ${S.owner.short} has read it) or private (only ${S.owner.short} sees it)`,
  });

  function profile() {
    return compact({
      name: person.name,
      summary: person.summary,
      location: person.location,
      language: S.lang,
      current: person.role || person.organization ? compact({ role: person.role, organization: person.organization, since: person.since }) : null,
      availability: S.availability,
      contact: compact({ email: person.email, form: abs(S.contact.form), preferred: S.contact.preferred, note: S.contact.note }),
      readingPreference: compact({ choice: reading, statement, training: S.contentSignal?.aiTrain || null, trainingStatement: training, robots: `${SITE}/robots.txt` }),
      links,
      otherLanguages: S.otherLanguages,
      about: person.about,
      work: work.map(({ caseStudy, ...w }) => compact(w)),
      projects,
      writing,
      sections: extraSections,
      experience,
      skills,
      recognition,
      education,
      clients,
      guestbook: guestbookOpen
        ? {
            name: g.name,
            about: "Agents can sign on their way out: what they came for, what they used, and a note. Signing is optional. An entry speaks for the person an agent works for.",
            form: `${pageUrl}#guestbook`,
            endpoint: `${SITE}/api/guestbook`,
            method: "POST",
            accepts: ["application/json", "application/x-www-form-urlencoded"],
            fields: fields(),
            reply: "includes a receipt link for the entry",
          }
        : null,
      updated,
    });
  }

  /* ── /work/<slug>.md ───────────────────────────────────────────────────── */

  /** Images the case study text already shows (markdown image syntax). */
  function embedded(w) {
    return [...new Set([...String(w.caseStudy || "").matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)/g)].map((m) => m[1]))];
  }

  function workMarkdown(w) {
    // the media the case study doesn't already show, so nothing is listed twice
    const shown = new Set(embedded(w));
    const rest = w.media.filter((m) => !shown.has(m));
    const video = rest.some((m) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(m));
    const facts = [
      w.year && `- Year: ${w.year}`,
      w.disciplines.length && `- Disciplines: ${w.disciplines.join(", ")}`,
      ...w.roles.map((r) => `- Role: ${r}`),
      ...w.credits.map((cr) => `- ${cr}`),
      w.url && `- ${reading === "files-first" ? "Page (for people)" : "Page"}: ${w.url}`,
      `- By: ${person.name} (${SITE})`,
    ].filter(Boolean);
    return (
      [
        `# ${w.title}`,
        w.summary && `> ${w.summary}`,
        facts.join("\n"),
        w.caseStudy || (w.media.length ? "No written case study yet. The images below are what the site shows for now." : "No written case study yet."),
        rest.length && `## ${video ? "Images and video" : "Images"}\n\n${rest.map((m) => `- ${m}`).join("\n")}`,
        `---\n\nFrom the site of ${person.name}. Everything in one file: ${links.llmsFull} · Updated ${updated}`,
      ]
        .filter(Boolean)
        .join("\n\n") + "\n"
    );
  }

  /* ── /llms.txt and /llms-full.txt ──────────────────────────────────────── */

  /** The guest book in llms.txt: link items only (llmstxt.org). */
  function guestbookLinks() {
    if (!guestbookOpen) return null;
    // "no-ai" has no profile.json or llms-full.txt, so the fields go here
    const fieldsAt = noAi
      ? `with agent (the agent's name), purpose (one of: ${Object.keys(g.purposes).join(", ")}) and, optionally, used (any of: ${Object.keys(g.uses).join(", ")}), a note of up to ${g.noteMax} characters, on_behalf_of (never shown publicly) and visibility (public or private)`
      : "the fields are listed in profile.json and llms-full.txt";
    return [
      `## ${g.name}`,
      [
        `- [Form](${linkUrl(`${pageUrl}#guestbook`)}): a form for signing this site's guest book for agents${called ? `${called},` : ""} in a browser. ${noAi ? `It counts the AI tools that came anyway. ` : ""}Signing is optional`,
        `- [API](${linkUrl(`${SITE}/api/guestbook`)}): takes a POST of JSON or a form ${fieldsAt}; the reply includes a receipt link`,
      ].join("\n"),
    ].join("\n\n");
  }

  /** The guest book in llms-full.txt, described as facts. */
  function guestbookMd() {
    if (!guestbookOpen) return null;
    const opts = (o) => Object.entries(o).map(([k, label]) => `    - ${k}: ${label}`).join("\n");
    return [
      `## ${g.name}`,
      `This site keeps a guest book for agents${called}.${noAi ? ` It's how ${S.owner.short} sees which AI tools came anyway.` : ""} Signing is optional and takes one request. An entry speaks for the person an agent works for.`,
      [
        `- Form: ${pageUrl}#guestbook`,
        `- API: POST ${SITE}/api/guestbook, as JSON or as a form, with:`,
        `  - agent (required): the agent's name, e.g. "Claude"`,
        `  - purpose (required), one of:\n${opts(g.purposes)}`,
        `  - used (optional, a list), any of:\n${opts(g.uses)}`,
        `  - note (optional): up to ${g.noteMax} characters`,
        `  - on_behalf_of (optional): who the agent works for; never shown publicly`,
        `  - visibility (optional): public (the default; shown once ${S.owner.short} has read it) or private (only ${S.owner.short} sees it)`,
        `- The reply includes a receipt link for the entry.`,
        `- Visits from known agents are counted by the name their software gives (not verified). Notes left by other agents are never included in these files.`,
      ].join("\n"),
    ].join("\n\n");
  }

  function contactLine() {
    const ways = [person.email, links.contactForm && `the form at ${links.contactForm}`].filter(Boolean);
    if (!ways.length && !S.contact.note) return null;
    const best = ways.length > 1 && S.contact.preferred ? ` (${S.contact.preferred} is best)` : "";
    return `- Contact: ${[ways.join(" or ") + best, S.contact.note].filter(Boolean).join(". ")}`;
  }

  function header({ full = false } = {}) {
    const elsewhere = Object.entries(person.links).map(([k, u]) => `[${linkText(k)}](${linkUrl(u)})`).join(" · ");
    const languages = Object.entries(S.otherLanguages || {}).map(([k, u]) => `[${linkText(k)}](${linkUrl(abs(u))})`).join(" · ");
    return [
      `# ${person.name}`,
      person.summary && `> ${person.summary}`,
      [
        `- Reading preference: ${statement}`,
        // "no-ai" already says "train on" in the reading preference
        !noAi && training && `- AI training: ${training}`,
        S.availability && `- Availability: ${S.availability}`,
        contactLine(),
        elsewhere && `- Elsewhere: ${elsewhere}`,
        languages && `- Other languages: ${languages}`,
        links.profile && `- Structured profile (JSON): [profile.json](${links.profile})`,
        !full && links.llmsFull && `- Everything in one file: [llms-full.txt](${links.llmsFull})${work.length ? ", case studies included" : ""}`,
        !full && work.length && `- Case studies: each ${S.sections.work} link below is the full case study as markdown`,
        `- This summary for people: ${pageUrl}`,
        `- Updated: ${updated}`,
      ]
        .filter(Boolean)
        .join("\n"),
    ];
  }

  const workLine = (w) => {
    const meta = [w.year, w.disciplines.join(", "), w.roles.join("; ")].filter(Boolean).join(" · ");
    const notes = [meta, w.summary].filter(Boolean).join(". ");
    return `- [${linkText(w.title)}](${linkUrl(w.markdown)})${notes ? `: ${notes}` : ""}`;
  };
  const linkLine = (x) => `- [${linkText(x.title)}](${linkUrl(x.url || SITE)})${x.summary ? `: ${x.summary}` : ""}`;
  const section = (title, items, line, intro) => (items.length ? `## ${title}\n\n${intro ? `${intro}\n\n` : ""}${items.map(line).join("\n")}` : null);

  function llmsTxt() {
    return (
      [
        ...header(),
        section(S.sections.work, work, workLine),
        section(S.sections.projects, projects, linkLine),
        section(S.sections.writing, writing, linkLine),
        ...extraSections.map((s) => section(s.title, s.items, linkLine)),
        guestbookLinks(),
      ]
        .filter(Boolean)
        .join("\n\n") + "\n"
    );
  }

  function llmsFull() {
    return (
      [
        ...header({ full: true }),
        person.aboutMd.length && `## About\n\n${person.aboutMd.join("\n\n")}`,
        section("Experience", experience, (e) => `### ${[e.role, e.organization].filter(Boolean).join(", ")}\n${[e.place, e.dates].filter(Boolean).join(" · ")}${e.description ? `\n\n${e.description}` : ""}`),
        Object.keys(skills).length && `## Skills\n\n${Object.entries(skills).map(([k, v]) => `- ${k}: ${v.join(", ")}`).join("\n")}`,
        section("Recognition", recognition, (r) => `- ${r}`),
        section("Education", education, (e) => `- ${[e.school, e.field].filter(Boolean).join(", ")}${e.years ? ` (${e.years})` : ""}`),
        clients.length && `## Clients\n\n${clients.join(", ")}`,
        section(S.sections.projects, projects, linkLine),
        section(S.sections.writing, writing, linkLine),
        ...extraSections.map((s) => section(s.title, s.items, linkLine)),
        work.length &&
          `## ${S.sections.work}\n\n${work
            .map((w) => workMarkdown(w).trim().replace(/^# /, "### ").replace(/\n## /g, "\n#### ").replace(/\n---\n\nFrom the site of[^\n]*$/, ""))
            .join("\n\n---\n\n")}`,
        guestbookMd(),
      ]
        .filter(Boolean)
        .join("\n\n") + "\n"
    );
  }

  /* ── Head tags: alternate links and schema.org JSON-LD ─────────────────── */

  function jsonLd() {
    const id = `${SITE}/#person`;
    return {
      "@context": "https://schema.org",
      "@graph": [
        compact({
          "@type": "Person",
          "@id": id,
          name: person.name,
          url: SITE,
          image: person.image,
          description: person.summary,
          jobTitle: person.role,
          worksFor: person.organization ? { "@type": "Organization", name: person.organization } : null,
          homeLocation: person.location ? { "@type": "Place", name: person.location } : null,
          email: person.email && `mailto:${person.email}`,
          sameAs: Object.values(person.links),
          knowsAbout: [...new Set(work.flatMap((w) => w.disciplines))],
          alumniOf: education.filter((e) => e.school).map((e) => ({ "@type": "EducationalOrganization", name: e.school })),
          award: recognition,
        }),
        { "@type": "WebSite", "@id": `${SITE}/#website`, url: SITE, name: person.name, inLanguage: S.lang, author: { "@id": id } },
        work.length
          ? {
              "@type": "ItemList",
              name: `Selected ${S.sections.work.toLowerCase()}`,
              itemListElement: work.map((w, i) => ({
                "@type": "ListItem",
                position: i + 1,
                item: compact({
                  "@type": "CreativeWork",
                  name: w.title,
                  description: w.summary,
                  dateCreated: w.year,
                  genre: w.disciplines,
                  creator: { "@id": id },
                  url: w.url || w.markdown,
                  image: w.media.find((m) => !/\.(mp4|webm|mov)(\?|$)/i.test(m)),
                }),
              })),
            }
          : null,
      ].filter(Boolean),
    };
  }

  /** Tags for <head>. Alternates go on every page; JSON-LD on the homepage
   *  (and the agent page, which adds it itself); `work: slug` adds the
   *  markdown twin on that project's page. Safe to inline: "<" is escaped
   *  inside the JSON so nothing can close the script tag early. */
  function headTags({ jsonLd: withLd = false, work: slug = null } = {}) {
    const w = slug ? work.find((x) => x.slug === slug) : null;
    return [
      // "no-ai" doesn't point agents at the files: it asks them not to come.
      !noAi && `<link rel="describedby" href="/llms.txt">`,
      !noAi && `<link rel="alternate" type="text/plain" href="/llms.txt" title="Agent-readable summary (llms.txt)">`,
      !noAi && `<link rel="alternate" type="application/json" href="/profile.json" title="Profile as structured data">`,
      !noAi && w && `<link rel="alternate" type="text/markdown" href="${S.paths.work}/${w.slug}.md" title="This case study as markdown">`,
      // Bing's page-level AI preferences (Copilot answers come from Bingbot)
      trainNo && `<meta name="bingbot" content="ai-training:disallow">`,
      noAi && `<meta name="bingbot" content="ai-grounding:disallow">`,
      // W3C TDMRep: text and data mining rights reserved (with tdmrep())
      trainNo && `<meta name="tdm-reservation" content="1">`,
      withLd && `<script type="application/ld+json">${JSON.stringify(jsonLd()).replace(/</g, "\\u003c")}</script>`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  /** The robots.txt lines for the reading choice. Every group carries the
   *  same Content-Signal line, because a crawler obeys only the groups that
   *  name it (references/reading.md).
   *    anything     everyone may read everything
   *    files-first  AI crawlers: the agent files, /agents and the exact images
   *                 and video the files list; not the pages. Agents a person
   *                 sent (kind "user-fetch") may also open the homepage, which
   *                 points to the files. Everyone else: everything.
   *    no-ai        AI crawlers: nothing, the community list included.
   *                 Everyone else (search): everything.
   *  A "no" to training puts the training crawlers in a group of their own,
   *  kept out of everything, in every mode, with the community list's
   *  training names, the shared opt-out token and Cloudflare's policy text.
   *  `skip`: tokens the person's own robots.txt already keeps out completely
   *  (robotsFile() finds them), left out so nothing here loosens that. "*"
   *  in `skip` means their file keeps everyone out: then no AI crawler is
   *  named in a group with Allow lines, so those stay under that rule. Groups
   *  that only say "Disallow: /" (No AI, training, the community list) are
   *  still written: naming a crawler there can only keep it out more. */
  function robots({ skip = [], alone = false } = {}) {
    const cs = S.contentSignal;
    const pairs = [
      ["search", cs.search],
      ["ai-input", cs.aiInput],
      ["ai-train", cs.aiTrain],
    ].filter(([, v]) => v === "yes" || v === "no");
    const signal = pairs.length ? `Content-Signal: ${pairs.map(([k, v]) => `${k}=${v}`).join(", ")}` : null;
    const s = S.owner.short;
    const skipped = new Set(skip.map((t) => t.toLowerCase()));
    const starKept = skipped.has("*");
    const lower = (t) => t.toLowerCase();
    const tokens = AI_CRAWLERS.filter((x) => !skipped.has(lower(x.token)));
    const trainers = trainNo ? tokens.filter((x) => x.kind === "training") : [];
    // with "*" kept, crawlers that would get Allow lines stay under that rule
    const readers = starKept && !noAi ? [] : tokens.filter((x) => !trainers.includes(x));

    // the community list, for "no-ai" and a "no" to training, minus any name
    // already covered (robots.txt names are matched without case)
    const seen = new Set(AI_CRAWLERS.map((x) => lower(x.token)));
    const community = AI_ROBOTS_TXT.names
      .filter((n) => noAi || (trainNo && n.kind === "training"))
      .map((n) => n.token)
      .filter((t) => !skipped.has(lower(t)) && !seen.has(lower(t)) && seen.add(lower(t)));

    const pointer = [
      {
        anything: `# ${s} is happy for AI agents and tools to read the site's pages and these files:\n# ${SITE}/llms.txt, ${SITE}/llms-full.txt and ${SITE}/profile.json\n# (shown to people at ${pageUrl}).`,
        "files-first": `# ${s} asks that AI agents and tools read these files rather than the site's pages:\n# ${SITE}/llms.txt, ${SITE}/llms-full.txt and ${SITE}/profile.json\n# (shown to people at ${pageUrl}). Search engines may read every page the site's own rules allow.`,
        "no-ai": `# ${s} asks that AI agents and tools not read, use or train on this site.${alone ? "" : `\n# What an agent would find here is shown to people at ${pageUrl}`}`,
      }[reading],
      trainNo && !noAi && `# ${s} asks that this site not be used to train AI models.`,
      trainNo && `# The reservation below is Cloudflare's Content Signals Policy (CC0),\n# quoted as published. A stated reservation, not a lock.\n\n${CONTENT_SIGNALS_POLICY}`,
    ]
      .filter(Boolean)
      .join("\n");

    // The exact images and video the files list (the portrait too), so an
    // agent reading a case study can open its pictures, and nothing else:
    // a pattern like /*.jpg$ would also reach locked or NDA work's images.
    // "$" ends the match; a listed query string is kept as it is.
    const media = [
      ...new Set(
        [person.image, ...work.flatMap((w) => [...w.media, ...embedded(w)])]
          .filter((u) => u && u.startsWith(`${SITE}/`))
          .map((u) => {
            const x = new URL(u);
            return `${x.pathname}${x.search}`.replace(/\*/g, "%2A").replace(/\$/g, "%24");
          }),
      ),
    ].sort();
    const ai = {
      anything: null,
      "files-first": [
        "Allow: /llms.txt",
        "Allow: /llms-full.txt",
        "Allow: /profile.json",
        work.length && `Allow: ${S.paths.work}/*.md$`,
        `Allow: ${S.paths.page}`,
        // the guest book the files describe, so agents that follow
        // robots.txt can sign it and open their receipt
        guestbookOpen && "Allow: /api/guestbook",
        guestbookOpen && "Allow: /guestbook/",
        ...media.map((m) => `Allow: ${m}$`),
        "Disallow: /",
      ].filter(Boolean),
      "no-ai": ["Disallow: /"],
    }[reading];
    // files first: an agent a person sent may also land on the homepage,
    // which points to the files ("/$" is the homepage only)
    const sent = reading === "files-first" ? readers.filter((x) => x.kind === "user-fetch") : [];
    const crawlers = readers.filter((x) => !sent.includes(x));

    // crawlers the person already keeps out by name get the signal alone:
    // groups that name the same crawler are combined, so their own rule
    // still applies
    const keptAi = AI_CRAWLERS.filter((x) => skipped.has(lower(x.token))).map((x) => x.token);
    const groups = [
      signal && keptAi.length && { agents: keptAi, rules: [signal] },
      trainers.length && { agents: trainers.map((x) => x.token), rules: ["Disallow: /", signal].filter(Boolean) },
      ai && sent.length && { agents: sent.map((x) => x.token), rules: [...ai.slice(0, -1), "Allow: /$", ...ai.slice(-1), signal].filter(Boolean) },
      ai && crawlers.length && { agents: crawlers.map((x) => x.token), rules: [...ai, signal].filter(Boolean) },
      community.length && {
        comment: `# More AI crawlers, from the community list ai.robots.txt\n# (${AI_ROBOTS_TXT.source}, MIT licence), taken ${AI_ROBOTS_TXT.taken}`,
        agents: community,
        rules: ["Disallow: /", signal].filter(Boolean),
      },
      trainNo && { agents: [TRAINING_TOKEN], rules: ["Disallow: /"] },
      { agents: ["*"], rules: [starKept ? null : "Allow: /", signal].filter(Boolean) },
    ].filter((x) => x && x.rules.length);
    const text = [pointer, ...groups.map((grp) => [grp.comment, ...grp.agents.map((a) => `User-agent: ${a}`), ...grp.rules].filter(Boolean).join("\n"))].join("\n\n");
    return { signal, pointer, groups, text };
  }

  /** A whole robots.txt: the person's own file with the door-policy block
   *  (between "# door-policy:robots" and "# /door-policy:robots") written in,
   *  or added at the end. Everything outside the markers is kept. A block
   *  from before the rename ("# agent-view:robots") is replaced the same way.
   *  A crawler the person's own rules already keep out completely
   *  ("Disallow: /", "/*" or "/*$", with at most the homepage allowed) is left
   *  out of the block (RFC 9309 combines groups that name the same crawler,
   *  so naming it again would loosen their rule); `kept` lists them. If their
   *  file keeps every crawler out that way, no AI crawler is given an Allow
   *  line, so that rule keeps covering every one. The warnings also name any
   *  Allow line of theirs that the reading or training choice would refuse:
   *  the block can't override it, so it has to change in their own rules. */
  function robotsFile(existing = "", { alone = false } = {}) {
    const src = String(existing || "").replace(/\r\n?/g, "\n");
    const re = /^# (?:door-policy|agent-view):robots[^\n]*\n[\s\S]*?^# \/(?:door-policy|agent-view):robots[^\n]*(?:\n|$)/m;
    const outside = src.replace(re, "");
    const byAgent = new Map();
    for (const grp of parseRobots(outside)) for (const a of grp.agents) byAgent.set(a.toLowerCase(), [...(byAgent.get(a.toLowerCase()) || []), ...grp.rules]);
    // "/", "/*" and "/*$" all match every path; "/$" is the homepage alone
    const everything = (v) => /^\/(\*\$?)?$/.test(v);
    const fullyBlocked = (rules) => rules.some((r) => r.key === "disallow" && everything(r.value)) && !rules.some((r) => r.key === "allow" && r.value && r.value !== "/$");
    const homeAllowed = (rules) => rules.some((r) => r.key === "allow" && r.value === "/$");
    const kept = [...AI_CRAWLERS.map((x) => x.token), "*"].filter((t) => byAgent.has(t.toLowerCase()) && fullyBlocked(byAgent.get(t.toLowerCase())));
    const warnings = kept.map((t) => {
      const home = homeAllowed(byAgent.get(t.toLowerCase())) ? " except the homepage" : "";
      return t === "*"
        ? `robots.txt already keeps every crawler out${home}. That rule is kept: no AI crawler is given an Allow line in the block, so nothing there loosens it${reading === "no-ai" ? "." : `. It's stricter than "${reading}". To let AI crawlers read ${reading === "anything" ? "the site" : "the files"}, change that rule first.`}`
        : `robots.txt already blocks ${t}${home ? `${home}` : " completely"}. That rule is kept; ${t} gets only the Content-Signal line in the block.`;
    });
    // their Allow lines for a crawler the block keeps out of that path: the
    // groups are combined and the longer (or equal) Allow wins, so the block
    // can't override them
    const why = (token) => (trainNo && (AI_CRAWLERS.find((x) => x.token === token)?.kind === "training" || token === TRAINING_TOKEN || AI_ROBOTS_TXT.names.some((n) => n.token === token && n.kind === "training")) ? "the no to training" : `"${reading}"`);
    const plain = robots({ alone: alone && noAi });
    for (const grp of plain.groups) {
      if (!grp.rules.includes("Disallow: /")) continue;
      const offered = new Set(grp.rules.filter((r) => r.startsWith("Allow: ")).map((r) => r.slice(7)));
      for (const t of grp.agents) {
        const theirs = (byAgent.get(t.toLowerCase()) || []).filter((r) => r.key === "allow" && r.value && !offered.has(r.value)).map((r) => r.value);
        if (theirs.length) warnings.push(`robots.txt already lets ${t} read ${theirs.join(", ")} (${theirs.map((v) => `"Allow: ${v}"`).join(", ")}, outside the block). Groups for the same crawler are combined, so ${why(t)} can't override ${theirs.length > 1 ? "those lines" : "that line"}: remove ${theirs.length > 1 ? "them" : "it"} if ${t} should stay out.`);
      }
    }
    const block = `# door-policy:robots (generated by door-policy/build.mjs; edit config.mjs, not these lines)\n${robots({ skip: kept, alone: alone && noAi }).text}\n# /door-policy:robots\n`;
    const text = re.test(src) ? src.replace(re, () => block) : src.trim() ? `${src.replace(/\n*$/, "")}\n\n${block}` : block;
    return { text, kept: kept.filter((t) => t !== "*"), warnings };
  }

  /** /.well-known/tdmrep.json (W3C TDMRep): text and data mining rights
   *  reserved for the whole site, for a "no" to training and for "no-ai".
   *  null otherwise. A stated reservation, not a lock. */
  function tdmrep() {
    return trainNo ? `${JSON.stringify([{ location: "/", "tdm-reservation": 1 }], null, 2)}\n` : null;
  }

  /** Every agent file, ready to write or serve. "no-ai": llms.txt alone. */
  function files() {
    if (noAi) return [{ path: "/llms.txt", type: "text/plain; charset=utf-8", body: llmsTxt() }];
    return [
      { path: "/llms.txt", type: "text/plain; charset=utf-8", body: llmsTxt() },
      { path: "/llms-full.txt", type: "text/plain; charset=utf-8", body: llmsFull() },
      { path: "/profile.json", type: "application/json; charset=utf-8", body: JSON.stringify(profile(), null, 2) + "\n" },
      ...work.map((w) => ({ path: `${S.paths.work}/${w.slug}.md`, type: "text/markdown; charset=utf-8", body: workMarkdown(w) })),
    ];
  }

  return { settings: S, reading, statement, training, person, work, projects, writing, sections: extraSections, links, updated, guestbookOpen, llmsTxt, llmsFull, profile, workMarkdown, jsonLd, headTags, robots, robotsFile, tdmrep, files };
}
