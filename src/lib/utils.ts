import type { ResultState } from "./types";
export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export const TODAY = today();
export const formatTimestamp = (value?: string | null) => value ? new Intl.DateTimeFormat("mn-MN", { timeZone: "Asia/Ulaanbaatar", dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";
export const dayOffset = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
export const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
export const formatDate = (date: string) =>
  date ? date.replaceAll("-", ".") : "—";
export const shortDate = (date: string) => date.slice(5).replace("-", ".");
export const uid = () => crypto.randomUUID();
export const strength = (loadKN: number, widthMM: number, lengthMM: number) =>
  widthMM > 0 && lengthMM > 0 ? (loadKN * 1000) / (widthMM * lengthMM) : 0;
export const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
export const gradeTarget = (grade: string) => (grade === "M600" ? 58.8 : 39.2);
export const resultState = (value: number, target: number): ResultState =>
  value >= target ? "pass" : value >= target * 0.9 ? "warning" : "fail";
export const stateLabel = {
  pass: "Хангасан",
  warning: "Анхаарах",
  fail: "Хангаагүй",
};
export const formNames = {
  environment: "Лабораторийн орчны бүртгэл",
  fresh: "Шинэ бетоны үзлэг",
  compression: "Бетоны шахалтын бат бэх",
  sand: "Элсний шинжилгээ",
  aggregate: "Хайрга, дайрганы шинжилгээ",
  cement: "Цементийн шинжилгээ",
};
export const formCodes = {
  environment: "Матл-03",
  fresh: "Матл-13",
  compression: "Матл-17",
  sand: "Матл-21",
  aggregate: "Матл-22",
  cement: "Матл-25",
};
