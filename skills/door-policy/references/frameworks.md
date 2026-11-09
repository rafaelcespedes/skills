# Frameworks: where each piece goes

Contents: § Astro · § Next.js · § Plain HTML · § Other static generators ·
§ SPAs · § robots.txt · § The middleware · § vercel.json · § .gitignore ·
§ Upgrading from agent-view

Every route uses the same `door-policy/` folder. What changes is how the files
are served, where the head tags go, and how the guest book's endpoints are
mounted. Paths below assume the defaults (`/agents`, `/work`); if
`config.paths` differs, move the files and the middleware matcher to match.

## Astro (static output) on Vercel

This is the route the original was built on and tested with.

1. Copy `templates/astro/src/pages/*` into `src/pages/`: `llms.txt.js`,
   `llms-full.[ext].js`, `profile.[ext].js`, `work/[slug].md.js`,
   `agents.astro`. The `[ext]` names are on purpose: they serve
   `/llms-full.txt` and `/profile.json`, and aren't built at all in "no AI".
   If `src/pages/work/` holds the site's own case-study pages, the `.md` file
   can sit beside them; the URLs don't collide. (`robots.txt.js` and
   `.well-known/tdmrep.[ext].js` are only for § robots.txt's endpoint case.)
2. Head tags, in the base layout's `<head>`:

   ```astro
   ---
   import { getView } from "../../door-policy/view.mjs";
   const view = await getView();
   const isHome = (Astro.url.pathname.replace(/\/+$/, "") || "/") === "/";
   ---
   <Fragment set:html={view.headTags({ jsonLd: isHome })} />
   ```

   In the case-study layout, pass the project's slug instead, so the page
   links to its markdown twin: `view.headTags({ work: slug })`.
3. robots.txt: add `node door-policy/build.mjs --robots public/robots.txt` to
   `prebuild`, or use the endpoint template when `content.mjs` needs Astro
   (§ robots.txt).
4. The middleware: copy `templates/vercel/middleware.js` to the root, guest
   book or not (§ The middleware), and merge `templates/vercel/vercel.json`'s
   redirects and headers, guest book or not (§ vercel.json). Guest book: copy
   `templates/vercel/api/` to `api/` at the project root (not
   `src/pages/api`) and add the `/guestbook` rewrites. Vercel deploys these
   beside a static Astro build. The project's `package.json` already has
   `"type": "module"`.
   The `vercel.json` rewrites work on static Astro (tested live), though
   Vercel's Astro docs call them unsupported; if a deploy ignores them, do the
   same rewrites in the root `middleware.js` instead.
5. Test locally: `GUESTBOOK_MEMORY=1 npm run build`, then
   `scripts/local-server.mjs --root . --static dist --port <any free port>`.

**Astro with the `@astrojs/vercel` adapter** (`output: "server"`, or pages with
`prerender = false`): Vercel uses the adapter's output and ignores a root
`api/` folder. Mount the handlers as Astro endpoints instead, e.g.
`src/pages/api/guestbook.js`:

```js
import { guestbook } from "../../../door-policy/guestbook/handlers.mjs";
export const prerender = false;
export const GET = ({ request }) => guestbook(request);
export const POST = ({ request }) => guestbook(request);
export const OPTIONS = ({ request }) => guestbook(request);
```

and likewise `src/pages/guestbook/[id].js` (`receipt(request, params.id)`) and
`src/pages/guestbook/admin.js` (`admin(request)`). Keep root `middleware.js` for
check-ins. This variant hasn't been run end to end: check the check-in counter
on a preview deployment.

## Next.js (App Router)

1. Copy `templates/next/app/*` into `app/`. With `src/app/`, add one `../` to
   each import (`door-policy/` stays at the project root): the homepage then
   imports `../../door-policy/view.mjs`, and `src/proxy.js` imports
   `../door-policy/…`. The files are `force-static`, so they're built once at
   build time, like the rest of a static page.
2. **`/work/<slug>.md`**: a route can't sit beside a page in the same folder.
   If `app/work/[slug]/page.js` exists, set `paths.work` to a free path (for
   example `"/md"`), move `app/work/[file]/` there, and update the middleware
   matcher.
