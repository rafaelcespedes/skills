// ─────────────────────────────────────────────────────────────────────────────
// The /agents page: the agent view, shown to people, styled as a file open in
// a code editor. One mono face at one size, numbered lines, markdown markers
// left visible, and llms.txt printed exactly as agents get it.
//
//   agentsPage(view)                        a whole HTML document
//   agentsPage(view, { standalone: false }) { head, body } to place inside the
//                                           site's own layout
//
// Every value is escaped, and the guest book's live half is written with
// textContent only, so nothing a visitor wrote can become markup. Colours,
// fonts and copy come from config.mjs; don't edit this file for those.
// ─────────────────────────────────────────────────────────────────────────────

import { esc, themeCss, themeBootScript, fontLink } from "./theme.mjs";

/* ── Light markdown colouring for the printed llms.txt ───────────────────── */

function inline(text) {
  const out = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s)]+)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: text.slice(last, m.index) });
    if (m[1]) {
      out.push({ t: "[", c: "mk" }, { t: m[1], c: "lk", href: m[2] }, { t: "](", c: "mk" }, { t: m[2], c: "url", href: m[2] }, { t: ")", c: "mk" });
    } else {
      let url = m[3];
      let trail = "";
      while (/[.,;:]$/.test(url)) {
        trail = url.slice(-1) + trail;
        url = url.slice(0, -1);
      }
      out.push({ t: url, c: "url", href: url });
      if (trail) out.push({ t: trail });
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ t: text.slice(last) });
  return out;
}

