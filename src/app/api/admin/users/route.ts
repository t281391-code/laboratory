import { z } from "zod";
import { db } from "@/server/db";
import { route, body, json } from "@/server/http";
import { requireAdmin, userSelect, passwordHash } from "@/server/auth";
import { newUser } from "@/server/auth-validation";
import { transaction, recordChange } from "@/server/transaction";
export const GET = route(async request => {
  await requireAdmin();
  const page = z.coerce.number().int().min(1).parse(new URL(request.url).searchParams.get("page") || 1);
  const [users, total] = await db.$transaction([db.user.findMany({ select: userSelect, orderBy: { createdAt: "desc" }, take: 100, skip: (page - 1) * 100 }), db.user.count()]);
  return json(users, 200, { page, pageSize: 100, total });
});
export const POST = route(async request => {
  const admin = await requireAdmin(); const input = newUser.parse(await body(request));
  const hash = await passwordHash(input.password);
  const user = await transaction(async tx => {
    const user = await tx.user.create({ data: { fullName: input.fullName, username: input.username, role: input.role, passwordHash: hash, createdById: admin.id }, select: userSelect });
    await recordChange(tx, admin.id, "CREATE", "users", user.id, undefined, user); return user;
  });
  return json(user, 201);
});
