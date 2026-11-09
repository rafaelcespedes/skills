// /agents: the agent view, shown to people, styled as a code editor.
// A standalone page built by door-policy/page.mjs. To put it inside the site's
// layout instead, see the skill's references/agents-page.md § Inside the layout.
import { getView } from "../../door-policy/view.mjs";
import { agentsPage } from "../../door-policy/page.mjs";

export const dynamic = "force-static";

export async function GET() {
  return new Response(agentsPage(await getView()), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
