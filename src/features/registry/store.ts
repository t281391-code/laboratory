"use client";
import { create } from "zustand";
import { allRecords, api, RequestError } from "@/lib/api";
import type { HistoryEntry, SampleRecordDto } from "@/lib/registry";
import { useLabStore } from "@/lib/store";

interface RegistryState {
  records: SampleRecordDto[]; loaded: boolean; error: string;
  refresh: () => Promise<void>;
  upsert: (record: SampleRecordDto) => void;
  remove: (id: string) => void;
}
/** Server-backed registry cache. `refresh` never throws, so a registry outage cannot block the rest of the workspace from loading. */
export const useRegistryStore = create<RegistryState>((set) => ({
  records: [], loaded: false, error: "",
  refresh: async () => {
    try { set({ records: await allRecords<SampleRecordDto>("sample-records"), loaded: true, error: "" }); }
    catch (error) { set({ loaded: true, error: error instanceof Error ? error.message : "Дээжийн бүртгэл ачаалж чадсангүй." }); }
  },
  upsert: (record) => set((s) => ({ records: s.records.some((r) => r.id === record.id) ? s.records.map((r) => (r.id === record.id ? record : r)) : [record, ...s.records] })),
  remove: (id) => set((s) => ({ records: s.records.filter((r) => r.id !== id) })),
}));

const json = (body: unknown) => JSON.stringify(body);
async function saved(request: Promise<{ data: SampleRecordDto }>) {
  const record = (await request).data;
  useRegistryStore.getState().upsert(record);
  if (record.sourceSampleId) {
    useLabStore.setState((s) => ({ samples: s.samples.filter((sample) => sample.id !== record.sourceSampleId) }));
  }
  return record;
}
/** Multipart save (result fields + files in one request, so the server commits them atomically). */
async function sendForm(path: string, method: "POST" | "PATCH", payload: object, files: File[]) {
  const form = new FormData();
  form.set("payload", JSON.stringify(payload));
  for (const file of files) form.append("files", file, file.name);
  const response = await fetch(path, { method, body: form, credentials: "same-origin", cache: "no-store" });
  let result: { data?: SampleRecordDto; error?: { message?: string } };
  try { result = await response.json(); } catch { throw new RequestError(response.status, "Сервертэй холбогдож чадсангүй."); }
  if (!response.ok || !result.data) {
    if (response.status === 401) location.assign("/login/");
    throw new RequestError(response.status, result.error?.message ?? "Хүсэлт амжилтгүй боллоо.");
  }
  useRegistryStore.getState().upsert(result.data);
  return result.data;
}

export type RecordInput = {
  code: string; material: string; description: string; project: string; location: string; quantity: number; unit: string;
  sampledDate: string; sampledBy: string; notes: string; submittedLaboratory: string | null; sentDate: string | null;
};
export type ResultPayload = {
  reportNumber: string; receivedDate: string; resultLaboratory: string; testedBy: string; conclusion: string; isComplete: boolean; notes: string;
  items: { testName: string; resultValue: string; unit: string; standardRequirement: string; testStandard: string; itemConclusion: string; notes: string }[];
};

export const registryApi = {
  create: (input: RecordInput & { sourceSampleId?: string }) => saved(api<SampleRecordDto>("/api/sample-records/", { method: "POST", body: json(input) })),
  update: (id: string, version: number, input: RecordInput) => saved(api<SampleRecordDto>(`/api/sample-records/${id}/`, { method: "PATCH", body: json({ ...input, version }) })),
  send: (id: string, version: number, submittedLaboratory: string, sentDate: string) =>
    saved(api<SampleRecordDto>(`/api/sample-records/${id}/send/`, { method: "POST", body: json({ version, submittedLaboratory, sentDate }) })),
  deactivate: async (id: string, version: number) => {
    await api(`/api/sample-records/${id}/`, { method: "DELETE", body: json({ version }) });
    useRegistryStore.getState().remove(id);
  },
  createResult: (recordId: string, payload: ResultPayload, files: File[]) => sendForm(`/api/sample-records/${recordId}/results/`, "POST", payload, files),
  updateResult: (resultId: string, version: number, payload: ResultPayload, files: File[]) => sendForm(`/api/laboratory-results/${resultId}/`, "PATCH", { ...payload, version }, files),
  setCompletion: (resultId: string, version: number, complete: boolean) =>
    saved(api<SampleRecordDto>(`/api/laboratory-results/${resultId}/${complete ? "complete" : "reopen"}/`, { method: "POST", body: json({ version }) })),
  deactivateResult: (resultId: string, version: number) => saved(api<SampleRecordDto>(`/api/laboratory-results/${resultId}/`, { method: "DELETE", body: json({ version }) })),
  removeAttachment: (attachmentId: string) => saved(api<SampleRecordDto>(`/api/laboratory-attachments/${attachmentId}/`, { method: "DELETE" })),
  history: async (recordId: string) => (await api<HistoryEntry[]>(`/api/sample-records/${recordId}/history/`)).data,
};
export const attachmentUrl = (id: string, download = false) => `/api/laboratory-attachments/${id}/${download ? "?download=1" : ""}`;
