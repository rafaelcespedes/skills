/*
  Runs before the paths below are served. Two jobs, both web-standard:

  1. Markdown on request (door-policy/negotiate.mjs): a client that clearly
     prefers markdown (Accept: text/markdown) asking for "/" or a case-study
     page gets the matching agent file, the same facts in the format it asked
     for. Everyone else gets the page as before, plus "Vary: Accept" and a
     Link to /llms.txt. Decided by the Accept header, never the user agent.
     Off in "no-ai".
  2. Guest book check-ins: when a known AI agent reads one of these paths,
     count the visit under that agent's fixed name, once per address and
     day. The name is what the visitor's software says it is (not verified).
     People aren't counted and nothing about the visitor is kept. Does
     nothing while the guest book's storage isn't connected.

  Vercel runs this for any framework except Next.js (Next.js has its own
  version: templates/next/). If the site already has a middleware.js, merge
  this into it. Keep the matcher in step with paths in door-policy/config.mjs,
  and add the folder of the case-study pages people see if it isn't /work.
*/
import { agentName, recordCheckIn } from "./door-policy/guestbook/rules.mjs";
import { negotiate, passHeaders } from "./door-policy/negotiate.mjs";

export const config = {
  matcher: ["/", "/agents", "/llms.txt", "/llms-full.txt", "/profile.json", "/work/:path*"],
};

// Let the request through (what next() from @vercel/functions returns),
// with the extra response headers.
const pass = () => new Response(null, { headers: { "x-middleware-next": "1", ...passHeaders() } });

export default async function middleware(request, context) {
  const name = agentName(request.headers);
  if (name) {
    const counted = recordCheckIn(name, request);
    // count after the response goes out, so agents aren't kept waiting
    if (context && typeof context.waitUntil === "function") context.waitUntil(counted);
    else await counted;
  }
  return (await negotiate(request)) || pass();
}
