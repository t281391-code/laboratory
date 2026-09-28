"use client";
import { useLabStore } from "@/lib/store";
import { useProductModuleStore } from "@/features/forms/product-module-state";
import { formatTimestamp } from "@/lib/utils";
export function useTelemetry() {
  const tests = useLabStore(s => s.tests);
  const records = useProductModuleStore(s => s.records);
  const series = [
    ...tests.filter(t => t.kind === "fresh").map(t => ({ id: t.id, timestamp: `${t.date}T${t.values.testTime || "00:00"}:00+08:00`, values: t.values })),
    ...(records.trials ?? []).map(t => ({ id: t.id, timestamp: `${t.date}T${t.time || "00:00"}:00+08:00`, values: { concreteTemp: String(t.concreteTemperature ?? ""), ambientTemp: String(t.airTemperature ?? ""), flow: String(t.spread ?? ""), air: String(t.airContent ?? "") } as Record<string, string> })),
  ].sort((a,b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  return [
    { label: "Бетоны температур", key: "concreteTemp", unit: "°C" },
    { label: "Орчны температур", key: "ambientTemp", unit: "°C" },
    { label: "Тархалт", key: "flow", unit: "мм" },
    { label: "Агаарын агууламж", key: "air", unit: "%" },
  ].map(definition => {
    const entries = series.filter(r => r.values[definition.key] !== "" && r.values[definition.key] !== undefined);
    const latest = entries.at(-1), previous = entries.at(-2);
    const value = latest?.values[definition.key] ?? "—";
    const change = latest && previous ? Number(value) - Number(previous.values[definition.key]) : null;
    return { ...definition, value, timestamp: latest?.timestamp, updated: formatTimestamp(latest?.timestamp), previous: previous?.values[definition.key] ?? "—", change, trend: entries.slice(-24).map(e => Number(e.values[definition.key])) };
  });
}
