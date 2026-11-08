// /api/guestbook: sign the guest book (POST) and read it (GET).
// Code: agent-view/guestbook/handlers.mjs.
import { guestbook } from "../../../agent-view/guestbook/handlers.mjs";

export const dynamic = "force-dynamic";
export const GET = guestbook;
export const POST = guestbook;
export const OPTIONS = guestbook;
