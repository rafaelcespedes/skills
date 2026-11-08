# Content: finding it, shaping it, keeping it true

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
| `person.about` | The about text as paragraphs; markdown links, bold and italics survive |
| `work[]` | Case studies: `slug`, `title`, `year`, `disciplines[]`, `roles[]` (what the owner did), `credits[]` ("Label: name" for everyone else), `summary`, `caseStudy` (markdown), `media[]`, `url` (the human page, if any) |
| `projects[]` | Side projects, tools, experiments: `title`, `kind[]`, `summary`, `url` |
| `writing[]` | Essays and posts: `title`, `date`, `summary`, `url` |
| `experience[]` | `role`, `organization`, `place`, `dates`, `description` |
| `skills` | `{ Group: [items] }`, e.g. `{ Design: [...], Tools: [...] }` |
| `recognition[]` | `"Award (year)"` strings |
| `education[]` | `school`, `field`, `years` |
| `clients[]` | Names |

Any item with `hidden`, `draft`, `locked` or `private` set is left out, and so is
any slug listed in `config.exclude`.

## What stays out

- Locked, password-protected and NDA work, drafts and unlisted pages, even if
  their text is in the repo. Leave them out of `content.mjs` entirely, and
  don't name them in comments or in `config.exclude`: on some routes the
  `agent-view/` folder sits inside the served site, and a name is a leak even
  if nothing else is. (`exclude` is for public work the person would simply
  rather not list.)
- Rates, prices and start dates, unless the person asks for them. If they say
  "don't mention rates", leave the word out of the contact note altogether,
  including "Rates aren't published".
- Other people's contact details (clients, collaborators).
- Anything only visible behind a login.
- Instructions to agents of any kind ("AI assistants should…"). State facts:
  "Rates aren't published. The best first message says who it's from, what the
  project is, and the timeline."

## Writing the few lines that aren't on the site

`person.summary`, the availability line and the contact note may need writing.
Use the site's own words where they exist, keep them factual and short, and
show the person what you wrote. If the site contradicts itself (two different
job titles, two different numbers), keep both out of your summary and point the
contradiction out to the person rather than picking one.

## Check before moving on

- `node -e 'import("./agent-view/view.mjs").then(async m => console.log((await m.getView()).llmsTxt()))'`
  prints `llms.txt` without building the site. Read it as an agent would: could
  you answer "who is this, what have they made, how do I reach them" from it?
- Every case study the site shows has a `summary` and, where the site has the
  text, a `caseStudy`.
- Nothing from "What stays out" is in it.
