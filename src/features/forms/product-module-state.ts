"use client";
import type { SetStateAction } from "react";
import { create } from "zustand";
import { uid, TODAY } from "@/lib/utils";
import { allRecords, deleteRecord, saveRecord } from "@/lib/api";
import type { RecordMeta } from "@/lib/contracts";
import { useUI } from "@/components/ui";
export type Row = { id: string; values: Record<string, string>; version?: number };
export type Product = "pipe" | "ring";
export type Batch = { id: string; number: number; rows: Row[]; version?: number; product?: Product };
type Track = { id?: string; version?: number; temperature: string; rows: Row[]; notes?: string };
type Batches = Record<Product, Batch[]>;
export type ProductRecord = RecordMeta & { track?: number; temperature?: string; notes?: string; rows?: Row[]; product?: Product; number?: number | string; totals?: Record<string, string>; time?: string; [key: string]: unknown };
export function blankRow(id: string): Row { return { id, values: {} }; }
const emptyTracks = (): Track[] => Array.from({ length: 3 }, (_, t) => ({ temperature: "", rows: Array.from({ length: 8 }, (_, h) => ({ id: `track-${t}-${h}`, values: { time: `${String(8 + h).padStart(2, "0")}:00`, value: "", note: "" } })) }));
interface ProductModuleState {
  date: string; setDate: (date: string) => void; records: Record<string, ProductRecord[]>; saving: number; error: string;
  track: number; tracks: Track[]; secretTab: "trials" | "recipe" | "result"; trials: Row[]; recipe: Row[]; totals: Record<string, string>; result: string;
  product: Product; batches: Batches;
  setTrack: (track: number) => void; setTracks: (tracks: SetStateAction<Track[]>) => void;
  setSecretTab: (tab: "trials" | "recipe" | "result") => void; setTrials: (rows: Row[]) => void; setRecipe: (rows: Row[]) => void; setResult: (result: string) => void;
  setProduct: (product: Product) => void; setBatches: (batches: SetStateAction<Batches>) => void; addBatch: (product: Product) => void;
  refresh: (module: string) => Promise<void>; derive: () => void;
}
let queue = Promise.resolve();
const changed = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);
function commit(module: string, operation: () => Promise<unknown>) {
  useProductModuleStore.setState(s => ({ saving: s.saving + 1, error: "" }));
  queue = queue.then(async () => {
    try { await operation(); }
    catch (error) { const message = error instanceof Error ? error.message : "Хадгалж чадсангүй."; useProductModuleStore.setState({ error: message }); useUI.getState().notify(message); }
    finally {
      try { await useProductModuleStore.getState().refresh(module); } catch { useProductModuleStore.setState({ error: "Мэдээлэл шинэчилж чадсангүй." }); }
      useProductModuleStore.setState(s => ({ saving: s.saving - 1 }));
    }
  });
}
export const useProductModuleStore = create<ProductModuleState>((set, get) => ({
  date: TODAY, records: {}, saving: 0, error: "", track: 0, tracks: emptyTracks(), secretTab: "trials", trials: [], recipe: [], totals: {}, result: "", product: "pipe", batches: { pipe: [], ring: [] },
  setDate: date => { set({ date }); get().derive(); },
  derive: () => {
    const { records, date } = get(); const forDay = (module: string) => (records[module] ?? []).filter(r => r.date === date);
    const tracks = emptyTracks(); for (const r of forDay("sleepers")) tracks[r.track! - 1] = { id: r.id, version: r.version, temperature: r.temperature ?? "", notes: r.notes, rows: r.rows ?? [] };
    const trials = forDay("trials").sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(r => ({ id: r.id, version: r.version, values: Object.fromEntries(["number", "spread", "concreteTemperature", "airTemperature", "airContent", "date", "time", "note"].map(k => [k, String(r[k] ?? "")])) }));
    const composition = forDay("compositions")[0]; const batches = { pipe: [], ring: [] } as Batches;
    for (const b of forDay("batches")) if (b.product) batches[b.product].push({ id: b.id, number: Number(b.number), version: b.version, rows: b.rows ?? [], product: b.product });
    batches.pipe.sort((a,b) => a.number-b.number); batches.ring.sort((a,b) => a.number-b.number);
    set({ tracks, trials, recipe: composition?.rows ?? [], totals: composition?.totals ?? {}, result: composition?.result ?? "", batches });
  },
  refresh: async module => { const records = await allRecords<ProductRecord>(module); set(s => ({ records: { ...s.records, [module]: records } })); get().derive(); },
  setTrack: track => set({ track }), setSecretTab: secretTab => set({ secretTab }), setProduct: product => set({ product }),
  setTracks: value => {
    const old = get().tracks, next = typeof value === "function" ? value(old) : value; const date = get().date;
    next.forEach((track, index) => { if (changed(track, old[index])) commit("sleepers", () => saveRecord("sleepers", { date, track: index + 1, temperature: track.temperature, notes: track.notes ?? "", rows: track.rows }, old[index].id, old[index].version)); });
  },
  setTrials: rows => {
    const old = get().trials, date = get().date;
    for (const row of rows) { const before = old.find(r => r.id === row.id); if (!before || changed(row.values, before.values)) commit("trials", () => saveRecord("trials", { date, ...row.values }, before?.id, before?.version)); }
    for (const row of old) if (!rows.some(r => r.id === row.id)) commit("trials", () => deleteRecord("trials", row.id, row.version!));
  },
  setRecipe: rows => {
    const { records, date } = get(); const before = records.compositions?.find(r => r.date === date);
    commit("compositions", () => saveRecord("compositions", { date, time: before?.time ?? "", result: before?.result ?? "", rows }, before?.id, before?.version));
  },
  setResult: result => {
    const { records, date } = get(); const before = records.compositions?.find(r => r.date === date);
    commit("compositions", () => saveRecord("compositions", { date, time: before?.time ?? "", result, rows: before?.rows ?? [] }, before?.id, before?.version));
  },
  setBatches: value => {
    const old = get().batches, next = typeof value === "function" ? value(old) : value; const date = get().date;
    for (const product of ["pipe", "ring"] as const) {
      for (const batch of next[product]) { const before = old[product].find(b => b.id === batch.id); if (before && changed(before.rows, batch.rows)) commit("batches", () => saveRecord("batches", { date, product, rows: batch.rows }, before.id, before.version)); }
      for (const batch of old[product]) if (!next[product].some(b => b.id === batch.id)) commit("batches", () => deleteRecord("batches", batch.id, batch.version!));
    }
  },
  addBatch: product => { const date = get().date; commit("batches", () => saveRecord("batches", { date, product, rows: [blankRow(uid())] })); },
}));
