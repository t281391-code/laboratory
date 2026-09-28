import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { ApiError } from "./http";
import { transaction, recordChange, type Tx } from "./transaction";

export const COOKIE = "laboratory_session";
export const userSelect = { id: true, fullName: true, username: true, role: true, isActive: true, createdById: true, createdAt: true, updatedAt: true } as const;
export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
export function tokenHash(token: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new ApiError(503, "Серверийн нэвтрэх тохиргоо дутуу байна.");
  return createHmac("sha256", secret).update(token).digest("hex");
}
export async function cleanupSessions() {
  await db.session.deleteMany({ where: { OR: [{ expiresAt: { lte: new Date() } }, { user: { isActive: false } }] } });
  await db.loginAttempt.deleteMany({ where: { resetAt: { lte: new Date() } } });
}
export async function validateSession(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  await cleanupSessions();
  const session = await db.session.findUnique({ where: { tokenHash: tokenHash(token) }, include: { user: { select: userSelect } } });
  if (!session || !session.user.isActive || session.expiresAt <= new Date()) return null;
  if (Date.now() - session.lastUsedAt.getTime() > 60000)
    await db.session.updateMany({ where: { id: session.id }, data: { lastUsedAt: new Date() } });
  return session;
}
export async function getCurrentUser() { return (await validateSession((await cookies()).get(COOKIE)?.value))?.user ?? null; }
export async function requireUser() {
  const user = await getCurrentUser(); if (!user) throw new ApiError(401, "Нэвтрэх шаардлагатай."); return user;
}
export async function requireAdmin() {
  const user = await requireUser(); if (user.role !== "ADMIN") throw new ApiError(403, "Администраторын эрх шаардлагатай."); return user;
}
export async function requirePageUser(admin = false) {
  const user = await getCurrentUser(); if (!user) redirect("/login/");
  if (admin && user.role !== "ADMIN") redirect("/"); return user;
}
export async function createSession(tx: Tx, userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 12 * 3600000);
  await tx.session.create({ data: { userId, tokenHash: tokenHash(token), expiresAt } });
  return { token, expiresAt };
}
export async function setSessionCookie(token: string, expires: Date) {
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires });
}
export async function deleteSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (token && /^[a-f0-9]{64}$/.test(token)) await transaction(async (tx) => {
    const session = await tx.session.findUnique({ where: { tokenHash: tokenHash(token) } });
    if (session) {
      await tx.session.delete({ where: { id: session.id } });
      await recordChange(tx, session.userId, "LOGOUT", "auth", session.userId);
    }
  });
  (await cookies()).delete(COOKIE);
}
export async function passwordHash(password: string) { return bcrypt.hash(password, 12); }
export async function rateLimit(username: string) {
  await cleanupSessions();
  const key = tokenHash(`login:${username.toLowerCase()}`);
  const result = await db.loginAttempt.upsert({ where: { key }, create: { key, attempts: 1, resetAt: new Date(Date.now() + 15 * 60000) }, update: { attempts: { increment: 1 } } });
  if (result.attempts > 10) throw new ApiError(429, "Олон удаа оролдлоо. 15 минутын дараа дахин оролдоно уу.");
}
