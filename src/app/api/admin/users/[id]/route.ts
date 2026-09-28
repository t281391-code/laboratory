import { z } from "zod";
import { body, json, errorResponse, ApiError } from "@/server/http";
import { requireAdmin, userSelect } from "@/server/auth";
import { transaction, recordChange } from "@/server/transaction";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(); const { id } = await context.params;
    const input = z.object({ isActive: z.boolean() }).strict().parse(await body(request));
    if (id === admin.id && !input.isActive) throw new ApiError(409, "Өөрийн эрхийг идэвхгүй болгох боломжгүй.");
    const user = await transaction(async tx => {
      const before = await tx.user.findUnique({ where: { id }, select: userSelect });
      if (!before) throw new ApiError(404, "Хэрэглэгч олдсонгүй.");
      const after = await tx.user.update({ where: { id }, data: input, select: userSelect });
      if (!input.isActive) await tx.session.deleteMany({ where: { userId: id } });
      await recordChange(tx, admin.id, input.isActive ? "ACTIVATE" : "DEACTIVATE", "users", id, before, after); return after;
    });
    return json(user);
  } catch (error) { return errorResponse(error); }
}