3. Head tags. In `app/layout.js` (no links in "no AI at all"; switching mode
   needs a rebuild). Most layouts already export `metadata` (title,
   description, `metadataBase`), and Next doesn't allow both exports: turn it
   into the `base` object below, so nothing of the site's own is lost.

   ```jsx
   import { getView } from "../door-policy/view.mjs";

   // the layout's existing metadata, moved here
   const base = { /* title, description, metadataBase… */ };

   export async function generateMetadata() {
     const view = await getView();
     return view.reading === "no-ai" ? base : {
       ...base,
       alternates: { ...base.alternates, types: { "text/plain": "/llms.txt", "application/json": "/profile.json" } },
     };
   }

   // metadata can't express rel="describedby" or the bingbot and
   // tdm-reservation tags, so they go in <head> by hand
   export default async function RootLayout({ children }) {
     const view = await getView();
     const trainNo = view.settings.contentSignal.aiTrain === "no";
     return (
       <html lang={view.settings.lang}>
         <head>
           {view.reading !== "no-ai" && <link rel="describedby" href="/llms.txt" />}
           {trainNo && <meta name="bingbot" content="ai-training:disallow" />}
           {view.reading === "no-ai" && <meta name="bingbot" content="ai-grounding:disallow" />}
           {trainNo && <meta name="tdm-reservation" content="1" />}
         </head>
         <body>{children}</body>
       </html>
     );
   }
   ```

   On a case-study page, add the markdown twin to its own metadata:
   `alternates: { types: { "text/markdown": "/work/<slug>.md" } }`.

   and on the homepage (`app/page.js`), the JSON-LD:

   ```jsx
   import { getView } from "../door-policy/view.mjs";
   export default async function Home() {
     const view = await getView();
     return (
       <>
         <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(view.jsonLd()).replace(/</g, "\\u003c") }} />
         {/* the existing homepage */}
       </>
     );
   }
   ```
4. robots.txt: Next's `app/robots.js` can't write a `Content-Signal` line, and
   a leftover one silently shadows `public/robots.txt`. Delete `app/robots.js`
   and move its rules into `public/robots.txt` (with `--robots` in
   `prebuild`, which also writes `public/.well-known/tdmrep.json`), or into
   `robots.base.txt` with the `templates/next/app/robots.txt/route.js` and
   `app/.well-known/tdmrep.json/route.js` endpoints (§ robots.txt). In "no
   AI", the `llms-full.txt` and `profile.json` routes answer 404.
5. The middleware, guest book or not, at the root (beside `app/`, or in
   `src/`): **`templates/next/proxy.js` on Next.js 16 and later**,
   `templates/next/middleware.js` on 15 and earlier. Guest book: the route
   handlers in `templates/next/app/api/guestbook/` and
   `templates/next/app/guestbook/`. No `vercel.json` rewrites are needed. If
   the project already has a middleware:
   - **On Next.js 16 with a `middleware.js`** (left over from an upgrade):
     rename it to `proxy.js` and its function to `proxy` (Next prints the
     codemod), then merge, and tell the person. On 16, `middleware.js` runs in
     the edge sandbox and doesn't share the in-memory store, so local checks
     fail for no real reason.
   - Merge the check-in and markdown lines into it, and keep its matcher in
     step with `paths`.
   - **If it sets security headers on every path** (`X-Frame-Options:
     SAMEORIGIN`, a CSP), skip `/guestbook` and `/api/guestbook`: the guest
     book sets stricter ones (`DENY`, `frame-ancestors 'none'`), and the
     site's would overwrite them. `verify.mjs` says so if it happens.
6. Test with `GUESTBOOK_MEMORY=1 next build`, then
   `GUESTBOOK_MEMORY=1 GUESTBOOK_ADMIN_PASSWORD=… next start -p <port>` and
   `verify.mjs`. On Next.js 16 the in-memory store is shared with `proxy.js`, so
   every check runs locally. On 15 and earlier, middleware runs in a separate
   edge sandbox and the check-in count can read 0 locally even when it works:
   confirm check-ins on a preview with a real (free) Upstash database.

Tested end to end on Next.js 16.4 (both builds, every check). A
`force-static` route is rendered once at build time, before the site's
address is known, so anything it returns must use relative URLs: that's why
`app/guestbook/route.js` redirects with a relative `Location`.

