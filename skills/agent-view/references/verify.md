# Verify: run it, don't just read it

`scripts/verify.mjs` checks a running site over HTTP. `scripts/local-server.mjs`
serves a built site the way Vercel does (middleware, `api/`, `vercel.json`
redirects, rewrites and headers), with in-memory storage. Together they cover
what the original build passed before it went live. `<skill>` below is this
skill's folder.

## 1. Open build, every check

```bash
# a throwaway password for local testing only, never the real one
export GUESTBOOK_ADMIN_PASSWORD="local-test-$(openssl rand -hex 6)"

GUESTBOOK_MEMORY=1 npm run build
node <skill>/scripts/local-server.mjs --root . --static dist --port 4399 &
node <skill>/scripts/verify.mjs --url http://localhost:4399 --expect open --write
```

`--static` is the folder the build writes (`dist` for Astro, `_site` for
Eleventy…). For plain HTML, the site is the project root, so leave it out:
`local-server.mjs --root . --port 4399`. Any free port works.

On Next.js, skip the local server: `GUESTBOOK_MEMORY=1 next build`, then
`GUESTBOOK_MEMORY=1 next start -p 4399` (with the password exported), and point
`verify.mjs` at it. On Next.js 15 and earlier the check-in test can fail
locally for a harmless reason (`references/frameworks.md` § Next.js).

Run the server in the background and stop it afterwards. `--write` signs the
guest book from a test address, hits the daily limit and uses the review page;
storage is in memory, so restarting the server clears it.

## 2. Closed build: nothing about the guest book

```bash
npm run build                           # no GUESTBOOK_MEMORY: storage isn't connected
node <skill>/scripts/local-server.mjs --root . --static dist --port 4399 --closed &   # plain HTML: no --static
node <skill>/scripts/verify.mjs --url http://localhost:4399 --expect closed
```

This is the state the site ships in before the person connects storage, so it
has to be clean.

## What the checks cover

| Group | Checks |
|---|---|
| Agent files | `llms.txt`, `llms-full.txt`, `profile.json` served with the right types; every case study linked from `llms.txt` is served as markdown; a missing one is a 404; CORS on the files (warning) |
| Discovery | `/agents` prints `llms.txt`; the homepage links to `/agents`, has `<link rel="alternate">` to `llms.txt` and a schema.org `Person`; robots.txt gives every crawler group the configured Content-Signal and points to `llms.txt`; the `agent-view/` folder isn't readable; images listed in the files exist (warning) |
| Closed | No agent file or page mentions the guest book; the API says closed without naming it; `/guestbook` doesn't lead anywhere; signing is refused; the review page doesn't open |
| Open | The files describe the guest book as facts; the form is on `/agents`; the listing answers and never includes "working for"; unknown and malformed receipt links are 404s; `/guestbook` redirects; the review page asks for a password and refuses a wrong one |
| Check-ins (`--write`) | A browser and a made-up bot aren't counted and a raw user agent never shows; `Claude-User` is counted under its fixed name |
| Signing (`--write`) | JSON sign gets a 201 and a receipt; the receipt shows the entry; new public entries wait; form sign gets a 303 to the receipt; eight kinds of bad entry get a 400 or 413 without using up the limit; markup and planted instructions are kept as escaped plain text and invisible characters are stripped; private signing; one signature over the daily limit gets a 429 |
| Review (`--write` + password) | Lists waiting entries and private notes; approve publishes without "working for"; hide works on waiting and approved entries; archive works and private notes can't be approved; a form posted from another site gets a 403; unknown actions and malformed ids get a 400 |
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
| robots.txt: a group without a Content-Signal | The file names a crawler in its own group (GPTBot…); add the same line there |
| `agent-view/config.mjs` is readable | The `/agent-view/:path*` redirect is missing from `vercel.json` |
| Images listed in the files are missing | Paths in `content.mjs` don't match the site, or the images aren't in the repo |
| API 404 when open | `api/` isn't at the project root, `vercel.json` rewrites missing, or (Next.js) route handlers in the wrong folder |
| Review page 503 | `GUESTBOOK_ADMIN_PASSWORD` isn't set where the server runs |
| Check-in not counted | Middleware matcher doesn't include the path, or (Next.js locally) the in-memory store isn't shared |
| Closed build mentions the guest book | The build ran with `GUESTBOOK_MEMORY=1` or storage variables set |
