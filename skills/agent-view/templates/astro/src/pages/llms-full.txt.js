// /llms-full.txt: everything in one file, every case study included.
import { getView } from "../../agent-view/view.mjs";

export async function GET() {
  const view = await getView();
  return new Response(view.llmsFull(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
