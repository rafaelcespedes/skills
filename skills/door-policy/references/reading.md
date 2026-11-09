# The reading choice: the site's door policy for AI

The one place for the reading choice: the three modes, the training choice,
the exact statements, the robots.txt block and how it merges, the community
list, the reservations, markdown on request, what to tell the person, and what
`verify.mjs` checks.

Contents: § The three modes · § Nothing at all · § The training choice ·
§ The statements · § robots.txt · § The community list · § The reservations ·
§ Markdown on request · § Head tags · § What to tell the person · § What verify
checks

## The three modes

`config.reading`, asked as question 1 ("How should AI treat your site?"). Fill
`content.mjs` the same way in every mode; the view does the rest.

| `reading` | robots.txt asks AI crawlers to… | What's published for agents |
|---|---|---|
| `"anything"` | read whatever they like | Every file |
| `"files-first"` (default) | read the agent files, `/agents`, the exact images and video the files list and (when open) the guest book; not the pages. Agents a person sent (`kind: "user-fetch"`) may also open the homepage | Every file |
| `"no-ai"` | stay away entirely, the community list included | `/llms.txt` alone: name, summary, availability, contact, links and the wish. No `llms-full.txt`, `profile.json` or `/work/*.md` |

Search engines (Googlebot, Bingbot, Applebot) aren't AI crawlers here: they
keep reading every page in every mode, unless `contentSignal.search` is `"no"`
(only if the person raises it). AI answers (`ai-input`) follow from the mode:
yes, or no in `"no-ai"`. No combination of answers can make the build fail.

**Why agents a person sent may open the homepage in files first.** Claude-User
says it follows robots.txt; ChatGPT-User and Perplexity-User say it may not
apply. Without `Allow: /$`, the most careful agent would get the worst result.
The homepage only (`/$`), which points to the files with its head links and
its "For agents" link; crawlers keep the stricter rule.

"Files first" leans on a complete adapter: every case study the site shows
needs its summary and, where the site has the text, its case study. Writing and
side projects are listed with a summary and a link. If something visible on the
pages can't go in the files, tell the person, or suggest "anything".

In "no-ai" the guest book is off unless the person asks for it (`settings.mjs`
does that when `guestbook.enabled` is left out; `true` turns it on). On, it's a
counter that shows which AI tools came anyway; its "used" choices are cut to
what that mode offers, and `llms.txt` lists its fields itself.

## Nothing at all

For people who want no agent files and no page: set `reading: "no-ai"` and run
`node door-policy/build.mjs --robots robots.txt --robots-only` as the build
(no `--out`, no endpoints, no head links, no middleware). robots.txt then
states the wish alone, with the community list and the reservations, and its
comment doesn't point to `/agents`. `verify.mjs` needs `/llms.txt`, so check
the result with `--print robots` and by reading the file.

Switching an existing setup to this: `--robots-only` removes the files an
earlier `build.mjs --out` wrote (the list in `door-policy/.last-build.json`),
and pages passed with `--head` get the No AI tags, with no links to files.
Remove the rest by hand: the "For agents" footer link, the framework's
endpoints for the files and `/agents` (Astro `src/pages/`, Next.js `app/`), the
middleware, and the `--out` part of the build command.

## The training choice

`contentSignal.aiTrain`, the follow-up to question 1: `"yes"`, `"no"` or
`null` (say nothing, the default). Saying nothing states no preference either
way; in practice crawlers treat that as allowed, so in files first training
crawlers may read what the files offer, case studies and images included. Say
that plainly. Reluctant wording from the person ("I'd rather AI didn't…") means
`"no"` (SKILL.md, Read how they put it). "No AI at all" always means no, and
the follow-up isn't asked.

A "no" reaches the crawlers vendors document for training, in every mode:

- The training crawlers in `AI_CRAWLERS` (`kind: "training"`: GPTBot,
  ClaudeBot, Google-Extended, Applebot-Extended, CCBot, meta-externalagent,
  MistralAI-Training…) get a group of their own with `Disallow: /`. Naming a
  crawler overrides any shared token, so they can't sit in the files-first
  group, which lets them read the files.
- The training names from the community list (§ The community list), in a
  `Disallow: /` group of their own.
