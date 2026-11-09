// /work/<slug>.md: one case study as plain markdown.
// The folder must match paths.work in door-policy/config.mjs. If the site
// already has app/work/[slug]/page.js, a route can't sit beside it: set
// paths.work to a free path (e.g. "/md") and move this folder there.
import { getView } from "../../../door-policy/view.mjs";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const view = await getView();
  return view.work.map((w) => ({ file: `${w.slug}.md` }));
}

export async function GET(_request, { params }) {
  const { file } = await params;
  const view = await getView();
  const w = view.work.find((x) => `${x.slug}.md` === file);
  if (!w) return new Response("Not found", { status: 404 });
  return new Response(view.workMarkdown(w), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Access-Control-Allow-Origin": "*" },
  });
}
