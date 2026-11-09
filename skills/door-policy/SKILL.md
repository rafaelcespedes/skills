---
name: door-policy
description: Sets a personal site's door policy for AI - let AI read anything, send it to clean agent files first, or ask it to stay out - stated as a wish in robots.txt (with Content Signals, and TDMRep for a no to training), in the files and on a visible /agents page. Builds those files from the site's own content - llms.txt, llms-full.txt, profile.json, a markdown file per project, markdown on request - plus an optional guest book agents can sign. Use when someone asks to "set up a door policy" or "add an agent view to my site", wants their site readable by AI agents or ChatGPT, asks for llms.txt or a "For agents" page, or wants AI crawlers to stay away or not train on their work. Astro, Next.js, plain HTML and static generators; guest book on Vercel. Not for enforced bot blocking, general SEO, or chatbots that answer for the person.
license: MIT
compatibility: Needs Node 18+ and the site's source code; the guest book needs Vercel and Upstash Redis.
---

# Door policy

The site's door policy for AI agents: let them in, send them to clean files,
or ask them to stay out. The choice is stated, as the person's wish, in
robots.txt, in every agent file and on a visible `/agents` page. For the
agents it welcomes, the site gets a second, agent-shaped side, generated from
the same content people see, so the two can never drift apart:

