// ─────────────────────────────────────────────────────────────────────────────
// THE SITE'S CONTENT, in the shape the agent view needs.
//
// Two ways to fill this in (the skill's references/content.md has both):
//
//   Adapter (best). Import the site's own data (a projects file, a CMS query,
//   markdown files) and map it here, so the agent files are rebuilt from the
//   same source as the pages and can never drift from what people see.
//
//   Snapshot. When the content is written straight into HTML pages, copy it in
//   here once. Then this file is the source for agents: update it, or run the
//   skill again, when the site changes.
//
// Facts only, and only what's already public on the site. Leave out locked,
// NDA or draft work (or mark it `hidden: true`), and never put instructions to
// agents in here.
// ─────────────────────────────────────────────────────────────────────────────

// Helpers for adapters: toMd(html, site) turns case-study HTML into markdown,
// plain(text) strips markup, lede(text) keeps the first sentence or two.
// eslint-disable-next-line no-unused-vars
import { toMd, plain, lede } from "./core.mjs";

export async function loadContent() {
  return {
    person: {
      name: "",
      summary: "",       // one or two sentences, in the site's own words
      location: "",
      role: "",          // current role…
      organization: "",  // …and where
      since: "",
      image: "",         // a portrait or logo already on the site, e.g. "/me.jpg"
      email: "",
      links: {},         // { X: "https://x.com/…", LinkedIn: "https://…", GitHub: "https://…" }
      about: [],         // paragraphs; markdown links, bold and italics are fine
    },

    // Case studies. Each gets its own markdown file at <paths.work>/<slug>.md.
    work: [
      // {
      //   slug: "lumen",                 // letters, digits, dashes
      //   title: "Lumen",
      //   year: "2025",
      //   disciplines: ["Brand", "Product"],
      //   roles: ["Lead designer"],      // what the owner did
      //   credits: ["Studio: Northwind"],// everyone else, "Label: name"
      //   summary: "One or two sentences.",
      //   caseStudy: "## Problem\n\n…",  // markdown; toMd(html, site) if it's HTML
      //   media: ["/work/lumen/cover.jpg"],
      //   url: "/work/lumen",            // the page people see, if there is one
      // },
    ],

    // Side projects, tools, experiments: a title, a line, a link.
    projects: [
      // { slug: "tiny-tool", title: "Tiny Tool", kind: ["Tool"], summary: "…", url: "https://…" },
    ],

    // Essays and posts.
    writing: [
      // { slug: "on-craft", title: "On craft", date: "2025-03-01", summary: "…", url: "/writing/on-craft" },
    ],

    experience: [
      // { role: "Senior designer", organization: "Acme", place: "Lisbon", dates: "2022 – now", description: "…" },
    ],
    skills: {},        // { "Design": ["Brand", "Motion"], "Tools": ["Figma", "After Effects"] }
    recognition: [],   // ["Award name (2024)"]
    education: [],     // [{ school: "…", field: "…", years: "2012 – 2016" }]
    clients: [],       // ["Name", "Name"]
  };
}
