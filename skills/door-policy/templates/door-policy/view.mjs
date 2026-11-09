// ─────────────────────────────────────────────────────────────────────────────
// Glue: settings + content → the agent view. Endpoints and build.mjs call
// getView(); nothing else needs to.
// ─────────────────────────────────────────────────────────────────────────────

import { settings } from "./settings.mjs";
import { loadContent } from "./content.mjs";
import { createAgentView } from "./core.mjs";
import { connected } from "./guestbook/store.mjs";

/** The guest book appears only when it's switched on in config.mjs AND its
 *  storage is connected (GUESTBOOK_MEMORY=1 counts, for local tests). Until
 *  then nothing about it appears anywhere. */
export const guestbookOpen = settings.guestbook.enabled !== false && connected;

export { settings };

export async function getView() {
  return createAgentView(settings, await loadContent(), { guestbookOpen });
}
