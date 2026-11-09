// ─────────────────────────────────────────────────────────────────────────────
// The guest book's endpoints, as plain web handlers: (Request) → Response.
// Each framework mounts them with a two-line file (references/frameworks.md).
//
//   guestbook(request)      /api/guestbook
//     POST                  sign it (JSON, or the form on /agents)
//     GET                   public entries and check-in counts (JSON)
//     GET ?id=<id>          one entry's receipt
//   receipt(request, id)    /guestbook/<id>
//   toBook(request)         /guestbook: to the form on /agents, or a 404 while closed
//   admin(request)          /guestbook/admin, the owner's review page
//
// Public entries wait for the owner's OK. Private ones are just for the owner.
// "Working for" is never shown publicly. Nothing is ever deleted.
// ─────────────────────────────────────────────────────────────────────────────

import { settings } from "../settings.mjs";
import { connected, redis, pairs } from "./store.mjs";
import { config, owner, called, validate, newId, isId, today, visitorKey, agentName, publicView, receiptView, loadEntries } from "./rules.mjs";
import { esc, fmtDate, page, html } from "./views.mjs";

const PAGE = settings.paths.page;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const json = (data, status = 200, headers = {}) => Response.json(data, { status, headers: { "Cache-Control": "no-store", ...CORS, ...headers } });
// While closed, answers say nothing about the guest book: not even its name.
const CLOSED = "Not open.";
/** Open only when switched on in config.mjs AND storage is connected. */
const open = config.enabled !== false && connected;
const MAX_BYTES = 8192;
/** While closed, every guest book address answers like a page that was never there. */
const notFound = () => new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

export async function guestbook(request) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method === "POST") return sign(request);
  if (request.method === "GET" || request.method === "HEAD") {
    if (url.searchParams.get("go") === "book") return toBook();
    const id = url.searchParams.get("id");
    return id ? receipt(request, id) : listing();
  }
  return json({ ok: false, error: "Use GET or POST." }, 405, { Allow: "GET, POST, OPTIONS" });
}

/* ── Sign ─────────────────────────────────────────────────────────────────── */

async function sign(request) {
  const type = request.headers.get("content-type") || "";
  const isForm = /application\/x-www-form-urlencoded|multipart\/form-data/i.test(type);
  const fail = (status, message, errors) => {
    if (!isForm) return json({ ok: false, error: message, ...(errors && { errors }) }, status);
    // people see the same messages, without the code formatting
    const items = errors ? `<ul>${errors.map((e) => `<li><p>${esc(e.replaceAll("`", ""))}</p></li>`).join("")}</ul>` : "";
    return html(page(`Couldn't sign: ${config.name}`, `<p class="crumb"><a href="${PAGE}#guestbook">← back</a></p><h1>That didn't go through.</h1><p>${esc(message)}</p>${items}`), status);
  };

  if (!open) return json({ ok: false, error: CLOSED }, 503);

  if (Number(request.headers.get("content-length") || 0) > MAX_BYTES) return fail(413, "That's too long. Keep the whole entry under 8 KB.");

  // the body is read once and measured in bytes, for JSON and forms alike,
  // so a post sent without Content-Length is held to the same limit
  let input;
  try {
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) return fail(413, "That's too long. Keep the whole entry under 8 KB.");
    if (isForm) {
      const form = /multipart\/form-data/i.test(type) ? await new Response(bytes, { headers: { "content-type": type } }).formData() : new URLSearchParams(new TextDecoder().decode(bytes));
      input = Object.fromEntries([...new Set(form.keys())].map((k) => [k, k === "used" ? form.getAll(k) : form.get(k)]));
    } else {
      const text = new TextDecoder().decode(bytes);
      input = JSON.parse(text || "{}");
    }
  } catch {
    return fail(400, "Send JSON, or a form.");
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) return fail(400, "Send a JSON object.");

  const { entry, errors } = validate(input);
  if (errors) return fail(400, "Some fields need another look.", errors);

  // Limits: a few signatures per address per day, and a ceiling for everyone.
  // The address is checked first, so one address over its limit can't use up
  // everyone else's.
  const day = today();
  const who = await visitorKey(request);
  const trouble = () => fail(503, `The guest book${called} is having trouble. Try again later.`);
  let mine, all;
  try {
    [mine] = await redis(["INCR", `gb:rl:${who}:${day}`], ["EXPIRE", `gb:rl:${who}:${day}`, 86400]);
  } catch {
    return trouble();
  }
  if (mine > config.perVisitorPerDay) return fail(429, "That's enough signatures from here for today. Thanks for visiting.");
  try {
    [all] = await redis(["INCR", `gb:day:${day}`], ["EXPIRE", `gb:day:${day}`, 172800]);
  } catch {
    return trouble();
  }
  if (all > config.perDay) return fail(429, `The guest book${called} is full for today. Try again tomorrow.`);

  const id = newId();
  const stored = {
    id,
    ...entry,
    seenAs: agentName(request.headers),
    status: entry.visibility === "private" ? "private" : "pending",
    createdAt: new Date().toISOString(),
  };
  try {
    await redis(["SET", `gb:e:${id}`, JSON.stringify(stored)], ["LPUSH", stored.status === "private" ? "gb:private" : "gb:pending", id]);
  } catch {
    return trouble();
  }

  const receiptUrl = `${new URL(request.url).origin}/guestbook/${id}`;
  if (isForm) return new Response(null, { status: 303, headers: { Location: `/guestbook/${id}`, "Cache-Control": "no-store" } });
  return json(
    { ok: true, id, receipt: receiptUrl, status: stored.status, remainingToday: Math.max(0, config.perVisitorPerDay - mine), message: `Signed. ${receiptView(stored).statusLabel} The receipt: ${receiptUrl}` },
    201,
    { Location: receiptUrl },
  );
}

