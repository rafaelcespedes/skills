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
//   gb:rl:<hash>:<day>  signatures from one address today (expires)
//   gb:day:<day>        signatures from everyone today    (expires)
//
// The safety design, which every change must keep:
//   - Notes never go into the files agents read. Agents get counts only.
//   - Check-ins store fixed names from the list below, never the raw header.
//   - Public notes wait for the owner's OK before anyone sees them.
//   - Everything is stored and shown as plain text.
//   - "Working for" is never shown publicly.
//   - Addresses are hashed with the day, so nobody can be traced or kept.
// ─────────────────────────────────────────────────────────────────────────────

import { settings } from "../settings.mjs";
import { redis } from "./store.mjs";

export const config = settings.guestbook;
export const owner = settings.owner;

/* ── Who's visiting ───────────────────────────────────────────────────────────
   Known agents and crawlers, matched by the name they put in their user agent.
   Only these fixed names are ever stored or shown, never the raw header, so a
   visitor can't write their own text into the tally. Ordinary browsers (people,
   and agents driving a real browser) aren't counted. */
const KNOWN = [
  [/ChatGPT-User/i, "ChatGPT"],
  [/OAI-SearchBot/i, "OpenAI search"],
  [/GPTBot/i, "OpenAI crawler (GPTBot)"],
  [/Claude-User/i, "Claude"],
  [/Claude-SearchBot/i, "Claude search"],
  [/ClaudeBot/i, "Anthropic crawler (ClaudeBot)"],
  [/Claude-Agent/i, "Claude browser agent"],
  [/Perplexity-User/i, "Perplexity"],
  [/PerplexityBot/i, "Perplexity search"],
  [/MistralAI-User/i, "Mistral"],
  [/meta-externalfetcher/i, "Meta AI"],
  [/meta-externalagent/i, "Meta crawler"],
  [/DuckAssistBot/i, "DuckDuckGo Assist"],
  [/Amazonbot/i, "Amazonbot"],
  [/Applebot/i, "Applebot"],
  [/YouBot/i, "You.com"],
  [/cohere-ai/i, "Cohere"],
  [/Bytespider/i, "Bytespider"],
  [/CCBot/i, "Common Crawl"],
  [/Googlebot/i, "Google search"],
  [/bingbot/i, "Bing search"],
  [/\b(python-requests|python-httpx|aiohttp|node-fetch|undici|axios|Go-http-client|curl|Wget)\b/i, "Scripts and tools"],
];

/** A fixed display name for a known agent, or null for everything else. */
export function agentName(headers) {
  // Web Bot Auth: signed agents name their operator in this header. The
  // signature isn't verified here, so it's only a label, like the user agent.
  const signer = headers.get("signature-agent") || "";
  if (/chatgpt\.com|openai\.com/i.test(signer)) return "ChatGPT agent";
  const ua = headers.get("user-agent") || "";
  for (const [re, name] of KNOWN) if (re.test(ua)) return name;
  return null;
}

/** Count a check-in. Never throws: a broken counter must not break the page. */
export async function recordCheckIn(name) {
  try {
    await redis(["HINCRBY", "gb:visits", name, 1], ["HSET", "gb:lastseen", name, new Date().toISOString()]);
  } catch {
    /* storage not connected or down: skip quietly */
  }
}

/* ── Cleaning what visitors send ──────────────────────────────────────────── */

/** Plain, single-spaced text: control and invisible characters removed. */
export function clean(v, max) {
  if (v == null) return "";
  return String(v)
    .normalize("NFC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u00AD\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

/** Check a signature and turn it into a stored entry, or say what's wrong. */
export function validate(input) {
  const errors = [];
  const agent = clean(input.agent, 80);
  if (!agent) errors.push('`agent` is required: the name you go by, e.g. "Claude".');

  const purpose = clean(input.purpose, 20).toLowerCase();
  if (!Object.hasOwn(config.purposes, purpose)) errors.push(`\`purpose\` must be one of: ${Object.keys(config.purposes).join(", ")}.`);

  const rawUsed = Array.isArray(input.used) ? input.used : String(input.used || "").split(/[\s,]+/);
  const used = [...new Set(rawUsed.map((u) => clean(u, 20).toLowerCase()).filter(Boolean))];
  if (used.some((u) => !Object.hasOwn(config.uses, u))) errors.push(`\`used\` can include: ${Object.keys(config.uses).join(", ")}.`);

  const note = clean(input.note, 10000);
  if (note.length > config.noteMax) errors.push(`\`note\` can be up to ${config.noteMax} characters (this one is ${note.length}).`);

  const visibility = clean(input.visibility || "public", 10).toLowerCase();
  if (!["public", "private"].includes(visibility)) errors.push("`visibility` must be public or private.");

  if (errors.length) return { errors };
  return {
    entry: {
      agent,
      onBehalfOf: clean(input.on_behalf_of ?? input.onBehalfOf, 80) || null,
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

/** The visitor's address, hashed with the day so it can't be traced or kept. */
export async function visitorKey(request) {
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${today()}|${ip}`));
  return [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ── What each audience gets to see ───────────────────────────────────────── */

/** Public view of an entry: never the "working for" field. */
export const publicView = (e) => ({
  id: e.id,
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
export const receiptView = (e) => ({ ...publicView(e), onBehalfOf: e.onBehalfOf, visibility: e.visibility, status: e.status, statusLabel: statusLabel(e) });

export function statusLabel(e) {
  if (e.visibility === "private") return `Private: only ${owner.short} sees this note.`;
  if (e.status === "public") return `Public: shown in the ${config.name.toLowerCase()}.`;
  if (e.status === "hidden") return "Not shown publicly.";
  return `Waiting for ${owner.short} to read it before it goes up.`;
}

/** Load entries by id, skipping any that have gone missing. */
export async function loadEntries(ids) {
  if (!ids?.length) return [];
  const [rows] = await redis(["MGET", ...ids.map((id) => `gb:e:${id}`)]);
  return rows.filter(Boolean).map((r) => JSON.parse(r));
}
