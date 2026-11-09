// ─────────────────────────────────────────────────────────────────────────────
// The guest book's rules, shared by the sign endpoint, the review page and the
// check-in counter (middleware). Settings (name, choices, limits) come from
// config.mjs. Web-standard APIs only, so it runs in middleware too.
//
// Storage keys (Redis):
//   gb:e:<id>           one entry, as JSON
//   gb:pending          public entries waiting for the owner's OK (newest first)
//   gb:public           approved public entries
//   gb:private          private notes, for the owner only
//   gb:archived         private notes the owner has read
//   gb:visits           check-ins per known agent        (hash: name → count)
//   gb:lastseen         last check-in per known agent    (hash: name → ISO date)
//   gb:seen:<hash>:<name>:<day>  one address already counted for that
//                       name today, so a loop counts once (expires)
//   gb:ci:<day>         check-ins counted today, capped   (expires)
//   gb:rl:<hash>:<day>  signatures from one address today (expires)
//   gb:day:<day>        signatures from everyone today    (expires)
//
// The safety design, which every change must keep:
//   - Notes never go into the files agents read. Agents get counts only.
//   - Check-ins store fixed names from the list below, never the raw header.
//   - Public notes wait for the owner's OK before anyone sees them.
//   - Everything is stored and shown as plain text.
//   - "Working for" is never shown publicly.
//   - Addresses are never stored: only a hash of the address and the day,
//     salted with the storage token (so it can't be reversed without it),
//     which expires within a day.
// ─────────────────────────────────────────────────────────────────────────────

import { settings } from "../settings.mjs";
import { redis, hashSecret } from "./store.mjs";

export const config = settings.guestbook;
export const owner = settings.owner;
/** The guest book's own name, as written, when it isn't just "Guest book". */
export const called = /^guest ?book$/i.test(config.name) ? "" : ` (“${config.name}”)`;

/* ── Who's visiting ───────────────────────────────────────────────────────────
   Known agents and crawlers, matched by the name they put in their user agent.
   Only these fixed names are ever stored or shown, never the raw header, so a
   visitor can't write their own text into the tally. Ordinary browsers (people,
   and agents driving a real browser) aren't counted. The names are what the
   visitor's software says it is: nothing here verifies it.
   Every entry that is an AI agent (no `ai: false`) must also be in
   AI_CRAWLERS in core.mjs, so robots.txt asks it too (scripts/selftest.mjs). */
export const KNOWN = [
  { token: "ChatGPT-User", name: "ChatGPT" },
  { token: "OAI-SearchBot", name: "OpenAI search" },
  { token: "GPTBot", name: "OpenAI crawler (GPTBot)" },
  { token: "Claude-User", name: "Claude" },
  { token: "Claude-SearchBot", name: "Claude search" },
  { token: "Claude-Agent", name: "Claude browser agent" },
  { token: "Claude-Web", name: "Claude" },
  { token: "ClaudeBot", name: "Anthropic crawler (ClaudeBot)" },
  { token: "anthropic-ai", name: "Anthropic crawler (ClaudeBot)" },
  { token: "Perplexity-User", name: "Perplexity" },
  { token: "PerplexityBot", name: "Perplexity search" },
  { token: "MistralAI-User", name: "Mistral" },
  { token: "MistralAI-Index", name: "Mistral search" },
  { token: "MistralAI-Training", name: "Mistral crawler" },
  { token: "meta-externalfetcher", name: "Meta AI" },
  { token: "meta-webindexer", name: "Meta AI search" },
  { token: "meta-externalagent", name: "Meta crawler" },
  { token: "Google-Agent", name: "Google agent" },
  { token: "Google-GeminiNotebook", name: "Gemini Notebook" },
  { token: "Google-CloudVertexBot", name: "Google Vertex AI" },
  { token: "DuckAssistBot", name: "DuckDuckGo Assist" },
  { token: "Amzn-User", name: "Amazon" },
  { token: "Amzn-SearchBot", name: "Amazon search" },
  { token: "Amazonbot", name: "Amazonbot" },
  { token: "YouBot", name: "You.com" },
  { token: "cohere-training-data-crawler", name: "Cohere crawler" },
  { token: "cohere-ai", name: "Cohere" },
  { token: "Bytespider", name: "Bytespider" },
  { token: "CCBot", name: "Common Crawl" },
  { token: "Applebot", name: "Applebot", ai: false },
  { token: "Googlebot", name: "Google search", ai: false },
  { token: "bingbot", name: "Bing search", ai: false },
  { re: /\b(python-requests|python-httpx|aiohttp|node-fetch|undici|axios|Go-http-client|curl|Wget)\b/i, name: "Scripts and tools", ai: false },
];
const MATCHERS = KNOWN.map((k) => [k.re || new RegExp(k.token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), k.name]);

