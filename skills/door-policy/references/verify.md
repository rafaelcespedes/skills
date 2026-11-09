# Verify: run it, don't just read it

`scripts/verify.mjs` checks a running site over HTTP. `scripts/local-server.mjs`
serves a built site the way Vercel does (middleware, `api/`, `vercel.json`
redirects, rewrites and headers), with in-memory storage. Together they cover
what the original build passed before it went live. `<skill>` below is this
skill's folder. `scripts/selftest.mjs` checks the shared code without a
server; run it after any change to `door-policy/`'s shared files
(`node <skill>/scripts/selftest.mjs --project .`).

Contents: § 1. Open build · § 2. Closed build · § What the checks cover ·
§ By eye · § After it's live · § When a check fails

## 1. Open build, every check

Guest book off (`enabled: false`, or No AI without it): skip this section and
run § 2 alone. `verify.mjs --expect open` stops with a message if config.mjs
has the guest book switched off.

```bash
# a throwaway password for local testing only, never the real one; the
# accent checks that passwords with é or ñ work
export GUESTBOOK_ADMIN_PASSWORD="café-local-$(openssl rand -hex 6)"
PORT=$((5000 + RANDOM % 3000))   # its own port, so parallel sessions don't collide

GUESTBOOK_MEMORY=1 npm run build
node <skill>/scripts/local-server.mjs --root . --static dist --port $PORT &
node <skill>/scripts/verify.mjs --url http://localhost:$PORT --expect open --write
```

On Windows (cmd), set variables first: `set GUESTBOOK_MEMORY=1` and
`set GUESTBOOK_ADMIN_PASSWORD=…`, or prefix commands with `npx cross-env
GUESTBOOK_MEMORY=1`. `verify.mjs` stops at once if the server isn't serving
this site (another session's server on the same port).

`--static` is the folder the build writes (`dist` for Astro, `_site` for
Eleventy…). For plain HTML, the site is the project root, so leave it out:
`local-server.mjs --root . --port $PORT`. A single-page app with a catch-all
rewrite works as on Vercel: real files and functions are served first.

On Next.js, skip the local server: `GUESTBOOK_MEMORY=1 next build`, then
`GUESTBOOK_MEMORY=1 next start -p $PORT` (with the password exported), and point
`verify.mjs` at it. On Next.js 15 and earlier the check-in test can fail
locally for a harmless reason (`references/frameworks.md` § Next.js).

Run the server in the background and stop it afterwards. `--write` signs the
guest book from a test address, hits the daily limit and uses the review page;
storage is in memory, so restarting the server clears it.

Test each reading choice the person might switch to, not only the one they
picked: set `reading` in `config.mjs`, rebuild (the build rewrites the
robots.txt block), and run the checks again. Put their choice back afterwards.

## 2. Closed build: nothing about the guest book

```bash
npm run build                           # no GUESTBOOK_MEMORY: storage isn't connected
node <skill>/scripts/local-server.mjs --root . --static dist --port $PORT --closed &   # plain HTML: no --static
node <skill>/scripts/verify.mjs --url http://localhost:$PORT --expect closed
```

This is the state the site ships in before the person connects storage, so it
has to be clean.

## What the checks cover

| Group | Checks |
|---|---|
| Right site | Stops first if `/llms.txt` doesn't start with the owner's name |
| Agent files | `llms.txt`, `llms-full.txt`, `profile.json` served with the right types (in "no-ai", only `llms.txt`, and the other two not served); `llms.txt` has only link items after its first section (llmstxt.org); every same-site link in it answers (links to other sites too, against a live address, as a warning); every case study is served as markdown; a missing one is a 404; CORS on the files (warning) |
| Discovery | `/agents` shows every line of `llms.txt`, in order; the homepage links to `/agents` outside comments and hidden elements, has `<link rel="alternate">` or `describedby` to `llms.txt` (none in "no-ai"), the `bingbot` and `tdm-reservation` tags and `/.well-known/tdmrep.json` when training is no (none otherwise), and a schema.org `Person`; `door-policy/`, `package.json`, `middleware.js` and the installed skill aren't readable; images listed in the files exist (warning) |
| Reading preference | `references/reading.md` § What verify checks |
| Markdown on request | `/` and a case-study page asked for as markdown get `llms.txt` and the `.md`; browsers get the page, with `Vary: Accept` and the `Link` header; nothing in "no-ai"; skipped where the project has no middleware |
| Closed | No agent file, page or robots.txt mentions the guest book; the API says closed without naming it; `/guestbook`, a receipt link and `/guestbook/admin` are plain 404s that name nothing; signing is refused |
| Open | The files describe the guest book as facts; the form is on `/agents`; in files first, robots.txt lets agents reach it; the listing answers and never includes "working for" or ids; unknown and malformed receipt links are 404s; `/guestbook` redirects; the review page asks for a password, can't be framed, and refuses a wrong one |
| Check-ins (`--write`) | A browser, a made-up bot and a fake `Signature-Agent` aren't counted and a raw user agent never shows; `Claude-User` is counted under its fixed name, once per address and day (polled for 5 seconds) |
| Signing (`--write`) | JSON sign gets a 201 and a receipt (also as `?format=json`); new public entries wait; form sign gets a 303; every kind of bad entry (wrong types, invisible names, over 8 KB with or without `Content-Length`) gets a 400 or 413 without using up the limit; markup and planted instructions are kept as escaped plain text, and invisible, tag and filler characters and mark stacks are stripped; private signing; over the daily limit gets a 429 while another address can still sign. Against a live address the limit tests are skipped and the rest stop when the day's signatures run out |
| Review (`--write` + password) | Lists waiting entries (with the real total) and private notes; works with a password with accents; approve publishes without the id or "working for", which then shows in no public answer; hide and archive work; private notes can't be approved; posts from another site, cross-site or from no page at all get a 403; unknown actions and malformed ids get a 400 |
| Isolation (`--write`) | Nothing from any test entry appears in the agent files, `/agents` or the homepage |

## By eye, in a real browser

The checks can't see the page. Open it (the built-in browser works) and look:

- `/agents` in dark and light, at 1440px and 375px wide. Colours and font
  should read as the site's own. No horizontal scrolling on a phone.
- Submit the form for real: it should land on the receipt page. Then approve
  the entry and reload `/agents`: the note should appear under "Notes", as
  plain text. The review page asks for the password in a browser dialog, which
  a browser tool usually can't fill; approve from the shell instead (the form
  posts `action=approve&id=<id>` to `/guestbook/admin` with Basic auth and a
  same-site `Origin`), and to look at the review page, fetch it with the test
  password and open the saved HTML. Never type the person's real password
  anywhere.
