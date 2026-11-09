# Content: finding it, shaping it, keeping it true

Contents: § Find where the content lives · § Adapter or snapshot · § The shape ·
§ What stays out · § Common judgement calls · § Sites in another language ·
§ An existing llms.txt · § Writing the few lines · § Check before moving on

The agent files are only as good as what `content.mjs` hands them. The goal is
the same work people see, as facts, rebuilt from the same source every time the
site builds.

## Find where the content lives

Look before asking. Typical places:

| Site | Where to look |
|---|---|
| Hand-coded data | `src/data/*.{js,ts,json}`, `data/`, `_data/` (Eleventy), `content.json` |
| Markdown | `src/content/**` (Astro collections), `content/`, `posts/`, `_posts/` (Jekyll), `*.md` with frontmatter |
| A CMS | fetch calls or SDKs for Sanity, Contentful, Notion, Prismic, WordPress; `.env` names hint at which |
| Hand-written HTML | `index.html`, `work/*.html`, `about.html`: the content is the markup |

Also read the homepage, about page and one case study as a visitor would, so
the summary and roles match what people actually see.

## Adapter or snapshot

**Adapter (prefer it).** `loadContent()` imports the site's own data and maps
it. The agent files then rebuild from the same source as the pages, so they
can't drift. Use one whenever the content exists as data or files.

**Hand-written HTML can have an adapter too.** If the pages share a structure
(every case study has the same title, label and body markup), read them at
build time with `fs` and pull out the parts with a few regular expressions or
string slices, then pass the body through `toMd(html, site)`. It's more work up
front, and the files then follow every edit to the pages. Prefer it when there
are more than a handful of pages or they change often.

**Snapshot.** When the pages are irregular, or there are only two or three,
copy the content into `content.mjs` once, as plain objects. Then `content.mjs`
is the source for agents, and it must be updated when the site changes. Say so
in the hand-off. `toMd(html, site)` from `core.mjs` turns a case study's HTML
into markdown. In a snapshot:

- Don't repeat the summary inside `caseStudy`: if the page opens with the
  paragraph you used as `summary`, start `caseStudy` after it.
- A page that says "case study coming soon" gets a `summary` and no
  `caseStudy`; the markdown file then says there's no written case study yet.
- Copy text, not judgement: the site's words, its headings, its numbers.

Where the adapter runs decides what it can import:

- **Framework endpoints (Astro, Next.js):** the adapter runs inside the
  framework's bundler, so TypeScript, path aliases (`@/…`), `import.meta.glob`
  and content collections (`getCollection`) all work.
- **`build.mjs` (plain Node):** only what Node can import. Node 22.18+ runs
  `.ts` files directly; older Node can't. Path aliases, image imports
  (`import hero from "./hero.jpg"`) and CSS imports fail. Read markdown with
  `fs` and parse the frontmatter yourself, or use a snapshot.

```js
// Adapter example: a projects file and markdown essays (plain Node).
import fs from "node:fs";
import { projects } from "../src/data/projects.js";
import { toMd, lede } from "./core.mjs";

const SITE = "https://example.com";
const front = (file) => {
  const m = fs.readFileSync(file, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const pairs = (m?.[1] || "").split(/\r?\n/).map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim().replace(/^["']|["']$/g, "")]);
  return Object.fromEntries(pairs.filter(([k]) => k));
};

export async function loadContent() {
  return {
    person: { /* … */ },
    work: projects.map((p) => ({
      slug: p.slug,
      title: p.title,
      year: p.year,
      disciplines: p.tags,
      roles: [p.role],
      summary: lede(p.intro),
      caseStudy: toMd(p.bodyHtml, SITE),
      media: p.images,
      url: `/work/${p.slug}`,
      hidden: p.locked || p.draft,   // stays out of every file
    })),
    writing: fs.readdirSync("posts").filter((f) => f.endsWith(".md")).map((f) => {
      const fm = front(`posts/${f}`);
      return { slug: f.replace(/\.md$/, ""), title: fm.title, date: fm.date, summary: fm.description, url: `/posts/${f.replace(/\.md$/, "")}` };
    }),
  };
}
```

Relative paths in an adapter run from the project root (where the build runs).

## The shape

Every field is optional except `person.name` and each work item's `slug`.
Empty sections are left out of the files.

