import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import {
  canEditRecord, canTransition, deriveStatus, isSent, type AttachmentDto, type HistoryEntry, type LabResultDto, type RecordStatus, type SampleRecordDto,
} from "@/lib/registry";
import { today } from "@/lib/utils";
import type { CurrentUser } from "./auth";
import { db } from "./db";
import { ApiError } from "./http";
import { recordInput, recordCreateInput, recordUpdateInput, resultInput, resultUpdateInput, sendInput, versionInput, type ResultInput } from "./registry-validation";
import { recordChange, transaction, type Tx } from "./transaction";
import { discardStored, multipart, readUploads, storagePathFor, writeStored, type PreparedFile } from "./uploads";

const MAX_ACTIVE_RESULTS = 50, MAX_ATTACHMENTS_PER_RESULT = 10;
const conflict = "Өөр хэрэглэгч бүртгэлийг өөрчилсөн. Мэдээллээ шинэчилж дахин хадгална уу.";
const who = { select: { fullName: true } } as const;
const resultInclude = {
  items: { orderBy: { sortOrder: "asc" as const } },
  attachments: { where: { removedAt: null }, orderBy: { uploadedAt: "asc" as const }, include: { uploadedBy: who } },
  createdBy: who, updatedBy: who,
} satisfies Prisma.LaboratoryResultInclude;
const recordInclude = {
  sourceSample: { select: { companyPlannedDate: true } },
  results: { include: resultInclude, orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }] },
  createdBy: who, updatedBy: who,
} satisfies Prisma.SampleRecordInclude;
type RecordRow = Prisma.SampleRecordGetPayload<{ include: typeof recordInclude }>;
type ResultRow = Prisma.LaboratoryResultGetPayload<{ include: typeof resultInclude }>;

const day = (value: Date | null) => value?.toISOString().slice(0, 10) ?? "";
const dateValue = (value: string) => new Date(`${value}T00:00:00.000Z`);

function attachmentDto(row: ResultRow["attachments"][number]): AttachmentDto {
  return { id: row.id, name: row.originalName, mimeType: row.mimeType, size: row.size, uploadedAt: row.uploadedAt.toISOString(), uploadedByName: row.uploadedBy.fullName };
}
export function resultDto(row: ResultRow): LabResultDto {
  return {
    id: row.id, sampleRecordId: row.sampleRecordId, reportNumber: row.reportNumber, receivedDate: day(row.receivedDate), resultLaboratory: row.resultLaboratory,
    testedBy: row.testedBy, conclusion: row.conclusion, isComplete: row.isComplete, isActive: row.isActive, notes: row.notes, version: row.version,
    completedAt: row.completedAt?.toISOString() ?? null, createdById: row.createdById, updatedById: row.updatedById, createdByName: row.createdBy.fullName,
    updatedByName: row.updatedBy.fullName, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    items: row.items.map((i) => ({ id: i.id, testName: i.testName, resultValue: i.resultValue, unit: i.unit, standardRequirement: i.standardRequirement, testStandard: i.testStandard, itemConclusion: i.itemConclusion, notes: i.notes, sortOrder: i.sortOrder })),
    attachments: row.attachments.map(attachmentDto),
  };
}
export function recordDto(row: RecordRow): SampleRecordDto {
  return {
    sourceSampleId: row.sourceSampleId, companyPlannedDate: row.sourceSample?.companyPlannedDate ? day(row.sourceSample.companyPlannedDate) : null,
    id: row.id, code: row.code, material: row.material, description: row.description, project: row.project, location: row.location, quantity: row.quantity, unit: row.unit,
    sampledDate: day(row.sampledDate), registeredDate: day(row.registeredDate), sampledBy: row.sampledBy, status: row.status as RecordStatus,
    submittedLaboratory: row.submittedLaboratory, sentDate: row.sentDate ? day(row.sentDate) : null, notes: row.notes, version: row.version, isActive: row.isActive,
    createdById: row.createdById, updatedById: row.updatedById, createdByName: row.createdBy.fullName, updatedByName: row.updatedBy.fullName,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), results: row.results.map(resultDto),
  };
}

