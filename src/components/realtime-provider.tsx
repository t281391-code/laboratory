/* A new authentication context must discard all cached ERP data. */
/* eslint-disable @next/next/no-location-assign-relative-destination */
"use client";
import { useEffect, type ReactNode } from "react";
import { useLabStore } from "@/lib/store";
import { useProductModuleStore } from "@/features/forms/product-module-state";
import { api } from "@/lib/api";
import type { AuthUser } from "@/lib/contracts";
import { registryEntityTypes } from "@/lib/registry";
import { useRegistryStore } from "@/features/registry/store";
const productModules = ["sleepers", "trials", "compositions", "batches"];
const modules = ["samples", "tests", "equipment", "standards", "checklists", "activity", "sampleRecords", ...productModules];
export function RealtimeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let disposed = false, source: EventSource | null = null, timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0, cursor = "", heartbeat = Date.now();
    const running = new Map<string, Promise<void>>(); const dirty = new Set<string>();
    const refresh = (requested: string): Promise<void> => {
      // Sample records and their laboratory results share one cache, so both event types refresh it once.
      const module = (registryEntityTypes as readonly string[]).includes(requested) ? "sampleRecords" : requested;
      if (disposed || !modules.includes(module)) return Promise.resolve();
      if (running.has(module)) { dirty.add(module); return running.get(module)!; }
      const promise = (async () => { do { dirty.delete(module); await (module === "sampleRecords" ? useRegistryStore.getState().refresh() : productModules.includes(module) ? useProductModuleStore.getState().refresh(module) : useLabStore.getState().refresh(module)); } while (dirty.has(module) && !disposed); })().finally(() => running.delete(module));
      running.set(module, promise); return promise;
    };
    const refreshAll = async () => {
      try {
        const me = await api<AuthUser>("/api/auth/me/"); if (disposed) return;
        useLabStore.setState({ user: me.data }); await Promise.all(modules.map(refresh));
        if (!disposed) useLabStore.setState({ hydrated: true, error: "" });
      } catch (error) { if (!disposed) useLabStore.setState({ error: error instanceof Error ? error.message : "Мэдээлэл ачаалж чадсангүй." }); }
    };
    const connect = () => {
      if (disposed) return; clearTimeout(timer); source?.close();
      if (!navigator.onLine) { useLabStore.setState({ connection: "OFFLINE" }); return; }
      useLabStore.setState({ connection: "RECONNECTING" });
      source = new EventSource(`/api/events/${cursor ? `?lastEventId=${cursor}` : ""}`);
      source.addEventListener("ready", () => { attempt = 0; heartbeat = Date.now(); useLabStore.setState({ connection: "LIVE" }); void refreshAll(); });
      source.addEventListener("heartbeat", (event: MessageEvent) => { heartbeat = Date.now(); if (event.lastEventId) cursor = event.lastEventId; });
      source.addEventListener("checkpoint", (event: MessageEvent) => { if (event.lastEventId) cursor = event.lastEventId; });
      source.addEventListener("unauthorized", () => { source?.close(); location.assign("/login/"); });
      source.addEventListener("change", (event: MessageEvent) => {
        heartbeat = Date.now(); if (cursor && BigInt(event.lastEventId) <= BigInt(cursor)) return; cursor = event.lastEventId;
        const change = JSON.parse(event.data) as { entityType: string; createdAt: string };
        useLabStore.setState({ updatedAt: change.createdAt });
        void refresh(change.entityType).catch(() => useLabStore.setState({ error: "Мэдээлэл шинэчилж чадсангүй. Дахин холбогдож байна." }));
        void refresh("activity").catch(() => {}); window.dispatchEvent(new CustomEvent("laboratory:change", { detail: change }));
      });
      source.onerror = () => { source?.close(); useLabStore.setState({ connection: navigator.onLine ? "RECONNECTING" : "OFFLINE" }); timer = setTimeout(connect, Math.min(30000, 1000 * 2 ** Math.min(attempt++, 5))); };
    };
    const offline = () => { source?.close(); clearTimeout(timer); useLabStore.setState({ connection: "OFFLINE" }); };
    const focus = () => { if (Date.now() - heartbeat > 30000) connect(); };
    const watchdog = setInterval(focus, 15000);
    window.addEventListener("online", connect); window.addEventListener("offline", offline); window.addEventListener("focus", focus); connect();
    return () => { disposed = true; clearTimeout(timer); clearInterval(watchdog); source?.close(); window.removeEventListener("online", connect); window.removeEventListener("offline", offline); window.removeEventListener("focus", focus); };
  }, []);
  return children;
}
