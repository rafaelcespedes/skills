// ─────────────────────────────────────────────────────────────────────────────
// Small standalone pages for the guest book (receipts, the review page,
// errors), in the /agents page's editor voice and the site's colours.
// ─────────────────────────────────────────────────────────────────────────────

import { settings } from "../settings.mjs";
import { esc, themeCss, themeBootScript, fontLink } from "../theme.mjs";

export { esc };

export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: settings.owner.timeZone || "UTC" });

const P = settings.page;
const font = String(P.font.family).replace(/[<>{};]/g, "");

/** A small standalone page. Never indexed. */
export function page(title, body) {
  return `<!doctype html>
<html lang="${esc(settings.lang || "en")}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
${themeBootScript(P)}
${fontLink(P)}
<style>
${themeCss(P, ":root")}
  * { box-sizing: border-box; }
  body { margin:0; background:var(--av-bg); color:var(--av-muted); font:15px/1.7 ${font}; font-variant-ligatures:none; }
  main { max-width: 760px; margin: 0 auto; padding: clamp(1.25rem,4vw,3rem) clamp(1rem,3vw,1.8rem) 4rem; }
  a { color: var(--av-fg); }
  .crumb { color: var(--av-dim); margin-bottom: 2.5rem; }
  .crumb a { color: var(--av-muted); text-decoration: none; }
  h1 { font-weight: 400; font-size: 1em; line-height: inherit; color: var(--av-fg); margin: 0 0 1rem; }
  h1::before { content: "# "; color: var(--av-dim); }
  h2 { font-weight: 400; font-size: 1em; color: var(--av-fg); margin: 2.5rem 0 .75rem; }
  h2::before { content: "## "; color: var(--av-dim); }
  p, dd { color: var(--av-muted); }
  ul { padding-left: 2ch; }
  dl { display: grid; grid-template-columns: 9rem 1fr; gap: .5rem 1rem; margin: 1.5rem 0; padding: 1rem 0; border-top: 1px solid var(--av-line); border-bottom: 1px solid var(--av-line); }
  dt { color: var(--av-dim); } dd { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
  .card { border: 1px solid var(--av-line); border-radius: 4px; background: var(--av-surface); padding: 1rem 1.1rem; margin: .75rem 0; }
  .card dl { border: 0; padding: 0; margin: .5rem 0 .75rem; }
  .meta { color: var(--av-dim); }
  .note { white-space: pre-wrap; overflow-wrap: anywhere; color: var(--av-fg); margin: .5rem 0; }
  form.inline { display: inline; }
  button { font: inherit; color: var(--av-bg); background: var(--av-fg); border: 0; border-radius: 3px; padding: 0 1ch; cursor: pointer; margin-right: .4rem; }
  button.quiet { color: var(--av-fg); background: transparent; border: 1px solid var(--av-line); }
  .empty { color: var(--av-dim); }
  code { font: inherit; color: var(--av-fg); }
  @media (max-width: 560px) { dl { grid-template-columns: 1fr; } dt { margin-top: .5rem; } }
</style>
</head><body><main>${body}</main></body></html>`;
}

export const html = (body, status = 200, headers = {}) =>
  new Response(body, {
    status,
    // never framed: a framed review page could be clicked into approving
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "X-Frame-Options": "DENY", "Content-Security-Policy": "frame-ancestors 'none'", ...headers },
  });