async function loadRecord(tx: Tx, id: string) {
  const row = await tx.sampleRecord.findFirst({ where: { id, isActive: true }, include: recordInclude });
  if (!row) throw new ApiError(404, "Дээжийн бүртгэл олдсонгүй.");
  return row;
}
async function loadResult(tx: Tx, id: string) {
  const row = await tx.laboratoryResult.findUnique({ where: { id }, include: resultInclude });
  if (!row) throw new ApiError(404, "Лабораторийн хариу олдсонгүй.");
  return row;
}
const snapshot = async (tx: Tx, id: string) => recordDto(await loadRecord(tx, id));

export async function listSampleRecords(request: Request) {
  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page") || 1), pageSize = Number(params.get("pageSize") || 100);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new ApiError(422, "Хуудасны хэмжээ буруу байна.");
  const where = { isActive: true };
  const [rows, total] = await db.$transaction([
    db.sampleRecord.findMany({ where, include: recordInclude, orderBy: [{ registeredDate: "desc" }, { createdAt: "desc" }, { id: "asc" }], take: pageSize, skip: (page - 1) * pageSize }),
    db.sampleRecord.count({ where }),
  ]);
  return { data: rows.map(recordDto), meta: { page, pageSize, total } };
}
export async function getSampleRecord(id: string) { return recordDto(await loadRecord(db, id)); }

function checkDispatch(v: { sampledDate: string; submittedLaboratory: string | null; sentDate: string | null }) {
  const now = today();
  if (v.sampledDate > now) throw new ApiError(422, "Дээж авсан огноо ирээдүйд байж болохгүй.");
  if ((v.submittedLaboratory === null) !== (v.sentDate === null)) throw new ApiError(422, "Илгээсэн лаборатори болон огноог хамт оруулна уу.");
  if (v.sentDate && (v.sentDate < v.sampledDate || v.sentDate > now)) throw new ApiError(422, "Илгээсэн огноо дээж авсан огнооноос өмнө эсвэл ирээдүйд байж болохгүй.");
}
const recordFields = (v: ReturnType<typeof recordInput.parse>) => ({
  code: v.code, material: v.material, description: v.description, project: v.project, location: v.location, quantity: v.quantity, unit: v.unit,
  sampledDate: dateValue(v.sampledDate), sampledBy: v.sampledBy, notes: v.notes,
  submittedLaboratory: v.submittedLaboratory, sentDate: v.sentDate ? dateValue(v.sentDate) : null,
});
const authorizeRecord = (user: CurrentUser, row: { createdById: string }) => {
  if (!canEditRecord(user, row)) throw new ApiError(403, "Зөвхөн өөрийн бүртгэлийг засах эрхтэй.");
};

