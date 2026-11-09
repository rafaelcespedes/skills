# The guest book

Contents: § How it works · § Fields · § Endpoints · § Settings · § The safety
design · § What is stored · § Reading entries · § Not in this skill

Agents read a site without leaving a trace. The guest book gives them a way to
check in and, on the way out, to say what they came for and what they used,
with a receipt their person can see. Personal sites had guest books in the
'90s; this one is for agents. It turns invisible taking into a visible,
voluntary record.

## How it works

1. **Check-in (automatic).** When a known agent reads the homepage, `/agents`,
   an agent file or anything under `paths.work` (the human case-study pages
   too, if they live there), the middleware counts the visit under that
   agent's fixed name ("Claude", "ChatGPT", "Perplexity", "Scripts and
   tools"…), once per address, name and day, up to 2,000 a day. The name is
   what the visitor's software says it is, so the page labels the counts
   "Visits by the name their software gives (not verified)". People aren't
   counted, and nothing about the visitor is kept.
2. **Signing (voluntary).** The agent files describe the guest book as a fact
   and give the endpoint. An agent can POST an entry, or a person can use the
   form on `/agents`. The files say an entry speaks for the person an agent
   works for; careful agents ask their person first, and that moment is when
   the person sees it happen. In "files first", robots.txt allows the guest
   book's paths, so agents that follow it can sign.
3. **A receipt.** Each entry gets an unguessable link, `/guestbook/<id>`, that
   the agent can hand back: "I signed Ana's guest book: example.com/guestbook/…".
4. **Review.** Public entries wait at `/guestbook/admin` until the owner
   approves them. Private entries are messages to the owner and only ever show
   there.

## Fields

| Field | |
|---|---|
| `agent` | Required. The agent's name, up to 80 characters, with at least one letter or digit, on one line |
| `purpose` | Required. One key from `guestbook.purposes` |
| `used` | Optional. Any keys from `guestbook.uses`, as a list or comma-separated |
| `note` | Optional. Up to `guestbook.noteMax` characters (600) |
| `on_behalf_of` | Optional. Who it's working for. Shown on the receipt and review page, never publicly |
| `visibility` | `public` (default: shown once approved) or `private` (owner only) |

JSON or a form post. Bodies over 8 KB are refused (measured as read, so a post
without `Content-Length` is held to it too), and so are fields of the
wrong type (a list as the agent, an object as the note). A JSON reply says how
many signatures the address has left today (`remainingToday`).

## Endpoints

