// /llms.txt: the short, agent-readable version of the site (llmstxt.org).
// Built at build time from the site's own content; see agent-view/.
// Using src/app? Add one more "../" to the import.
import { getView } from "../../agent-view/view.mjs";

export const dynamic = "force-static";

export async function GET() {
  const view = await getView();
  return new Response(view.llmsTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
}
