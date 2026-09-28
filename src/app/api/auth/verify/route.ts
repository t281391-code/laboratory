import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser, rateLimit } from "@/server/auth";
import { route, body, json, ApiError } from "@/server/http";
export const POST = route(async request => {
  const user = await requireUser(); const v = z.object({ password: z.string().min(1).max(128) }).strict().parse(await body(request));
  await rateLimit(`verify-${user.username}`);
  const account = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!await bcrypt.compare(v.password, account.passwordHash)) throw new ApiError(403, "Нууц үг буруу байна.");
  return json({ verified: true });
});
