// /guestbook/admin: the owner's review page. Needs GUESTBOOK_ADMIN_PASSWORD
// set on the host. Code: door-policy/guestbook/handlers.mjs.
import { admin } from "../../../door-policy/guestbook/handlers.mjs";

export const dynamic = "force-dynamic";
export const GET = admin;
export const POST = admin;
