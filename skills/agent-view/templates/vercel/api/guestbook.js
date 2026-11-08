// /api/guestbook: sign the guest book (POST), read it (GET), and receipts
// (/guestbook/<id>, rewritten here by vercel.json). The code is in
// agent-view/guestbook/handlers.mjs.
import { guestbook } from "../agent-view/guestbook/handlers.mjs";

export default { fetch: guestbook };
