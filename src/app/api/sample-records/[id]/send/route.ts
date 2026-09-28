import { requireUser } from "@/server/auth";
import { body, errorResponse, json } from "@/server/http";
import { parseId, sendSampleRecord } from "@/server/registry";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    return json(await sendSampleRecord(user, parseId((await context.params).id), await body(request)));
  } catch (error) { return errorResponse(error); }
}