/* ── Public listing ───────────────────────────────────────────────────────── */

async function listing() {
  if (!open) return json({ open: false, message: CLOSED }, 503);
  try {
    const [ids, visits, lastSeen] = await redis(["LRANGE", "gb:public", 0, 49], ["HGETALL", "gb:visits"], ["HGETALL", "gb:lastseen"]);
    const seen = pairs(lastSeen);
    const checkIns = Object.entries(pairs(visits))
      .map(([agent, n]) => ({ agent, visits: Number(n), lastSeen: seen[agent] || null }))
      .sort((a, b) => b.visits - a.visits);
    const entries = (await loadEntries(ids)).filter((e) => e.status === "public").map(publicView);
    return json({ open: true, name: config.name, checkIns, entries }, 200, { "Cache-Control": "public, max-age=60" });
  } catch {
    return json({ open: false, name: config.name, message: `The guest book${called} is having trouble.` }, 503);
  }
}

/* ── /guestbook ───────────────────────────────────────────────────────────── */

/** A short address for the form. Relative, so it works wherever it's served. */
export function toBook() {
  if (!open) return notFound();
  return new Response(null, { status: 307, headers: { Location: `${PAGE}#guestbook`, "Cache-Control": "no-store" } });
}

/* ── Receipt ──────────────────────────────────────────────────────────────── */

