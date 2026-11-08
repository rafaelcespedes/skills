#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// A local stand-in for Vercel, to test the agent view and guest book before
// anything goes live. It serves a folder of built files, runs middleware.js on
// its matched paths, applies vercel.json's redirects, rewrites and headers,
// and calls the handlers in api/. Storage is in memory unless --closed.
//
//   node <skill>/scripts/local-server.mjs --root . --static dist --port 4399
//   node <skill>/scripts/local-server.mjs --root . --closed      (guest book off)
//
//   --root     the project (where vercel.json, middleware.js and api/ live)
//   --static   the built site to serve (default: --root)
//   --closed   don't switch on in-memory storage: tests the closed guest book
//
// Set GUESTBOOK_ADMIN_PASSWORD in the environment to test the review page.
// Build with the same setting: GUESTBOOK_MEMORY=1 for an open build.
// Next.js sites test with `next build && next start` instead.
// ─────────────────────────────────────────────────────────────────────────────

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] && !args[at + 1].startsWith("--") ? args[at + 1] : fallback;
};
const ROOT = path.resolve(opt("--root", "."));
const STATIC = path.resolve(ROOT, opt("--static", "."));
const PORT = Number(opt("--port", 4399));
const CLOSED = args.includes("--closed");

// storage must be decided before the guest book code is imported
if (CLOSED) delete process.env.GUESTBOOK_MEMORY;
else if (!process.env.KV_REST_API_URL && !process.env.UPSTASH_REDIS_REST_URL) process.env.GUESTBOOK_MEMORY = "1";

const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const exists = (p) => fs.existsSync(path.join(ROOT, p));

const mw = exists("middleware.js") ? await imp("middleware.js") : null;
const api = {};
if (exists("api")) {
  for (const f of fs.readdirSync(path.join(ROOT, "api"))) {
    if (f.startsWith("_") || !/\.(m?js)$/.test(f)) continue;
    const mod = await imp(`api/${f}`);
    const h = mod.default;
    api[`/api/${f.replace(/\.m?js$/, "")}`] = typeof h === "function" ? h : h?.fetch;
  }
}
const vercel = exists("vercel.json") ? JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8")) : {};

const TYPES = { ".html": "text/html; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".json": "application/json; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".mp4": "video/mp4", ".ico": "image/x-icon", ".woff2": "font/woff2", ".xml": "application/xml" };

/** Vercel's path patterns, enough for these configs: :name, :name*, (.*). */
function pattern(source) {
  let re = "";
  for (let i = 0; i < source.length; ) {
    const rest = source.slice(i);
    let m;
    if ((m = rest.match(/^\/:([a-z_]\w*)\*/i))) { re += `(?:/(?<${m[1]}>.*))?`; i += m[0].length; }
    else if ((m = rest.match(/^:([a-z_]\w*)/i))) { re += `(?<${m[1]}>[^/]+?)`; i += m[0].length; }
    else if ((m = rest.match(/^\((.*?)\)/))) { re += `(${m[1]})`; i += m[0].length; }
    else { re += rest[0].replace(/[.+?^${}|[\]\\]/g, "\\$&"); i++; }
  }
  return new RegExp(`^${re}$`, "i");
}
const fill = (dest, groups = {}) => dest.replace(/:([a-z_]\w*)\*?/gi, (_, k) => encodeURIComponent(groups[k] ?? ""));

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) headers.set(k, Array.isArray(v) ? v.join(",") : v);
  if (!headers.get("x-forwarded-for")) headers.set("x-forwarded-for", req.socket.remoteAddress);
  const hasBody = !["GET", "HEAD"].includes(req.method);
  const extra = {};
  for (const h of vercel.headers || []) if (pattern(h.source).test(url.pathname)) for (const { key, value } of h.headers) extra[key] = value;
  const send = async (r, withExtra = true) => {
    const out = Object.fromEntries(r.headers);
    if (withExtra) Object.assign(out, extra);
    res.writeHead(r.status, out);
    res.end(req.method === "HEAD" ? undefined : Buffer.from(await r.arrayBuffer()));
  };

  try {
    // 1. middleware
    if (mw && [].concat(mw.config?.matcher || []).some((m) => pattern(m).test(url.pathname))) {
      const pending = [];
      const r = await mw.default(new Request(url, { method: req.method, headers, body: hasBody ? body : undefined }), { waitUntil: (p) => pending.push(p) });
      await Promise.all(pending);
      if (r && !r.headers.get("x-middleware-next")) return send(r, false);
    }
    // 2. redirects
    for (const rd of vercel.redirects || []) {
      const m = url.pathname.match(pattern(rd.source));
      if (m) return send(new Response(null, { status: rd.permanent ? 308 : 307, headers: { Location: fill(rd.destination, m.groups) } }), false);
    }
    // 3. rewrites to functions
    let target = url.pathname;
    let search = url.search;
    for (const rw of vercel.rewrites || []) {
      const m = url.pathname.match(pattern(rw.source));
      if (m) {
        const [p, q] = fill(rw.destination, m.groups).split("?");
        target = p;
        search = q ? `?${q}` : "";
        break;
      }
    }
    if (api[target]) {
      return send(await api[target](new Request(new URL(target + search, url), { method: req.method, headers, body: hasBody ? body : undefined })), false);
    }
    if (target.startsWith("/api/")) return send(new Response("Not found", { status: 404 }), false);
    // 4. static files (directory index, then .html)
    let file = path.join(STATIC, decodeURIComponent(target));
    if (!file.startsWith(STATIC)) return send(new Response("Not found", { status: 404 }));
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file) && fs.existsSync(`${file}.html`)) file += ".html";
    if (!fs.existsSync(file) || /(^|\/)(\.|node_modules\/|agent-view\/\.last)/.test(path.relative(STATIC, file))) {
      const notFound = path.join(STATIC, "404.html");
      return send(new Response(fs.existsSync(notFound) ? fs.readFileSync(notFound) : "Not found", { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }));
    }
    return send(new Response(fs.readFileSync(file), { headers: { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream" } }));
  } catch (err) {
    console.error(err);
    return send(new Response(`Server error: ${err.message}`, { status: 500 }), false);
  }
});

server.listen(PORT, () => {
  console.log(`agent-view local server on http://localhost:${PORT}`);
  console.log(`  serving ${path.relative(process.cwd(), STATIC) || "."} · middleware ${mw ? "on" : "none"} · functions: ${Object.keys(api).join(", ") || "none"}`);
  console.log(`  guest book: ${CLOSED ? "closed (no storage)" : `storage ${process.env.GUESTBOOK_MEMORY ? "in memory (resets on restart)" : "Upstash"} · review page ${process.env.GUESTBOOK_ADMIN_PASSWORD ? "on" : "off (no GUESTBOOK_ADMIN_PASSWORD)"}`}`);
});
