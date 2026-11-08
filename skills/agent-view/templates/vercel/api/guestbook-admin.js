// /guestbook/admin: the owner's review page (rewritten here by vercel.json).
// Needs GUESTBOOK_ADMIN_PASSWORD set on Vercel. Code: agent-view/guestbook/handlers.mjs.
import { admin } from "../agent-view/guestbook/handlers.mjs";

export default { fetch: admin };
