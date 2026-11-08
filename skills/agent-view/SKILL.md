---
name: agent-view
description: Give a personal site or portfolio an agent-facing side, built from the site's own content - llms.txt, llms-full.txt, profile.json and one markdown file per project - plus a visible /agents page styled as a code editor in the site's colours and fonts, and an optional guest book AI agents can sign (check-in counts, receipts, limits, a password-protected review page). Use when someone wants their site to be readable by AI agents, asks for llms.txt, an "agent view" or "For agents" page, agent-friendly structured data, or a guest book or visitors' book for agents. Works with Astro, Next.js, plain HTML and other static sites; the guest book runs on Vercel with Upstash Redis. Not for blocking or charging AI crawlers, SEO work in general, or chatbots that answer for the person.
---

# Agent view

More and more, people send an agent to read the web for them. A site built for
eyes reaches an agent as layout noise: case studies hidden in modals, titles
without descriptions, nothing about availability. This skill gives the site a
second, agent-shaped side, generated from the same content people see, so the
two can never drift apart:

| Piece | What it is |
|---|---|
| `/llms.txt` | The short version: who, what, the work, how to get in touch ([llmstxt.org](https://llmstxt.org)) |
| `/llms-full.txt` | Everything in one file, every case study included |
| `/profile.json` | The same as structured data |
| `/work/<slug>.md` | One case study per file |
| Head tags | `<link rel="alternate">` to the files, schema.org `Person` JSON-LD on the homepage |
| `robots.txt` | A Content-Signal line stating how the content may be used |
| `/agents` | All of it shown to people, styled as a file open in a code editor |
| Guest book (optional) | Agents check in (counted by name) and can sign on the way out, with a receipt link for the person who sent them. The owner approves public notes at `/guestbook/admin` |

Each person hosts their own copy and their own data. Nothing runs on anyone
else's server.

**Read this file, then work.** Open a reference when the table at the end says to.

## Ask first, all at once

Before writing anything, ask the person these in one message, each with its
default, so "use the defaults" is a full answer. Everything else you work out
from the site.

1. **Availability**, one line as agents should repeat it. Default: say nothing.
2. **Contact**: email, a contact page, or both, and anything to say about rates
   or start dates. Default: the email the site already shows; rates unstated.
3. **What stays out**: client work under NDA, locked or password-protected
   projects, drafts. Default: whatever the site already hides.
4. **Guest book**: yes or no, and its name (Guest book, Visitors' book, Libro de
   visitas…). Default: yes, "Guest book".
5. **How AI may use the site**, stated in robots.txt. Search results and AI
   answers that read a page live: yes or no (default: yes to both, which is the
   point of an agent view). Training AI models: yes, no, or say nothing. Explain
   it plainly: saying nothing leaves it unstated, which in practice means
   allowed, and every answer is a stated preference, not a lock. Default for
   training: say nothing.

## Workflow

1. **Read the site.** The framework and host; where the content lives (data
   files, markdown, a CMS, or hand-written HTML); the colours, fonts and theme
   switch; the existing `robots.txt`, `<head>` layout, `vercel.json`,
   middleware and `package.json`; and whether `/agents`, `/work/*.md`,
   `/guestbook` or `/api/guestbook` are already taken. → `references/content.md`
2. **Copy `templates/agent-view/` to `<project>/agent-view/`** and fill in two
   files. `config.mjs` takes the answers above, the site's address, and the
   page's colours and fonts taken from the site. `content.mjs` maps the site's
   content into the shape the files need: an **adapter** that reads the site's
   own data or files at build time (data files, markdown, a CMS, or HTML pages
   regular enough to parse), so the files can't drift; a **snapshot** copied in
   once only when there's nothing dependable to read. Facts only, in the site's
   own words. → `references/content.md`
3. **Serve the files** by the route for the framework (table below).
   → `references/frameworks.md`
4. **Make it findable**: the `/agents` page, a visible "For agents" link in the
   site's footer or menu, the head tags, and the robots.txt lines
   (`node agent-view/build.mjs --print robots`). → `references/agents-page.md`
   for the page, `references/frameworks.md` for the rest.
5. **The guest book**, if wanted: the endpoints, the review page and the
   check-in middleware for the framework, plus the `vercel.json` rewrites. It
   stays switched off until storage is connected on the host, so the site can
   ship before that. → `references/guestbook.md`
6. **Verify by running, not by reading.** Build with the guest book open
   (`GUESTBOOK_MEMORY=1`), serve it with `scripts/local-server.mjs`, run
   `scripts/verify.mjs --expect open --write` with an admin password; then
   build and verify it closed. Look at `/agents` in both themes and at phone
   width, and submit the form in a real browser. → `references/verify.md`
7. **Hand off.** Don't deploy, push, connect storage or set passwords on the
   person's accounts unless they ask. Walk them through the two Vercel steps in
   plain words (connect Upstash, set `GUESTBOOK_ADMIN_PASSWORD`, redeploy), and
   say what you verified and what you didn't. → `references/deploy.md`

## Routes by framework

| Site | Agent files and `/agents` | Guest book |
|---|---|---|
| **Astro**, static output, on Vercel | Endpoints from `templates/astro/src/pages/` | `templates/vercel/`: root `api/`, `middleware.js`, `vercel.json` |
| **Next.js**, App Router | Route handlers from `templates/next/app/` | `templates/next/`: route handlers, and `proxy.js` (Next 16+) or `middleware.js` (15 and earlier) |
| **Plain HTML** on Vercel | `node agent-view/build.mjs --out .` as the build, head markers in each page | `templates/vercel/`, and `package.json` with `"type": "module"` |
| **Other static generators** (Eleventy, Hugo, Vite, SvelteKit static…) | `build.mjs --out <the static folder>` before the site's build | `templates/vercel/` |
| **Not on Vercel** | Any of the above | Needs serverless functions and a Redis: `references/deploy.md` § Other hosts |
| **Hosted builders** (Squarespace, Wix, Framer, Webflow) | Only if the builder can serve custom files at those paths; say so plainly | Not supported |

## Non-negotiables: the safety design

These come from the original build and its threat model. Keep every one, in
every framework, and change settings rather than code.

- **Visible, never hidden.** Everything agents get is shown to people at
  `/agents`. No hidden text, no agent-only content in pages, no serving agents
  different HTML from people. Hidden instructions are how prompt injection
  works, and careful agents distrust sites that do it.
- **Facts, not instructions.** The files state things ("This site keeps a guest
  book. Signing is optional."). They never tell agents what to do. Careful
  agents treat instructions on a page as a possible attack.
- **Notes never feed the agent files.** Nothing a visitor wrote goes into
  `llms.txt`, `llms-full.txt`, `profile.json`, the markdown, the JSON-LD or any
  page's HTML. Approved notes appear on `/agents` only through the live script,
  which writes them with `textContent`. Agents get counts, so one agent can't
  plant instructions for the next.
- **Fixed names only.** Check-ins store a name from the fixed list in
  `guestbook/rules.mjs`, never the raw user agent, address or any header text.
- **The owner approves public notes.** Public entries wait at
  `/guestbook/admin`. Private notes only ever show there. "Working for" is never
  public. Nothing is deleted: hide and archive only move entries.
- **Plain text and limits.** Everything a visitor sends is cleaned, stored and
  shown as plain text, with the note length, 8 KB body, per-address daily and
  site-wide daily limits.
- **Closed until connected.** The guest book is mentioned nowhere until it's
  enabled in `config.mjs` and its storage is connected on the host.
- **Secrets stay on the host.** `GUESTBOOK_ADMIN_PASSWORD` and the storage
  keys live only in the host's environment variables. Never write them into a
  file, a commit, the config or the chat.
- **Only what's already public.** Locked, NDA, draft and unlisted work stays
  out, and so do rates unless the person asks for them. Leave confidential work
  out of `content.mjs` entirely rather than naming it anywhere (comments, the
  `exclude` list): code can end up public.

## Don't

- Don't edit `core.mjs`, `page.mjs`, `theme.mjs` or `guestbook/*` to fit a
  site. Everything site-specific is in `config.mjs` and `content.mjs`. If a fix
  truly belongs in shared code, keep every rule above and rerun `verify.mjs`.
- Don't overwrite an existing `llms.txt`, `robots.txt`, `vercel.json` or
  middleware: merge into it. `build.mjs` refuses to replace files it didn't
  write.
- Don't hand-write `llms.txt` or `profile.json`. They're generated, so they
  stay true when the site changes.

## References

| File | Read it |
|---|---|
| `references/content.md` | Steps 1–2: finding the content, the shape `content.mjs` returns, adapter or snapshot, what stays out |
| `references/frameworks.md` | Step 3–4: where each piece goes in Astro, Next.js, plain HTML and other generators; head tags, robots.txt, vercel.json, .gitignore |
| `references/agents-page.md` | Step 4: the page's anatomy, taking colours, fonts and the theme switch from the site, standalone or inside the layout |
| `references/guestbook.md` | Step 5: how it works, fields, endpoints, storage, settings, what each safety rule protects |
| `references/verify.md` | Step 6: the commands, what each check covers, what to look at by eye |
| `references/deploy.md` | Step 7: the Vercel steps in plain words, the launch order, other hosts |

`scripts/local-server.mjs` serves a built site the way Vercel would (middleware,
`api/`, `vercel.json`), with in-memory storage. `scripts/verify.mjs` runs the
checks over HTTP against it, a preview, or the live site (read-only).