| Piece | What it is |
|---|---|
| `robots.txt` | A generated block stating the reading and training choice to each AI crawler |
| `/llms.txt` | The short version: who, what, the work, how to get in touch ([llmstxt.org](https://llmstxt.org)). In No AI, the only file: who, how to reach them, the wish |
| `/llms-full.txt` | Everything in one file, every case study included (not in No AI) |
| `/profile.json` | The same as structured data (not in No AI) |
| `/work/<slug>.md` | One case study per file (not in No AI) |
| Markdown on request | `/` and case-study pages answer with the matching file when a client asks for markdown (not in No AI) |
| Head tags | `<link rel=alternate>` to the files (not in No AI), schema.org `Person` JSON-LD on the homepage, the reservation tags for a no to training |
| Reservations | For a no to training: W3C TDMRep (`/.well-known/tdmrep.json`) and Cloudflare's Content Signals text in robots.txt |
| `/agents` | All of it shown to people, styled as a file open in a code editor |
| Guest book (optional) | Agents check in (counted by name) and can sign on the way out, with a receipt link for the person who sent them. The owner approves public notes at `/guestbook/admin` |

Each person hosts their own copy and their own data. Nothing runs on anyone
else's server. Paths: `templates/`, `scripts/` and `references/` are in this
skill's folder; `door-policy/` is in the person's project.

**Read this file, then work.** Open a reference when the table at the end says to.

## Ask first, all at once

Before writing anything, ask the person these five in one message, each with
its default, so "use the defaults" is a full answer. Everything else you work
out from the site. If you can't ask (a non-interactive run), use every
default, except where the request itself says how they feel about AI (below),
and list them in the hand-off.

1. **How should AI treat your site?** Anything goes / Files first (default) /
   No AI at all. Explain it with `references/reading.md` § What to tell the
   person, in one line each, including: "With files first, AI crawlers are
   asked to read the clean files, not your pages; an agent a person sent may
   also open your homepage, which points to the files. Google's and Bing's AI
   answers come from their search crawlers, which still read every page:
   robots.txt can't separate the two." For people who want nothing at all
   for AI, say there's also an option with no agent files: robots.txt alone
   states the wish.
   **Then one follow-up, skipped for No AI: training AI models on your work:
   yes, no, or say nothing (default).** Say what "say nothing" means: training
   crawlers may then read what the files offer, case studies and images
   included. If their words already set training to no (Read how they put it,
   below), show no as the default instead and say it came from how they put
   it.
2. **Availability**, one line as agents should repeat it. Default: say nothing.
3. **Contact**: email, a contact page, or both, and anything to say about rates
   or start dates. Default: the email the site already shows; rates unstated.
4. **What stays out**: client work under NDA, locked or password-protected
   projects, drafts. Default: whatever the site already hides.
5. **Guest book**: yes or no, and its name (Guest book, Visitors' book, Libro de
   visitas…). Default: yes if the site is on Vercel, otherwise no; "Guest
   book". With No AI the default is no, and it's offered as "a counter that
   shows which AI tools came anyway". The page and guest book interface are in
   English; the name is used as written.

Search results and AI answers are worked out from question 1 (`reading`):
search stays yes; AI answers are yes, or no in No AI. Set `contentSignal.search`
to `"no"` only if the person raises it.

**Read how they put it.** Map their words, from the request or the answers:

| They say | Choice |
|---|---|
| "I'd rather AI didn't read my pages", "not my pages", "just the clean version" | Files first, training **no** |
| "No AI", "keep AI away", "stop AI scraping", "don't use my work for AI" | No AI at all |
| "Don't train on my work" (and nothing about reading) | Files first, training no |
| "Make my site easy for ChatGPT", "I want AI to find me" | Anything goes or files first; ask which |

Any reluctant wording ("rather not", "don't want", "keep away") sets training to
**no** unless they say otherwise, so training crawlers never get the case
studies and images by default. When their words fit two rows, ask; in a
non-interactive run, pick the stricter one and say so.

If the site's robots.txt already keeps an AI crawler out completely
(`Disallow: /`, or `/*`), add: "Your robots.txt already blocks GPTBot
completely. Keep that? (Default: keep.)" If it lets an AI crawler in by name
where the choice would keep it out (`User-agent: GPTBot` / `Allow: /`, common
on sites that once welcomed it), add: "Your robots.txt lets GPTBot read
everything, and that line wins over the door policy. Remove it? (Default:
remove.)" It's an edit outside the block, so in a non-interactive run leave it
and flag it in the hand-off; the build warns about it either way. If it keeps
every crawler out (`User-agent: *` / `Disallow: /`), add: "Your robots.txt
keeps every crawler out. Files first would let AI crawlers, training crawlers
included, read the agent files. Keep everything closed? (Default: keep, which
works like No AI for crawlers.)" The build keeps their rule either way and
gives no AI crawler an Allow line over it; to open up, their own rule has to
change first.

## Workflow

Progress:

- [ ] Questions asked (or defaults listed)
- [ ] Site read: framework, content, theme, robots.txt, existing paths
- [ ] `door-policy/` copied, `config.mjs` and `content.mjs` filled in
- [ ] Files served by the framework's route
- [ ] `/agents`, footer link, head tags, robots.txt block in the build
- [ ] Middleware (markdown on request, check-ins) and guest book wired
- [ ] `verify.mjs` passes open (`--write`) and closed (guest book off: closed only)
- [ ] `/agents` and the form checked by eye, both themes
- [ ] Hand-off given

1. **Read the site.** The framework and host; where the content lives (data
   files, markdown, a CMS, or hand-written HTML); the colours, fonts and theme
   switch; the existing `robots.txt`, `<head>` layout, `vercel.json`,
   middleware and `package.json`; and whether `/agents`, `/work/*.md`,
   `/guestbook` or `/api/guestbook` are already taken. While reading, note
   anything that looks confidential but is publicly served (text in hidden
   elements, client-side password gates, draft folders) and tell the person
   in the hand-off, without copying it. Don't fix it unless asked.
   → `references/content.md`
2. **Copy `templates/door-policy/` to `<project>/door-policy/`** and fill in two
   files. `config.mjs` takes the answers above (question 1 is `reading`:
   `"anything"`, `"files-first"` or `"no-ai"`; its follow-up is
   `contentSignal.aiTrain`), the site's address and language, and the page's
   colours and fonts taken from the site. `content.mjs` maps the site's
   content: an **adapter** that reads the site's own data at build time (so
   the files can't drift), or a **snapshot** only when there's nothing
   dependable to read. Facts only, in the site's words, and only fields the
   pages show. → `references/content.md`
3. **Serve the files** by the route for the framework (table below).
   → `references/frameworks.md`
4. **Make it findable**: the `/agents` page, a visible "For agents" link in the
   site's footer or menu, the head tags, and robots.txt: add
   `build.mjs --robots <file>` to the build, which writes the reading choice
   between markers, keeps the person's own rules, and writes
   `.well-known/tdmrep.json` beside it for a no to training.
   → `references/agents-page.md` for the page, `references/reading.md` for
   robots.txt.
5. **The middleware and the guest book.** On Vercel and Next.js, the
   middleware answers requests for markdown (not in No AI) and counts
   check-ins; install it even without the guest book. The guest book, if
   wanted: the endpoints, the review page and the `vercel.json` rewrites. It
   stays switched off until storage is connected on the host, so the site can
   ship before that. → `references/frameworks.md`, `references/guestbook.md`
6. **Verify by running, not by reading.** Build with the guest book open
   (`GUESTBOOK_MEMORY=1`), serve it with `scripts/local-server.mjs` on a port of
   its own, run `scripts/verify.mjs --expect open --write` with an admin
   password; then build and verify it closed. Guest book off (`enabled:
   false`, or No AI without it): skip the open run; build and run
   `verify.mjs --expect closed` only. Look at `/agents` in both themes
   and at phone width and submit the form, in a browser tool if you have one,
   otherwise by asking the person to. → `references/verify.md`
7. **Hand off.** Don't deploy, push, connect storage or set passwords on the
   person's accounts unless they ask. With the guest book on, walk them
   through the two Vercel steps (connect Upstash, set
   `GUESTBOOK_ADMIN_PASSWORD`), then a redeploy, in plain words; without it,
   skip them. Say what the reading choice does and doesn't do, and what you
   verified and what you didn't. → `references/deploy.md`

## Routes by framework

| Site | Agent files and `/agents` | Middleware and guest book |
|---|---|---|
| **Astro**, static output, on Vercel | Endpoints from `templates/astro/src/pages/` | `templates/vercel/`: root `middleware.js`, `api/`, `vercel.json` |
| **Next.js**, App Router | Route handlers from `templates/next/app/` | `templates/next/`: `proxy.js` (Next 16+) or `middleware.js` (15 and earlier), route handlers |
| **Plain HTML** on Vercel | `node door-policy/build.mjs --out . --robots robots.txt` as the build, head markers in each page | `templates/vercel/`, and `package.json` with `"type": "module"` |
| **Other static generators and SPAs** (Eleventy, Hugo, Vite, SvelteKit static…) | `build.mjs --out <the static folder>` before the site's build | `templates/vercel/` |
| **Not on Vercel** | Any of the above | No markdown on request; the guest book needs serverless functions and a Redis: `references/deploy.md` § Other hosts |
| **Hosted builders** (Squarespace, Wix, Framer, Webflow) | Only if the builder can serve custom files at those paths; say so plainly | Not supported |

## Non-negotiables: the safety design

Keep every one, in every framework, and change settings rather than code.

- **Visible, never hidden.** Everything agents get is shown to people at
  `/agents`. No hidden text and no agent-only content: hidden instructions
  are how prompt injection works. A client that asks for markdown gets the
  same facts, in the format the client asked for, decided by its `Accept`
  header, never by its user agent.
- **Facts, not instructions.** The files state things ("This site keeps a guest
  book for agents. Signing is optional."). They never tell agents what to do.
  Careful agents treat instructions on a page as a possible attack.
- **The reading choice is a wish, said the same way everywhere.** "Ana asks
  that…", never "you may not…", in every file, on `/agents` and in robots.txt,
  with the training choice beside it. Never oversell it: it's a stated wish,
  not a lock. Nothing enforces it, and some tools say robots.txt may not
  apply to them. The one quoted exception is Cloudflare's Content Signals
  text, kept word for word in robots.txt as the legal reservation it is.
  → `references/reading.md`
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
- **Plain text and limits.** Everything a visitor sends is cleaned and kept as
  plain text, with note-length, 8 KB, per-address and site-wide daily limits.
- **Closed until connected.** The guest book is mentioned nowhere until it's
  enabled in `config.mjs` and its storage is connected on the host.
- **Secrets stay on the host.** The admin password and storage keys live only
  in the host's environment variables: never in a file, commit, config or chat.
- **Only what's already public.** Locked, NDA, draft and unlisted work stays
  out, and so do rates unless asked. Leave confidential work out of
  `content.mjs` entirely, unnamed even in comments: code can end up public.
  robots.txt invites AI crawlers to the exact images the files list, never to
  a file type.

## Don't

- Don't edit `core.mjs`, `page.mjs`, `theme.mjs`, `negotiate.mjs` or
  `guestbook/*` to fit a site. Everything site-specific is in `config.mjs` and
  `content.mjs`. If a fix truly belongs in shared code, keep every rule above
  and rerun `scripts/selftest.mjs` and `verify.mjs`.
- Don't overwrite an existing `llms.txt`, `vercel.json` or middleware: merge
  into it. `build.mjs` refuses to replace files it didn't write, and in
  robots.txt it only writes between its markers.
- Don't hand-write `llms.txt`, `profile.json`, `tdmrep.json` or the robots.txt
  block. They're generated, so they stay true when the site changes.

## References

| File | Read it |
|---|---|
| `references/content.md` | Steps 1–2: finding the content, the shape `content.mjs` returns, adapter or snapshot, what stays out, judgement calls |
| `references/frameworks.md` | Steps 3–5: where each piece goes in Astro, Next.js, plain HTML, SPAs and other generators; head tags, middleware, vercel.json, .gitignore; upgrading from agent-view |
| `references/reading.md` | Question 1 and step 4: the reading and training choices, the statements, the robots.txt block, the community list, the reservations, markdown on request, what to tell the person |
| `references/agents-page.md` | Step 4: the page's anatomy, taking colours, fonts and the theme switch from the site, standalone or inside the layout |
| `references/guestbook.md` | Step 5: how it works, fields, endpoints, storage, settings, what each safety rule protects |
| `references/verify.md` | Step 6: the commands, what each check covers, what to look at by eye |
| `references/deploy.md` | Step 7: the Vercel steps in plain words, the launch order, other hosts |

`scripts/local-server.mjs` serves a built site the way Vercel would, with
in-memory storage; `scripts/verify.mjs` checks it over HTTP (or a preview, or
the live site, read-only); `scripts/selftest.mjs` checks the shared code;
`scripts/refresh-ai-robots.mjs` refreshes the community crawler list.