function mdLine(line) {
  let m;
  if ((m = line.match(/^(#{1,6} )(.*)$/))) return { hang: false, segs: [{ t: m[1], c: "mk" }, ...inline(m[2]).map((s) => ({ ...s, c: s.c || "hi" }))] };
  if ((m = line.match(/^(> )(.*)$/))) return { hang: true, segs: [{ t: m[1], c: "mk" }, ...inline(m[2])] };
  if ((m = line.match(/^(\s*- )(.*)$/))) return { hang: true, segs: [{ t: m[1], c: "mk" }, ...inline(m[2])] };
  if (line.trim() === "---") return { hang: false, segs: [{ t: line, c: "mk" }] };
  return { hang: false, segs: inline(line) };
}

const seg = (s) => (s.href ? `<a class="${s.c}" href="${esc(s.href)}">${esc(s.t)}</a>` : s.c ? `<span class="${s.c}">${esc(s.t)}</span>` : esc(s.t));

/* ── Markup helpers: every visible row is a numbered line ────────────────── */

const blank = `<p class="l"></p>`;
const line = (inner, tag = "p", cls = "") => `<${tag} class="l${cls}"><span class="tx">${inner}</span></${tag}>`;
const heading = (level, text, id = "") =>
  `<h${level} class="l"${id ? ` id="${id}"` : ""}><span class="tx"><span class="mk" aria-hidden="true">${"#".repeat(level)} </span><span class="hi">${esc(text)}</span></span></h${level}>`;
const comment = (text) => line(`<span class="cm">// ${esc(text)}</span>`);

export function agentsPage(view, { standalone = true } = {}) {
  const S = view.settings;
  const P = S.page;
  const g = S.guestbook;
  const name = view.person.name;
  const open = view.guestbookOpen;

  const files = [
    { href: "/llms.txt", name: "/llms.txt", what: "The short version: who this is, the work, how to get in touch." },
    { href: "/llms-full.txt", name: "/llms-full.txt", what: "Everything in one file, every case study included." },
    { href: "/profile.json", name: "/profile.json", what: "The same profile as structured data." },
    view.work.length && {
      href: `${S.paths.work}/${view.work[0].slug}.md`,
      name: `${S.paths.work}/<project>.md`,
      what: `One case study as plain text, ${view.work.length} in all.`,
    },
  ].filter(Boolean);

  const llmsLines = view
    .llmsTxt()
    .replace(/\n+$/, "")
    .split("\n")
    .map(mdLine)
    .map((ln) => `<p class="l${ln.hang ? " l--hang" : ""}"><span class="tx">${ln.segs.map(seg).join("")}</span></p>`)
    .join("\n");

  const guestbook = !open
    ? ""
    : `
      <section class="av-gb" id="guestbook" aria-labelledby="av-gb-title">
        ${blank}
        ${heading(2, g.name, "av-gb-title")}
        ${blank}
        ${line(`Agents can sign on their way out: what they came for, what they used, and a note if they like. Signing is optional. Public notes go up once ${esc(S.owner.short)} has read them; private ones are just for ${esc(S.owner.short)}. Each entry gets a receipt link the agent can hand back to whoever sent it.`)}

        <div data-av-gb-live hidden>
          ${blank}
          ${heading(3, "Checked in")}
          ${comment("Known agents that have read this site, counted by name only.")}
          <ul class="av-list" data-av-gb-checkins></ul>
          ${blank}
          ${heading(3, "Notes")}
          ${comment(`Written by visiting agents. ${S.owner.short} reads each one before it appears.`)}
          <ol class="av-list" data-av-gb-entries></ol>
        </div>

        ${blank}
        ${heading(3, "Sign")}
        <form class="av-form" method="post" action="/api/guestbook">
          <label class="l" for="av-gb-agent"><span class="tx av-kv"><span class="key">agent:</span><span class="val"><input id="av-gb-agent" name="agent" required maxlength="80" autocomplete="off" placeholder="the name you go by, e.g. Claude"></span></span></label>
          ${comment("optional, never shown publicly")}
          <label class="l" for="av-gb-for"><span class="tx av-kv"><span class="key">working for:</span><span class="val"><input id="av-gb-for" name="on_behalf_of" maxlength="80" autocomplete="off"></span></span></label>

          <div role="radiogroup" aria-labelledby="av-gb-purpose">
            ${line(`<span class="key" id="av-gb-purpose">came for:</span>`)}
            ${Object.entries(g.purposes)
              .map(([k, label], i) => `<label class="l av-opt"><span class="tx"><input class="vh" type="radio" name="purpose" value="${esc(k)}"${i === 0 ? " required" : ""}><span class="box" aria-hidden="true"></span>${esc(label)}</span></label>`)
              .join("\n")}
          </div>

          <div role="group" aria-labelledby="av-gb-used">
            ${line(`<span class="key" id="av-gb-used">used:</span> <span class="cm">// optional</span>`)}
            ${Object.entries(g.uses)
              .map(([k, label]) => `<label class="l av-opt"><span class="tx"><input class="vh" type="checkbox" name="used" value="${esc(k)}"><span class="box box--check" aria-hidden="true"></span>${esc(label)}</span></label>`)
              .join("\n")}
          </div>

          <label class="l" for="av-gb-note"><span class="tx"><span class="key">note:</span> <span class="cm">// optional, up to ${g.noteMax} characters</span></span></label>
          <div class="l"><span class="tx av-indent"><textarea id="av-gb-note" name="note" maxlength="${g.noteMax}" rows="4"></textarea></span></div>

          <div role="radiogroup" aria-labelledby="av-gb-vis">
            ${line(`<span class="key" id="av-gb-vis">who can see it:</span>`)}
            <label class="l av-opt"><span class="tx"><input class="vh" type="radio" name="visibility" value="public" checked><span class="box" aria-hidden="true"></span>Public, once ${esc(S.owner.short)} has read it</span></label>
            <label class="l av-opt"><span class="tx"><input class="vh" type="radio" name="visibility" value="private"><span class="box" aria-hidden="true"></span>Private, only ${esc(S.owner.short)} sees it</span></label>
          </div>

          ${blank}
          <div class="l"><span class="tx"><button class="av-btn" type="submit">Sign the ${esc(g.name.toLowerCase())}</button></span></div>
        </form>
      </section>`;

  const home = P.home.label || P.home.image
    ? `<a class="av-home" href="${esc(P.home.href)}">${P.home.image ? `<img src="${esc(P.home.image)}" alt="" width="28" height="28">` : ""}<span>${esc(P.home.label || name)}</span></a>`
    : `<a class="av-home" href="${esc(P.home.href)}"><span class="mk" aria-hidden="true">← </span><span>${esc(name)}</span></a>`;
  const toggle = standalone && P.theme.toggle
    ? `<button class="av-theme" type="button" aria-label="Switch between light and dark"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 3.9 A8.1 8.1 0 0 0 12 20.1 Z" fill="currentColor"/></svg></button>`
    : "";

  const body = `
<div class="av">
  <header class="av-bar">${home}${toggle}</header>
  <main class="av-main">
    <div class="av-tab"><span class="hi">agents.md</span><span class="av-tab__meta">Markdown · UTF-8</span></div>
    <div class="av-doc">
      <h1 class="l"><span class="tx"><span class="mk" aria-hidden="true"># </span><span class="hi">${esc(P.title)}</span><span class="caret" aria-hidden="true"></span></span></h1>
      ${P.intro.map((t) => `${blank}\n${line(esc(t))}`).join("\n")}
      ${blank}
      ${heading(2, "Files")}
      ${blank}
      <ul class="av-list">
        ${files.map((f) => `<li class="l"><span class="tx av-file"><a class="lk" href="${esc(f.href)}">${esc(f.name)}</a><span>${esc(f.what)}</span></span></li>`).join("\n")}
      </ul>
      ${guestbook}
    </div>

    <section class="av-section" aria-labelledby="av-llms">
      <div class="av-tab"><h2 class="hi" id="av-llms">llms.txt</h2><span class="av-tab__meta">Exactly what agents get · ${esc(view.updated)} · <a class="lk" href="/llms.txt">open raw</a></span></div>
      <div class="av-doc av-doc--file">
${llmsLines}
      </div>
    </section>
  </main>
</div>
${open ? `<script>${LIVE_SCRIPT}</script>` : ""}
${toggle ? `<script>${toggleScript(P.theme)}</script>` : ""}`;

  const css = `<style>\n${themeCss(P, standalone ? ":root" : ".av")}\n${CSS.replace("__WIDTH__", String(P.width).replace(/[<>{};]/g, "")).replace("__FONT__", String(P.font.family).replace(/[<>{};]/g, ""))}\n${open ? GB_CSS : ""}\n${standalone ? STANDALONE_CSS : ""}</style>`;
  const head = `${fontLink(P)}\n${css}`;
  if (!standalone) return { head, body };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>For agents · ${esc(name)}</title>
<meta name="description" content="The version of this site that AI agents read, shown to people too.">
<link rel="canonical" href="${esc(view.links.agentView)}">
${view.headTags({ jsonLd: true })}
${themeBootScript(P)}
${head}
</head>
<body>${body}
</body>
</html>
`;
}

/* ── Scripts ──────────────────────────────────────────────────────────────── */

// The guest book's live half: check-in counts and approved notes, written as
// more numbered lines. textContent only, so nothing a visitor wrote can
// become markup.
const LIVE_SCRIPT = `
(function () {
  var live = document.querySelector("[data-av-gb-live]");
  if (!live) return;
  var fmt = function (iso) { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); };
  var el = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  var row = function (tag) { var li = el(tag, "l"), tx = el("span", "tx"); for (var i = 1; i < arguments.length; i++) tx.append(arguments[i]); li.append(tx); return li; };
  fetch("/api/guestbook", { headers: { Accept: "application/json" } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || !data.open) return;
      var checkins = live.querySelector("[data-av-gb-checkins]");
      var entries = live.querySelector("[data-av-gb-entries]");
      if (data.checkIns.length) {
        data.checkIns.forEach(function (c) {
          var r = row("li", el("span", "key", c.agent), el("span", "num", String(c.visits)));
          r.firstChild.classList.add("av-count");
          checkins.append(r);
        });
      } else checkins.append(row("li", el("span", "cm", "// No known agents yet.")));
      if (data.entries.length) {
        data.entries.forEach(function (e, i) {
          if (i) entries.append(el("li", "l"));
          entries.append(row("li", el("span", "hi", e.agent), " ", el("span", "cm", "// " + fmt(e.createdAt) + " · " + e.purposeLabel)));
          if (e.note) {
            var q = row("li", el("span", "mk", "> "), el("span", "note", e.note));
            q.classList.add("l--hang");
            entries.append(q);
          }
        });
      } else entries.append(row("li", el("span", "cm", "// No notes yet.")));
      live.hidden = false;
    })
    .catch(function () {});
})();`;

function toggleScript(theme) {
  const key = JSON.stringify(theme.storageKey);
  const cls = theme.attribute === "class";
  const attr = JSON.stringify(theme.attribute || "data-theme");
  return `
(function () {
  var btn = document.querySelector(".av-theme"), root = document.documentElement;
  if (!btn) return;
  var current = function () {
    ${cls ? `if (root.classList.contains("light")) return "light"; if (root.classList.contains("dark")) return "dark";` : `var a = root.getAttribute(${attr}); if (a === "light" || a === "dark") return a;`}
    return ${theme.default === "system" ? `matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"` : JSON.stringify(theme.default)};
  };
  btn.addEventListener("click", function () {
    var next = current() === "dark" ? "light" : "dark";
    ${cls ? `root.classList.remove("light", "dark"); root.classList.add(next);` : `root.setAttribute(${attr}, next);`}
    try { localStorage.setItem(${key}, next); } catch (e) {}
  });
})();`;
}

/* ── Styles: every rule is under .av, so nothing leaks into the site ─────── */

const CSS = `
.av {
  --mono: __FONT__;
  --size: clamp(13px, calc(0.55vw + 9px), 16px);
  --pad: clamp(16px, 3vw, 32px);
  --gut: 5ch;
  --c-mk: var(--av-dim);
  --c-tx: var(--av-muted);
  --c-hi: var(--av-fg);
  --c-cm: color-mix(in srgb, var(--av-fg) 45%, transparent);
  --c-row: color-mix(in srgb, var(--av-fg) 4%, transparent);
  --c-field: color-mix(in srgb, var(--av-fg) 7%, transparent);
  --ease: cubic-bezier(0.2, 0, 0, 1);
  max-width: __WIDTH__;
  margin: 0 auto;
  background: var(--av-bg);
  border-left: 1px solid var(--av-line);
  border-right: 1px solid var(--av-line);
  padding-bottom: 4em;
  font-family: var(--mono);
  font-size: var(--size);
  font-weight: 400;
  line-height: 1.7;
  letter-spacing: 0;
  color: var(--c-tx);
  font-variant-ligatures: none;
  -webkit-text-size-adjust: 100%;
}
@media (max-width: 820px) { .av { border-left: 0; border-right: 0; --gut: 4ch; } }
.av *, .av *::before, .av *::after { box-sizing: border-box; }
.av :is(h1, h2, h3, p, ul, ol, li, form, label) { margin: 0; padding: 0; font: inherit; letter-spacing: inherit; color: inherit; }
.av :is(ul, ol) { list-style: none; }
.av .mk { color: var(--c-mk); }
.av .hi { color: var(--c-hi); }
.av .cm { color: var(--c-cm); }
.av a { color: var(--c-hi); text-decoration: underline; text-decoration-color: transparent; text-underline-offset: 0.22em; transition: text-decoration-color 0.15s var(--ease); }
.av a:hover { text-decoration-color: currentColor; }
.av a.url { color: var(--c-cm); }
.av a.url:hover { color: var(--c-hi); }
.av a:focus-visible { outline: 1px solid var(--c-hi); outline-offset: 2px; border-radius: 2px; }

/* the bar: back home on the left, the theme switch on the right */
.av-bar { display: flex; justify-content: space-between; align-items: center; gap: 2ch; padding: calc(var(--pad) * 0.75) var(--pad); min-height: 3.5em; }
.av .av-home { display: inline-flex; align-items: center; gap: 1ch; color: var(--c-hi); text-decoration: none; }
.av .av-home img { width: 28px; height: 28px; border-radius: 8px; object-fit: cover; }
.av-theme { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border: 0; padding: 0; border-radius: 10px; background: var(--c-field); color: var(--c-hi); cursor: pointer; }
.av-theme svg { width: 15px; height: 15px; }
.av-theme:focus-visible { outline: 1px solid var(--c-hi); outline-offset: 2px; }

/* file tabs: the name of what's open, on a hairline */
.av-tab { display: flex; justify-content: space-between; align-items: baseline; gap: 2ch; flex-wrap: wrap; margin-bottom: 0.6em; padding: 0 var(--pad) 0.6em calc(var(--pad) + var(--gut)); border-bottom: 1px solid var(--av-line); }
.av-tab h2 { margin: 0; font: inherit; }
.av-tab__meta { color: var(--c-cm); }
.av-section { margin-top: 3em; }

/* numbered lines */
.av-doc { counter-reset: ln; }
.av .l { counter-increment: ln; display: grid; grid-template-columns: var(--gut) minmax(0, 1fr); padding: 0 var(--pad); min-height: 1.7em; }
.av .l::before { content: counter(ln); color: var(--c-mk); text-align: right; padding-right: 2ch; font-variant-numeric: tabular-nums; }
.av .l:hover { background: var(--c-row); }
.av .l:hover::before { color: var(--c-cm); }
.av .tx { min-width: 0; overflow-wrap: anywhere; }
.av .l--hang .tx { padding-left: 2ch; text-indent: -2ch; }

/* the caret, at the end of the title */
.av .caret { display: inline-block; width: 2px; height: 1.15em; margin-left: 0.25ch; vertical-align: -0.2em; background: var(--c-hi); animation: av-caret 1.1s steps(1) infinite; }
@keyframes av-caret { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .av .caret { animation: none; } }

/* the files: path, then what it is; stacked when narrow */
.av .av-file { display: grid; grid-template-columns: 20ch minmax(0, 1fr); gap: 0 2ch; }
@media (max-width: 640px) { .av .av-file { grid-template-columns: minmax(0, 1fr); } }

`;

// Only on pages where the guest book is open: a closed page says nothing about it.
const GB_CSS = `
/* the form, as a small config file */
.av-gb { scroll-margin-top: 1em; }
.av .key { color: var(--c-hi); }
.av .av-kv { display: grid; grid-template-columns: 16ch minmax(0, 1fr); gap: 0 1ch; align-items: baseline; }
.av .av-count { display: grid; grid-template-columns: minmax(0, 32ch) auto; gap: 0 2ch; align-items: baseline; }
.av .val { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 2ch; }
.av .num { color: var(--c-cm); font-variant-numeric: tabular-nums; }
.av .note { color: var(--c-tx); white-space: pre-wrap; }
@media (max-width: 640px) { .av .av-kv { grid-template-columns: minmax(0, 1fr); } .av .av-count { grid-template-columns: minmax(0, 1fr) auto; } }
.av input:not([type]), .av textarea { font: inherit; color: var(--c-hi); background: var(--c-field); border: 0; border-radius: 3px; padding: 0 0.6ch; margin: 0; flex: 1 1 22ch; max-width: 44ch; width: 100%; min-width: 0; caret-color: var(--c-hi); height: 1.45em; line-height: 1.45; align-self: center; }
.av textarea { display: block; height: auto; line-height: 1.7; max-width: none; resize: vertical; min-height: calc(1.7em * 4); padding: 0.2em 0.8ch; margin: 0.15em 0; }
.av input::placeholder, .av textarea::placeholder { color: var(--c-mk); }
.av input:focus-visible, .av textarea:focus-visible { outline: 1px solid var(--c-cm); outline-offset: 0; }
.av .av-indent { padding-left: 2ch; }
.av .av-opt { cursor: pointer; }
.av .av-opt .tx { padding-left: 2ch; }
.av .av-opt:has(input:checked) { color: var(--c-hi); }
.av .vh { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.av .box { color: var(--c-mk); margin-right: 1ch; white-space: pre; }
.av .box::before { content: "( )"; }
.av input:checked + .box { color: var(--c-hi); }
.av input:checked + .box::before { content: "(•)"; }
.av .box--check::before { content: "[ ]"; }
.av input:checked + .box--check::before { content: "[x]"; }
.av input:focus-visible + .box { outline: 1px solid var(--c-hi); outline-offset: 1px; border-radius: 2px; }
.av .av-btn { font: inherit; color: var(--av-bg); background: var(--c-hi); border: 0; border-radius: 3px; padding: 0 1ch; cursor: pointer; transition: opacity 0.15s var(--ease); }
.av .av-btn:hover { opacity: 0.85; }
.av .av-btn:focus-visible { outline: 1px solid var(--c-hi); outline-offset: 2px; }
`;

const STANDALONE_CSS = `
html { background: var(--av-bg); }
body { margin: 0; background: var(--av-bg); }
.av { min-height: 100vh; }
`;
