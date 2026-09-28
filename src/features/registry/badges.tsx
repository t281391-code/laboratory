"use client";
import { conclusionLabels, conclusionTone, statusTone, type Conclusion, type RecordStatus } from "@/lib/registry";

/** Green = Тэнцсэн, red = Тэнцээгүй, orange = Нөхцөлтэй, gray = Үнэлээгүй. Item conclusions are a subset of the same values. */
export function ConclusionBadge({ value }: { value: Conclusion }) {
  return <span className={`status ${conclusionTone[value]}`}><span />{conclusionLabels[value]}</span>;
}
export function RecordStatusBadge({ status }: { status: RecordStatus }) {
  return <span className={`status reg-status reg-${statusTone[status]}`}><span />{status}</span>;
}
export function FlagBadge({ tone, children }: { tone: "green" | "amber" | "neutral"; children: string }) {
  return <span className={`status ${tone}`}><span />{children}</span>;
}
