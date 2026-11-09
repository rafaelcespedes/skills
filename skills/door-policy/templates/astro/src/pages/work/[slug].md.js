// /work/<slug>.md: one case study as plain markdown. If paths.work in
// door-policy/config.mjs isn't "/work", move this file to match.
import { getView } from "../../../door-policy/view.mjs";

export async function getStaticPaths() {
  const view = await getView();
  return view.work.map((w) => ({ params: { slug: w.slug }, props: { slug: w.slug } }));
}

export async function GET({ props }) {
  const view = await getView();
  const w = view.work.find((x) => x.slug === props.slug);
  return new Response(view.workMarkdown(w), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
