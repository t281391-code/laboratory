import type { SampleProduct } from "./sample-products";

export type SampleStatus =
  | "Бүртгэсэн"
  | "Бэхжүүлж байгаа"
  | "Туршилтад бэлэн"
  | "Туршсан"
  | "Хянаж байгаа"
  | "Баталгаажсан"
  | "Хугацаа хэтэрсэн";
export type ResultState = "pass" | "warning" | "fail";
export type FormKind =
  "environment" | "fresh" | "compression" | "sand" | "aggregate" | "cement";
export type FormValues = Record<string, string>;
export interface Sample {
  id: string;
  code: string;
  material: string;
  grade: string;
  project: string;
  element: string;
  castingDate: string;
  registeredDate: string;
  age: number;
  count: number;
  product?: SampleProduct;
  track1Count?: number;
  track2Count?: number;
  track3Count?: number;
  companyPlannedDate?: string | null;
  status: SampleStatus;
  technician: string;
  photos: string[];
}
export interface TestRecord {
  id: string;
  kind: FormKind;
  sampleCode: string;
  date: string;
  values: FormValues;
  result: number;
  state: ResultState;
  approved: boolean;
  technician: string;
  photos: string[];
}
export interface Equipment {
  version?: number;
  date?: string;
  healthStatus?: string;
  failureInfo?: string;
  maintenanceInfo?: string;
  notes?: string;
  latestMeasurementAt?: string | null;
  readings?: { id: string; value: string; unit: string; measuredAt: string }[];
  maintenance?: { id: string; description: string; performedAt: string }[];
  id: string;
  name: string;
  model: string;
  serial: string;
  kind: "press" | "oven" | "scale" | "sieve" | "meter" | "cone";
  status: "Бэлэн" | "Үзлэг шаардлагатай" | "Засварт";
  lastInspection: string;
  nextInspection: string;
  calibrationDate: string;
  technician: string;
  purpose: string;
  specimens: string;
  tools: string;
  form: FormKind;
  steps: { title: string; description: string }[];
}
export interface Standard {
  id: string;
  number: string;
  title: string;
  material: string;
  equipment: string;
  equipmentId: string;
  form: FormKind;
  size: string;
  condition: string;
  formula: string;
  steps: string[];
}
export interface Notification {
  id: string;
  title: string;
  description: string;
  href: string;
  read: boolean;
}
