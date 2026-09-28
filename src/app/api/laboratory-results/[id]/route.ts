import { requireUser } from "@/server/auth";
import { body, errorResponse, json } from "@/server/http";
import { deactivateResult, parseId, readResultForm, updateResult } from "@/server/registry";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const id = parseId((await context.params).id);
    const { payload, files } = await readResultForm(request);
    return json(await updateResult(user, id, payload, files));
  } catch (error) { return errorResponse(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireUser();
    return json(await deactivateResult(user, parseId((await context.params).id), await body(request)));
  } catch (error) { return errorResponse(error); }
}
