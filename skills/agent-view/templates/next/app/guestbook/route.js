// /guestbook → the form on /agents (a 404 while the guest book is closed).
import { toBook } from "../../agent-view/guestbook/handlers.mjs";

export const dynamic = "force-dynamic";
export const GET = toBook;
