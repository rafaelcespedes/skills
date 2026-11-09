// /api/guestbook: sign the guest book (POST), read it (GET), and receipts
// (/guestbook/<id>, rewritten here by vercel.json). The code is in
// door-policy/guestbook/handlers.mjs.
import { guestbook } from "../door-policy/guestbook/handlers.mjs";

export default { fetch: guestbook };
