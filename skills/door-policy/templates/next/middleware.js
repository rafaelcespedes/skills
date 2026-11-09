/*
  Runs before the paths below are served. Two jobs:

  1. Markdown on request (door-policy/negotiate.mjs): a client that clearly
     prefers markdown (Accept: text/markdown) asking for "/" or a case-study
     page gets the matching agent file, the same facts in the format it asked
     for. Everyone else gets the page as before, plus "Vary: Accept" and a
     Link to /llms.txt. Decided by the Accept header, never the user agent.
     Off in "no-ai".
  2. Guest book check-ins: when a known AI agent reads one of these paths,
     count the visit under that agent's fixed name, once per address and
     day. People aren't counted and nothing about the visitor is kept.

  This is the version for Next.js 15 and earlier. Next.js 16 and later use
  proxy.js instead (beside this file). On Next.js 16, rename an existing
  middleware.js to proxy.js (and its function to proxy) before merging.
  If the project already has one, merge this into it, and keep its own
  security headers off /guestbook and /api/guestbook (the guest book sets
  stricter ones). Keep the matcher in step with paths in
  door-policy/config.mjs, and add the folder of the case-study pages people
  see if it isn't /work.

  With src/app, this file goes in src/ and the imports below start with
  "../door-policy/" (door-policy/ stays at the project root).
*/
import { NextResponse } from "next/server";
import { agentName, recordCheckIn } from "./door-policy/guestbook/rules.mjs";
import { negotiate, passHeaders } from "./door-policy/negotiate.mjs";

export const config = {
  matcher: ["/", "/agents", "/llms.txt", "/llms-full.txt", "/profile.json", "/work/:path*"],
};

export default async function middleware(request, event) {
  const name = agentName(request.headers);
  // count after the response goes out, so agents aren't kept waiting
  if (name) event.waitUntil(recordCheckIn(name, request));
  const markdown = await negotiate(request);
  if (markdown) return markdown;
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(passHeaders())) res.headers.set(k, v);
  return res;
}