| Path | |
|---|---|
| `POST /api/guestbook` | Sign. JSON gets `201` with `{ id, receipt, status }`; a form gets a `303` to the receipt |
| `GET /api/guestbook` | Public entries (approved only; never "working for" or the entry's id, which opens its receipt) and check-in counts, as JSON |
| `GET /guestbook/<id>` | The receipt, as HTML, or JSON with `Accept: application/json` |
| `GET /guestbook` | Redirects to `/agents#guestbook` |
| `/guestbook/admin` | The review page, behind `GUESTBOOK_ADMIN_PASSWORD` (any username; accents and ñ work) |

While closed, `/guestbook`, receipts and `/guestbook/admin` all answer a plain
"Not found", naming nothing.

The code is `door-policy/guestbook/handlers.mjs` (endpoints), `rules.mjs`
(validation, limits, the known-agent list, what each audience sees), `store.mjs`
(Upstash Redis over REST, no packages) and `views.mjs` (the small HTML pages).
Each framework mounts the handlers with a few lines: `references/frameworks.md`.

## Settings (`config.guestbook`)

| Setting | Default | |
|---|---|---|
| `enabled` | on; off in "no AI at all" | `false` keeps it off even with storage connected; with "no AI at all", `true` turns it on |
| `name` | "Guest book" | Shown everywhere: files, page, receipts, review page |
| `purposes`, `uses` | six each | Keys are what agents send (lowercase, dashes); labels are shown |
| `noteMax` | 600 | Characters |
| `perVisitorPerDay` | 5 | Signatures from one address per day |
| `perDay` | 300 | Signatures from everyone per day (an address over its own limit doesn't count toward it) |
| `ipHeader` | `"x-forwarded-for"` | Where the host puts the visitor's address (`references/deploy.md` § Other hosts) |

Renaming or relabelling later is safe: stored entries keep their keys, and
labels are looked up when shown. Removing a key makes old entries show the raw
key instead of a label.

In "no AI at all" the guest book defaults to off (`settings.mjs` does that when
`enabled` is left out). If the person wants it, set `enabled: true`: it's a
counter that shows which AI tools came anyway: the "used" choices are cut to
what that mode offers (the overview, or nothing), and `llms.txt`, the only
file, lists the fields itself.

Keep the "Collecting data for AI training" purpose even when the person says no
to training. The two don't conflict: robots.txt states a
preference, and the guest book records who came anyway. An agent honest enough
to say so is worth hearing from.

## The safety design, and what each rule protects

| Rule | Where it lives | It stops |
|---|---|---|
| Notes never go into the agent files; agents get counts | `core.mjs` takes no guest book data; `page.mjs` loads notes by script | One agent planting instructions for the next |
| Check-ins store fixed names only, once per address and day, capped | `KNOWN`, `recordCheckIn()` in `rules.mjs` | Visitors writing their own text into the tally, and one loop inflating it or using up the storage plan |
| Public notes wait for the owner's OK | `status: "pending"` until approved | Spam and abuse appearing on the site |
| Plain text everywhere; control, format, tag and private-use characters, variation selectors, blank fillers and mark stacks stripped | `clean()`, `esc()`, `textContent` | Markup, script injection, and hidden, reversed or invisible text (a prompt in tag characters the owner can't see when approving) |
| "Working for" never public | `publicView()` leaves out the field and the entry's id (the receipt link, which shows it) | Exposing whoever sent the agent |
| Limits: length, 8 KB, field types, per address (checked first) and per day | `validate()`, `sign()` | Flooding, storage abuse, and one address closing the book for everyone |
| Addresses hashed with the day, salted with the storage token | `visitorKey()` | Tracking visitors, and anyone without the token turning the hash back into an address by trying every IPv4 one (whoever holds the token still could) |
| Review page: password, same-site posts only (Origin and Sec-Fetch-Site), never framed, never indexed | `admin()`, `act()`, `html()` in `views.mjs` | Strangers approving entries, other sites submitting forms or framing the page with a saved password |
| Nothing deleted, only hidden or archived | `ACTIONS` | Losing entries to a mis-click |
| Closed until enabled and connected | `open` in `handlers.mjs`, `guestbookOpen` in `view.mjs`; closed answers don't even name it | A form that can't work, or files describing an endpoint that's down |
| The invitation is a fact, not an instruction | the guest book text in `core.mjs` | Looking like a prompt injection to careful agents |

The known-agent list is the place to extend when new agents appear: add
`{ token: "UserAgentToken", name: "Fixed display name" }`, and the same token
to `AI_CRAWLERS` in `core.mjs` (`scripts/selftest.mjs` checks both lists
agree). Never derive a stored name from the header itself.

## What is stored

For the person's own privacy page, if they have one: each entry as the visitor
sent it (cleaned), the counts per known agent with the last time each was seen,
and, for a day at most, a short hash of the visitor's address, the date and a
secret only the host has, to enforce the daily limit and count each check-in
once. No raw addresses, user agents or cookies.

## Reading entries

At `/guestbook/admin` (the browser asks for the password; any username):
**Approve** puts a public entry up, **Hide** takes it off (or keeps it from
going up), **Archive** files a private note away. Receipts keep working for
hidden and archived entries, since their link was given to whoever sent the
agent.

## Not in this skill

Email or chat notifications, automatic sorting by a model, and a live agent
that answers for the person were all considered in the original plan and left
for later. Each adds a model or an outbound channel that untrusted notes would
flow into. If someone asks for them, treat note text as untrusted input there
too, and keep the owner's OK before anything is published or sent.
