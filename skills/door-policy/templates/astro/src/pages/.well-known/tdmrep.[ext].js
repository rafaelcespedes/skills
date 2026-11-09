// /.well-known/tdmrep.json (W3C TDMRep): text and data mining rights
// reserved, for a "no" to training and for "no-ai"; not built otherwise.
// Only needed beside the robots.txt.js endpoint: build.mjs --robots writes
// this file itself.
import { getView } from "../../../door-policy/view.mjs";

export async function getStaticPaths() {
  const view = await getView();
  return view.tdmrep() ? [{ params: { ext: "json" } }] : [];
}

export async function GET() {
  const view = await getView();
  return new Response(view.tdmrep(), { headers: { "Content-Type": "application/json; charset=utf-8" } });
}
