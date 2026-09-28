import { z } from "zod";
import { body, json, errorResponse, ApiError } from "@/server/http";
import { requireAdmin, passwordHash } from "@/server/auth";
import { password } from "@/server/auth-validation";
import { transaction, recordChange } from "@/server/transaction";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(); const { id } = await context.params;
    if (id === admin.id) throw new ApiError(409, "Бусад хэрэглэгчийн нууц үгийг шинэчилнэ үү.");
    const input = z.object({ password }).strict().parse(await body(request));
    const hash = await passwordHash(input.password);
    await transaction(async tx => {
      await tx.user.update({ where: { id }, data: { passwordHash: hash } });
      await tx.session.deleteMany({ where: { userId: id } });
      await recordChange(tx, admin.id, "PASSWORD_RESET", "users", id);
    });
    return json({ reset: true });
  } catch (error) { return errorResponse(error); }
}
