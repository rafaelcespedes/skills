/*
  Guest book check-ins for Next.js: when a known AI agent reads the homepage,
  /agents or one of the agent files, count the visit under that agent's fixed
  name. People aren't counted and nothing about the visitor is kept.

  This is the version for Next.js 16 and later. Next.js 15 and earlier use
  middleware.js instead (beside this file). If the project already has one,
  merge this into it.
  Keep the matcher in step with paths.page and paths.work in agent-view/config.mjs.
*/
import { NextResponse } from "next/server";
import { agentName, recordCheckIn } from "./agent-view/guestbook/rules.mjs";

export const config = {
  matcher: ["/", "/agents", "/llms.txt", "/llms-full.txt", "/profile.json", "/work/:path*"],
};

export default function proxy(request, event) {
  const name = agentName(request.headers);
  // count after the response goes out, so agents aren't kept waiting
  if (name) event.waitUntil(recordCheckIn(name));
  return NextResponse.next();
}
