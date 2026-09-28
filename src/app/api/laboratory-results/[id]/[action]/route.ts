import { requireUser } from "@/server/auth";
import { ApiError, body, errorResponse, json } from "@/server/http";
import { parseId, setResultCompletion } from "@/server/registry";
export async function POST(request: Request, context: { params: Promise<{ id: string; action: string }> }) {
  try {
    const user = await requireUser();
    const { id, action } = await context.params;
    if (action !== "complete" && action !== "reopen") throw new ApiError(404, "Үйлдэл олдсонгүй.");
    return json(await setResultCompletion(user, parseId(id), action === "complete", await body(request)));
  } catch (error) { return errorResponse(error); }
}
