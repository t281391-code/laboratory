"use client";
import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Radio } from "lucide-react";
import { useLabStore } from "@/lib/store";
import { summarize, type RegistrySummary } from "@/lib/registry";
import { formatTimestamp } from "@/lib/utils";
import { useRegistryStore } from "./store";

export type RegistryFilter = { status?: string; conclusion?: string };
type Tile = { key: string; label: string; value: string; unit?: string; tone: "green" | "amber" | "red" | "blue" | "neutral"; filter?: RegistryFilter };

export const useRegistrySummary = () => {
  const records = useRegistryStore((s) => s.records);
  return useMemo(() => summarize(records), [records]);
};
const tiles = (s: RegistrySummary): Tile[] => [
  { key: "received", label: "Хариу авсан дээж", value: String(s.received), tone: "green", filter: { status: "Хариу авсан" } },
  { key: "pending", label: "Хариу хүлээгдэж буй", value: String(s.pending), tone: "blue", filter: { status: "Лабораторид илгээсэн" } },
  { key: "passed", label: "Тэнцсэн", value: String(s.passed), tone: "green", filter: { conclusion: "PASS" } },
  { key: "failed", label: "Тэнцээгүй", value: String(s.failed), tone: "red", filter: { conclusion: "FAIL" } },
  { key: "partial", label: "Хэсэгчилсэн хариу", value: String(s.partial), tone: "amber", filter: { status: "Хариу хэсэгчлэн авсан" } },
  { key: "days", label: "Дундаж хариу ирэх хоног", value: s.averageDays === null ? "—" : s.averageDays.toFixed(1), unit: s.averageDays === null ? undefined : "хоног", tone: "neutral" },
];
/** A tile is active only when the table filter is exactly that tile's filter (tiles clear the other dimension). */
const isActive = (filter: RegistryFilter | undefined, current: RegistryFilter) =>
  !!filter && (filter.status ?? "") === (current.status ?? "") && (filter.conclusion ?? "") === (current.conclusion ?? "");

export function LiveIndicator() {
  const connection = useLabStore((s) => s.connection);
  const updatedAt = useLabStore((s) => s.updatedAt);
  return (
    <span className="reg-live" title="Өөрчлөлт бүр бусад холбогдсон хөтөч рүү шууд дамжина">
      <i className={`hud-led ${connection === "LIVE" ? "" : connection === "RECONNECTING" ? "orange" : "red"}`} />
      {connection === "LIVE" ? "БОДИТ ЦАГТ" : connection === "RECONNECTING" ? "ДАХИН ХОЛБОГДОЖ БАЙНА" : "ХОЛБОЛТГҮЙ"}
      {updatedAt && <small>Сүүлд: {formatTimestamp(updatedAt)}</small>}
    </span>
  );
}

/** KPI tiles. On the registry page a click filters the table; elsewhere it links to the registry. */
export function RegistryKpis({ current, onSelect }: { current: RegistryFilter; onSelect: (filter: RegistryFilter) => void }) {
  const summary = useRegistrySummary();
  return (
    <div className="reg-kpis" role="group" aria-label="Хариуны бодит цагийн үзүүлэлт">
      {tiles(summary).map((tile) => (
        <button
          key={tile.key}
          type="button"
          className={`reg-kpi ${isActive(tile.filter, current) ? "active" : ""}`}
          data-tone={tile.tone}
          aria-pressed={isActive(tile.filter, current)}
          disabled={!tile.filter}
          onClick={() => tile.filter && onSelect(isActive(tile.filter, current) ? {} : tile.filter)}
        >
          <span className="reg-kpi-label"><i className="hud-led" />{tile.label}</span>
          <strong key={tile.value} className="reg-num">{tile.value}{tile.unit && <small>{tile.unit}</small>}</strong>
        </button>
      ))}
    </div>
  );
}

