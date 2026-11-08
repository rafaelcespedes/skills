# The /agents page

The page shows people exactly what agents get. It reads like a file open in a
code editor: one mono face at one size, numbered lines, markdown markers left
visible, and `llms.txt` printed as agents receive it. It's the visible half of
"nothing is hidden", and it should look like it belongs to the site.

`agent-view/page.mjs` builds it; `config.page` styles it. Don't restyle the
markup by editing `page.mjs`: the colours, font, width, theme and copy are all
settings.

## Anatomy

1. **The bar**: back home on the left (the site's avatar or logo and name),
   an optional theme switch on the right.
2. **`agents.md`**: a title with a blinking caret, two short paragraphs
   (`page.intro`), and the **Files** list, each with a line on what it is.
3. **The guest book**, when open: what it is, then the live part (known agents
   that checked in, and approved notes, loaded by script), then the form, laid
   out like a config file with `( )` and `[ ]` drawn as text.
4. **`llms.txt`**: printed exactly as agents get it, with markers dimmed,
   headings bright and links clickable.

## Take the colours and fonts from the site

Fill `config.page.colors.dark` and `.light` from the site's own tokens:

| Token | Use the site's… |
|---|---|
| `bg` | page background |
| `surface` | card or raised background (receipt and review pages) |
| `fg` | headings and strong text |
| `muted` | body text |
| `dim` | faint text: captions, line numbers, markdown markers |
| `line` | hairlines and borders |

Where to find them: CSS custom properties in the global stylesheet, the
Tailwind theme, or the computed styles of `body`, a heading and a caption in a
browser. A site with only one theme gets the same values in both, plus
`theme.default` set to it. Check contrast in both themes: `muted` on `bg` at
least 4.5:1; `dim` on `bg` **and on `surface`** at least 3:1 (the receipt and
review pages put `dim` labels on `surface`). Nudge `dim` darker or lighter if
the site's own faint colour falls short.

**The font.** Use the site's own mono face if it has one (point `font.href` at
its stylesheet, or `""` if the site already loads it for this page). If not,
keep Geist Mono. The editor voice depends on a mono face: the line-number
gutter and the form's alignment are measured in characters.

**The theme switch.** Find how the site changes theme and mirror it in
`config.page.theme`:

| The site… | `theme` |
|---|---|
| follows the system only | `{ default: "system", attribute: "" }` |
| sets `data-theme="dark"`/`"light"` on `<html>` | `{ attribute: "data-theme" }` (or its own `data-…` name) |
| toggles a `dark` class on `<html>` (Tailwind) | `{ attribute: "class" }` |
| remembers the choice in localStorage | add `storageKey` with the same key, so the page opens in the visitor's theme |
| has a visible toggle | add `toggle: true` for the page's own switch |

`default` is the theme when nobody has chosen: `"system"`, `"dark"` or
`"light"`, matching the site.

**The home link.** `page.home.image` is the avatar or logo the site's header
uses; `label` is the name as the header writes it. Without either, the bar shows
`← Name`. There's one image for both themes: if the logo vanishes on one of
them (a dark mark on a dark background), use a portrait, a version that works
on both, or leave `image` empty and let the name carry it.

## Standalone or inside the layout

**Standalone (default).** `agentsPage(view)` returns a whole document: the
editor is the page, the way the original sits on its site's shell. Nothing in
the site's CSS can reach it, and it works the same in every framework.

**Inside the layout** (the site's header and footer around it):
`agentsPage(view, { standalone: false })` returns `{ head, body }`. All of its
CSS lives under `.av`, and it resets headings and lists inside itself, so the
site's styles mostly stay out. In Astro:

```astro
---
import Layout from "../layouts/Base.astro";
import { getView } from "../../agent-view/view.mjs";
import { agentsPage } from "../../agent-view/page.mjs";
const { head, body } = agentsPage(await getView(), { standalone: false });
---
<Layout title="For agents">
  <Fragment slot="head" set:html={head} />
  <Fragment set:html={body} />
</Layout>
```

(The layout needs a `head` slot; add one if it hasn't. Tested in Astro: the
site's own heading and list styles stay out.) In this mode the tokens
follow the site's theme attribute, and the page's own theme switch is left out,
since the site has one. In Next.js, keep it standalone: scripts inside
`dangerouslySetInnerHTML` don't run in React, and the guest book's live part
needs its script.

## Copy

`page.title` and `page.intro` are plain statements for people. The defaults
work for most sites; first person is fine if the site speaks that way. Keep
them facts. Don't address agents.

## Make it findable

Add a visible link, "For agents", where the site keeps its secondary links
(the footer, usually). In the original's tests, an agent exploring the site
went homepage → footer link → `/agents` → the files, and never had to guess a
URL. Hidden links don't count.

## Check it

- Both themes, including the site's own switch if it has one.
- 1440px and 375px wide: at 640px and below, file names stack over their
  descriptions and form labels stack over their fields.
- Tab through the form: every field and the button show a focus ring, and the
  radio and checkbox rows can be chosen with the keyboard.
- `prefers-reduced-motion`: the caret stops blinking.

## Site-specific extras

The original page (rafaelcespedes.com/agents) also has draggable column edges
and an availability dot on the avatar, because that site's homepage has both.
Add things like that only when the person's site already has them, so the page
matches its shell.
