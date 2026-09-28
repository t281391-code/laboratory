import { requireUser } from "@/server/auth";
import { errorResponse, json } from "@/server/http";
import { parseId, recordHistory } from "@/server/registry";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    return json(await recordHistory(parseId((await context.params).id)));
  } catch (error) { return errorResponse(error); }
}
