// ─────────────────────────────────────────────────────────────────────────────
// Guest book storage: Upstash Redis, reached over its REST API, so no package
// is needed. Connecting "Upstash for Redis" to the project on Vercel (Storage
// tab) sets the variables read below; any Upstash database works if you set
// UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN yourself.
//
// For local testing only: GUESTBOOK_MEMORY=1 swaps in an in-memory stand-in
// (scripts/local-server.mjs sets it). Never set it on the live site.
// ─────────────────────────────────────────────────────────────────────────────

const env = (k) => (typeof process !== "undefined" && process.env ? process.env[k] : undefined);

const REST_URL = env("KV_REST_API_URL") || env("UPSTASH_REDIS_REST_URL");
const REST_TOKEN = env("KV_REST_API_TOKEN") || env("UPSTASH_REDIS_REST_TOKEN");
const MEMORY = !REST_URL && env("GUESTBOOK_MEMORY") === "1";

/** True once there is somewhere to keep entries. */
export const connected = Boolean((REST_URL && REST_TOKEN) || MEMORY);

/**
 * Run Redis commands in one round trip. Each command is an array, e.g.
 * ["INCR", "key"]. Resolves to the results in the same order.
 */
export async function redis(...commands) {
  if (!connected) throw new Error("guest book storage is not connected");
  if (MEMORY) return commands.map(memory);
  const res = await fetch(`${REST_URL.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`storage error ${res.status}`);
  const out = await res.json();
  return out.map((r) => {
    if (r.error) throw new Error(`storage error: ${r.error}`);
    return r.result;
  });
}

/* ── In-memory stand-in (local testing only) ──────────────────────────────── */

const mem = (globalThis.__guestbookMemory ||= new Map());

function memory([cmd, key, ...args]) {
  const op = cmd.toUpperCase();
  const list = () => (mem.has(key) ? mem.get(key) : (mem.set(key, []), mem.get(key)));
  const hash = () => (mem.has(key) ? mem.get(key) : (mem.set(key, {}), mem.get(key)));
  switch (op) {
    case "GET": return mem.has(key) ? mem.get(key) : null;
    case "SET": mem.set(key, String(args[0])); return "OK";
    case "MGET": return [key, ...args].map((k) => (mem.has(k) ? mem.get(k) : null));
    case "INCR": { const n = Number(mem.get(key) || 0) + 1; mem.set(key, String(n)); return n; }
    case "EXPIRE": return 1;
    case "LPUSH": list().unshift(...args.reverse()); return list().length;
    case "LRANGE": { const l = list(), a = +args[0], b = +args[1]; return l.slice(a, b < 0 ? l.length + b + 1 : b + 1); }
    case "LREM": { const l = list(), before = l.length; mem.set(key, l.filter((v) => v !== args[1])); return before - mem.get(key).length; }
    case "HINCRBY": { const h = hash(); h[args[0]] = String(Number(h[args[0]] || 0) + Number(args[1])); return Number(h[args[0]]); }
    case "HSET": { const h = hash(); for (let i = 0; i < args.length; i += 2) h[args[i]] = String(args[i + 1]); return 1; }
    case "HGETALL": return Object.entries(hash()).flat();
    default: throw new Error(`memory store: ${op} not supported`);
  }
}

/** HGETALL replies come back as a flat [field, value, ...] list. */
export const pairs = (flat) => {
  const out = {};
  for (let i = 0; flat && i < flat.length; i += 2) out[flat[i]] = flat[i + 1];
  return out;
};
