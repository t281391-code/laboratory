/* Shared by server and browser: domain vocabulary, status rules, permissions and summary maths for the sample registry. */
import type { AuthUser } from "./contracts";
import { daysBetween } from "./utils";

/** Realtime/audit entity types owned by the registry. Any event of these types refreshes the registry store. */
export const registryEntityTypes = ["sampleRecords", "laboratoryResults"] as const;
export const plannedRegistryStatus = "Явахаар товлосон";

/** Scheduled samples appear immediately; a completed registration replaces its source row. */
export function plannedRegistrySamples<T extends { id: string; companyPlannedDate?: string | null }>(samples: T[], records: { sourceSampleId: string | null }[]) {
  const registered = new Set(records.map((record) => record.sourceSampleId));
  return samples.filter((sample) => !!sample.companyPlannedDate && !registered.has(sample.id))
    .sort((a, b) => a.companyPlannedDate!.localeCompare(b.companyPlannedDate!) || a.id.localeCompare(b.id));
}

export const recordStatuses = ["Бүртгэсэн", "Лабораторид илгээсэн", "Хариу хэсэгчлэн авсан", "Хариу авсан"] as const;
export type RecordStatus = (typeof recordStatuses)[number];
export const conclusions = ["PASS", "FAIL", "CONDITIONAL", "NOT_EVALUATED"] as const;
export type Conclusion = (typeof conclusions)[number];
export const itemConclusions = ["PASS", "FAIL", "NOT_EVALUATED"] as const;
export type ItemConclusion = (typeof itemConclusions)[number];
export type Tone = "green" | "red" | "amber" | "neutral" | "blue";

export const conclusionLabels: Record<Conclusion, string> = { PASS: "Тэнцсэн", FAIL: "Тэнцээгүй", CONDITIONAL: "Нөхцөлтэй", NOT_EVALUATED: "Үнэлээгүй" };
export const itemConclusionLabels: Record<ItemConclusion, string> = { PASS: "Тэнцсэн", FAIL: "Тэнцээгүй", NOT_EVALUATED: "Үнэлээгүй" };
/** Green = passed, red = failed, orange (amber) = conditional, gray = not evaluated. */
export const conclusionTone: Record<Conclusion, Tone> = { PASS: "green", FAIL: "red", CONDITIONAL: "amber", NOT_EVALUATED: "neutral" };
export const statusTone: Record<RecordStatus, Tone> = { "Бүртгэсэн": "neutral", "Лабораторид илгээсэн": "blue", "Хариу хэсэгчлэн авсан": "amber", "Хариу авсан": "green" };

export const fileRules = {
  maxBytes: 10 * 1024 * 1024,
  maxFiles: 5,
  extensions: ["pdf", "jpg", "jpeg", "png"] as const,
  mimeByExtension: { pdf: ["application/pdf"], jpg: ["image/jpeg", "image/jpg"], jpeg: ["image/jpeg", "image/jpg"], png: ["image/png"] } as Record<string, string[]>,
  accept: ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png",
};

export type AttachmentDto = { id: string; name: string; mimeType: string; size: number; uploadedAt: string; uploadedByName: string };
export type ResultItemDto = { id: string; testName: string; resultValue: string; unit: string; standardRequirement: string; testStandard: string; itemConclusion: ItemConclusion; notes: string; sortOrder: number };
export type LabResultDto = {
  id: string; sampleRecordId: string; reportNumber: string; receivedDate: string; resultLaboratory: string; testedBy: string;
  conclusion: Conclusion; isComplete: boolean; isActive: boolean; notes: string; version: number; completedAt: string | null;
  createdById: string; updatedById: string; createdByName: string; updatedByName: string; createdAt: string; updatedAt: string;
  items: ResultItemDto[]; attachments: AttachmentDto[];
};
export type SampleRecordDto = {
  sourceSampleId: string | null; companyPlannedDate: string | null;
  id: string; code: string; material: string; description: string; project: string; location: string; quantity: number; unit: string;
  sampledDate: string; registeredDate: string; sampledBy: string; status: RecordStatus; submittedLaboratory: string | null; sentDate: string | null;
  notes: string; version: number; isActive: boolean; createdById: string; updatedById: string; createdByName: string; updatedByName: string;
  createdAt: string; updatedAt: string; results: LabResultDto[];
};
export type HistoryEntry = {
  id: string; action: string; entityType: string; entityId: string; userName: string; createdAt: string;
  before: Record<string, unknown> | null; after: Record<string, unknown> | null;
};

/** Status transitions the server accepts. Results move a sent sample between the three "sent" states; nothing skips registration. */
export const statusTransitions: Record<RecordStatus, readonly RecordStatus[]> = {
  "Бүртгэсэн": ["Лабораторид илгээсэн"],
  "Лабораторид илгээсэн": ["Хариу хэсэгчлэн авсан", "Хариу авсан"],
  "Хариу хэсэгчлэн авсан": ["Лабораторид илгээсэн", "Хариу авсан"],
  "Хариу авсан": ["Хариу хэсэгчлэн авсан", "Лабораторид илгээсэн"],
};
export const canTransition = (from: RecordStatus, to: RecordStatus) => from === to || statusTransitions[from].includes(to);
export const isSent = (status: RecordStatus) => status !== "Бүртгэсэн";

