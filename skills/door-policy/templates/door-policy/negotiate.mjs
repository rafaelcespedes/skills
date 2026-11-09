// ─────────────────────────────────────────────────────────────────────────────
// Markdown on request: when a client asks for "/" or a case-study page and
// clearly prefers markdown (its Accept header ranks text/markdown above
// text/html), the middleware answers with the matching agent file: /llms.txt
// for "/", and <paths.work>/<slug>.md for a case study. Same facts, in the
// format the client asked for. Every other request gets the page as before,
// with a "Vary: Accept" header and a Link to /llms.txt.
//
// Decided by the Accept header alone: never by the user agent. Off in
// "no-ai", which doesn't point anyone to the files. Web-standard APIs only,
// so it runs in middleware. Don't edit: change config.mjs.
// ─────────────────────────────────────────────────────────────────────────────

import { settings } from "./settings.mjs";

const SLUG = /^[a-z0-9][a-z0-9_-]*$/i;
const LINK = '</llms.txt>; rel="describedby"';
export const on = settings.reading !== "no-ai";

/** The quality a header gives a media type: the most specific range that
 *  matches wins (text/html, then text/*, then *\/*); 0 when none does.
 *  `at` is where that range sits in the header, for ties. */
function quality(ranges, type) {
  const [major] = type.split("/");
  let best = null;
  for (const r of ranges) {
    const rank = r.type === type ? 3 : r.type === `${major}/*` ? 2 : r.type === "*/*" ? 1 : 0;
    if (rank && (!best || rank > best.rank)) best = { rank, q: r.q, at: r.at, exact: rank === 3 };
  }
  return best || { rank: 0, q: 0, at: Infinity, exact: false };
}

/** True when the Accept header clearly prefers markdown: text/markdown is
 *  named outright with q > 0, and ranks above text/html, or equal to it and
 *  listed first (agents that skip q-values list their preference first). */
export function prefersMarkdown(accept = "") {
  const ranges = String(accept || "")
    .split(",")
    .map((part, at) => {
      const [type, ...params] = part.trim().toLowerCase().split(";").map((x) => x.trim());
      const qp = params.find((p) => p.startsWith("q="));
      const q = qp ? Number(qp.slice(2)) : 1;
      return { type, q: Number.isFinite(q) ? Math.min(Math.max(q, 0), 1) : 0, at };
    })
    .filter((r) => r.type);
  const md = quality(ranges, "text/markdown");
  if (!md.exact || md.q <= 0) return false;
  const html = quality(ranges, "text/html");
  return md.q > html.q || (md.q === html.q && md.at < html.at);
}

/** The agent file that holds the same facts as a page, or null. */
export function markdownFor(pathname) {
  if (pathname === "/" || pathname === "/index.html") return "/llms.txt";
  const base = settings.paths.workPages.replace(/\/+$/, "");
  if (!pathname.startsWith(`${base}/`)) return null;
  const slug = pathname.slice(base.length + 1).replace(/(\/index)?\.html$|\/$/, "");
  return SLUG.test(slug) ? `${settings.paths.work}/${slug}.md` : null;
}

/** Headers for every page the middleware lets through: caches keep the
 *  markdown and HTML answers apart, and the Link names the agent files. */
export const passHeaders = () => (on ? { Vary: "Accept", Link: LINK } : {});

/** The markdown answer for a request that prefers it, or null to serve the
 *  page as usual. Fetches the agent file from the same site, so a case
 *  study without a markdown file (locked, hidden) simply gets its page. */
export async function negotiate(request) {
  if (!on || (request.method !== "GET" && request.method !== "HEAD")) return null;
  const url = new URL(request.url);
  const file = markdownFor(url.pathname);
  if (!file || !prefersMarkdown(request.headers.get("accept"))) return null;
  try {
    const r = await fetch(new URL(file, url.origin), { headers: { accept: "text/markdown, text/plain", "user-agent": "door-policy (markdown on request)" }, redirect: "manual" });
    if (r.status !== 200) return null;
    const body = await r.text();
    return new Response(request.method === "HEAD" ? null : body, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Location": file,
        Vary: "Accept",
        Link: LINK,
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return null;
  }
}