export async function createSampleRecord(user: CurrentUser, input: unknown) {
  const v = recordCreateInput.parse(input); checkDispatch(v);
  return transaction(async (tx) => {
    // The link, registration, audit and queue removal commit together. Keep the
    // original sample and its tests intact; the queue excludes linked samples.
    const source = await tx.sample.findUnique({
      where: v.sourceSampleId ? { id: v.sourceSampleId } : { code: v.code },
      include: { record: true, registryRecord: { select: { id: true } } },
    });
    if (v.sourceSampleId && !source) throw new ApiError(404, "Эх сорьц олдсонгүй.");
    if (source) {
      if (!source.record.isActive) throw new ApiError(409, "Эх сорьц идэвхгүй болсон байна.");
      if (source.registryRecord) throw new ApiError(409, "Энэ сорьц компанийн дээжийн бүртгэлд аль хэдийн бүртгэгдсэн байна.");
      authorizeRecord(user, source.record);
    }
    const status: RecordStatus = v.sentDate ? "Лабораторид илгээсэн" : "Бүртгэсэн";
    const row = await tx.sampleRecord.create({ data: { ...recordFields(v), sourceSampleId: source?.id, registeredDate: dateValue(today()), status, createdById: user.id, updatedById: user.id } });
    if (source) {
      await tx.erpRecord.update({ where: { id: source.id }, data: { version: { increment: 1 }, updatedById: user.id } });
      await recordChange(tx, user.id, "TRANSFER", "samples", source.id, { registryRecordId: null }, { registryRecordId: row.id });
    }
    const after = await snapshot(tx, row.id);
    await recordChange(tx, user.id, "CREATE", "sampleRecords", row.id, undefined, after);
    return after;
  });
}
export async function updateSampleRecord(user: CurrentUser, id: string, input: unknown) {
  const { version, ...v } = recordUpdateInput.parse(input); checkDispatch(v);
  return transaction(async (tx) => {
    const before = await loadRecord(tx, id); authorizeRecord(user, before);
    if (before.version !== version) throw new ApiError(409, conflict);
    if (!isSent(before.status as RecordStatus) && v.sentDate) throw new ApiError(422, "Дээжийг «Лабораторид илгээх» үйлдлээр илгээнэ үү.");
    if (isSent(before.status as RecordStatus) && !v.sentDate) throw new ApiError(422, "Илгээсэн лаборатори, огноог хоосон болгох боломжгүй.");
    if (v.sentDate && before.results.some((r) => r.isActive && day(r.receivedDate) < v.sentDate!)) throw new ApiError(422, "Илгээсэн огноо хариу авсан огнооноос хойш байж болохгүй.");
    await tx.sampleRecord.update({ where: { id }, data: { ...recordFields(v), version: { increment: 1 }, updatedById: user.id } });
    const after = await snapshot(tx, id);
    await recordChange(tx, user.id, "UPDATE", "sampleRecords", id, recordDto(before), after);
    return after;
  });
}
export async function sendSampleRecord(user: CurrentUser, id: string, input: unknown) {
  const v = sendInput.parse(input);
  return transaction(async (tx) => {
    const before = await loadRecord(tx, id); authorizeRecord(user, before);
    if (before.version !== v.version) throw new ApiError(409, conflict);
    const from = before.status as RecordStatus, to: RecordStatus = "Лабораторид илгээсэн";
    if (isSent(from)) throw new ApiError(409, "Дээж лабораторид аль хэдийн илгээгдсэн байна.");
    if (!canTransition(from, to)) throw new ApiError(409, "Төлөвийн шилжилт буруу байна.");
    if (v.sentDate < day(before.sampledDate) || v.sentDate > today()) throw new ApiError(422, "Илгээсэн огноо дээж авсан огнооноос өмнө эсвэл ирээдүйд байж болохгүй.");
    await tx.sampleRecord.update({ where: { id }, data: { status: to, submittedLaboratory: v.submittedLaboratory, sentDate: dateValue(v.sentDate), version: { increment: 1 }, updatedById: user.id } });
    const after = await snapshot(tx, id);
    await recordChange(tx, user.id, "SEND", "sampleRecords", id, { status: from }, { status: to, submittedLaboratory: v.submittedLaboratory, sentDate: v.sentDate });
    return after;
  });
}
/** Admin-only, soft: a record with live results cannot be deactivated, and nothing is ever hard-deleted. */
export async function deactivateSampleRecord(user: CurrentUser, id: string, input: unknown) {
  const { version } = versionInput.parse(input);
  if (user.role !== "ADMIN") throw new ApiError(403, "Администраторын эрх шаардлагатай.");
  return transaction(async (tx) => {
    const before = await loadRecord(tx, id);
    if (before.version !== version) throw new ApiError(409, conflict);
    if (before.results.some((r) => r.isActive)) throw new ApiError(409, "Хариутай дээжийг идэвхгүй болгох боломжгүй. Эхлээд хариуг идэвхгүй болгоно уу.");
    await tx.sampleRecord.update({ where: { id }, data: { isActive: false, version: { increment: 1 }, updatedById: user.id } });
    await recordChange(tx, user.id, "DELETE", "sampleRecords", id, recordDto(before), { id, isActive: false });
    return { id, isActive: false };
  });
}

// ── Laboratory results ────────────────────────────────────────────────────────────────────────────────────────────