| Field | What goes in it |
|---|---|
| `person.name` | As the site writes it |
| `person.summary` | One or two sentences in the site's own words: what they do, where, for whom |
| `person.location`, `role`, `organization`, `since` | The current position, if the site states one |
| `person.image` | A portrait or logo the site already shows (path or URL) |
| `person.email` | Only if the site already shows it |
| `person.links` | `{ Label: url }`: the profiles the site links to |
| `person.about` | The about text as paragraphs (markdown or HTML); links, bold and italics survive in `llms-full.txt`, and `profile.json` gets plain text |
| `work[]` | Case studies: `slug` (unique, whatever the case), `title`, `year`, `disciplines[]`, `roles[]` (what the owner did), `credits[]` ("Label: name" for everyone else), `summary`, `caseStudy` (markdown; root-relative links and images are made absolute), `media[]` (every image and video the project shows; the markdown file lists only the ones `caseStudy` doesn't already embed), `url` (the human page, if any) |
| `projects[]` | Side projects, tools, experiments: `title`, `kind[]`, `summary`, `url` |
| `writing[]` | Essays and posts: `title`, `date`, `summary`, `url` |
| `experience[]` | `role`, `organization`, `place`, `dates`, `description` |
| `skills` | `{ Group: [items] }`, e.g. `{ Design: [...], Tools: [...] }` |
| `recognition[]` | `"Award (year)"` strings |
| `education[]` | `school`, `field`, `years` |
| `clients[]` | Names |
| `sections[]` | Anything else the site lists (talks, press, exhibitions): `{ title, items: [{ title, url, summary }] }`, each a section of links in `llms.txt` and `llms-full.txt` |

Any item with `hidden`, `draft`, `locked` or `private` set is left out, and so is
any slug listed in `config.exclude`.

## What stays out

- Locked, password-protected and NDA work, drafts and unlisted pages, even if
  their text is in the repo. Leave them out of `content.mjs` entirely, and
  don't name them in comments or in `config.exclude`: on some routes the
  `door-policy/` folder sits inside the served site, and a name is a leak even
  if nothing else is. (`exclude` is for public work the person would simply
  rather not list.)
- Rates, prices and start dates, unless the person asks for them. If they say
  "don't mention rates", leave the word out of the contact note altogether,
  including "Rates aren't published".
- Other people's contact details (clients, collaborators).
- Fields the pages never show. Map only what the pages actually render: data
  files often carry more (team names, client contacts, internal notes, a
  `team` array the case study never prints). Check each mapped field against
  a rendered page.
- Anything only visible behind a login.
- Instructions to agents of any kind ("AI assistants should…"). State facts:
  "Rates aren't published. The best first message says who it's from, what the
  project is, and the timeline."

## The reading choice

`config.reading` changes one line in the files, and in "no-ai" it changes what
is published: `llms.txt` alone, with who the person is and how to reach them. Fill `content.mjs` the same way in every mode. The modes, the exact
statements and robots.txt: `references/reading.md`.

## Common judgement calls

1. **Unlisted or NDA work:** filter it out by a marker the site already uses (a
   `locked` class, a tile with no link), so it's never named anywhere.
2. **Leave a field out rather than infer it** (a job title, a start year).
3. **A theme switch that only toggles a `dark` class** works with
   `theme.attribute: "class"`.
4. **Locked pages** get the footer link but no head tags.
5. **Availability that names a month:** add the year, and remind the person to
   update it.
6. **Keep the site's wording.** If a first-person summary would read
   ambiguously under the person's name, ask before changing it.
7. **"No AI at all" on a snapshot site:** `person`, contact and links are
   enough; fill in `work` only if the person may switch modes.
8. **New pages on plain HTML:** an unquoted glob in the build script
   (`--head index.html work/*.html`) picks them up on Vercel's Linux shell.

## Sites in another language, or in several

The page and the guest book's interface are in English; the person's names
and content are used as written. Build the files from the site's primary
language, set `lang` in `config.mjs` to it (`"es"`, `"pt-BR"`), and list the
other versions in `otherLanguages` (`{ en: "/en/" }`): they show as
`- Other languages: [en](…)` at the top of `llms.txt`.

## An existing llms.txt

`build.mjs` won't replace a file it didn't write. When the site already has a
hand-written `llms.txt`, move its custom sections (`## Talks`, `## Press`) into
`content.sections`, show the person the generated result, then delete the old
file so `build.mjs` can own it.

## Writing the few lines that aren't on the site

`person.summary`, the availability line and the contact note may need writing.
Use the site's own words where they exist, keep them factual and short, and
show the person what you wrote. If the site contradicts itself (two different
job titles, two different numbers), keep both out of your summary and point the
contradiction out to the person rather than picking one.

## Check before moving on

- `node -e 'import("./door-policy/view.mjs").then(async m => console.log((await m.getView()).llmsTxt()))'`
  prints `llms.txt` without building the site. An adapter that uses
  framework-only imports (content collections, aliases) can't run that way:
  check it through the dev server's `/llms.txt` instead. Read it as an agent would: could
  you answer "who is this, what have they made, how do I reach them" from it?
- Every case study the site shows has a `summary` and, where the site has the
  text, a `caseStudy`.
- Nothing from "What stays out" is in it.