const pipeline = [
  { key: "registered", label: "Бүртгэсэн", tone: "neutral" },
  { key: "pending", label: "Лабораторид илгээсэн", tone: "blue" },
  { key: "partial", label: "Хариу хэсэгчлэн авсан", tone: "amber" },
  { key: "received", label: "Хариу авсан", tone: "green" },
] as const;
const outcomes = [
  { key: "passed", label: "Тэнцсэн", color: "var(--green)" },
  { key: "conditional", label: "Нөхцөлтэй", color: "var(--orange)" },
  { key: "failed", label: "Тэнцээгүй", color: "var(--red)" },
  { key: "notEvaluated", label: "Үнэлээгүй", color: "#8294a3" },
] as const;

export function StatusPipeline({ summary }: { summary: RegistrySummary }) {
  const max = Math.max(1, summary.total);
  return (
    <div className="reg-pipeline" role="img" aria-label="Дээжийн төлөвийн тархалт">
      {pipeline.map((row) => (
        <div className="reg-pipe-row" key={row.key}>
          <span>{row.label}</span>
          <span className="reg-pipe-track"><span className="reg-pipe-fill" data-tone={row.tone} style={{ width: `${(summary[row.key] / max) * 100}%` }} /></span>
          <b>{summary[row.key]}</b>
        </div>
      ))}
    </div>
  );
}
export function OutcomeDonut({ summary }: { summary: RegistrySummary }) {
  const total = outcomes.reduce((sum, o) => sum + summary[o.key], 0);
  const radius = 38, circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="reg-donut-wrap">
      <svg className="reg-donut" viewBox="0 0 100 100" role="img" aria-label="Дүгнэлтийн тархалт">
        <circle cx="50" cy="50" r={radius} className="reg-donut-track" />
        {outcomes.map((o) => {
          const length = total ? (summary[o.key] / total) * circumference : 0;
          const segment = <circle key={o.key} cx="50" cy="50" r={radius} fill="none" stroke={o.color} strokeWidth="9" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} transform="rotate(-90 50 50)" className="reg-donut-seg" />;
          offset += length;
          return segment;
        })}
        <text x="50" y="49" textAnchor="middle" className="reg-donut-value">{total}</text>
        <text x="50" y="60" textAnchor="middle" className="reg-donut-caption">хариутай</text>
      </svg>
      <ul className="reg-legend">
        {outcomes.map((o) => <li key={o.key}><i style={{ background: o.color }} />{o.label}<b>{summary[o.key]}</b></li>)}
      </ul>
    </div>
  );
}

export function RegistryGraphics() {
  const summary = useRegistrySummary();
  return (
    <div className="reg-graphics">
      <section className="reg-hud">
        <header className="reg-hud-head"><code>A1</code>Төлөвийн урсгал<LiveIndicator /></header>
        <StatusPipeline summary={summary} />
      </section>
      <section className="reg-hud">
        <header className="reg-hud-head"><code>A2</code>Дүгнэлтийн харьцаа</header>
        <OutcomeDonut summary={summary} />
      </section>
    </div>
  );
}

/** Compact panel for the main command center; every value comes from the same live store as the registry page. */
export function RegistryCompact() {
  const summary = useRegistrySummary();
  return (
    <div className="reg-compact">
      <div className="reg-compact-grid">
        {tiles(summary).map((tile) => (
          <Link
            key={tile.key}
            className="reg-compact-tile"
            data-tone={tile.tone}
            href={tile.filter ? `/sample-registry/?${tile.filter.status ? `status=${encodeURIComponent(tile.filter.status)}` : `conclusion=${tile.filter.conclusion}`}` : "/sample-registry/"}
          >
            <span>{tile.label}</span>
            <strong key={tile.value} className="reg-num">{tile.value}{tile.unit && <small>{tile.unit}</small>}</strong>
          </Link>
        ))}
      </div>
      <StatusPipeline summary={summary} />
      <div className="hud-list-caption"><span><Radio size={10} /> НИЙТ {summary.total} ДЭЭЖ</span><Link href="/sample-registry/">Дэлгэрэнгүй <ArrowRight size={10} /></Link></div>
    </div>
  );
}
