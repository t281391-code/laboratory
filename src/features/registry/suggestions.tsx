"use client";
import { useMemo } from "react";
import { useRegistryStore } from "./store";

const uniq = (values: string[], seed: string[] = []) => [...new Set([...seed, ...values.filter(Boolean)])].sort((a, b) => a.localeCompare(b, "mn"));

/** Datalists shared by every registry form. Different materials need different tests, so previously used names are offered but never enforced. */
export function SuggestionLists() {
  const records = useRegistryStore((s) => s.records);
  const lists = useMemo(() => {
    const items = records.flatMap((r) => r.results.flatMap((x) => x.items));
    return {
      "reg-materials": uniq(records.map((r) => r.material), ["Бетон", "Цемент", "Элс", "Дайрга", "Арматур", "Тоосго", "Хөрс", "Асфальт", "Ус"]),
      "reg-labs": uniq(records.flatMap((r) => [r.submittedLaboratory ?? "", ...r.results.map((x) => x.resultLaboratory)])),
      "reg-units": uniq(records.map((r) => r.unit), ["ширхэг", "кг", "тн", "м³", "литр"]),
      "reg-staff": uniq(records.flatMap((r) => [r.sampledBy, ...r.results.map((x) => x.testedBy)])),
      "reg-tests": uniq(items.map((i) => i.testName)),
      "reg-item-units": uniq(items.map((i) => i.unit), ["МПа", "%", "мм", "кг/м³", "г/см³", "мин", "°C"]),
      "reg-standards": uniq(items.map((i) => i.testStandard)),
    };
  }, [records]);
  return (
    <>
      {Object.entries(lists).map(([id, values]) => (
        <datalist id={id} key={id}>{values.map((value) => <option value={value} key={value} />)}</datalist>
      ))}
    </>
  );
}
