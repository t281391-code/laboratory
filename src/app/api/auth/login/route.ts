import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/server/db";
import { route, body, json, ApiError } from "@/server/http";
import { createSession, rateLimit, setSessionCookie, userSelect } from "@/server/auth";
import { transaction, recordChange } from "@/server/transaction";
import { username } from "@/server/auth-validation";
// Random dummy hash generated once per process, used only for equal-cost rejection.
const dummy = bcrypt.hash(crypto.randomUUID(), 12);
export const POST = route(async request => {
  const input = z.object({ username, password: z.string().min(1).max(128) }).strict().parse(await body(request));
  await rateLimit(input.username);
  const user = await db.user.findUnique({ where: { username: input.username } });
  const valid = await bcrypt.compare(input.password, user?.passwordHash ?? await dummy);
  if (!valid || !user?.isActive) {
    await transaction(tx => recordChange(tx, null, "LOGIN_FAILED", "auth", "login"));
    throw new ApiError(401, "Нэвтрэх нэр эсвэл нууц үг буруу байна.");
  }
  const session = await transaction(async tx => {
    const current = await tx.user.findUnique({ where: { id: user.id } });
    if (!current?.isActive || current.passwordHash !== user.passwordHash) throw new ApiError(401, "Нэвтрэх нэр эсвэл нууц үг буруу байна.");
    const session = await createSession(tx, user.id);
    await recordChange(tx, user.id, "LOGIN", "auth", user.id);
    return session;
  });
  await setSessionCookie(session.token, session.expiresAt);
  return json(await db.user.findUnique({ where: { id: user.id }, select: userSelect }));
});
