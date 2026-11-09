# Deploy: going live, in plain words

Contents: § The order · § What to say about the reading choice · § The two
Vercel steps · § Previews · § Afterwards · § Other hosts · § Costs

Don't deploy, push, create databases or set passwords on the person's
accounts unless they ask you to. Most people want to click these themselves.
Give them the steps below as written, in plain words, and wait.

## The order

1. **Ship the door policy first, guest book closed.** The files, the `/agents`
   page, the head tags, the middleware and robots.txt (with the reading
   choice) go live with the next deploy. The guest
   book's code can ship too: it stays off and unmentioned until step 2.
2. **Then switch the guest book on** with the two Vercel steps below, and
   redeploy. Guest book off (the person said no, or No AI without it, or a
   host other than Vercel): skip this step and the two Vercel steps entirely.
3. **Check it live**: `verify.mjs --url https://<their site>` (read-only), then,
   with the guest book on, sign once from `/agents`, approve it at
   `/guestbook/admin`, and hide it.

## What to say about the reading choice

Say it in plain words when you hand off, whatever they chose:

> Your site now has a door policy: it says how you'd like AI to treat it, in
> robots.txt, in the files agents read and on `/agents`. It's a stated wish,
> not a lock. Crawlers that collect pages for AI training
> and search say they follow robots.txt. Tools that open a page because a
> person asked (ChatGPT, Perplexity, Meta AI, Alexa, Google's agents) say
> robots.txt may not apply to them; Claude's says it does. Nothing enforces
> any of it, which is why the wish is also written in the files and on
> `/agents`, and why the guest book counts who came anyway.

(Without the guest book, drop the last clause.)

Then the line for their choice, and that a change can take a day or more to
reach crawlers and doesn't undo anything already collected:
`references/reading.md` § What to tell the person.

## The two Vercel steps (give these to the person)

Only with the guest book on.

> **1. Add the guest book's storage (free).** In Vercel, open the project, then
> **Storage** → **Create** (or **Connect Database**) → **Upstash for Redis** →
> the free plan. Connect it to this project, for all environments. That's all:
> it adds two settings the guest book looks for.
>
> **2. Set your review password.** **Settings** → **Environment Variables** →
> add `GUESTBOOK_ADMIN_PASSWORD` with a long password you keep in your password
> manager. You'll type it at `/guestbook/admin` (any username works).
>
> **Then redeploy**: **Deployments** → the latest one → **⋯** → **Redeploy**.
> The site checks for the storage while it builds, so it needs a fresh build to
> switch the guest book on.

Behind the scenes: the Upstash integration sets `KV_REST_API_URL` and
`KV_REST_API_TOKEN` (an Upstash database set up by hand can use
`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` instead). The guest book
opens when `config.guestbook.enabled` is true and both storage values are there
at build time. Never ask the person to paste these values or the password into
chat, and never put them in a file.

## Previews

Vercel gives every branch a preview address. If the storage is connected to
"all environments", previews share the live guest book's data: fine for a
look, but don't run `verify.mjs --write` against a preview unless it has its own
database (connect a second free Upstash database to the Preview environment
only).

## Afterwards

- **Reading entries:** `/guestbook/admin`. Approve, hide, archive.
- **Changing the name, choices or limits:** `door-policy/config.mjs`, then
  deploy. Existing entries keep working.
- **Switching it off:** `guestbook.enabled: false` and deploy. Entries stay in
  the database.
- **Changing the training stance or how agents should read the site:**
  `contentSignal.aiTrain` or `reading` in `config.mjs`, then deploy. The files,
  `/agents`, the head tags and the robots.txt block (`--robots` in the build)
  all follow.
- **Keeping it current:** with an adapter, nothing to do: the files rebuild
  from the site's content on every deploy. With a snapshot, update
  `content.mjs` when the site changes.

## Other hosts

The door policy and the agent files are static files and work on any host;
markdown on request needs the middleware, so it's Vercel and Next.js only. The
guest book needs three things: serverless functions for the endpoints, a way to run code
before serving the agent paths (for check-ins), and a Redis that speaks
Upstash's REST API. The handlers are standard web `(Request) → Response`
functions, so porting means writing the small mounting files:

- **Netlify:** Functions (`export default (req) => guestbook(req)` with
  `export const config = { path: "/api/guestbook" }`) and an Edge Function for
  check-ins. Upstash connects by hand.
- **Cloudflare Pages:** `functions/api/guestbook.js` exporting
  `onRequest({ request })`, and `_middleware.js` for check-ins; environment
  variables come in through `context.env`, so `store.mjs`'s `env()` needs
  adapting. Keep Markdown for Agents off in "files first" and "no AI"
  (`references/reading.md`).
- **GitHub Pages and other static-only hosts:** the door policy and the files
  yes; markdown on request and the guest book no. Leave `enabled: false` and
  skip the endpoints.

Each port must take the visitor's address from its platform's trusted header,
or the per-address limit can be faked: Vercel overwrites `X-Forwarded-For`
itself, but elsewhere the first value is whatever the client sends. Set
`guestbook.ipHeader` in `config.mjs` (Cloudflare: `"cf-connecting-ip"`;
Netlify: `"x-nf-client-connection-ip"`) rather than changing code.

None of these ports has been run. Say so, and run `verify.mjs --write` against
a preview before calling it done.

## Costs

Nothing on the person's side runs a model, so there's nothing for a visitor to
run up. Upstash's free plan comfortably covers a personal site's guest book;
check its current limits if traffic grows. Every visitor's signing is capped
per address and per day.