## Plain HTML on Vercel

1. Add a `package.json` if there isn't one:

   ```json
   {
     "private": true,
     "type": "module",
     "scripts": { "build": "node door-policy/build.mjs --out . --robots robots.txt --head index.html about.html work/*.html" }
   }
   ```

   After `--head`, list every public page (the homepage and every page people
   can reach from it). Never list drafts or unlisted pages: on this route
   `package.json` is public unless `vercel.json` redirects it, so the list
   would name them. An unquoted glob (`work/*.html`) picks up new pages on
   Vercel's Linux shell. A page whose address is a project's `url` also gets
   the link to that project's markdown. Vercel runs
   `npm run build` and serves the project root, so the files land where the
   site already is. (If the project has a `public/` folder, Vercel serves that
   folder instead: add `"outputDirectory": "."` to `vercel.json`.)
   `"type": "module"` is what lets Vercel run `api/` and `middleware.js` as
   modern JavaScript.
2. Head markers, in each listed page's `<head>`. On the homepage:

   ```html
   <!-- door-policy:head jsonld -->
   <!-- /door-policy:head -->
   ```

   On other pages, the same without `jsonld`. The build fills them in, and
   rerunning it keeps them current.
3. A visible link to `/agents` in each page's footer or menu.
4. `robots.txt` at the root, written by `--robots` (§ robots.txt).
5. `vercel.json`, `.vercelignore` and `middleware.js`, **even without the
   guest book** (the middleware answers requests for markdown): on this
   route the whole project is served, so the template's redirects keep
   `door-policy/`, `package.json`, `middleware.js`, `skills-lock.json`,
   `.agents/` and `.claude/` private (a project-level `npx skills add` puts the
   skill and its lock file there), and `templates/vercel/.vercelignore` keeps
   the last three out of the deploy. Merge `templates/vercel/vercel.json`
   (§ vercel.json); without the guest book, the `/guestbook` rewrites can stay
   out.
6. Guest book: `templates/vercel/api/`, as for Astro.
7. `.gitignore` the generated files (§ .gitignore). They're rebuilt on every
   deploy, with the host's settings, which is how the guest book knows whether
   it's open.
8. Test: `GUESTBOOK_MEMORY=1 npm run build`, then
   `scripts/local-server.mjs --root .`.

The `door-policy/` folder holds no secrets (the password and storage keys live
only in Vercel's settings), but its comments, `content.mjs` and `exclude` list
are nobody's business: keep the redirect in step 5, and keep confidential names
out of the folder entirely (`references/content.md` § What stays out).
`verify.mjs` checks that `/door-policy/config.mjs`, `/package.json`,
`/middleware.js` and the installed skill aren't readable.

## Other static generators

Run `build.mjs` into the folder the generator copies as-is, before its build:

| Generator | Command (as `prebuild`, or before the build command) |
|---|---|
| Vite, React SPA, SvelteKit static, Gatsby | `node door-policy/build.mjs --out public --robots public/robots.txt` (SvelteKit and Gatsby: `static`), and § SPAs |
| Eleventy | `--out` a passthrough-copied folder, e.g. `public`, with `addPassthroughCopy({ public: "/" })` |
| Hugo | `--out static` |
| Jekyll | `--out .` and make sure `_config.yml` doesn't exclude the files |

For head tags, put the markers in the generator's base layout and pass it to
`--head`, or render `view.headTags()` from the layout if it can run JavaScript.

## SPAs (Vite/React, Vue, CRA)

1. Put the "For agents" link in `index.html`'s static markup, outside the app
   root (`<div id="root">`), so it's in the HTML agents fetch. A footer the app
   renders after load never reaches them.
2. Narrow the catch-all rewrite so missing agent files are 404s, not the app:
   `{ "source": "/((?!api/|work/.*\\.md$).*)", "destination": "/index.html" }`
   (change `work` to match `paths.work`). On Vercel, real files and functions
   are served before rewrites; the catch-all only needs narrowing so missing
   agent files 404.
3. The JSON-LD from `--head index.html` is on every route, which is fine, and
   `index.html` changes whenever the content does.

`local-server.mjs` serves real files and functions before rewrites, as Vercel
does, so test the SPA with it as usual.

## robots.txt

Generated by `build.mjs --robots <file>` (or the robots.txt endpoint template
when `content.mjs` needs the framework), between markers, keeping the person's
own rules. The modes, the training groups, how it merges and what to tell the
person: `references/reading.md`.

## The middleware

`templates/vercel/middleware.js` (Vercel, any framework but Next.js) and
`templates/next/proxy.js` or `middleware.js` (Next.js) do two things, both
from shared code that never reads the user agent to decide what to serve:

- **Markdown on request** (`door-policy/negotiate.mjs`): `/` and case-study
  pages answer with `llms.txt` and the `.md` when a client clearly prefers
  markdown, and every page it passes gets `Vary: Accept` and a `Link` to
  `llms.txt`. Off in "no AI". `references/reading.md` § Markdown on request.
- **Check-ins** for the guest book. Quietly nothing until its storage is
  connected.

So install it on these routes even without the guest book. Its matcher lists
`/`, `/agents`, the agent files and `/work/:path*`; add the folder of the
case-study pages people see if it isn't `paths.work` (and set
`paths.workPages`). Other hosts have no middleware here, so no markdown on
request (`references/deploy.md` § Other hosts).