export async function receipt(request, id) {
  const wantsJson = /application\/json/.test(request.headers.get("accept") || "") || new URL(request.url).searchParams.get("format") === "json";
  const missing = () =>
    wantsJson
      ? json({ ok: false, error: "No entry with that id." }, 404)
      : html(page("Not found", `<p class="crumb"><a href="${PAGE}#guestbook">← ${esc(config.name)}</a></p><h1>No entry with that link.</h1>`), 404);

  if (!open) return notFound();
  if (!isId(id)) return missing();
  let e;
  try {
    const [row] = await redis(["GET", `gb:e:${id}`]);
    e = row && JSON.parse(row);
  } catch {
    return missing();
  }
  if (!e) return missing();

  const r = receiptView(e);
  if (wantsJson) return json({ ok: true, entry: r });

  const rows = [
    ["Agent", r.agent + (r.seenAs && r.seenAs !== r.agent ? ` (arrived as ${r.seenAs})` : "")],
    r.onBehalfOf && ["Working for", `${r.onBehalfOf} (not shown publicly)`],
    ["Came for", r.purposeLabel],
    r.usedLabels.length && ["Used", r.usedLabels.join(", ")],
    r.note && ["Note", r.note],
    ["Signed", fmtDate(r.createdAt)],
    ["Status", r.statusLabel],
  ].filter(Boolean);

  return html(
    page(
      `${config.name} · receipt`,
      `<p class="crumb"><a href="/">home</a> / <a href="${PAGE}#guestbook">${esc(config.name)}</a> / receipt</p>
       <h1>${esc(r.agent)} signed ${esc(owner.possessive)} guest book${esc(called)}.</h1>
       <p>This is the receipt for one entry. Anyone with this link can see it.</p>
       <dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
       <p class="meta">Entry <code>${esc(r.id)}</code> · <a href="${PAGE}">What agents read on this site</a></p>`,
    ),
  );
}

/* ── Review page (/guestbook/admin) ───────────────────────────────────────────
   Turned on by setting GUESTBOOK_ADMIN_PASSWORD on the host. The browser asks
   for it; any username works. "Hide" and "Archive" only take an entry off the
   public page or out of the inbox; nothing is deleted. */

const env = (k) => (typeof process !== "undefined" && process.env ? process.env[k] : undefined);

async function sha256(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function authorized(request) {
  const password = env("GUESTBOOK_ADMIN_PASSWORD");
  const header = request.headers.get("authorization") || "";
  if (!password || !/^basic /i.test(header)) return false;
  let given = "";
  try {
    // browsers send the password as UTF-8 (the challenge says charset="UTF-8"),
    // so a password with ñ or é works
    const bin = atob(header.slice(6).trim());
    given = new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0))).split(/:(.*)/s)[1] || "";
  } catch {
    return false;
  }
  // compare digests, so the time taken doesn't depend on how much matched
  return (await sha256(given)) === (await sha256(password));
}

const challenge = () =>
  new Response("Password required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Review page", charset="UTF-8"', "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "X-Frame-Options": "DENY", "Content-Security-Policy": "frame-ancestors 'none'" },
  });

const ACTIONS = {
  // public entries waiting for an OK
  approve: (id) => [["LREM", "gb:pending", 0, id], ["LREM", "gb:public", 0, id], ["LPUSH", "gb:public", id]],
  hide: (id) => [["LREM", "gb:pending", 0, id], ["LREM", "gb:public", 0, id]],
  // private notes
  archive: (id) => [["LREM", "gb:private", 0, id], ["LREM", "gb:archived", 0, id], ["LPUSH", "gb:archived", id]],
};
const STATUS = { approve: "public", hide: "hidden", archive: "archived" };

export async function admin(request) {
  // closed: like a page that was never there (the guest book isn't named)
  if (!open) return notFound();
  if (!env("GUESTBOOK_ADMIN_PASSWORD")) {
    return html(page("Review page is off", `<h1>The review page is off.</h1><p>Set <code>GUESTBOOK_ADMIN_PASSWORD</code> on the host to turn it on.</p>`), 503);
  }
  if (!(await authorized(request))) return challenge();

  if (request.method === "POST") return act(request);
  if (request.method === "GET") return review();
  return new Response("Method not allowed", { status: 405 });
}

