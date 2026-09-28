export const writableKeys: Record<string, string[]> = {
  samples: ["code", "material", "grade", "project", "element", "castingDate", "registeredDate", "age", "count", "product", "track1Count", "track2Count", "track3Count", "companyPlannedDate", "status", "technician", "photos"],
  tests: ["kind", "sampleCode", "date", "values", "photos", "approved"],
  sleepers: ["date", "track", "temperature", "notes", "rows"],
  trials: ["date", "number", "spread", "concreteTemperature", "airTemperature", "airContent", "time"],
  compositions: ["date", "time", "rows"],
  batches: ["date", "product", "rows"],
  equipment: ["date", "name", "model", "serial", "kind", "status", "healthStatus", "lastInspection", "nextInspection", "calibrationDate", "technician", "purpose", "specimens", "tools", "form", "steps", "failureInfo", "maintenanceInfo", "notes"],
  standards: ["date", "number", "title", "material", "equipment", "equipmentId", "form", "size", "condition", "formula", "steps"],
  checklists: ["date", "key", "checks"],
};
export function writable(module: string, value: object) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => writableKeys[module]?.includes(key)));
}
export type RecordMeta = { id: string; version: number; date: string; createdById: string; updatedById: string; createdAt: string; updatedAt: string };
export type AuthUser = { id: string; fullName: string; username: string; role: "ADMIN" | "USER"; isActive: boolean; createdAt: string };
