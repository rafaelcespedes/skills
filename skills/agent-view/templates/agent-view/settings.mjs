// ─────────────────────────────────────────────────────────────────────────────
// config.mjs with defaults filled in, so a deleted line never breaks the build
// or the guest book. Everything else in this folder reads `settings` from here.
// Don't edit this file: change config.mjs.
// ─────────────────────────────────────────────────────────────────────────────

import config from "./config.mjs";

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
const KEY = /^[a-z0-9][a-z0-9-]{0,19}$/; // what agents send for purpose/used
const PATH = /^\/[a-z0-9/_-]*[a-z0-9_-]$/i;

const fail = (msg) => {
  throw new Error(`agent-view config: ${msg}`);
};

export function withDefaults(c = {}) {
  const site = String(c.site || "").replace(/\/+$/, "");
  if (!/^https?:\/\/[^/\s]+$/.test(site)) fail(`\`site\` must be the site's address, like "https://example.com" (got "${c.site}").`);

  const owner = { name: "", short: "", timeZone: "UTC", ...c.owner };
  owner.short ||= String(owner.name).trim().split(/\s+/)[0] || "the owner";
  owner.possessive ||= `${owner.short}'s`;

  const paths = { page: "/agents", work: "/work", ...c.paths };
  for (const [k, v] of Object.entries(paths)) if (!PATH.test(v)) fail(`\`paths.${k}\` must look like "/agents" (got "${v}").`);

  const gb = {
    enabled: true,
    name: "Guest book",
    noteMax: 600,
    perVisitorPerDay: 5,
    perDay: 300,
    ...c.guestbook,
    purposes: { ...(c.guestbook?.purposes || PURPOSES) },
    uses: { ...(c.guestbook?.uses || USES) },
  };
  for (const k of [...Object.keys(gb.purposes), ...Object.keys(gb.uses)]) {
    if (!KEY.test(k)) fail(`guest book choice "${k}" must be lowercase letters, digits and dashes.`);
  }

  const page = c.page || {};
  const theme = { default: "system", attribute: "data-theme", storageKey: "", toggle: false, ...page.theme };
  if (theme.attribute && !/^(class|data-[a-z-]+)$/.test(theme.attribute)) fail('`page.theme.attribute` must be "class", a "data-…" attribute, or "".');
  if (theme.toggle && !theme.storageKey) theme.storageKey = "theme";

  return {
    site,
    owner,
    availability: c.availability || "",
    contact: { preferred: "email", form: "", note: "", ...c.contact },
    exclude: [...(c.exclude || [])],
    paths,
    sections: { work: "Work", projects: "Side projects", writing: "Writing", ...c.sections },
    contentSignal: { search: "yes", aiInput: "yes", aiTrain: null, ...c.contentSignal },
    guestbook: gb,
    page: {
      title: "This is the version of this site that AI agents read.",
      width: "960px",
      intro: [
        "More and more, people send an agent to read the web for them. Agents can click through a site built for eyes, but most of it reaches them as layout noise. So this site also hands them the same work as plain text and data.",
        "None of it is hidden. Below is exactly what an agent gets.",
      ],
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
