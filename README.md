# Skills

[![skills.sh](https://skills.sh/b/rafaelcespedes/skills)](https://skills.sh/rafaelcespedes/skills)

Agent skills by [Rafael Cespedes](https://rafaelcespedes.com), a designer in NYC. Each one started as
something I built for my own site, and I packaged it up afterwards so others can use it.

## Install

```bash
npx skills@latest add rafaelcespedes/skills
```

Works with Claude Code, Cursor, Codex and other coding agents.

## agent-view

A side of your site for AI agents.

More and more, people send an AI agent to read the web for them: "who is this designer, what have
they made, are they available?" Most personal sites reach those agents as layout noise. Case
studies hide in pop-ups, projects have titles but no descriptions, and the agent guesses.

This skill reads your site and adds an agent-friendly side to it, built from your own content, so
it stays up to date by itself.

See it live at [rafaelcespedes.com/agents](https://rafaelcespedes.com/agents).

### What you get

- **Files agents read:** a short summary of you and your work (`/llms.txt`), everything in one
  file (`/llms-full.txt`), the same as data (`/profile.json`), and one plain-text page per project.
- **A page for people, at `/agents`:** it shows exactly what agents get, styled like a file open
  in a code editor, in your site's colours and fonts. Nothing is hidden.
- **A guest book for agents (optional):** agents that visit are counted by name, and they can sign
  on the way out with what they came for, what they used, and a note. Whoever sent the agent gets
  a receipt link. You approve public notes before anyone sees them.

### What you need

- A personal site or portfolio whose code you have (Astro, Next.js, plain HTML and most site
  generators work).
- A coding agent to do the work.
- For the guest book: the site hosted on Vercel, and a free Upstash database (two clicks inside
  Vercel).

### How to use it

1. Install it with the command above.
2. Ask your agent: *"Add an agent view to my site."*
3. Your agent asks you five things at once, each with a sensible default:
   - your availability, in one line
   - how people should contact you, and whether to mention rates
   - anything to keep out (client work under NDA, drafts)
   - whether you want the guest book, and what to call it
   - how AI may use your site: search and live answers (yes, by default), and training AI models
     (yes, no, or say nothing)
4. It builds everything, tests it on your computer, and shows you the page.
5. You publish as you normally do. Then, for the guest book, two steps in Vercel: connect the free
   Upstash storage, and set a password for your review page. Your agent walks you through both.

You read guest book entries at `yoursite.com/guestbook/admin`.

### How it stays safe

- Everything agents get is also shown to people. There's no hidden text.
- The files state facts. They never tell agents what to do.
- What visitors write never goes into the files agents read, so one agent can't leave
  instructions for the next.
- Public notes appear only after you approve them. Private notes only you see.
- Everything visitors send is kept as plain text, with length and daily limits.
- The guest book stays off, and isn't mentioned anywhere, until you connect its storage.

### Your data stays yours

Your copy runs on your own site, and the guest book's entries live in your own database. Nobody
else runs a server for it or sees what agents write to you.

## License

MIT
