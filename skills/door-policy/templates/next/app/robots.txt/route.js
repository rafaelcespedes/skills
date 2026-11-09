// /robots.txt: the site's own rules (robots.base.txt at the project root),
// with the door-policy block for the reading choice written in. Delete
// app/robots.js and public/robots.txt if they exist: either one wins over
// this route. Copy .well-known/tdmrep.json/route.js too. See the skill's
// references/reading.md.
// Using src/app? Add one more "../" to the import.
import fs from "node:fs";
import { getView } from "../../door-policy/view.mjs";

export const dynamic = "force-static";

export async function GET() {
  const base = fs.existsSync("robots.base.txt") ? fs.readFileSync("robots.base.txt", "utf8") : "";
  const { text, warnings } = (await getView()).robotsFile(base);
  for (const w of warnings) console.warn(`door-policy: ! ${w}`);
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
