// /profile.json: the same profile as structured data.
import { getView } from "../../door-policy/view.mjs";

export const dynamic = "force-static";

export async function GET() {
  const view = await getView();
  // "no-ai" publishes /llms.txt alone
  if (view.reading === "no-ai") return new Response("Not found", { status: 404 });
  return new Response(JSON.stringify(view.profile(), null, 2) + "\n", {
    headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" },
  });
}