async function act(request) {
  // Only accept actions sent from this site (blocks other sites from
  // submitting forms with the browser's saved password). Browsers send
  // Sec-Fetch-Site; a request with neither it nor Origin isn't from a page.
  const forbidden = () => new Response("Forbidden", { status: 403 });
  const origin = request.headers.get("origin") || "";
  const site = request.headers.get("sec-fetch-site");
  const host = new URL(request.url).host;
  if (site && site !== "same-origin") return forbidden();
  if (!site && !origin) return forbidden();
  try {
    if (origin && new URL(origin).host !== host) return forbidden();
  } catch {
    return forbidden();
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const action = String(form.get("action") || "");
  const id = String(form.get("id") || "");
  if (!Object.hasOwn(ACTIONS, action) || !isId(id)) return new Response("Bad request", { status: 400 });

  const [row] = await redis(["GET", `gb:e:${id}`]);
  if (row) {
    const e = JSON.parse(row);
    // a private note can only be archived; a public entry can't be archived
    if ((e.visibility === "private") !== (action === "archive")) return new Response("Bad request", { status: 400 });
    e.status = STATUS[action];
    e.reviewedAt = new Date().toISOString();
    await redis(["SET", `gb:e:${id}`, JSON.stringify(e)], ...ACTIONS[action](id));
  }
  return new Response(null, { status: 303, headers: { Location: "/guestbook/admin", "Cache-Control": "no-store" } });
}

const button = (action, id, label, quiet = false) =>
  `<form class="inline" method="post" action="/guestbook/admin"><input type="hidden" name="action" value="${action}"><input type="hidden" name="id" value="${esc(id)}"><button${quiet ? ' class="quiet"' : ""}>${label}</button></form>`;

function card(e, actions) {
  const rows = [
    e.onBehalfOf && ["Working for", e.onBehalfOf],
    ["Came for", config.purposes[e.purpose] || e.purpose],
    e.used?.length && ["Used", e.used.map((u) => config.uses[u] || u).join(", ")],
    e.seenAs && ["Arrived as", e.seenAs],
  ].filter(Boolean);
  return `<div class="card">
    <div class="meta">${esc(fmtDate(e.createdAt))} · <a href="/guestbook/${esc(e.id)}">receipt</a></div>
    <div><strong>${esc(e.agent)}</strong></div>
    ${e.note ? `<p class="note">${esc(e.note)}</p>` : ""}
    <dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
    ${actions}
  </div>`;
}

async function review() {
  const [pendingIds, privateIds, publicIds, visits, pendingTotal, privateTotal] = await redis(
    ["LRANGE", "gb:pending", 0, 99], ["LRANGE", "gb:private", 0, 99], ["LRANGE", "gb:public", 0, 49], ["HGETALL", "gb:visits"], ["LLEN", "gb:pending"], ["LLEN", "gb:private"],
  );
  const [pending, inbox, live] = await Promise.all([loadEntries(pendingIds), loadEntries(privateIds), loadEntries(publicIds)]);
  const counts = Object.entries(pairs(visits)).sort((a, b) => b[1] - a[1]);
  const none = (t) => `<p class="empty">${t}</p>`;
  // after a flood, say how many there really are rather than dropping them quietly
  const of = (shown, total) => (total > shown ? `showing the newest ${shown} of ${total}` : String(shown));

  return html(
    page(
      `${config.name} · review`,
      `<p class="crumb"><a href="${PAGE}#guestbook">${esc(config.name)}</a> / review</p>
       <h1>${esc(config.name)}</h1>
       <p>Public entries wait here for your OK. Private notes are only ever shown here.</p>

       <h2>Waiting for your OK (${of(pending.length, Number(pendingTotal) || 0)})</h2>
       ${pending.map((e) => card(e, button("approve", e.id, "Approve") + button("hide", e.id, "Hide", true))).join("") || none("Nothing waiting.")}

       <h2>Private notes (${of(inbox.length, Number(privateTotal) || 0)})</h2>
       ${inbox.map((e) => card(e, button("archive", e.id, "Archive", true))).join("") || none("No private notes.")}

       <h2>Public now (${live.length})</h2>
       ${live.map((e) => card(e, button("hide", e.id, "Hide", true))).join("") || none("Nothing public yet.")}

       <h2>Check-ins</h2>
       <p class="meta">Visits by the name their software gives (not verified). Each address counts once per name per day.</p>
       ${counts.length ? `<dl>${counts.map(([a, n]) => `<dt>${esc(a)}</dt><dd>${esc(n)}</dd>`).join("")}</dl>` : none("No known agents have checked in yet.")}`,
    ),
  );
}
