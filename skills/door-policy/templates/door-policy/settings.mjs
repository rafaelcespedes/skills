// ─────────────────────────────────────────────────────────────────────────────
// config.mjs with defaults filled in, so a deleted line never breaks the build
// or the guest book. Everything else in this folder reads `settings` from here.
// Don't edit this file: change config.mjs.
// ─────────────────────────────────────────────────────────────────────────────

import config from "./config.mjs";
import { readingStatement, trainingStatement } from "./core.mjs";

const PURPOSES = {
  answering: "Answering someone's question",
  hiring: "Research for hiring or a project",
  comparing: "Comparing people or options",
  reference: "Looking for references or inspiration",
  training: "Collecting data for AI training",
  other: "Something else",
};
const USES = {
  overview: "The overview",
  "case-studies": "Case studies",
  images: "Images or video",
  writing: "Writing",
  profile: "Profile data",
  nothing: "Nothing, just looking",
};
const COLORS = {
  dark: { bg: "#0C0C0C", surface: "#131313", fg: "rgba(255,255,255,.9)", muted: "rgba(255,255,255,.65)", dim: "rgba(255,255,255,.4)", line: "rgba(255,255,255,.1)" },
  light: { bg: "#FFFFFF", surface: "#F6F6F6", fg: "rgba(0,0,0,.88)", muted: "rgba(0,0,0,.64)", dim: "rgba(0,0,0,.4)", line: "rgba(0,0,0,.1)" },
};
const READING = ["anything", "files-first", "no-ai"];
const KEY = /^[a-z0-9][a-z0-9-]{0,19}$/; // what agents send for purpose/used
const PATH = /^\/[a-z0-9/_-]*[a-z0-9_-]$/i;
const LANG = /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i; // BCP 47-looking: "en", "es", "pt-BR"
const HEADER = /^[a-z0-9-]+$/i;

const fail = (msg) => {
  throw new Error(`door-policy config: ${msg}`);
};

