import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
export type Tx = Prisma.TransactionClient;
export async function transaction<T>(fn: (tx: Tx) => Promise<T>) {
  return db.$transaction(async (tx) => {
    await tx.eventSequence.upsert({ where: { id: 1 }, create: { id: 1 }, update: { version: { increment: 1 } } });
    return fn(tx);
  }, { maxWait: 15000, timeout: 20000 });
}
function safe(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  // Audit snapshots omit attachments and all authentication material.
  return JSON.parse(JSON.stringify(value, (key, val) => /password|token|secret|photos/i.test(key) ? undefined : typeof val === "bigint" ? String(val) : val));
}
export async function recordChange(tx: Tx, userId: string | null, action: string, entityType: string, entityId: string, before?: unknown, after?: unknown) {
  await tx.auditLog.create({ data: { userId, action, entityType, entityId, beforeData: safe(before), afterData: safe(after) } });
  await tx.realtimeEvent.create({ data: { eventType: action, entityType, entityId, payload: {} } });
}