## vercel.json

Merge `templates/vercel/vercel.json` into the project's own. On every Vercel
route, merge the redirects and the headers, guest book or not: `verify.mjs`
checks the types and the CORS header they set. Add the `/guestbook` rewrites
only with the guest book.

- The `/door-policy/:path*` redirect matters on routes that serve the project
  root (plain HTML, Jekyll); elsewhere it's harmless. If `paths.page` isn't
  `/agents`, change its destination.
- `/guestbook` is a rewrite to the guest book's own handler, not a plain
  redirect, so it answers 404 while the guest book is closed.

- `/guestbook/admin` must come before `/guestbook/:id` in `rewrites`.
- If the site already has a catch-all rewrite (single-page apps send
  everything to `/index.html`): on Vercel, real files and functions are served
  before rewrites; the catch-all only needs narrowing so missing agent files
  404 (§ SPAs).
- The redirects for `/package.json`, `/middleware.js`, `/skills-lock.json`,
  `/.agents/*` and `/.claude/*` matter where the project root is served; they
  never break a deploy (redirects don't touch what Vercel builds from).
- The headers block sets plain-text and markdown types and lets other sites
  read the agent files (`Access-Control-Allow-Origin: *`). If `paths.work`
  isn't `/work`, change the `/work/(.*).md` source.

## .gitignore

On the `build.mjs` routes, the generated files are rebuilt on every deploy and
don't belong in the repo:

```
# door-policy (generated by door-policy/build.mjs; robots.txt stays committed:
# only the block between its markers is generated)
door-policy/.last-build.json
/llms.txt
/llms-full.txt
/profile.json
/work/*.md
/agents/index.html
/.well-known/tdmrep.json
```

Prefix the paths with the `--out` folder (`/public/llms.txt`…). If a file was
already committed, remove it from the repo (`git rm --cached`): `build.mjs`
won't replace a file it didn't write, so a stale copy can stop the build on the host.

## Upgrading from agent-view

This skill used to be called agent-view, and so did its folder. To upgrade a
site:

1. Copy `templates/door-policy/` to `door-policy/`, then move `config.mjs`,
   `content.mjs` and `.last-build.json` over from `agent-view/` and delete
   `agent-view/`. (`build.mjs` also reads an old `agent-view/.last-build.json`
   while it's still there, so it doesn't refuse files it wrote.)
2. Replace `agent-view/` with `door-policy/` in every import (endpoints, the
   layout, middleware, `api/`), in `package.json`'s scripts, `vercel.json`
   (the `/door-policy/:path*` redirect) and `.gitignore`.
3. Copy the endpoints and middleware again from `templates/` (Astro's
   `llms-full.txt.js` and `profile.json.js` become the `[ext]` files; the
   middleware now also answers requests for markdown).
4. Leave the old markers: `--robots` and `--head` replace
   `# agent-view:robots` and `<!-- agent-view:head -->` blocks with the new
   ones on the next build.
5. In `config.mjs`, `contentSignal.aiInput` is gone (it follows from
   `reading`); an old line is ignored.
