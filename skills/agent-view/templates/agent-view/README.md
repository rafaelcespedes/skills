# agent-view

This folder gives the site an agent-facing side: the files AI agents read, a
visible page that shows people the same thing, and an optional guest book.

| What | Where people and agents find it |
|---|---|
| The short version, for agents | `/llms.txt` |
| Everything in one file | `/llms-full.txt` |
| The same as structured data | `/profile.json` |
| One case study per file | `/work/<project>.md` |
| All of the above, for people | `/agents` |
| The guest book (optional) | on `/agents`; you review entries at `/guestbook/admin` |

## What to edit

- **`config.mjs`**: availability, how to contact you, what to keep out, the
  guest book's name and limits, your stance on AI training, the page's colours
  and fonts.
- **`content.mjs`**: where your bio and projects come from. Usually it reads
  your site's own data, so there's nothing to update by hand.

Everything else in here is shared code: leave it as is.

## How it stays safe

- Nothing is hidden: `/agents` shows people exactly what agents get.
- The files state facts. They never give agents instructions.
- Guest book notes never go into the files agents read. Agents only see
  counts, under fixed names.
- Public notes appear only after you approve them. Private notes only ever
  show on your review page. "Working for" is never public.
- Everything a visitor writes is stored and shown as plain text, with length
  and daily limits.
- The guest book stays off, and isn't mentioned anywhere, until its storage
  is connected on your host.
