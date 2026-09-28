import { route, checkOrigin, json } from "@/server/http";
import { deleteSession, requireUser } from "@/server/auth";
export const POST = route(async request => { checkOrigin(request); await requireUser(); await deleteSession(); return json({ loggedOut: true }); });