- `User-agent: __usage_ai-training` / `Disallow: /`: the shared training
  opt-out token (Bing supports it; Google plans to from 2027 and will then
  treat it as a Google-Extended "no" when Google-Extended isn't named).
- `<meta name="bingbot" content="ai-training:disallow">` in every page's head
  (and `ai-grounding:disallow` in "no AI at all").
- The reservations: TDMRep and the Content Signals text (§ The reservations).
- The `Content-Signal` line in every group.
- The sentence in every file and on `/agents` (§ The statements).

Disallowing Google-Extended also stops Gemini Apps from grounding answers on
the site. Applebot-Extended only opts out of Apple's model training; Siri and
Spotlight still use Applebot.

## The statements

Worded as the person's wish on purpose: "asks that", never "you may not".
Careful agents treat commands in page content as prompt injection, and a
command is also a claim the site can't back up. Don't rewrite them into one.
They come from `readingStatement()` and `trainingStatement()` in `core.mjs`
("Ana" is `owner.short`):

| | Statement |
|---|---|
| anything | Ana is happy for AI agents and tools to read the site's pages and these files. |
| files-first | Ana asks that AI agents and tools read these files rather than the site's pages, and robots.txt says the same. The files hold the work shown on the pages. (+ "Writing and side projects are listed with a summary and a link." when the site has them) |
| no-ai | Ana asks that AI agents and tools not read, use or train on this site, and robots.txt says the same. For an agent that comes anyway, this file holds only who Ana is and how to get in touch. |
| training no | Ana asks that this site not be used to train AI models (robots.txt says the same). |
| training yes | Ana is happy for this site to be used to train AI models (robots.txt says the same). |

Where they go: `- Reading preference: …` and `- AI training: …` at the top of
`llms.txt` and `llms-full.txt` (in "no-ai" only the first, which already says
"train on"); `readingPreference` in `profile.json`
(`choice`, `statement`, `training`, `trainingStatement`, a link to robots.txt);
the `/agents` intro and its `/robots.txt` row; the comment at the top of the
robots.txt block. In "no-ai" the page's headline becomes "About AI on this
site", and the intro says the wish once (it already covers training).

## robots.txt

**Generated, never hand-merged.** `build.mjs --robots <file>` writes the block
between `# door-policy:robots` and `# /door-policy:robots`, adding the markers
at the end of the file the first time. Everything outside them (the person's
comments, `Sitemap:`, their own groups) is kept, and it prints what changed. A
block from before the rename (`# agent-view:robots`) is replaced the same way.
Put it in the build next to `--out` (plain HTML: `--robots robots.txt`; Astro,
Vite, Eleventy: `--robots public/robots.txt`), so it reruns on the host
whenever content or settings change: the media lines and the guest book lines
stay true. For a training "no" it also writes `.well-known/tdmrep.json` beside
the robots file, and removes it when the "no" goes. `--print robots` shows the
block without writing it.

When `content.mjs` needs the framework to run (Astro content collections,
aliases), `build.mjs` can't load it. Then serve robots.txt and TDMRep from
endpoints: `templates/astro/src/pages/robots.txt.js` and
`.well-known/tdmrep.[ext].js`, or `templates/next/app/robots.txt/route.js` and
`app/.well-known/tdmrep.json/route.js`. Move the person's rules into
`robots.base.txt` at the project root, and delete `public/robots.txt` and
Next's `app/robots.js`, either of which would win over the endpoint. Both
endpoints print the same warnings as `--robots` in the build log.

**The block, files first** (abridged; `AI_CRAWLERS` in `core.mjs` holds about
30 documented names, each with its kind, whether the vendor says it follows
robots.txt, and the vendor's page):

```
# door-policy:robots (generated by door-policy/build.mjs; edit config.mjs, not these lines)
# Ana asks that AI agents and tools read these files rather than the site's pages:
# https://example.com/llms.txt, https://example.com/llms-full.txt and https://example.com/profile.json
# (shown to people at https://example.com/agents). Search engines may read every page the site's own rules allow.

User-agent: ChatGPT-User
User-agent: Claude-User
User-agent: Perplexity-User
…every user-fetch name…
Allow: /llms.txt
Allow: /llms-full.txt
Allow: /profile.json
Allow: /work/*.md$
Allow: /agents
Allow: /api/guestbook          (only while the guest book is open)
Allow: /guestbook/             (only while the guest book is open)
Allow: /work/ink-river/01.jpg$ (each image the files list, exactly)
Allow: /$                      (the homepage: agents a person sent only)
Disallow: /
Content-Signal: search=yes, ai-input=yes

User-agent: OAI-SearchBot
…every search and training name…
(the same, without Allow: /$)

User-agent: *
Allow: /
Content-Signal: search=yes, ai-input=yes
# /door-policy:robots
```

With a training "no", the training crawlers get their own `Disallow: /` group,
followed by the community list's training names and the `__usage_ai-training`
group, and the Content Signals text sits at the top (§ The training choice).
"Anything" has only the `*` group (plus the training groups if training is
no); "no AI at all" gives every AI crawler and the whole community list
`Disallow: /`.

The longest matching rule wins, so `Allow: /llms.txt` beats `Disallow: /`, and
`Allow: /$` (2 characters) beats `Disallow: /` for the homepage alone. Images
are named one by one, case and query string kept, never as a file type: a rule
like `/*.jpg$` would also invite crawlers to the images of locked or NDA work
that the site serves but the files leave out. The portrait counts as media.

**How it merges with the person's rules.** RFC 9309 combines groups that name
the same crawler, so the person's own `User-agent: *` lines (`Disallow:
/drafts/`) still apply to everyone who falls back to `*`. AI crawlers named in
the block don't fall back, but in "files first" and "no AI" they're already
kept off the pages. If the person's file already keeps a crawler out
completely (`User-agent: GPTBot` / `Disallow: /`, or `/*`, or `/*$`, with at
most the homepage allowed by `Allow: /$`), `--robots` warns, keeps that rule,
and gives that crawler only the `Content-Signal` line in the block, so nothing
loosens it. If it keeps every crawler out that way (`User-agent: *`), no AI
crawler is given an Allow line, so that rule keeps covering them, stricter
than any mode; the block still names crawlers in its `Disallow: /` groups (No
AI, training, the community list), which can only keep them out more. To open
up, their rule has to change first.

The other way round: an `Allow` line of theirs for a crawler the block keeps
out (`User-agent: GPTBot` / `Allow: /` with a training "no", or `Allow:
/work/` in files first) wins, because the groups are combined and the longer
or equal rule wins. The block can't override it, so `--robots` warns and names
the line, and `verify.mjs` says the line is theirs rather than "rebuild". It
has to change in their own rules. Ask before changing any of these (SKILL.md,
Ask first).

Behind Cloudflare: for "files first" and "no AI", make sure Cloudflare's
Markdown for Agents is off. It adds its own `Content-Signal` header that can
contradict robots.txt, and in "no AI" it would hand out markdown of every page.

## The community list

`door-policy/ai-robots.mjs` is a dated snapshot of
[ai.robots.txt](https://github.com/ai-robots-txt/ai.robots.txt) (MIT licence),
the community list of about 200 AI crawlers. robots.txt names it only where
"please don't" is the whole message:

- "No AI at all": every name, `Disallow: /`.
- A training "no": the names it lists for training, scraping or data sales,
  `Disallow: /`. Agents a person sent, search tools and coding agents aren't
  named for a training "no" alone.
- Files first and "anything" without a "no": not used. The curated
  `AI_CRAWLERS` list, where each name has a source and an Allow plan, does
  that job.

Names already in `AI_CRAWLERS` aren't repeated, and search engines and link
previews (Applebot, Bravebot, PetalBot, facebookexternalhit) are left out, so
"no AI" doesn't cost the site its search results or its link previews. The
group is credited and dated in robots.txt itself. To refresh it (then rebuild):

```bash
node <skill>/scripts/refresh-ai-robots.mjs --project .
```

## The reservations

For a training "no", and always in "no AI at all", two formal reservations sit
beside robots.txt. Both are a stated reservation, not a lock, and `/agents`
says so.

- **W3C TDMRep** ([the spec](https://www.w3.org/community/reports/tdmrep/CG-FINAL-tdmrep-20240510/)):
  `/.well-known/tdmrep.json` with `[{ "location": "/", "tdm-reservation": 1 }]`,
  and `<meta name="tdm-reservation" content="1">` in every page's head. It
  reserves text and data mining rights for the whole site.
- **Cloudflare's Content Signals Policy** (CC0): its text, quoted word for word
  as a comment at the top of the robots.txt block, ending with the express
  reservation of rights under Article 4 of EU Directive 2019/790. It's the one
  place the skill keeps someone else's legal wording ("you may not collect…"),
  because the wording is what makes it a reservation; the agent files still
  never instruct.

The IETF's `Content-Usage` line is left out while it's still a draft.

## Markdown on request

In "anything" and "files first", the middleware (`door-policy/negotiate.mjs`,
mounted by `templates/vercel/middleware.js` and `templates/next/proxy.js` or
`middleware.js`) answers a request for `/` with `llms.txt`, and a request for a
case-study page (`paths.workPages`, default `paths.work`, e.g. `/work/lumen`)
with its `.md`, when the request clearly prefers markdown:

- `Accept` names `text/markdown` outright with q > 0, and ranks it above
  `text/html` (q-values parsed, the most specific matching range wins), or
  equal to it and listed first (agents that skip q-values list their
  preference first). Browsers never send that.
- The answer is the same file anyone can open, so it's the same facts in the
  format the client asked for. Decided by the `Accept` header alone, never the
  user agent.
- Every page the middleware passes gets `Vary: Accept` (so caches keep the two
  answers apart) and `Link: </llms.txt>; rel="describedby"`.
- A case study without a `.md` (locked, hidden) just gets its page: the
  middleware fetches the file from the same site first.
- "No AI at all": none of it. The pages are served as they are.

It needs a middleware, so it works on Vercel and Next.js; elsewhere `verify.mjs`
skips the check. If the case-study pages live outside `paths.work`, set
`paths.workPages` and add that folder to the middleware's matcher. On a Vercel
preview with Deployment Protection, the middleware's own fetch is refused and
the page is served instead; check it on the live address.

## Head tags

`headTags()` in `core.mjs`, rendered in every page's `<head>` and listed on
`/agents` so nothing is hidden: `<link rel="describedby" href="/llms.txt">`,
the `text/plain` and JSON alternates, the `text/markdown` alternate on a case
study's page (`headTags({ work: slug })`), and for a training "no" the
`bingbot` and `tdm-reservation` meta tags. "No AI at all" drops the links,
which would invite agents in, and keeps the meta tags. Changing mode needs a
rebuild.

## What to tell the person

Say it in plain words when you ask (question 1) and again at the hand-off:

> It's a stated wish, not a lock. Crawlers that collect pages for AI training
> and search say they follow robots.txt. Tools that open a page because a
> person asked (ChatGPT, Perplexity, Meta AI, Alexa, Google's agents) say
> robots.txt may not apply to them; Claude's says it does. Nothing enforces
> any of it, which is why the wish is also written in the files and on
> /agents, and why the guest book counts who came anyway.

Then, by choice:

- **Anything goes:** AI may read the pages and the files.
- **Files first:** search engines still read every page. AI crawlers are asked
  to read only the files and `/agents`; an agent a person sent may also open
  the homepage, which points to the files. Google's and Bing's AI answers come
  from their search crawlers, which still read every page: robots.txt can't
  separate the two, and its general line says AI answers are welcome
  (`ai-input=yes`). Whether and how AI tools cite those
  files is up to them, so expect fewer citations of individual pages. Unless
  you say no to training, AI training crawlers can read your case studies and
  images.
- **No AI at all:** only a small `llms.txt` with who you are and how to reach
  you is published. The site drops out of AI search tools that follow
  robots.txt. Google's AI answers in search come from Googlebot, and Bing's
  Copilot answers from Bingbot, so robots.txt can't keep the site out of those
  without leaving search (the `bingbot` grounding tag asks Bing). If you want
  nothing at all, robots.txt can say it alone (§ Nothing at all).
- **A no to training:** also two formal reservations (TDMRep, and Cloudflare's
  text reserving rights under EU copyright law). They state a reservation;
  they don't lock anything.
- **Any change:** it can take a day or more for crawlers to see it, and it
  doesn't undo anything already collected. robots.txt doesn't hide pages
  either: a disallowed draft is still public to anyone with the link.

Call `Content-Signal` "Cloudflare's Content Signals (contentsignals.org)": a
stated preference, not a standard every crawler reads.

## What verify checks

`verify.mjs`, read the way crawlers read robots.txt (the groups that name a
crawler, combined, else `*`; longest rule wins):

- Every name the site gives a group sees one `Content-Signal` line matching
  `contentSignal`; a training "no" has the `__usage_ai-training` group and the
  Content Signals text.
- Each AI crawler gets what the choice asks: "anything", `/` and `llms.txt`;
  "files first", every file, `/agents`, every case study and every listed
  image (query strings and uppercase included), but not a page or an image the
  files don't list, and `/` only for agents a person sent; "no AI" and
  training crawlers under a "no", nothing, the community list included.
  A crawler kept out more than the choice asks passes with a note; only being
  less strict fails. Applebot and link previews stay welcome.
- Files first with the guest book open: search and user-fetch agents may fetch
  `/api/guestbook` and `/guestbook/<id>`. Closed: robots.txt never says
  "guestbook".
- The same statements in every published file and on `/agents`, the training
  sentence included; the `bingbot` and `tdm-reservation` tags and
  `/.well-known/tdmrep.json` for a training "no" (and none of them without
  one); no `<link>` to the files and only `llms.txt` published in "no AI".
- Markdown on request: `/` and a case-study page with `Accept: text/markdown`
  get the same bytes as `llms.txt` and the `.md`; browsers, `*/*` and ties
  where HTML comes first get the page; `Vary: Accept` and the `Link` header
  are there; a known agent asking for HTML gets HTML. In "no AI", markdown is
  never handed out.
