// /llms-full.txt: everything in one file, every case study included.
import { getView } from "../../door-policy/view.mjs";

export const dynamic = "force-static";

export async function GET() {
  const view = await getView();
  // "no-ai" publishes /llms.txt alone
  if (view.reading === "no-ai") return new Response("Not found", { status: 404 });
  return new Response(view.llmsFull(), { headers: { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
}
