import { requireUser } from "@/server/auth";
import { errorResponse, json } from "@/server/http";
import { createResult, parseId, readResultForm } from "@/server/registry";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const id = parseId((await context.params).id);
    const { payload, files } = await readResultForm(request);
    return json(await createResult(user, id, payload, files), 201);
  } catch (error) { return errorResponse(error); }
}
