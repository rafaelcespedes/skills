// /profile.json: the same profile as structured data.
import { getView } from "../../agent-view/view.mjs";

export async function GET() {
  const view = await getView();
  return new Response(JSON.stringify(view.profile(), null, 2) + "\n", { headers: { "Content-Type": "application/json; charset=utf-8" } });
}