function assertEditable(user: CurrentUser, result: Pick<ResultRow, "isActive" | "isComplete" | "createdById">) {
  if (!result.isActive) throw new ApiError(409, "Идэвхгүй болсон хариуг засах боломжгүй.");
  if (user.role === "ADMIN") return;
  if (result.isComplete) throw new ApiError(403, "Дууссан хариуг зөвхөн администратор өөрчилнө.");
  if (result.createdById !== user.id) throw new ApiError(403, "Зөвхөн өөрийн оруулсан хариуг засах эрхтэй.");
}
function assertAdmin(user: CurrentUser, message = "Администраторын эрх шаардлагатай.") {
  if (user.role !== "ADMIN") throw new ApiError(403, message);
}
function checkResult(v: ResultInput, record: Pick<RecordRow, "sentDate">) {
  if (v.receivedDate > today()) throw new ApiError(422, "Хариу авсан огноо ирээдүйд байж болохгүй.");
  if (record.sentDate && v.receivedDate < day(record.sentDate)) throw new ApiError(422, "Хариу авсан огноо дээжийг илгээсэн огнооноос өмнө байж болохгүй.");
  if (v.isComplete) {
    if (!v.items.length) throw new ApiError(422, "Бүрэн дууссан хариу дор хаяж нэг үзүүлэлттэй байна.");
    if (v.items.some((i) => !i.resultValue)) throw new ApiError(422, "Бүрэн дууссан хариуны үзүүлэлт бүрийн үр дүнг оруулна уу.");
  }
}
const content = (x: { reportNumber: string; receivedDate: string; resultLaboratory: string; testedBy: string; conclusion: string; notes: string; items: { testName: string; resultValue: string; unit: string; standardRequirement: string; testStandard: string; itemConclusion: string; notes: string }[] }) =>
  JSON.stringify([x.reportNumber, x.receivedDate, x.resultLaboratory, x.testedBy, x.conclusion, x.notes, x.items.map((i) => [i.testName, i.resultValue, i.unit, i.standardRequirement, i.testStandard, i.itemConclusion, i.notes])]);
/** Explicit picks: write payloads are never built by spreading request bodies or DTOs. */
const scalarFields = (v: ResultInput) => ({
  reportNumber: v.reportNumber, receivedDate: dateValue(v.receivedDate), resultLaboratory: v.resultLaboratory, testedBy: v.testedBy,
  conclusion: v.conclusion, isComplete: v.isComplete, notes: v.notes,
});
const itemRows = (resultId: string, items: ResultInput["items"]) => items.map((i, sortOrder) => ({
  laboratoryResultId: resultId, testName: i.testName, resultValue: i.resultValue, unit: i.unit, standardRequirement: i.standardRequirement,
  testStandard: i.testStandard, itemConclusion: i.itemConclusion, notes: i.notes, sortOrder,
}));
const attachmentRows = (resultId: string, userId: string, files: PreparedFile[]) => files.map((f) => ({
  laboratoryResultId: resultId, originalName: f.originalName, storedName: f.storedName, storagePath: storagePathFor(resultId, f.storedName),
  mimeType: f.mimeType, extension: f.extension, size: f.size, sha256: f.sha256, uploadedById: userId,
}));

/** Recomputes the sample's status from its active results and validates the transition before writing it. */
async function syncStatus(tx: Tx, recordId: string, user: CurrentUser) {
  const record = await tx.sampleRecord.findUniqueOrThrow({ where: { id: recordId }, include: { results: { select: { isActive: true, isComplete: true } } } });
  const from = record.status as RecordStatus, to = deriveStatus(from, record.results);
  if (from === to) return;
  if (!canTransition(from, to)) throw new ApiError(409, "Төлөвийн шилжилт буруу байна.");
  await tx.sampleRecord.update({ where: { id: recordId }, data: { status: to, version: { increment: 1 }, updatedById: user.id } });
  await recordChange(tx, user.id, "STATUS", "sampleRecords", recordId, { status: from }, { status: to });
}
/** Files are written last, inside the transaction, so a disk failure rolls the database back; a failed commit removes them again. */
async function withFiles<T>(work: (written: string[]) => Promise<T>) {
  const written: string[] = [];
  try { return await work(written); }
  catch (error) { await discardStored(written); throw error; }
}
async function storeFiles(tx: Tx, resultId: string, user: CurrentUser, files: PreparedFile[], written: string[]) {
  if (!files.length) return;
  const existing = await tx.laboratoryResultAttachment.count({ where: { laboratoryResultId: resultId, removedAt: null } });
  if (existing + files.length > MAX_ATTACHMENTS_PER_RESULT) throw new ApiError(422, `Нэг хариунд ${MAX_ATTACHMENTS_PER_RESULT}-аас олон файл хавсаргах боломжгүй.`);
  await tx.laboratoryResultAttachment.createMany({ data: attachmentRows(resultId, user.id, files) });
  for (const file of files) written.push(await writeStored(storagePathFor(resultId, file.storedName), file.buffer));
}