export function withDefaults(c = {}) {
  const site = String(c.site || "").replace(/\/+$/, "");
  if (!/^https?:\/\/[^/\s]+$/.test(site)) fail(`\`site\` must be the site's address, like "https://example.com" (got "${c.site}").`);

  const owner = { name: "", short: "", timeZone: "UTC", ...c.owner };
  owner.short ||= String(owner.name).trim().split(/\s+/)[0] || "the owner";
  owner.possessive ||= `${owner.short}'s`;

  const paths = { page: "/agents", work: "/work", ...c.paths };
  // where the case-study pages people see live, for markdown negotiation
  // (negotiate.mjs): the same folder as the markdown unless it says otherwise
  paths.workPages ||= paths.work;
  for (const [k, v] of Object.entries(paths)) if (!PATH.test(v)) fail(`\`paths.${k}\` must look like "/agents" (got "${v}").`);

  const reading = c.reading ?? "files-first";
  if (!READING.includes(reading)) fail(`\`reading\` must be "anything", "files-first" or "no-ai" (got "${c.reading}").`);

  const gb = {
    name: "Guest book",
    noteMax: 600,
    perVisitorPerDay: 5,
    perDay: 300,
    // where the host puts the visitor's real address: Vercel sets
    // x-forwarded-for itself; Cloudflare: "cf-connecting-ip"; Netlify:
    // "x-nf-client-connection-ip" (references/deploy.md § Other hosts)
    ipHeader: "x-forwarded-for",
    ...c.guestbook,
    purposes: { ...(c.guestbook?.purposes || PURPOSES) },
    // "no-ai" offers only llms.txt, so the default list becomes only what it
    // offers (a list the site changed is kept as written)
    uses: { ...(reading === "no-ai" && (!c.guestbook?.uses || JSON.stringify(c.guestbook.uses) === JSON.stringify(USES)) ? { overview: USES.overview, nothing: USES.nothing } : c.guestbook?.uses || USES) },
  };
  // on unless config.mjs says otherwise; with "no-ai", off unless asked for
  gb.enabled = c.guestbook?.enabled ?? reading !== "no-ai";
  gb.enabledByDefault = c.guestbook?.enabled === undefined;
  if (!HEADER.test(gb.ipHeader)) fail(`\`guestbook.ipHeader\` must be a header name like "x-forwarded-for" (got "${gb.ipHeader}").`);
  gb.ipHeader = gb.ipHeader.toLowerCase();
  for (const k of [...Object.keys(gb.purposes), ...Object.keys(gb.uses)]) {
    if (!KEY.test(k)) fail(`guest book choice "${k}" must be lowercase letters, digits and dashes.`);
  }

  // The content signals that go with the reading choice. AI answers follow
  // from it (yes, except in "no-ai"), so no combination can contradict it;
  // "no-ai" also always means no training. Search stays yes unless the
  // person asked for no. Anything other than "yes", "no" or null says nothing.
  const sig = (v) => (v === "yes" || v === "no" ? v : null);
  const contentSignal = {
    search: c.contentSignal?.search === undefined ? "yes" : sig(c.contentSignal.search),
    aiInput: reading === "no-ai" ? "no" : "yes",
    aiTrain: reading === "no-ai" ? "no" : sig(c.contentSignal?.aiTrain),
  };

  const lang = c.lang || "en";
  if (!LANG.test(lang)) fail(`\`lang\` must be a language tag like "en", "es" or "pt-BR" (got "${c.lang}").`);
  const otherLanguages = { ...c.otherLanguages };
  for (const [k, v] of Object.entries(otherLanguages)) if (!LANG.test(k) || !/^(https?:\/\/|\/)/.test(String(v))) fail(`\`otherLanguages\` maps a language tag to an address, like { es: "/es/" } (got ${k}: "${v}").`);

  const page = c.page || {};
  const s = owner.short;
  // the same words as the files (core.mjs readingStatement), for people
  const wish = readingStatement({ owner, reading, contentSignal }).replace(/ The files hold[\s\S]*$| For an agent that comes anyway[\s\S]*$/, "");
  // "no-ai" already says "train on" in the wish
  const train = reading === "no-ai" ? null : trainingStatement({ owner, contentSignal });
  const why = "More and more, people send an agent to read the web for them. Agents can click through a site built for eyes, but most of it reaches them as layout noise. So this site also hands them the same work as plain text and data.";
  const pageDefaults = {
    anything: {
      title: "This is the version of this site that AI agents read.",
      intro: [why, [wish, train].filter(Boolean).join(" "), "None of it is hidden. Below is exactly what an agent gets."],
    },
    "files-first": {
      title: "This is the version of this site that AI agents read.",
      intro: [why, [wish, "It's a stated wish, not a lock.", train].filter(Boolean).join(" "), "None of it is hidden. Below is exactly what an agent gets."],
    },
    "no-ai": {
      title: "About AI on this site",
      intro: [
        [wish, "It's a stated wish, not a lock."].join(" "),
        "None of it is hidden. Below is exactly what an agent finds if it comes anyway: who this is, how to get in touch, and that request.",
      ],
    },
  }[reading];
  const theme = { default: "system", attribute: "data-theme", storageKey: "", toggle: false, ...page.theme };
  if (theme.attribute && !/^(class|data-[a-z-]+)$/.test(theme.attribute)) fail('`page.theme.attribute` must be "class", a "data-…" attribute, or "".');
  if (theme.toggle && !theme.storageKey) theme.storageKey = "theme";

  return {
    site,
    owner,
    lang,
    otherLanguages,
    availability: c.availability || "",
    contact: { preferred: "email", form: "", note: "", ...c.contact },
    exclude: [...(c.exclude || [])],
    paths,
    sections: { work: "Work", projects: "Side projects", writing: "Writing", ...c.sections },
    reading,
    contentSignal,
    guestbook: gb,
    page: {
      width: "960px",
      ...pageDefaults,
      ...page,
      home: { href: "/", label: "", image: "", ...page.home },
      font: {
        family: '"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace',
        href: "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400&display=swap",
        ...page.font,
      },
      theme,
      colors: { dark: { ...COLORS.dark, ...page.colors?.dark }, light: { ...COLORS.light, ...page.colors?.light } },
    },
  };
}

export const settings = withDefaults(config);
