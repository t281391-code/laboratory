import { requireUser } from "@/server/auth";
import { body, errorResponse, json } from "@/server/http";
import { deactivateSampleRecord, getSampleRecord, parseId, updateSampleRecord } from "@/server/registry";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    await requireUser();
    return json(await getSampleRecord(parseId((await context.params).id)));
  } catch (error) { return errorResponse(error); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser();
    return json(await updateSampleRecord(user, parseId((await context.params).id), await body(request)));
  } catch (error) { return errorResponse(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireUser();
    return json(await deactivateSampleRecord(user, parseId((await context.params).id), await body(request)));
  } catch (error) { return errorResponse(error); }
}
