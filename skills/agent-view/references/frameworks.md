# Frameworks: where each piece goes

Every route uses the same `agent-view/` folder. What changes is how the files
are served, where the head tags go, and how the guest book's endpoints are
mounted. Paths below assume the defaults (`/agents`, `/work`); if
`config.paths` differs, move the files and the middleware matcher to match.

## Astro (static output) on Vercel

This is the route the original was built on and tested with.

1. Copy `templates/astro/src/pages/*` into `src/pages/`: `llms.txt.js`,
   `llms-full.txt.js`, `profile.json.js`, `work/[slug].md.js`, `agents.astro`.
   If `src/pages/work/` holds the site's own case-study pages, the `.md` file
   can sit beside them; the URLs don't collide.
2. Head tags, in the base layout's `<head>`:

   ```astro
   ---
   import { getView } from "../../agent-view/view.mjs";
   const view = await getView();
   const isHome = (Astro.url.pathname.replace(/\/+$/, "") || "/") === "/";
   ---
   <Fragment set:html={view.headTags({ jsonLd: isHome })} />
   ```
3. robots.txt: edit `public/robots.txt` (see § robots.txt).
4. Guest book: copy `templates/vercel/api/` to `api/` at the project root (not
   `src/pages/api`), `templates/vercel/middleware.js` to the root, and merge
   `templates/vercel/vercel.json`. Vercel deploys these beside a static Astro
   build. The project's `package.json` already has `"type": "module"`.
5. Test locally: `GUESTBOOK_MEMORY=1 npm run build`, then
   `scripts/local-server.mjs --root . --static dist`.

**Astro with the `@astrojs/vercel` adapter** (`output: "server"`, or pages with
`prerender = false`): Vercel uses the adapter's output and ignores a root
`api/` folder. Mount the handlers as Astro endpoints instead, e.g.
`src/pages/api/guestbook.js`:

```js
import { guestbook } from "../../../agent-view/guestbook/handlers.mjs";
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

1. Copy `templates/next/app/*` into `app/` (or `src/app/`, adding one `../` to
   each import). The files are `force-static`, so they're built once at build
   time, like the rest of a static page.
2. **`/work/<slug>.md`**: a route can't sit beside a page in the same folder.
   If `app/work/[slug]/page.js` exists, set `paths.work` to a free path (for
   example `"/md"`), move `app/work/[file]/` there, and update the middleware
   matcher.
3. Head tags. In `app/layout.js`:

   ```js
   export const metadata = {
     alternates: { types: { "text/plain": "/llms.txt", "application/json": "/profile.json" } },
   };
   ```

   and on the homepage (`app/page.js`), the JSON-LD:

   ```jsx
   import { getView } from "../agent-view/view.mjs";
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
4. robots.txt: Next's `app/robots.js` can't write a `Content-Signal` line. Use
   `public/robots.txt`, or replace `app/robots.js` with
   `app/robots.txt/route.js` returning the text.
5. Guest book: the route handlers in `templates/next/app/api/guestbook/` and
   `templates/next/app/guestbook/`, plus the check-in counter at the root
   (beside `app/`, or in `src/`): **`templates/next/proxy.js` on Next.js 16 and
   later**, `templates/next/middleware.js` on 15 and earlier. If the project
   already has one, merge the check-in lines into it, and keep its matcher in
   step with `paths`. No `vercel.json` rewrites are needed.
6. Test with `GUESTBOOK_MEMORY=1 next build`, then
   `GUESTBOOK_MEMORY=1 GUESTBOOK_ADMIN_PASSWORD=… next start -p 4399` and
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
     "scripts": { "build": "node agent-view/build.mjs --out . --head index.html about.html" }
   }
   ```

   After `--head`, list every public page (the homepage and every page people
   can reach from it; not drafts or unlisted pages). Vercel runs
   `npm run build` and serves the project root, so the files land where the
   site already is. (If the project has a `public/` folder, Vercel serves that
   folder instead: add `"outputDirectory": "."` to `vercel.json`.)
   `"type": "module"` is what lets Vercel run `api/` and `middleware.js` as
   modern JavaScript.
2. Head markers, in each listed page's `<head>`. On the homepage:

   ```html
   <!-- agent-view:head jsonld -->
   <!-- /agent-view:head -->
   ```

   On other pages, the same without `jsonld`. The build fills them in, and
   rerunning it keeps them current.
3. A visible link to `/agents` in each page's footer or menu.
4. `robots.txt` at the root (see § robots.txt).
5. `vercel.json`, **even without the guest book**: on this route the whole
   project is served, `agent-view/` included, so the template's first redirect
   (`/agent-view/:path*` → `/agents`) keeps the folder private. Merge
   `templates/vercel/vercel.json` (§ vercel.json); without the guest book, the
   `/guestbook` rewrites can stay out.
6. Guest book: `templates/vercel/api/` and `middleware.js`, as for Astro.
7. `.gitignore` the generated files (§ .gitignore). They're rebuilt on every
   deploy, with the host's settings, which is how the guest book knows whether
   it's open.
8. Test: `GUESTBOOK_MEMORY=1 npm run build`, then
   `scripts/local-server.mjs --root .`.

The `agent-view/` folder holds no secrets (the password and storage keys live
only in Vercel's settings), but its comments, `content.mjs` and `exclude` list
are nobody's business: keep the redirect in step 5, and keep confidential names
out of the folder entirely (`references/content.md` § What stays out).
`verify.mjs` checks that `/agent-view/config.mjs` isn't readable.

## Other static generators

Run `build.mjs` into the folder the generator copies as-is, before its build:

| Generator | Command (as `prebuild`, or before the build command) |
|---|---|
| Vite, React SPA, SvelteKit static, Gatsby | `node agent-view/build.mjs --out public` (SvelteKit and Gatsby: `--out static`) |
| Eleventy | `--out` a passthrough-copied folder, e.g. `public`, with `addPassthroughCopy({ public: "/" })` |
| Hugo | `--out static` |
| Jekyll | `--out .` and make sure `_config.yml` doesn't exclude the files |

For head tags, put the markers in the generator's base layout and pass it to
`--head`, or render `view.headTags()` from the layout if it can run JavaScript.

## robots.txt

`node agent-view/build.mjs --print robots` prints the lines for the current
config. The `Content-Signal` line belongs **inside a group**: after a
`User-agent:` line and before the next one.

```
User-agent: *
Allow: /
Content-Signal: search=yes, ai-input=yes

# For AI agents: an agent-readable summary of this site is at
# https://example.com/llms.txt (and shown to people at /agents)
```

**A crawler obeys only the group that names it**, and falls back to
`User-agent: *` only when no group does. So if the file already has groups for
specific crawlers (`User-agent: GPTBot`, `User-agent: CCBot`…), put the same
`Content-Signal` line in each of those groups too, or a "no" to training never
reaches the crawlers that collect training data. Keep each group's own rules as
they were.

```
User-agent: GPTBot
Disallow: /drafts/
Content-Signal: search=yes, ai-input=yes, ai-train=no

User-agent: *
Allow: /
Disallow: /drafts/
Content-Signal: search=yes, ai-input=yes, ai-train=no
```

Merge into an existing robots.txt rather than replacing it: keep its rules and
sitemap. When `contentSignal` changes in `config.mjs`, change every
`Content-Signal` line too; `verify.mjs` checks each group against the config.
Tell the person these are stated preferences: well-behaved crawlers follow
them, nothing enforces them, and robots.txt doesn't hide pages (a `Disallow`ed
draft is still public to anyone with the link).

## vercel.json

Merge `templates/vercel/vercel.json` into the project's own:

- The `/agent-view/:path*` redirect matters on routes that serve the project
  root (plain HTML, Jekyll); elsewhere it's harmless. If `paths.page` isn't
  `/agents`, change its destination.
- `/guestbook` is a rewrite to the guest book's own handler, not a plain
  redirect, so it answers 404 while the guest book is closed.

- `/guestbook/admin` must come before `/guestbook/:id` in `rewrites`.
- If the site already has a catch-all rewrite (single-page apps often send
  everything to `/index.html`), the agent paths and `/api/*` must come first.
- The headers block sets plain-text and markdown types and lets other sites
  read the agent files (`Access-Control-Allow-Origin: *`). If `paths.work`
  isn't `/work`, change the `/work/(.*).md` source.

## .gitignore

On the `build.mjs` routes, the generated files are rebuilt on every deploy and
don't belong in the repo:

```
# agent-view (generated by agent-view/build.mjs)
agent-view/.last-build.json
/llms.txt
/llms-full.txt
/profile.json
/work/*.md
/agents/index.html
```

Prefix the paths with the `--out` folder (`/public/llms.txt`…). If a file was
already committed, remove it from the repo (`git rm --cached`): `build.mjs`
won't replace a file it didn't write, so a stale copy can stop the build on the host.
