// /guestbook/admin: the owner's review page (rewritten here by vercel.json).
// Needs GUESTBOOK_ADMIN_PASSWORD set on Vercel. Code: door-policy/guestbook/handlers.mjs.
import { admin } from "../door-policy/guestbook/handlers.mjs";

export default { fetch: admin };