- Tab through the form with the keyboard.
- The receipt and review pages in both themes.

Testing several sites at once? Give each its own port and browser tab, and
check the address before every click: tabs in a shared browser pane can be
taken over by another session.

## After it's live

Read-only, against the real address, once the person has deployed:

```bash
node <skill>/scripts/verify.mjs --url https://example.com
```

Don't use `--write` there: it creates real entries and uses up the day's limit
for that address. To check signing on the live site, sign once from `/agents`
in a browser, approve it at `/guestbook/admin`, then hide it.

## When a check fails

| Failure | Usually |
|---|---|
| `/llms.txt` 404 | The build didn't run before the site's build, or wrote to the wrong folder (`--out`) |
| Case study markdown 404 | `paths.work` doesn't match where the route or files are |
| Homepage has no `/agents` link | The footer link is missing, or it uses a different path from `paths.page` |
| robots.txt: a name without a Content-Signal | The person's own rules name a crawler the block doesn't (rerun `--robots`; it adds the line), or the block is missing |
| robots.txt: an AI crawler "may still read the pages" or "is asked not to read" a file | The build doesn't run `--robots`, or old hand-merged door-policy lines sit outside the markers: delete those once and rebuild |
| The files and the page don't state the same preference | The site was built before `reading` changed, or `page.intro` was overridden without the wish |
| `door-policy/config.mjs` is readable | The `/door-policy/:path*` redirect is missing from `vercel.json` |
| Images listed in the files are missing | Paths in `content.mjs` don't match the site, or the images aren't in the repo |
| API 404 when open | `api/` isn't at the project root, `vercel.json` rewrites missing, or (Next.js) route handlers in the wrong folder |
| Review page 503 | `GUESTBOOK_ADMIN_PASSWORD` isn't set where the server runs |
| Review page "can be framed", review actions skipped | The site's own headers (an existing middleware, `vercel.json`) overwrite the guest book's on `/guestbook`: skip those paths there (`references/frameworks.md` § Next.js) |
| Markdown on request fails | The middleware isn't in place, its matcher lacks `/` or the case-study folder (`paths.workPages`), or (Next.js 16) the project still has `middleware.js` |
| `tdmrep.json` missing | The build doesn't run `--robots`, or (endpoint routes) the tdmrep endpoint wasn't copied |
| Check-in not counted | Middleware matcher doesn't include the path, or (Next.js locally) the in-memory store isn't shared |
| Closed build mentions the guest book | The build ran with `GUESTBOOK_MEMORY=1` or storage variables set |
| "This server isn't serving …'s site" | Wrong `--url` or `--project`, or another session's server on that port |
| `/agents` doesn't show a line of llms.txt | `page.mjs` was edited, or the page is built from a different copy of `door-policy/` |
