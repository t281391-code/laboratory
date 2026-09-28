import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { ApiError } from "./http";
import { schemas, type Module } from "./validation";
import { transaction, recordChange, type Tx } from "./transaction";
import type { CurrentUser } from "./auth";
import { calculate, formDefinitions } from "@/features/forms/config";

export const include = {
  sample: true, test: { include: { values: true } }, sleeper: { include: { entries: { orderBy: { hour: "asc" as const } } } }, trial: true,
  composition: { include: { entries: { orderBy: { position: "asc" as const } } } }, batch: { include: { entries: { orderBy: { position: "asc" as const } } } },
  equipment: { include: { readings: { orderBy: { measuredAt: "desc" as const }, take: 100 }, maintenance: { orderBy: { performedAt: "desc" as const }, take: 100 } } }, standard: true, checklist: true,
} satisfies Prisma.ErpRecordInclude;
type RecordData = Prisma.ErpRecordGetPayload<{ include: typeof include }>;
const day = (date: Date | null) => date?.toISOString().slice(0, 10) ?? "";
const decimal = (value: string) => value === "" ? null : new Prisma.Decimal(value);
const numeric = (value: Prisma.Decimal | null) => value?.toString() ?? "";
const dateValue = (value: string) => new Date(`${value}T00:00:00.000Z`);

export function dto(record: RecordData) {
  const meta = { id: record.id, date: day(record.date), version: record.version, isActive: record.isActive, createdById: record.createdById, updatedById: record.updatedById, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() };
  if (record.sample) { const s = record.sample; return { ...s, ...meta, castingDate: day(s.castingDate), registeredDate: day(s.registeredDate), companyPlannedDate: s.companyPlannedDate ? day(s.companyPlannedDate) : null }; }
  if (record.test) { const t = record.test; return { ...t, ...meta, result: Number(t.result), values: Object.fromEntries(t.values.map(v => [v.name, v.numericValue?.toString() ?? v.textValue])) }; }
  if (record.sleeper) { const s = record.sleeper; return { ...meta, track: s.track, temperature: numeric(s.temperature), notes: s.notes, rows: s.entries.map(e => ({ id: `${record.id}-${e.hour}`, values: { time: e.time, value: numeric(e.value), note: e.note } })) }; }
  if (record.trial) { const t = record.trial; return { ...meta, number: t.number?.toString() ?? "", spread: numeric(t.spread), concreteTemperature: numeric(t.concreteTemperature), airTemperature: numeric(t.airTemperature), airContent: numeric(t.airContent), time: t.time, note: t.note }; }
  if (record.composition) {
    const c = record.composition;
    const total = (key: "cement" | "fine" | "medium" | "coarse") => c.entries.reduce((sum, row) => sum.plus(row[key] ?? 0), new Prisma.Decimal(0)).toString();
    return { ...meta, time: c.time, result: c.result ?? "", totals: { cement: total("cement"), fine: total("fine"), medium: total("medium"), coarse: total("coarse") }, rows: c.entries.map(e => ({ id: e.id, values: { cement: numeric(e.cement), fine: numeric(e.fine), medium: numeric(e.medium), coarse: numeric(e.coarse) } })) };
  }
  if (record.batch) { const b = record.batch; return { ...meta, product: b.product, number: b.number, rows: b.entries.map(e => ({ id: e.id, values: { date: day(e.date), time: e.time, count: e.count?.toString() ?? "", code: e.code, size: e.size, curing: e.curing, note: e.note } })) }; }
  if (record.equipment) { const e = record.equipment; return { ...e, ...meta, lastInspection: day(e.lastInspection), nextInspection: day(e.nextInspection), calibrationDate: day(e.calibrationDate), readings: e.readings.map(r => ({ id: r.id, value: String(r.value), unit: r.unit, measuredAt: r.measuredAt.toISOString() })), maintenance: e.maintenance.map(m => ({ id: m.id, performedAt: m.performedAt.toISOString(), description: m.description })), latestMeasurementAt: e.readings[0]?.measuredAt.toISOString() ?? null }; }
  if (record.standard) return { ...record.standard, ...meta };
  if (record.checklist) return { key: record.checklist.key, checks: record.checklist.checks, ...meta };
  throw new ApiError(500, "Бүртгэлийн бүтэц буруу байна.");
}
export async function getRecord(module: Module, id: string, user: CurrentUser, tx: Tx = db) {
  const record = await tx.erpRecord.findFirst({ where: { id, module, isActive: true, ...(module === "checklists" ? { createdById: user.id } : {}) }, include });
  if (!record) throw new ApiError(404, "Бүртгэл олдсонгүй.");
  return record;
}
export function authorize(user: CurrentUser, record: RecordData) {
  if (user.role !== "ADMIN" && record.createdById !== user.id) throw new ApiError(403, "Зөвхөн өөрийн бүртгэлийг засах эрхтэй.");
}
export async function listRecords(module: Module, request: Request, user: CurrentUser) {
  const p = new URL(request.url).searchParams;
  const page = Number(p.get("page") || 1), pageSize = Number(p.get("pageSize") || 100);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new ApiError(422, "Хуудасны хэмжээ буруу байна.");
  const from = p.get("from"), to = p.get("to");
  for (const d of [from, to]) if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new ApiError(422, "Огноо буруу байна.");
  const where: Prisma.ErpRecordWhereInput = { module, isActive: true, ...(module === "checklists" ? { createdById: user.id } : {}), ...(from || to ? { date: { ...(from ? { gte: dateValue(from) } : {}), ...(to ? { lte: dateValue(to) } : {}) } } : {}) };
  if (p.get("kind") && module === "tests") where.test = { kind: p.get("kind")! };
  if (module === "samples") where.sample = { registryRecord: { is: null } };
  const [records, total] = await db.$transaction([db.erpRecord.findMany({ where, include, orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "asc" }], take: pageSize, skip: (page - 1) * pageSize }), db.erpRecord.count({ where })]);
  return { data: records.map(dto), meta: { page, pageSize, total } };
}

