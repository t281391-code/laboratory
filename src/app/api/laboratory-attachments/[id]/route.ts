import { requireUser } from "@/server/auth";
import { checkOrigin, errorResponse, json } from "@/server/http";
import { findAttachment, parseId, removeAttachment } from "@/server/registry";
import { serveStored } from "@/server/uploads";
type Context = { params: Promise<{ id: string }> };
/** Authentication is mandatory to view or download; files are never reachable through a public URL. */
export async function GET(request: Request, context: Context) {
  try {
    await requireUser();
    const file = await findAttachment(parseId((await context.params).id));
    return await serveStored(file.path, file, new URL(request.url).searchParams.get("download") === "1");
  } catch (error) { return errorResponse(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireUser();
    checkOrigin(request);
    return json(await removeAttachment(user, parseId((await context.params).id)));
  } catch (error) { return errorResponse(error); }
}
