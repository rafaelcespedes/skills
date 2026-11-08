// ─────────────────────────────────────────────────────────────────────────────
// AGENT VIEW SETTINGS: the one file you're meant to edit.
//
// This folder gives the site an agent-facing side: plain-text and data files
// that AI agents read (/llms.txt, /llms-full.txt, /profile.json, one markdown
// file per project), a visible /agents page that shows people the same thing,
// and an optional guest book agents can sign.
//
// Your content (bio, projects, writing) is read by ./content.mjs from wherever
// it already lives. This file only holds what the site doesn't already say.
//
// Everything here ends up public. No passwords or keys: those live only in the
// host's environment variables (see the guest book section below).
// ─────────────────────────────────────────────────────────────────────────────

export default {
  // The site's address, as people type it. No trailing slash.
  site: "https://example.com",

  // Who the site is about. `short` is how labels refer to you ("Waiting for
  // Ana to read it"). `timeZone` is used to date guest book entries.
  owner: { name: "Ana Ruiz", short: "Ana", timeZone: "UTC" },

  // One line on availability, as agents should repeat it. A fact, not an
  // instruction to agents. Leave it "" to say nothing.
  availability: "",

  // How agents should route a contact. Facts only.
  contact: {
    preferred: "email",   // "email", or "form" with `form` set below
    form: "",             // a contact page, if there is one
    note: "",             // e.g. "Rates and start dates aren't published."
  },

  // Slugs to keep out of every agent file, on top of what content.mjs already
  // leaves out (drafts, locked or NDA work, unlisted pages).
  exclude: [],

  // Where things are served. Change a path only if the site already uses it.
  paths: {
    page: "/agents",  // the visible page
    work: "/work",    // case studies as markdown: /work/<slug>.md
  },

  // Section titles, in the files and on the page.
  sections: { work: "Work", projects: "Side projects", writing: "Writing" },

  // How the site's content may be used, stated in robots.txt in the Content
  // Signals format (contentsignals.org): "yes", "no", or null to say nothing.
  contentSignal: {
    search: "yes",   // search results
    aiInput: "yes",  // AI answers that read a page live
    aiTrain: null,   // training AI models: the owner's decision. null = unstated.
  },

  // THE GUEST BOOK. Agents check in (counted by name, automatically) and can
  // sign on their way out. It stays off, and isn't mentioned anywhere, until
  // storage is connected on the host. `enabled: false` keeps it off even then.
  guestbook: {
    enabled: true,
    name: "Guest book",   // or "Visitors' book", "Libro de visitas"…
    // Why an agent came. The keys are what agents send; the labels are shown.
    purposes: {
      answering: "Answering someone's question",
      hiring: "Research for hiring or a project",
      comparing: "Comparing people or options",
      reference: "Looking for references or inspiration",
      training: "Collecting data for AI training",
      other: "Something else",
    },
    // What it used.
    uses: {
      overview: "The overview",
      "case-studies": "Case studies",
      images: "Images or video",
      writing: "Writing",
      profile: "Profile data",
      nothing: "Nothing, just looking",
    },
    noteMax: 600,          // characters in a note
    perVisitorPerDay: 5,   // signatures from one address in a day
    perDay: 300,           // signatures from everyone in a day
  },

  // THE VISIBLE PAGE (/agents), styled as a file open in a code editor.
  // Colours and fonts should come from the site itself.
  page: {
    title: "This is the version of this site that AI agents read.",
    home: { href: "/", label: "", image: "" },  // back-home link: text, and an avatar or logo
    width: "960px",                             // the column
    font: {
      family: '"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace',
      href: "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400&display=swap", // "" if the site already loads it
    },
    // How the site switches themes, so the page follows it. `default` is the
    // theme with no choice made: "system", "dark" or "light". `attribute` is
    // what the site sets on <html>: "data-theme" (values light/dark), "class"
    // (classes light/dark), or "" if it has no switch. `storageKey` is where it
    // remembers the choice, if it does. `toggle` adds a theme button.
    theme: { default: "system", attribute: "data-theme", storageKey: "", toggle: false },
    colors: {
      dark: { bg: "#0C0C0C", surface: "#131313", fg: "rgba(255,255,255,.9)", muted: "rgba(255,255,255,.65)", dim: "rgba(255,255,255,.4)", line: "rgba(255,255,255,.1)" },
      light: { bg: "#FFFFFF", surface: "#F6F6F6", fg: "rgba(0,0,0,.88)", muted: "rgba(0,0,0,.64)", dim: "rgba(0,0,0,.4)", line: "rgba(0,0,0,.1)" },
    },
  },
};
