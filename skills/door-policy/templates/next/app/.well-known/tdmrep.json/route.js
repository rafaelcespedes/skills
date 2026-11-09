// /.well-known/tdmrep.json (W3C TDMRep): text and data mining rights
// reserved, for a "no" to training and for "no-ai"; a 404 otherwise.
// Using src/app? Add one more "../" to the import.
import { getView } from "../../../door-policy/view.mjs";

export const dynamic = "force-static";

export async function GET() {
  const body = (await getView()).tdmrep();
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(body, { headers: { "Content-Type": "application/json; charset=utf-8" } });
}