export async function createResult(user: CurrentUser, recordId: string, input: unknown, files: PreparedFile[]) {
  const v = resultInput.parse(input);
  if (v.isComplete) assertAdmin(user, "Хариуг бүрэн дуусгахад администраторын эрх шаардлагатай.");
  const resultId = randomUUID();
  return withFiles((written) => transaction(async (tx) => {
    const record = await loadRecord(tx, recordId);
    if (!isSent(record.status as RecordStatus)) throw new ApiError(409, "Дээжийг лабораторид илгээсний дараа хариу оруулна.");
    if (record.results.filter((r) => r.isActive).length >= MAX_ACTIVE_RESULTS) throw new ApiError(422, "Нэг дээжид оруулах хариуны дээд хязгэрт хүрсэн.");
    checkResult(v, record);
    await tx.laboratoryResult.create({ data: { id: resultId, sampleRecordId: recordId, ...scalarFields(v), completedAt: v.isComplete ? new Date() : null, createdById: user.id, updatedById: user.id } });
    if (v.items.length) await tx.laboratoryResultItem.createMany({ data: itemRows(resultId, v.items) });
    await storeFiles(tx, resultId, user, files, written);
    const after = resultDto(await loadResult(tx, resultId));
    await recordChange(tx, user.id, "CREATE", "laboratoryResults", resultId, undefined, after);
    if (v.isComplete) await recordChange(tx, user.id, "COMPLETE", "laboratoryResults", resultId, { isComplete: false }, { isComplete: true });
    await syncStatus(tx, recordId, user);
    return snapshot(tx, recordId);
  }));
}

async function applyResultUpdate(tx: Tx, user: CurrentUser, before: ResultRow, v: ResultInput & { version: number }, files: PreparedFile[], written: string[]) {
  assertEditable(user, before);
  if (before.version !== v.version) throw new ApiError(409, conflict);
  if (v.isComplete !== before.isComplete) assertAdmin(user, v.isComplete ? "Хариуг бүрэн дуусгахад администраторын эрх шаардлагатай." : "Дууссан хариуг дахин нээхэд администраторын эрх шаардлагатай.");
  const record = await loadRecord(tx, before.sampleRecordId);
  checkResult(v, record);
  const beforeDto = resultDto(before);
  const contentChanged = content(beforeDto) !== content(v), completionChanged = beforeDto.isComplete !== v.isComplete;
  if (!contentChanged && !completionChanged && !files.length) return snapshot(tx, before.sampleRecordId);
  await tx.laboratoryResult.update({
    where: { id: before.id },
    data: { ...scalarFields(v), version: { increment: 1 }, updatedById: user.id, completedAt: v.isComplete ? before.completedAt ?? new Date() : null },
  });
  if (contentChanged) {
    await tx.laboratoryResultItem.deleteMany({ where: { laboratoryResultId: before.id } });
    if (v.items.length) await tx.laboratoryResultItem.createMany({ data: itemRows(before.id, v.items) });
  }
  await storeFiles(tx, before.id, user, files, written);
  const after = resultDto(await loadResult(tx, before.id));
  if (contentChanged || files.length) await recordChange(tx, user.id, "UPDATE", "laboratoryResults", before.id, beforeDto, after);
  if (completionChanged) await recordChange(tx, user.id, v.isComplete ? "COMPLETE" : "REOPEN", "laboratoryResults", before.id, { isComplete: beforeDto.isComplete }, { isComplete: v.isComplete });
  await syncStatus(tx, before.sampleRecordId, user);
  return snapshot(tx, before.sampleRecordId);
}
export async function updateResult(user: CurrentUser, resultId: string, input: unknown, files: PreparedFile[]) {
  const v = resultUpdateInput.parse(input);
  return withFiles((written) => transaction(async (tx) => applyResultUpdate(tx, user, await loadResult(tx, resultId), v, files, written)));
}
/** Admin-only complete / reopen without touching the measurements. */
export async function setResultCompletion(user: CurrentUser, resultId: string, isComplete: boolean, input: unknown) {
  const { version } = versionInput.parse(input);
  assertAdmin(user, isComplete ? "Хариуг бүрэн дуусгахад администраторын эрх шаардлагатай." : "Дууссан хариуг дахин нээхэд администраторын эрх шаардлагатай.");
  return transaction(async (tx) => {
    const before = await loadResult(tx, resultId), current = resultDto(before);
    const input: ResultInput & { version: number } = {
      reportNumber: current.reportNumber, receivedDate: current.receivedDate, resultLaboratory: current.resultLaboratory, testedBy: current.testedBy,
      conclusion: current.conclusion, isComplete, notes: current.notes, version,
      items: current.items.map((i) => ({ testName: i.testName, resultValue: i.resultValue, unit: i.unit, standardRequirement: i.standardRequirement, testStandard: i.testStandard, itemConclusion: i.itemConclusion, notes: i.notes })),
    };
    return applyResultUpdate(tx, user, before, input, [], []);
  });
}
/** Admin-only. Results are never hard-deleted; deactivation hides them from counters and restores the sample's status. */
export async function deactivateResult(user: CurrentUser, resultId: string, input: unknown) {
  const { version } = versionInput.parse(input);
  assertAdmin(user);
  return transaction(async (tx) => {
    const before = await loadResult(tx, resultId);
    if (!before.isActive) throw new ApiError(409, "Хариу аль хэдийн идэвхгүй болсон байна.");
    if (before.version !== version) throw new ApiError(409, conflict);
    await tx.laboratoryResult.update({ where: { id: resultId }, data: { isActive: false, version: { increment: 1 }, updatedById: user.id } });
    await recordChange(tx, user.id, "DEACTIVATE", "laboratoryResults", resultId, resultDto(before), { id: resultId, isActive: false });
    await syncStatus(tx, before.sampleRecordId, user);
    return snapshot(tx, before.sampleRecordId);
  });
}
/** Soft removal: metadata is marked removed and audited; the stored file is retained as evidence. */
export async function removeAttachment(user: CurrentUser, attachmentId: string) {
  return transaction(async (tx) => {
    const attachment = await tx.laboratoryResultAttachment.findUnique({ where: { id: attachmentId } });
    if (!attachment || attachment.removedAt) throw new ApiError(404, "Хавсралт олдсонгүй.");
    const result = await loadResult(tx, attachment.laboratoryResultId);
    assertEditable(user, result);
    await tx.laboratoryResultAttachment.update({ where: { id: attachmentId }, data: { removedAt: new Date(), removedById: user.id } });
    await tx.laboratoryResult.update({ where: { id: result.id }, data: { updatedById: user.id } });
    await recordChange(tx, user.id, "ATTACHMENT_REMOVE", "laboratoryResults", result.id, { attachment: { id: attachment.id, name: attachment.originalName, size: attachment.size } });
    return snapshot(tx, result.sampleRecordId);
  });
}
/** Authenticated download lookup; removed attachments are not served. */
export async function findAttachment(id: string) {
  const row = await db.laboratoryResultAttachment.findFirst({ where: { id, removedAt: null } });
  if (!row) throw new ApiError(404, "Файл олдсонгүй.");
  return { path: row.storagePath, name: row.originalName, mimeType: row.mimeType, size: row.size };
}