/** A fixed display name for a known agent, or null for everything else. */
export function agentName(headers) {
  // Web Bot Auth: signed agents name their operator in this header. The
  // signature isn't verified here, so it's only a label, like the user agent.
  const raw = headers.get("signature-agent") || "";
  if (raw) {
    try {
      const host = new URL((raw.match(/"([^"]+)"/) || [, raw.trim()])[1]).hostname.toLowerCase();
      if (host === "chatgpt.com" || host.endsWith(".openai.com")) return "ChatGPT agent";
    } catch {
      /* not an address: ignore it */
    }
  }
  const ua = headers.get("user-agent") || "";
  for (const [re, name] of MATCHERS) if (re.test(ua)) return name;
  return null;
}

/** Most check-ins counted in a day; past it, the rest are skipped quietly,
 *  so a flood can't use up the storage plan. */
const CHECKINS_PER_DAY = 2000;

/** Count a check-in, once per address, name and day. Never throws: a broken
 *  counter must not break the page. */
export async function recordCheckIn(name, request) {
  try {
    const day = today();
    const who = request ? await visitorKey(request) : "unknown";
    const [fresh] = await redis(["SET", `gb:seen:${who}:${name}:${day}`, "1", "NX", "EX", 86400]);
    if (fresh !== "OK") return;
    const [counted] = await redis(["INCR", `gb:ci:${day}`], ["EXPIRE", `gb:ci:${day}`, 172800]);
    if (counted > CHECKINS_PER_DAY) return;
    await redis(["HINCRBY", "gb:visits", name, 1], ["HSET", "gb:lastseen", name, new Date().toISOString()]);
  } catch {
    /* storage not connected or down: skip quietly */
  }
}

/* ── Cleaning what visitors send ──────────────────────────────────────────── */

/** Plain, single-spaced text. Control, format, private-use and unassigned
 *  characters go (tag characters can hide a whole prompt the owner never
 *  sees), and so do variation selectors, blank fillers and long stacks of
 *  combining marks. Line breaks and tabs stay. */
export function clean(v, max) {
  if (v == null) return "";
  return String(v)
    .normalize("NFC")
    .replace(/\r\n?|[\u2028\u2029]/g, "\n")
    .replace(/[\p{Cc}]/gu, (ch) => (ch === "\n" || ch === "\t" ? ch : ""))
    .replace(/[\p{Cf}\p{Co}\p{Cn}\u{E0000}-\u{E007F}\uFE00-\uFE0F\u{E0100}-\u{E01EF}\u180B-\u180F\u034F\u115F\u1160\u3164\uFFA0\u2800]/gu, "")
    .replace(/(\p{M}{3})\p{M}+/gu, "$1")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

/** Check a signature and turn it into a stored entry, or say what's wrong. */
export function validate(input) {
  // wrong types are refused, not turned into text ("Claude,x", "[object Object]")
  const types = [];
  for (const k of ["agent", "purpose", "note", "on_behalf_of", "onBehalfOf", "visibility"]) {
    if (input[k] != null && typeof input[k] !== "string") types.push(`\`${k}\` must be text.`);
  }
  if (input.used != null && typeof input.used !== "string" && !(Array.isArray(input.used) && input.used.every((u) => typeof u === "string"))) {
    types.push("`used` must be text or a list of text.");
  }
  if (types.length) return { errors: types };

  const errors = [];
  // one-line fields: a line break would split a name across lines
  const line = (v, n) => clean(v, n).replace(/\s*\n\s*/g, " ");
  const agent = line(input.agent, 80);
  if (!agent) errors.push('`agent` is required: the agent\'s name, e.g. "Claude".');
  else if (!/[\p{L}\p{N}]/u.test(agent)) errors.push("`agent` needs at least one letter or digit.");

  const purpose = line(input.purpose, 20).toLowerCase();
  if (!Object.hasOwn(config.purposes, purpose)) errors.push(`\`purpose\` must be one of: ${Object.keys(config.purposes).join(", ")}.`);

  const rawUsed = Array.isArray(input.used) ? input.used : String(input.used || "").split(/[\s,]+/);
  const used = [...new Set(rawUsed.map((u) => clean(u, 20).toLowerCase()).filter(Boolean))];
  if (used.some((u) => !Object.hasOwn(config.uses, u))) errors.push(`\`used\` can include: ${Object.keys(config.uses).join(", ")}.`);

  const note = clean(input.note, 10000);
  if (note.length > config.noteMax) errors.push(`\`note\` can be up to ${config.noteMax} characters (this one is ${note.length}).`);

  const visibility = line(input.visibility || "public", 10).toLowerCase();
  if (!["public", "private"].includes(visibility)) errors.push("`visibility` must be public or private.");

  if (errors.length) return { errors };
  return {
    entry: {
      agent,
      onBehalfOf: line(input.on_behalf_of ?? input.onBehalfOf, 80) || null,
      purpose,
      used,
      note: note || null,
      visibility,
    },
  };
}

/* ── Ids, addresses, days ─────────────────────────────────────────────────── */

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
/** 12 random characters: unguessable, so a receipt link is private by default. */
export function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
}
export const isId = (s) => typeof s === "string" && /^[a-z2-9]{12}$/.test(s);

export const today = () => new Date().toISOString().slice(0, 10);

/** The visitor's address, hashed with the day and salted with the storage
 *  token, so the stored key can't be turned back into the address without
 *  that token. */
export async function visitorKey(request) {
  // the header the host fills in itself (config.guestbook.ipHeader): on
  // Vercel x-forwarded-for, which Vercel overwrites, so it can't be faked
  const ip = (request.headers.get(config.ipHeader) || "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${hashSecret}|${today()}|${ip}`));
  return [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ── What each audience gets to see ───────────────────────────────────────── */

/** Public view of an entry: never the "working for" field, and never the id
 *  (the id is the receipt link, which shows "working for"). */
export const publicView = (e) => ({
  agent: e.agent,
  seenAs: e.seenAs || null,
  purpose: e.purpose,
  purposeLabel: config.purposes[e.purpose] || e.purpose,
  used: e.used,
  usedLabels: e.used.map((u) => config.uses[u] || u),
  note: e.note,
  createdAt: e.createdAt,
});

/** What the signer (and whoever they share the receipt with) sees. */
export const receiptView = (e) => ({ id: e.id, ...publicView(e), onBehalfOf: e.onBehalfOf, visibility: e.visibility, status: e.status, statusLabel: statusLabel(e) });

export function statusLabel(e) {
  if (e.visibility === "private") return `Private: only ${owner.short} sees this note.`;
  if (e.status === "public") return `Public: shown in the guest book${called}.`;
  if (e.status === "hidden") return "Not shown publicly.";
  return `Waiting for ${owner.short} to read it before it goes up.`;
}

/** Load entries by id, skipping any that have gone missing. */
export async function loadEntries(ids) {
  if (!ids?.length) return [];
  const [rows] = await redis(["MGET", ...ids.map((id) => `gb:e:${id}`)]);
  return rows.filter(Boolean).map((r) => JSON.parse(r));
}
