import { z } from "zod";
import { schemaFor } from "@/features/forms/config";
import { sampleTrackingFields, validateSampleTracking } from "@/lib/sample-products";
export const modules = ["samples", "tests", "sleepers", "trials", "compositions", "batches", "equipment", "standards", "checklists"] as const;
export type Module = typeof modules[number];
export const moduleSchema = z.enum(modules);
export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(v); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v; });
export const time = z.union([z.literal(""), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)]).default("");
const text = (max = 2000) => z.string().trim().max(max);
const optionalText = (max = 2000) => text(max).default("");
const numberString = (min: number, max: number, integer = false) => z.string().max(32).refine(v => v === "" || (/^-?\d+(\.\d{1,8})?$/.test(v) && Number(v) >= min && Number(v) <= max && (!integer || Number.isInteger(Number(v))))).default("");
const measurement = numberString(-100, 2000);
const quantity = numberString(0, 100000000);
export const kinds = z.enum(["environment", "fresh", "compression", "sand", "aggregate", "cement"]);
const photos = z.array(z.string().max(1500000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/)).max(4).default([]);
const rowId = z.string().min(1).max(36);
const sample = z.object({
  product: sampleTrackingFields.product.default("other"),
  track1Count: sampleTrackingFields.track1Count.default(0),
  track2Count: sampleTrackingFields.track2Count.default(0),
  track3Count: sampleTrackingFields.track3Count.default(0),
  companyPlannedDate: date.nullable().default(null),
  code: text(100).min(3), material: text(100).min(1), grade: text(100).min(1), project: text(200).min(2), element: text(200).min(2),
  castingDate: date, registeredDate: date, age: z.union([z.literal(3), z.literal(7), z.literal(28)]), count: z.number().int().min(1).max(100),
  status: z.enum(["Бүртгэсэн", "Бэхжүүлж байгаа", "Туршилтад бэлэн", "Туршсан", "Хянаж байгаа", "Баталгаажсан", "Хугацаа хэтэрсэн"]),
  technician: text(120).min(1), photos,
}).strict().refine(v => v.castingDate <= v.registeredDate)
  .refine(v => !v.companyPlannedDate || v.companyPlannedDate >= v.castingDate, { path: ["companyPlannedDate"], message: "Явах огноо дээж авсан огнооноос өмнө байж болохгүй." })
  .superRefine(validateSampleTracking);
const test = z.object({ kind: kinds, sampleCode: text(100), date, values: z.record(z.string().max(64), text(2000)), photos, approved: z.boolean().default(false) }).strict().superRefine((v, ctx) => {
  const parsed = schemaFor(v.kind).strict().safeParse(v.values);
  if (!parsed.success) for (const issue of parsed.error.issues) ctx.addIssue({ code: "custom", path: ["values", ...issue.path], message: issue.message });
  if (Object.keys(v.values).length > 60) ctx.addIssue({ code: "custom", message: "Талбар хэт олон байна." });
  if (v.date !== v.values.testDate || (v.kind !== "environment" && v.sampleCode !== v.values.sampleCode)) ctx.addIssue({ code: "custom", message: "Сорьцын код эсвэл огноо зөрж байна." });
});
const sleeper = z.object({ date, track: z.number().int().min(1).max(3), temperature: measurement, notes: optionalText(), rows: z.array(z.object({ id: z.string().min(1).max(64), values: z.object({ time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), value: measurement, note: optionalText() }).strict() }).strict()).length(8) }).strict();
const trial = z.object({ date, number: numberString(1, 100000, true), spread: numberString(0, 2000), concreteTemperature: numberString(-100, 200), airTemperature: numberString(-100, 100), airContent: numberString(0, 100), time, note: optionalText() }).strict();
const composition = z.object({ date, time, result: optionalText(4000), rows: z.array(z.object({ id: rowId, values: z.object({ cement: quantity, fine: quantity, medium: quantity, coarse: quantity }).strict() }).strict()).max(500) }).strict();
const batch = z.object({ date, product: z.enum(["pipe", "ring"]), rows: z.array(z.object({ id: rowId, values: z.object({ date: z.union([date, z.literal("")]).default(""), time, count: numberString(0, 100000, true), code: optionalText(100), size: optionalText(100), curing: z.enum(["", "Уурын нөхцөл", "Ердийн нөхцөл"]).default(""), note: optionalText() }).strict() }).strict()).max(500) }).strict();
const equipment = z.object({
  date, name: text(120).min(1), model: optionalText(120), serial: text(100).min(1), kind: z.enum(["press", "oven", "scale", "sieve", "meter", "cone"]),
  status: z.enum(["Бэлэн", "Үзлэг шаардлагатай", "Засварт"]), healthStatus: optionalText(100),
  lastInspection: z.union([date, z.literal("")]).default(""), nextInspection: z.union([date, z.literal("")]).default(""), calibrationDate: z.union([date, z.literal("")]).default(""),
  technician: optionalText(120), purpose: optionalText(), specimens: optionalText(), tools: optionalText(), form: kinds,
  steps: z.array(z.object({ title: text(200).min(1), description: text(2000) }).strict()).max(40).default([]),
  failureInfo: optionalText(), maintenanceInfo: optionalText(), notes: optionalText(),
}).strict();
const standard = z.object({ date, number: text(100).min(1), title: text(200).min(1), material: text(100), equipment: text(120), equipmentId: z.string().max(36), form: kinds, size: text(200), condition: text(), formula: text(500), steps: z.array(text()).max(40) }).strict();
const checklist = z.object({ date, key: text(100).min(1), checks: z.array(z.boolean()).max(40) }).strict();
export const schemas = { samples: sample, tests: test, sleepers: sleeper, trials: trial, compositions: composition, batches: batch, equipment, standards: standard, checklists: checklist };
export const readingSchema = z.object({ value: z.string().regex(/^-?\d{1,10}(\.\d{1,8})?$/), unit: text(24).min(1), measuredAt: z.iso.datetime({ offset: true }).refine(v => Date.parse(v) <= Date.now()) }).strict();
export const maintenanceSchema = z.object({ description: text().min(1), performedAt: z.iso.datetime({ offset: true }).refine(v => Date.parse(v) <= Date.now()) }).strict();
