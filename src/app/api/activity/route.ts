import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { route, body, json } from "@/server/http";
import { transaction, recordChange } from "@/server/transaction";
const labels: Record<string, string> = { samples: "Дээж, сорьц", tests: "Шинжилгээ", sleepers: "Төмөр бетон дэр", trials: "Туршилт", compositions: "Найрлага", batches: "Жижиг эдлэл", equipment: "Тоног төхөөрөмж", standards: "Стандарт", sampleRecords: "Дээжийн бүртгэл", laboratoryResults: "Лабораторийн хариу" };
const paths: Record<string, string> = { trials: "secret", compositions: "secret", batches: "small", sampleRecords: "sample-registry", laboratoryResults: "sample-registry" };
const verbs: Record<string, string> = { CREATE: "Бүртгэгдлээ", DELETE: "Идэвхгүй болголоо", SEND: "Лабораторид илгээгдлээ", STATUS: "Төлөв өөрчлөгдлөө", COMPLETE: "Дууссан гэж тэмдэглэгдлээ", REOPEN: "Дахин нээгдлээ", ATTACHMENT_REMOVE: "Хавсралт хасагдлаа", DEACTIVATE: "Идэвхгүй болголоо" };
export const GET = route(async () => {
  const user = await requireUser();
  const events = await db.realtimeEvent.findMany({ where: { entityType: { in: Object.keys(labels) } }, orderBy: { id: "desc" }, take: 50 });
  const reads = await db.notificationRead.findMany({ where: { userId: user.id, eventId: { in: events.map(e => e.id) } } });
  const seen = new Set(reads.map(r => String(r.eventId)));
  return json(events.map(e => ({ id: String(e.id), title: `${labels[e.entityType]} · ${e.entityType === "sampleRecords" || e.entityType === "laboratoryResults" ? verbs[e.eventType] ?? "Шинэчлэгдлээ" : e.eventType === "CREATE" ? "Бүртгэгдлээ" : e.eventType === "DELETE" ? "Устгагдлаа" : "Шинэчлэгдлээ"}`, description: new Intl.DateTimeFormat("mn-MN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ulaanbaatar" }).format(e.createdAt), href: `/${paths[e.entityType] ?? e.entityType}/?id=${e.entityId}`, read: seen.has(String(e.id)) })));
});
export const PATCH = route(async request => {
  const user = await requireUser(); const v = z.object({ id: z.string().regex(/^\d{1,19}$/).optional() }).strict().parse(await body(request));
  await transaction(async tx => {
    const events = await tx.realtimeEvent.findMany({ where: { entityType: { in: Object.keys(labels) }, ...(v.id ? { id: BigInt(v.id) } : {}) }, orderBy: { id: "desc" }, take: 50 });
    await tx.notificationRead.createMany({ data: events.map(e => ({ userId: user.id, eventId: e.id })), skipDuplicates: true });
    await recordChange(tx, user.id, "READ", "activity", user.id);
  });
  return json({ read: true });
});
