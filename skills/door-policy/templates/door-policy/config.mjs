// ─────────────────────────────────────────────────────────────────────────────
// DOOR POLICY SETTINGS: the one file you're meant to edit.
//
// This folder states the site's door policy for AI agents (let them in, send
// them to clean files, or ask them to stay out) in robots.txt, the files and
// a visible /agents page. It also builds the files AI agents read (/llms.txt,
// /llms-full.txt, /profile.json, one markdown file per project) and an
// optional guest book agents can sign.
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

  // The site's language, for <html lang> on /agents and the guest book
  // pages ("en", "es", "pt-BR"…). Those pages' own words are in English; your
  // names and content are used as written. If the site has other language
  // versions, list them: { es: "/es/" }.
  lang: "en",
  otherLanguages: {},

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
    // workPages: "/projects", // where people's case-study pages live, if not
    //                         // under `work` (for answering requests for markdown)
  },

  // Section titles, in the files and on the page.
  sections: { work: "Work", projects: "Side projects", writing: "Writing" },

  // The door policy: how you'd like AI to treat the site. A stated wish,
  // shown in every agent file, on the visible page and in robots.txt (the
  // skill's references/reading.md). Nothing can enforce it.
  //   "anything"     AI may read the pages and the files, whichever it likes
  //   "files-first"  AI reads the clean files instead of the pages (default).
  //                  Agents a person sent may also open the homepage.
  //   "no-ai"        please don't read, use or train on the site. Only
  //                  /llms.txt is published, with who you are and how to
  //                  reach you, and training is "no" whatever it says below.
  reading: "files-first",

  // How the site's content may be used, stated in robots.txt in the Content
  // Signals format (contentsignals.org): "yes", "no", or null to say nothing.
  // AI answers that read a page live follow from `reading` (no only in
  // "no-ai"), so they aren't set here.
  contentSignal: {
    search: "yes",   // search results; "no" only if you asked for it
    aiTrain: null,   // training AI models: "yes", "no", or null to say nothing
                     // (in practice crawlers treat that as allowed). "no" also
                     // asks training crawlers to stay out of everything, and
                     // adds the W3C TDMRep and Content Signals reservations.
  },

  // THE GUEST BOOK. Agents check in (counted by name, automatically) and can
  // sign on their way out. It stays off, and isn't mentioned anywhere, until
  // storage is connected on the host. `enabled: false` keeps it off even then.
  // Leave `enabled` out for the default: on, except with reading: "no-ai",
  // where it's off unless set to true (then it's a counter that shows which
  // AI tools came anyway).
  guestbook: {
    // enabled: false,
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
    // What it used. With reading: "no-ai", this default list becomes only
    // what that mode offers (the overview, or nothing).
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
    ipHeader: "x-forwarded-for", // where the host puts the visitor's address (Vercel: leave it)
  },

  // THE VISIBLE PAGE (/agents), styled as a file open in a code editor.
  // Colours and fonts should come from the site itself.
  page: {
    // title: "…",   // the page's headline; the default fits the reading choice above
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
