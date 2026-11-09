// /profile.json: the same profile as structured data.
// Named profile.[ext].js so it isn't built at all in "no-ai", which
// publishes /llms.txt alone (getStaticPaths returns nothing then).
import { getView } from "../../door-policy/view.mjs";

export async function getStaticPaths() {
  const view = await getView();
  return view.reading === "no-ai" ? [] : [{ params: { ext: "json" } }];
}

export async function GET() {
  const view = await getView();
  return new Response(JSON.stringify(view.profile(), null, 2) + "\n", { headers: { "Content-Type": "application/json; charset=utf-8" } });
}
