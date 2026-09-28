"use client";
import { create } from "zustand";
import type { Sample, TestRecord, FormKind, FormValues, Notification, Equipment, Standard } from "./types";
import type { AuthUser, RecordMeta } from "./contracts";
import { allRecords, api, saveRecord } from "./api";
import { TODAY } from "./utils";
import { useUI } from "@/components/ui";
interface Draft { values: FormValues; photos: string[]; step: number; updated: string }
export type Saved<T> = T & RecordMeta;
type Checklist = RecordMeta & { key: string; checks: boolean[] };
interface LabState {
  samples: Saved<Sample>[]; tests: Saved<TestRecord>[]; equipment: Saved<Equipment>[]; standards: Saved<Standard>[];
  drafts: Partial<Record<FormKind, Draft>>; checklists: Record<string, boolean[]>; checklistRecords: Checklist[];
  notifications: Notification[]; hydrated: boolean; storageError: boolean; error: string; user: AuthUser | null;
  connection: "LIVE" | "RECONNECTING" | "OFFLINE"; updatedAt: string;
  refresh: (module: string) => Promise<void>;
  addSample: (sample: Sample) => Promise<Saved<Sample>>;
  saveTest: (test: TestRecord) => Promise<Saved<TestRecord>>;
  approveTest: (id: string) => Promise<void>;
  saveDraft: (kind: FormKind, draft: Draft) => void; clearDraft: (kind: FormKind) => void;
  setChecklist: (id: string, list: boolean[]) => Promise<void>;
  readNotification: (id?: string) => void; finishHydration: () => void;
}
export const useLabStore = create<LabState>((set, get) => ({
  samples: [], tests: [], equipment: [], standards: [], drafts: {}, checklists: {}, checklistRecords: [], notifications: [],
  hydrated: false, storageError: false, error: "", user: null, connection: "RECONNECTING", updatedAt: "",
  finishHydration: () => set({ hydrated: true }),
  refresh: async module => {
    if (module === "checklists") {
      const records = await allRecords<Checklist>(module);
      set({ checklistRecords: records, checklists: Object.fromEntries(records.map(r => [r.key, r.checks])) });
    } else if (["samples", "tests", "equipment", "standards"].includes(module)) {
      const records = await allRecords(module); set({ [module]: records });
    } else if (module === "activity") {
      const result = await api<Notification[]>("/api/activity/"); set({ notifications: result.data });
    }
  },
  addSample: async sample => { const saved = await saveRecord<Saved<Sample>>("samples", sample); await get().refresh("samples"); return saved; },
  saveTest: async test => {
    const saved = await saveRecord<Saved<TestRecord>>("tests", test);
    await Promise.all([get().refresh("tests"), get().refresh("samples")]); get().clearDraft(test.kind); return saved;
  },
  approveTest: async id => {
    try {
      const test = get().tests.find(t => t.id === id); if (!test) return;
      await saveRecord("tests", { approved: true }, id, test.version);
      await Promise.all([get().refresh("tests"), get().refresh("samples")]);
    } catch (error) { useUI.getState().notify(error instanceof Error ? error.message : "Хадгалж чадсангүй."); }
  },
  saveDraft: (kind, draft) => set(s => ({ drafts: { ...s.drafts, [kind]: draft } })),
  clearDraft: kind => set(s => { const drafts = { ...s.drafts }; delete drafts[kind]; return { drafts }; }),
  setChecklist: async (key, checks) => {
    try {
      const existing = get().checklistRecords.find(r => r.key === key);
      await saveRecord("checklists", { date: TODAY, key, checks }, existing?.id, existing?.version);
      await get().refresh("checklists");
    } catch (error) { useUI.getState().notify(error instanceof Error ? error.message : "Хадгалж чадсангүй."); }
  },
  readNotification: id => { void api("/api/activity/", { method: "PATCH", body: JSON.stringify({ id }) }).then(() => get().refresh("activity")).catch(() => useUI.getState().notify("Мэдэгдэл хадгалж чадсангүй.")); },
}));