/**
 * The status a sample must have given its active results:
 * none → back to "sent" (the state before any result existed), every one complete → received, otherwise partial.
 */
export function deriveStatus(current: RecordStatus, results: { isActive: boolean; isComplete: boolean }[]): RecordStatus {
  if (current === "Бүртгэсэн") return current;
  const active = results.filter((r) => r.isActive);
  if (!active.length) return "Лабораторид илгээсэн";
  return active.every((r) => r.isComplete) ? "Хариу авсан" : "Хариу хэсэгчлэн авсан";
}

export type Actor = Pick<AuthUser, "id" | "role">;
export const canEditRecord = (user: Actor, record: { createdById: string }) => user.role === "ADMIN" || record.createdById === user.id;
/** Admin edits anything; a user edits only incomplete results they entered themselves. */
export const canEditResult = (user: Actor, result: { isActive: boolean; isComplete: boolean; createdById: string }) =>
  result.isActive && (user.role === "ADMIN" || (!result.isComplete && result.createdById === user.id));
export const canManageCompletion = (user: Actor) => user.role === "ADMIN";

const severity: Record<Conclusion, number> = { PASS: 0, NOT_EVALUATED: 1, CONDITIONAL: 2, FAIL: 3 };
export const activeResults = (record: Pick<SampleRecordDto, "results">) => record.results.filter((r) => r.isActive);
/** Worst active conclusion wins (fail > conditional > not evaluated > pass); null while no result exists. */
export function recordOutcome(record: Pick<SampleRecordDto, "results">): Conclusion | null {
  const active = activeResults(record);
  return active.length ? active.reduce<Conclusion>((worst, r) => (severity[r.conclusion] > severity[worst] ? r.conclusion : worst), "PASS") : null;
}
/** Days between dispatch and the first active result being received. */
export function responseDays(record: Pick<SampleRecordDto, "sentDate" | "results">): number | null {
  const active = activeResults(record);
  if (!record.sentDate || !active.length) return null;
  const first = active.map((r) => r.receivedDate).sort()[0];
  return Math.max(0, daysBetween(record.sentDate, first));
}
export function suggestConclusion(items: { itemConclusion: ItemConclusion }[]): Conclusion {
  if (!items.length || items.every((i) => i.itemConclusion === "NOT_EVALUATED")) return "NOT_EVALUATED";
  if (items.some((i) => i.itemConclusion === "FAIL")) return "FAIL";
  if (items.every((i) => i.itemConclusion === "PASS")) return "PASS";
  return "CONDITIONAL";
}

export type RegistrySummary = ReturnType<typeof summarize>;
export function summarize(records: SampleRecordDto[]) {
  const list = records.filter((r) => r.isActive);
  const count = (status: RecordStatus) => list.filter((r) => r.status === status).length;
  const outcome = (value: Conclusion) => list.filter((r) => recordOutcome(r) === value).length;
  const days = list.map(responseDays).filter((d): d is number => d !== null);
  return {
    total: list.length,
    registered: count("Бүртгэсэн"),
    pending: count("Лабораторид илгээсэн"),
    partial: count("Хариу хэсэгчлэн авсан"),
    received: count("Хариу авсан"),
    passed: outcome("PASS"),
    failed: outcome("FAIL"),
    conditional: outcome("CONDITIONAL"),
    notEvaluated: outcome("NOT_EVALUATED"),
    averageDays: days.length ? days.reduce((sum, d) => sum + d, 0) / days.length : null,
  };
}

export const formatBytes = (bytes: number) => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} МБ` : `${Math.max(1, Math.round(bytes / 1024))} КБ`;
export const versionLabel = (record: Pick<SampleRecordDto, "results">, result: { id: string }) => `Хувилбар ${record.results.findIndex((r) => r.id === result.id) + 1}`;

export const auditActionLabels: Record<string, string> = {
  CREATE: "Бүртгэсэн", UPDATE: "Засварласан", SEND: "Лабораторид илгээсэн", STATUS: "Төлөв өөрчлөгдсөн", COMPLETE: "Хариуг дуусгасан",
  REOPEN: "Хариуг дахин нээсэн", DEACTIVATE: "Идэвхгүй болгосон", DELETE: "Идэвхгүй болгосон", ATTACHMENT_REMOVE: "Хавсралт хассан",
};
export const fieldLabels: Record<string, string> = {
  code: "Дээжийн код", material: "Материал", description: "Дээжийн нэр", project: "Төсөл", location: "Авсан байршил", quantity: "Хэмжээ", unit: "Нэгж",
  sampledDate: "Дээж авсан огноо", registeredDate: "Бүртгэсэн огноо", sampledBy: "Дээж авсан ажилтан", status: "Төлөв",
  submittedLaboratory: "Илгээсэн лаборатори", sentDate: "Илгээсэн огноо", notes: "Тайлбар", isActive: "Идэвхтэй",
  reportNumber: "Хариуны дугаар", receivedDate: "Хариу авсан огноо", resultLaboratory: "Хариу өгсөн лаборатори", testedBy: "Шинжилгээ хийсэн ажилтан",
  conclusion: "Дүгнэлт", isComplete: "Бүрэн дууссан", items: "Үзүүлэлтүүд", attachments: "Хавсралт",
};
