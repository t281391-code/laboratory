import { route, json } from "@/server/http";
import { requireUser } from "@/server/auth";
export const GET = route(async () => json(await requireUser()));
