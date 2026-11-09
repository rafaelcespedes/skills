# door-policy

This folder states the site's door policy for AI agents (let them in, send
them to clean files, or ask them to stay out), and builds what goes with it:
the files AI agents read, a visible page that shows people the same thing,
and an optional guest book.

| What | Where people and agents find it |
|---|---|
| The door policy, for crawlers | `/robots.txt` (a marked block; your own lines are kept) |
| The short version, for agents | `/llms.txt` |
| Everything in one file | `/llms-full.txt` (not in "no AI") |
| The same as structured data | `/profile.json` (not in "no AI") |
| One case study per file | `/work/<project>.md` (not in "no AI") |
| A no to training, as reservations | `/.well-known/tdmrep.json` and a robots.txt comment |
| All of the above, for people | `/agents` |
| The guest book (optional) | on `/agents`; you review entries at `/guestbook/admin` |

## What to edit

- **`config.mjs`**: how you'd like AI to treat the site (anything, files
  first, or no AI at all), your stance on AI training, availability, how to
  contact you, what to keep out, the guest book's name and limits, the page's
  colours and fonts.
- **`content.mjs`**: where your bio and projects come from. Usually it reads
  your site's own data, so there's nothing to update by hand.

Everything else in here is shared code: leave it as is. `ai-robots.mjs` is a
dated copy of the community crawler list ai.robots.txt (MIT); its header says
how to refresh it.

## How it stays safe

- Nothing is hidden: `/agents` shows people exactly what agents get. A client
  that asks for markdown gets the same files anyone can open.
- The files state facts. They never give agents instructions. How you'd
  like AI to treat the site, and your stance on AI training, are said as
  your wish ("Ana asks that…"), and robots.txt says the same: `build.mjs
  --robots` writes its own block between markers and leaves the rest of the
  file alone. It's a stated wish, not a lock: nothing enforces it.
- Guest book notes never go into the files agents read. Agents only see
  counts, under fixed names.
- Public notes appear only after you approve them. Private notes only ever
  show on your review page. "Working for" is never public.
- Everything a visitor writes is stored and shown as plain text, with length
  and daily limits.
- The guest book stays off, and isn't mentioned anywhere, until its storage
  is connected on your host.
