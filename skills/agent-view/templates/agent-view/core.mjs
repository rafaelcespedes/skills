// ─────────────────────────────────────────────────────────────────────────────
// The agent view: turns the site's content into what AI agents read.
//
//   /llms.txt          the short version (llmstxt.org format)
//   /llms-full.txt     everything in one file, case studies included
//   /profile.json      the same as structured data
//   /work/<slug>.md    one case study per file (the folder is paths.work)
//   head tags          <link rel="alternate"> and schema.org JSON-LD
//
// Pure functions: no file system, no framework. view.mjs feeds it; build.mjs
// or the framework's endpoints serve what it returns. Don't edit this file:
// settings live in config.mjs and content in content.mjs.
//
// Never pass guest book notes in here. Agents get counts and fixed names
// only, so one visitor can't plant text for the next.
// ─────────────────────────────────────────────────────────────────────────────

const SLUG = /^[a-z0-9][a-z0-9_-]*$/i;

/** Build day (UTC), so agents can tell how fresh the files are. */
export const today = () => new Date().toISOString().slice(0, 10);

/* ── Text helpers (also handy in content.mjs adapters) ───────────────────── */

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", mdash: "—", ndash: "–", hellip: "…" };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
    e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENTITIES[e.toLowerCase()] ?? m,
  );

/** HTML → markdown. Paragraphs, headings, lists, links, bold and italics
 *  survive; every other tag is dropped. Relative links become absolute when
 *  `site` is given. */
export function toMd(html = "", site = "") {
  const abs = (u) => (!site || /^(https?:|mailto:|#)/.test(u) ? u : site + (u.startsWith("/") ? u : `/${u}`));
  return decode(
    String(html)
      .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, n, t) => `\n\n${"#".repeat(Math.max(2, +n))} ${t.replace(/<[^>]+>/g, "").trim()}\n\n`)
      .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, t) => `\n- ${t.trim()}`)
      .replace(/<\/(p|div|section|ul|ol|blockquote|figure)>/gi, "\n\n")
      .replace(/<a\b[^>]*?href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi, (_, __, href, text) => `[${text.replace(/<[^>]+>/g, "").trim()}](${abs(href)})`)
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
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*?([^*]+)\*\*?/g, "$1")
    .replace(/^#+\s*/gm, "");

/** The first sentence or two, kept under `max` characters. */
export function lede(text = "", max = 260) {
  const sentences = String(text).match(/[^.!?]+[.!?]+["”’)]*(\s+|$)/g) || [String(text)];
  let out = "";
  for (const s of sentences) {
    if (out && (out + s).length > max) break;
    out += s;
  }
  return out.trim();
}

/* ── The view ─────────────────────────────────────────────────────────────── */

const list = (x) => (Array.isArray(x) ? x : []);
const compact = (o) =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && !v.length) && !(typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length)),
  );

/**
 * @param settings  from settings.mjs
 * @param content   from content.mjs (see references/content.md for the shape)
 * @param opts.guestbookOpen  true only when the guest book is enabled AND its
 *                            storage is connected; otherwise it's never mentioned
 */