async function writeDetail(tx: Tx, module: Module, id: string, input: unknown, user: CurrentUser, updating: boolean) {
  switch (module) {
    case "samples": {
      const v = schemas.samples.parse(input);
      const data = { ...v, castingDate: dateValue(v.castingDate), registeredDate: dateValue(v.registeredDate), companyPlannedDate: v.companyPlannedDate ? dateValue(v.companyPlannedDate) : null };
      await tx.sample.upsert({ where: { id }, create: { id, ...data }, update: data }); break;
    }
    case "tests": {
      const v = schemas.tests.parse(input); const result = calculate(v.kind, v.values);
      const sample = v.kind === "environment" ? null : await tx.sample.findFirst({ where: { code: v.sampleCode, record: { isActive: true } } });
      if (v.kind !== "environment" && !sample) throw new ApiError(422, "Эхлээд сорьцыг бүртгэнэ үү.");
      const fields = formDefinitions[v.kind].sections.flatMap(s => s.fields);
      const values = Object.entries(v.values).map(([name, textValue]) => ({ name, textValue, numericValue: fields.find(f => f.name === name)?.type === "number" && textValue ? new Prisma.Decimal(textValue) : null }));
      const data = { kind: v.kind, sampleCode: v.sampleCode, sampleId: sample?.id, result: new Prisma.Decimal(result.value.toFixed(8)), state: result.state, approved: v.approved, technician: v.values.technician, photos: v.photos };
      if (updating) await tx.testValue.deleteMany({ where: { testId: id } });
      await tx.testRecord.upsert({ where: { id }, create: { id, ...data, values: { create: values } }, update: { ...data, values: { create: values } } });
      if (sample) {
        const remaining = await tx.testRecord.count({ where: { sampleId: sample.id, approved: false, record: { isActive: true } } });
        const status = remaining ? "Хянаж байгаа" : "Баталгаажсан";
        await tx.sample.update({ where: { id: sample.id }, data: { status } });
        await tx.erpRecord.update({ where: { id: sample.id }, data: { version: { increment: 1 }, updatedById: user.id } });
        await recordChange(tx, user.id, "UPDATE", "samples", sample.id, { status: sample.status }, { status });
      } break;
    }
    case "sleepers": {
      const v = schemas.sleepers.parse(input);
      const data = { date: dateValue(v.date), track: v.track, temperature: decimal(v.temperature), notes: v.notes };
      if (updating) await tx.temperatureEntry.deleteMany({ where: { sleeperId: id } });
      const entries = { create: v.rows.map((r, i) => ({ hour: i + 1, time: r.values.time, value: decimal(r.values.value), note: r.values.note })) };
      await tx.sleeperTrack.upsert({ where: { id }, create: { id, ...data, entries }, update: { ...data, entries } }); break;
    }
    case "trials": {
      const v = schemas.trials.parse(input);
      const data = { number: v.number ? Number(v.number) : null, spread: decimal(v.spread), concreteTemperature: decimal(v.concreteTemperature), airTemperature: decimal(v.airTemperature), airContent: decimal(v.airContent), time: v.time, note: v.note };
      await tx.secretTrial.upsert({ where: { id }, create: { id, ...data }, update: data }); break;
    }
    case "compositions": {
      const v = schemas.compositions.parse(input);
      if (updating) await tx.compositionEntry.deleteMany({ where: { compositionId: id } });
      const entries = { create: v.rows.map((r, position) => ({ id: r.id, position, cement: decimal(r.values.cement), fine: decimal(r.values.fine), medium: decimal(r.values.medium), coarse: decimal(r.values.coarse) })) };
      await tx.composition.upsert({ where: { id }, create: { id, date: dateValue(v.date), time: v.time, result: v.result, entries }, update: { date: dateValue(v.date), time: v.time, result: v.result, entries } }); break;
    }
    case "batches": {
      const v = schemas.batches.parse(input);
      const current = updating ? await tx.productBatch.findUnique({ where: { id } }) : null;
      const number = current?.number ?? ((await tx.productBatch.aggregate({ where: { product: v.product }, _max: { number: true } }))._max.number ?? 0) + 1;
      if (updating) await tx.productEntry.deleteMany({ where: { batchId: id } });
      const entries = { create: v.rows.map((r, position) => ({ id: r.id, position, ...r.values, date: r.values.date ? dateValue(r.values.date) : null, count: r.values.count ? Number(r.values.count) : null })) };
      await tx.productBatch.upsert({ where: { id }, create: { id, product: v.product, number, entries }, update: { product: v.product, entries } }); break;
    }
    case "equipment": {
      const { date: unused, ...v } = schemas.equipment.parse(input); void unused;
      const data = { ...v, lastInspection: v.lastInspection ? dateValue(v.lastInspection) : null, nextInspection: v.nextInspection ? dateValue(v.nextInspection) : null, calibrationDate: v.calibrationDate ? dateValue(v.calibrationDate) : null };
      await tx.equipment.upsert({ where: { id }, create: { id, ...data }, update: data }); break;
    }
    case "standards": {
      const { date: unused, ...data } = schemas.standards.parse(input); void unused;
      const standard = { ...data, equipmentId: data.equipmentId || null };
      await tx.standard.upsert({ where: { id }, create: { id, ...standard }, update: standard }); break;
    }
    case "checklists": {
      const v = schemas.checklists.parse(input);
      await tx.checklist.upsert({ where: { id }, create: { id, key: v.key, checks: v.checks, ownerId: user.id }, update: { checks: v.checks } }); break;
    }
  }
}
export async function mutateRecord(module: Module, user: CurrentUser, input: unknown, id?: string, version?: number, deleting = false) {
  if (["standards", "equipment"].includes(module) && user.role !== "ADMIN") throw new ApiError(403, "Администраторын эрх шаардлагатай.");
  return transaction(async tx => {
    const before = id ? await getRecord(module, id, user, tx) : null;
    if (before) {
      authorize(user, before);
      if (before.version !== version) throw new ApiError(409, "Өөр хэрэглэгч бүртгэлийг өөрчилсөн. Мэдээллээ шинэчилж дахин хадгална уу.");
    }
    const data = deleting ? null : schemas[module].parse(input);
    if (module === "tests" && data && "approved" in data && data.approved && user.role !== "ADMIN") throw new ApiError(403, "Үр дүн баталгаажуулахад администраторын эрх шаардлагатай.");
    const date = data && "date" in data ? data.date : data && "registeredDate" in data ? data.registeredDate : day(new Date());
    const record = before
      ? await tx.erpRecord.update({ where: { id }, data: { updatedById: user.id, version: { increment: 1 }, ...(deleting ? { isActive: false } : { date: dateValue(date) }) } })
      : await tx.erpRecord.create({ data: { module, date: dateValue(date), createdById: user.id, updatedById: user.id } });
    if (!deleting) await writeDetail(tx, module, record.id, data, user, !!before);
    const after = deleting ? { id: record.id, isActive: false } : dto(await getRecord(module, record.id, user, tx));
    await recordChange(tx, user.id, deleting ? "DELETE" : before ? "UPDATE" : "CREATE", module, record.id, before ? dto(before) : undefined, after);
    return after;
  });
}
