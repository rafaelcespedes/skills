/*
  Guest book check-ins: when a known AI agent reads the homepage, /agents or
  one of the agent files, count the visit under that agent's fixed name.
  People aren't counted, nothing about the visitor is kept, and the page is
  served exactly as before. See agent-view/guestbook/rules.mjs.

  Vercel runs this before serving the paths below, for any framework except
  Next.js (Next.js has its own version: templates/next/middleware.js).
  If the site already has a middleware.js, merge this into it.
  Keep the matcher in step with paths.page and paths.work in agent-view/config.mjs.
*/
import { agentName, recordCheckIn } from "./agent-view/guestbook/rules.mjs";

export const config = {
  matcher: ["/", "/agents", "/llms.txt", "/llms-full.txt", "/profile.json", "/work/:path*"],
};

// Let the request through untouched (what next() from @vercel/functions returns).
const pass = () => new Response(null, { headers: { "x-middleware-next": "1" } });

export default async function middleware(request, context) {
  const name = agentName(request.headers);
  if (name) {
    const counted = recordCheckIn(name);
    // count after the response goes out, so agents aren't kept waiting
    if (context && typeof context.waitUntil === "function") context.waitUntil(counted);
    else await counted;
  }
  return pass();
}