export function createAgentView(settings, content = {}, { guestbookOpen = false, updated = today() } = {}) {
  const S = settings;
  const SITE = S.site;
  const abs = (u) => (!u ? null : /^(https?:|mailto:)/.test(u) ? u : SITE + (u.startsWith("/") ? u : `/${u}`));
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
  };
  if (!person.name) throw new Error("agent-view content: person.name is missing.");

  const work = list(content.work)
    .filter(keep)
    .map((w) => {
      if (!SLUG.test(w.slug || "")) throw new Error(`agent-view content: work slug "${w.slug}" must be letters, digits, dashes or underscores.`);
      return {
        slug: w.slug,
        title: w.title || w.slug,
        year: w.year ? String(w.year) : null,
        disciplines: list(w.disciplines),
        roles: list(w.roles),
        credits: list(w.credits),
        summary: w.summary ? plain(w.summary) : null,
        caseStudy: w.caseStudy || null,
        media: [...new Set(list(w.media).map(abs).filter(Boolean))],
        url: abs(w.url),
        markdown: `${SITE}${S.paths.work}/${w.slug}.md`,
      };
    });
  const projects = list(content.projects).filter(keep).map((x) => compact({ slug: x.slug, title: x.title, kind: list(x.kind), summary: x.summary ? plain(x.summary) : null, url: abs(x.url) }));
  const writing = list(content.writing).filter(keep).map((x) => compact({ slug: x.slug, title: x.title, date: x.date || null, summary: x.summary ? plain(x.summary) : null, url: abs(x.url) }));
  const experience = list(content.experience).map((e) => compact({ role: e.role, organization: e.organization, place: e.place, dates: e.dates, description: e.description ? plain(e.description) : null }));
  const skills = Object.fromEntries(Object.entries(content.skills || {}).filter(([, v]) => list(v).length));
  const recognition = list(content.recognition);
  const education = list(content.education).map((e) => compact({ school: e.school, field: e.field, years: e.years }));
  const clients = list(content.clients);

  const g = S.guestbook;
  const pageUrl = `${SITE}${S.paths.page}`;
  const links = compact({
    site: SITE,
    ...Object.fromEntries(Object.entries(person.links).map(([k, u]) => [k.toLowerCase().replace(/[^a-z0-9]+/g, "-"), u])),
    email: person.email && `mailto:${person.email}`,
    contactForm: abs(S.contact.form),
    agentView: pageUrl,
    guestbook: guestbookOpen ? `${pageUrl}#guestbook` : null,
    llms: `${SITE}/llms.txt`,
    llmsFull: `${SITE}/llms-full.txt`,
    profile: `${SITE}/profile.json`,
  });

  /* ── /profile.json ─────────────────────────────────────────────────────── */

  function profile() {
    return compact({
      name: person.name,
      summary: person.summary,
      location: person.location,
      current: person.role || person.organization ? compact({ role: person.role, organization: person.organization, since: person.since }) : null,
      availability: S.availability,
      contact: compact({ email: person.email, form: abs(S.contact.form), preferred: S.contact.preferred, note: S.contact.note }),
      links,
      about: person.about,
      work: work.map(({ caseStudy, ...w }) => compact(w)),
      projects,
      writing,
      experience,
      skills,
      recognition,
      education,
      clients,
      guestbook: guestbookOpen
        ? {
            name: g.name,
            about: "Agents can sign on their way out: what they came for, what they used, and a note. Optional.",
            form: `${pageUrl}#guestbook`,
            endpoint: `${SITE}/api/guestbook`,
            method: "POST",
            accepts: ["application/json", "application/x-www-form-urlencoded"],
            fields: {
              agent: "required · the name you go by",
              purpose: `required · one of: ${Object.keys(g.purposes).join(", ")}`,
              used: `optional · any of: ${Object.keys(g.uses).join(", ")}`,
              note: `optional · up to ${g.noteMax} characters`,
              on_behalf_of: "optional · who you're working for; never shown publicly",
              visibility: `optional · public (default, shown once ${S.owner.short} has read it) or private (only ${S.owner.short} sees it)`,
            },
            reply: "includes a receipt link for the entry",
          }
        : null,
      updated,
    });
  }

  /* ── /work/<slug>.md ───────────────────────────────────────────────────── */

  function workMarkdown(w) {
    const facts = [
      w.year && `- Year: ${w.year}`,
      w.disciplines.length && `- Disciplines: ${w.disciplines.join(", ")}`,
      ...w.roles.map((r) => `- Role: ${r}`),
      ...w.credits.map((c) => `- ${c}`),
      w.url && `- Page: ${w.url}`,
      `- By: ${person.name} (${SITE})`,
    ].filter(Boolean);
    return (
      [
        `# ${w.title}`,
        w.summary && `> ${w.summary}`,
        facts.join("\n"),
        w.caseStudy || "No written case study yet. The images below are what the site shows for now.",
        w.media.length && `## Images and video\n\n${w.media.map((m) => `- ${m}`).join("\n")}`,
        `---\n\nFrom the site of ${person.name}. Everything in one file: ${links.llmsFull} · Updated ${updated}`,
      ]
        .filter(Boolean)
        .join("\n\n") + "\n"
    );
  }

  /* ── /llms.txt and /llms-full.txt ──────────────────────────────────────── */

  /** The guest book, described as facts: what it is and how to sign. */
  function guestbookMd() {
    if (!guestbookOpen) return null;
    const opts = (o) => Object.entries(o).map(([k, label]) => `    - ${k}: ${label}`).join("\n");
    return [
      `## ${g.name}`,
      `This site keeps a ${g.name.toLowerCase()} for agents. Signing is optional and takes one request. An entry speaks for the person an agent works for, so it's reasonable to check with them first.`,
      [
        `- Form: ${pageUrl}#guestbook`,
        `- API: POST ${SITE}/api/guestbook, as JSON or as a form, with:`,
        `  - agent (required): the name you go by, e.g. "Claude"`,
        `  - purpose (required), one of:\n${opts(g.purposes)}`,
        `  - used (optional, a list), any of:\n${opts(g.uses)}`,
        `  - note (optional): up to ${g.noteMax} characters`,
        `  - on_behalf_of (optional): who you're working for; never shown publicly`,
        `  - visibility (optional): public (the default; shown once ${S.owner.short} has read it) or private (only ${S.owner.short} sees it)`,
        `- The reply includes a receipt link for the entry.`,
        `- Visits from known agents are counted by name only. Notes left by other agents are never included in these files.`,
      ].join("\n"),
    ].join("\n\n");
  }

  function contactLine() {
    const ways = [person.email, links.contactForm && `the form at ${links.contactForm}`].filter(Boolean);
    if (!ways.length && !S.contact.note) return null;
    const best = ways.length > 1 && S.contact.preferred ? ` (${S.contact.preferred} is best)` : "";
    return `- Contact: ${[ways.join(" or ") + best, S.contact.note].filter(Boolean).join(". ")}`;
  }

  function header() {
    const elsewhere = Object.entries(person.links).map(([k, u]) => `[${k}](${u})`).join(" · ");
    return [
      `# ${person.name}`,
      person.summary && `> ${person.summary}`,
      [
        S.availability && `- Availability: ${S.availability}`,
        contactLine(),
        elsewhere && `- Elsewhere: ${elsewhere}`,
        `- Structured profile (JSON): ${links.profile}`,
        `- This summary for people: ${pageUrl}`,
        `- Updated: ${updated}`,
      ]
        .filter(Boolean)
        .join("\n"),
    ];
  }

  const workLine = (w) =>
    `- [${w.title}](${w.markdown}): ${[w.year, w.disciplines.join(", "), w.roles.join("; ")].filter(Boolean).join(" · ")}${w.summary ? `. ${w.summary}` : ""}`;
  const linkLine = (x) => `- ${x.url ? `[${x.title}](${x.url})` : x.title}${x.summary ? `: ${x.summary}` : ""}`;
  const section = (title, items, line, intro) => (items.length ? `## ${title}\n\n${intro ? `${intro}\n\n` : ""}${items.map(line).join("\n")}` : null);

  function llmsTxt() {
    return (
      [
        ...header(),
        `Everything below in one file, case studies included: ${links.llmsFull}`,
        section(S.sections.work, work, workLine, "Each link is the full case study as markdown."),
        section(S.sections.projects, projects, linkLine),
        section(S.sections.writing, writing, linkLine),
        guestbookMd(),
        section("Experience", experience, (e) => `- ${[e.role, e.organization].filter(Boolean).join(", ")}${e.dates ? ` (${e.dates})` : ""}`),
      ]
        .filter(Boolean)
        .join("\n\n") + "\n"
    );
  }

  function llmsFull() {
    return (
      [
        ...header(),
        person.about.length && `## About\n\n${person.about.join("\n\n")}`,
        section("Experience", experience, (e) => `### ${[e.role, e.organization].filter(Boolean).join(", ")}\n${[e.place, e.dates].filter(Boolean).join(" · ")}${e.description ? `\n\n${e.description}` : ""}`),
        Object.keys(skills).length && `## Skills\n\n${Object.entries(skills).map(([k, v]) => `- ${k}: ${v.join(", ")}`).join("\n")}`,
        section("Recognition", recognition, (r) => `- ${r}`),
        section("Education", education, (e) => `- ${[e.school, e.field].filter(Boolean).join(", ")}${e.years ? ` (${e.years})` : ""}`),
        clients.length && `## Clients\n\n${clients.join(", ")}`,
        section(S.sections.projects, projects, linkLine),
        section(S.sections.writing, writing, linkLine),
        guestbookMd(),
        work.length &&
          `## ${S.sections.work}\n\n${work
            .map((w) => workMarkdown(w).trim().replace(/^# /, "### ").replace(/\n## /g, "\n#### ").replace(/\n---\n\nFrom the site of[^\n]*$/, ""))
            .join("\n\n---\n\n")}`,
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
        { "@type": "WebSite", "@id": `${SITE}/#website`, url: SITE, name: person.name, author: { "@id": id } },
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
   *  (and the agent page, which adds it itself). Safe to inline: "<" is
   *  escaped inside the JSON so nothing can close the script tag early. */
  function headTags({ jsonLd: withLd = false } = {}) {
    return [
      `<link rel="alternate" type="text/plain" href="/llms.txt" title="Agent-readable summary (llms.txt)">`,
      `<link rel="alternate" type="application/json" href="/profile.json" title="Profile as structured data">`,
      withLd && `<script type="application/ld+json">${JSON.stringify(jsonLd()).replace(/</g, "\\u003c")}</script>`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  /** The robots.txt lines. The Content-Signal line belongs inside the
   *  `User-agent: *` group (references/frameworks.md § robots.txt). */
  function robots() {
    const cs = S.contentSignal;
    const pairs = [
      ["search", cs.search],
      ["ai-input", cs.aiInput],
      ["ai-train", cs.aiTrain],
    ].filter(([, v]) => v === "yes" || v === "no");
    return {
      signal: pairs.length ? `Content-Signal: ${pairs.map(([k, v]) => `${k}=${v}`).join(", ")}` : null,
      pointer: `# For AI agents: an agent-readable summary of this site is at\n# ${SITE}/llms.txt (and shown to people at ${S.paths.page})`,
    };
  }

  /** Every agent file, ready to write or serve. */
  function files() {
    return [
      { path: "/llms.txt", type: "text/plain; charset=utf-8", body: llmsTxt() },
      { path: "/llms-full.txt", type: "text/plain; charset=utf-8", body: llmsFull() },
      { path: "/profile.json", type: "application/json; charset=utf-8", body: JSON.stringify(profile(), null, 2) + "\n" },
      ...work.map((w) => ({ path: `${S.paths.work}/${w.slug}.md`, type: "text/markdown; charset=utf-8", body: workMarkdown(w) })),
    ];
  }

  return { settings: S, person, work, projects, writing, links, updated, guestbookOpen, llmsTxt, llmsFull, profile, workMarkdown, jsonLd, headTags, robots, files };
}
