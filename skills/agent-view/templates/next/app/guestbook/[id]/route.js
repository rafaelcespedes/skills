// /guestbook/<id>: one entry's receipt.
import { receipt } from "../../../agent-view/guestbook/handlers.mjs";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { id } = await params;
  return receipt(request, id);
}
