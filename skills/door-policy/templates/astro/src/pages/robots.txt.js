// /robots.txt: the site's own rules (robots.base.txt at the project root),
// with the door-policy block for the reading choice written in. Use this when
// content.mjs needs Astro to run (content collections, aliases), so
// build.mjs --robots can't; then delete public/robots.txt, which would win,
// and copy .well-known/tdmrep.[ext].js too. See the skill's
// references/reading.md.
import fs from "node:fs";
import { getView } from "../../door-policy/view.mjs";

export async function GET() {
  const base = fs.existsSync("robots.base.txt") ? fs.readFileSync("robots.base.txt", "utf8") : "";
  const { text, warnings } = (await getView()).robotsFile(base);
  for (const w of warnings) console.warn(`door-policy: ! ${w}`);
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
