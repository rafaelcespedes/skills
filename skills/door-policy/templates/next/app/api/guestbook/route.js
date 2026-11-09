// /api/guestbook: sign the guest book (POST) and read it (GET).
// Code: door-policy/guestbook/handlers.mjs.
import { guestbook } from "../../../door-policy/guestbook/handlers.mjs";

export const dynamic = "force-dynamic";
export const GET = guestbook;
export const POST = guestbook;
export const OPTIONS = guestbook;
