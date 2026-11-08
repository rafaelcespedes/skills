// ─────────────────────────────────────────────────────────────────────────────
// Colour tokens for the /agents page and the guest book's receipt and review
// pages, built from config.page.colors and config.page.theme, so all three
// follow the site's own light and dark themes. Don't edit: change config.mjs.
// ─────────────────────────────────────────────────────────────────────────────

/** Escape text for HTML. Every value that reaches markup goes through this. */
export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// a config value can't end the declaration or the <style> block
const safe = (v) => String(v ?? "").replace(/[<>{};]/g, "");

const vars = (c, scheme) =>
  `color-scheme:${scheme};--av-bg:${safe(c.bg)};--av-surface:${safe(c.surface)};--av-fg:${safe(c.fg)};--av-muted:${safe(c.muted)};--av-dim:${safe(c.dim)};--av-line:${safe(c.line)};`;

/**
 * The token blocks. `scope` is where the tokens live: ":root" on a standalone
 * page, ".av" when the page sits inside the site's own layout.
 */
export function themeCss(page, scope = ":root") {
  const { colors, theme } = page;
  const D = vars(colors.dark, "dark");
  const L = vars(colors.light, "light");
  const root = (mode) => (theme.attribute === "class" ? `:root.${mode}` : `:root[${theme.attribute}="${mode}"]`);
  const under = (sel) => (scope === ":root" ? sel : `${sel} ${scope}`);
  return [
    `${scope}{${theme.default === "light" ? L : D}}`,
    theme.default === "system" ? `@media (prefers-color-scheme: light){${scope}{${L}}}` : "",
    theme.attribute ? `${under(root("light"))}{${L}}\n${under(root("dark"))}{${D}}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Sets the stored theme before paint (standalone pages only). */
export function themeBootScript(page) {
  const { theme } = page;
  if (!theme.storageKey || !theme.attribute) return "";
  return `<script>(function(){try{var t=localStorage.getItem(${JSON.stringify(theme.storageKey)});if(t!=="light"&&t!=="dark")return;var r=document.documentElement;${
    theme.attribute === "class" ? `r.classList.remove("light","dark");r.classList.add(t);` : `r.setAttribute(${JSON.stringify(theme.attribute)},t);`
  }}catch(e){}})();</script>`;
}

/** The font stylesheet link, if the config names one. */
export const fontLink = (page) =>
  page.font.href
    ? `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${esc(page.font.href)}">`
    : "";