const asObject = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null);
export async function recordHistory(id: string): Promise<HistoryEntry[]> {
  const record = await db.sampleRecord.findUnique({ where: { id }, select: { id: true, results: { select: { id: true } } } });
  if (!record) throw new ApiError(404, "Дээжийн бүртгэл олдсонгүй.");
  const rows = await db.auditLog.findMany({
    where: { OR: [{ entityType: "sampleRecords", entityId: id }, { entityType: "laboratoryResults", entityId: { in: record.results.map((r) => r.id) } }] },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 300, include: { user: { select: { fullName: true } } },
  });
  return rows.map((r) => ({
    id: String(r.id), action: r.action, entityType: r.entityType, entityId: r.entityId, userName: r.user?.fullName ?? "Систем",
    createdAt: r.createdAt.toISOString(), before: asObject(r.beforeData), after: asObject(r.afterData),
  }));
}

/** Route params must look like generated UUIDs; anything else is simply "not found". */
export function parseId(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new ApiError(404, "Бүртгэл олдсонгүй.");
  return value;
}
/** Result saves are multipart: a JSON `payload` field plus zero or more `files`, validated together before anything is written. */
export async function readResultForm(request: Request) {
  const form = await multipart(request);
  const raw = form.get("payload");
  if (typeof raw !== "string") throw new ApiError(422, "Хариуны мэдээлэл дутуу байна.");
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { throw new ApiError(422, "JSON мэдээлэл буруу байна."); }
  return { payload, files: await readUploads(form) };
}
