# Deploy: going live, in plain words

Don't deploy, push, create databases or set passwords on the person's
accounts unless they ask you to. Most people want to click these themselves.
Give them the steps below as written, in plain words, and wait.

## The order

1. **Ship the agent view first, guest book closed.** The files, the `/agents`
   page, the head tags and robots.txt go live with the next deploy. The guest
   book's code can ship too: it stays off and unmentioned until step 2.
2. **Then switch the guest book on** with the two Vercel steps below, and
   redeploy.
3. **Check it live**: `verify.mjs --url https://<their site>` (read-only), then
   sign once from `/agents`, approve it at `/guestbook/admin`, and hide it.

## The two Vercel steps (give these to the person)

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
- **Changing the name, choices or limits:** `agent-view/config.mjs`, then
  deploy. Existing entries keep working.
- **Switching it off:** `guestbook.enabled: false` and deploy. Entries stay in
  the database.
- **Changing the training stance:** `contentSignal.aiTrain` in `config.mjs`
  and every `Content-Signal` line in robots.txt, together.
- **Keeping it current:** with an adapter, nothing to do: the files rebuild
  from the site's content on every deploy. With a snapshot, update
  `content.mjs` when the site changes.

## Other hosts

The agent view itself is static files and works on any host. The guest book
needs three things: serverless functions for the endpoints, a way to run code
before serving the agent paths (for check-ins), and a Redis that speaks
Upstash's REST API. The handlers are standard web `(Request) → Response`
functions, so porting means writing the small mounting files:

- **Netlify:** Functions (`export default (req) => guestbook(req)` with
  `export const config = { path: "/api/guestbook" }`) and an Edge Function for
  check-ins. Upstash connects by hand.
- **Cloudflare Pages:** `functions/api/guestbook.js` exporting
  `onRequest({ request })`, and `_middleware.js` for check-ins; environment
  variables come in through `context.env`, so `store.mjs`'s `env()` needs
  adapting.
- **GitHub Pages and other static-only hosts:** the agent view yes, the guest
  book no. Leave `enabled: false` and skip the endpoints.

None of these ports has been run. Say so, and run `verify.mjs --write` against
a preview before calling it done.

## Costs

Nothing on the person's side runs a model, so there's nothing for a visitor to
run up. Upstash's free plan comfortably covers a personal site's guest book;
check its current limits if traffic grows. Every visitor's signing is capped
per address and per day.
