// /llms-full.txt: everything in one file, every case study included.
// Named llms-full.[ext].js so it isn't built at all in "no-ai", which
// publishes /llms.txt alone (getStaticPaths returns nothing then).
import { getView } from "../../door-policy/view.mjs";

export async function getStaticPaths() {
  const view = await getView();
  return view.reading === "no-ai" ? [] : [{ params: { ext: "txt" } }];
}

export async function GET() {
  const view = await getView();
  return new Response(view.llmsFull(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
