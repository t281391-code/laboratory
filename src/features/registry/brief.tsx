"use client";
import { activeResults, type SampleRecordDto } from "@/lib/registry";
import { formatDate } from "@/lib/utils";
import { RecordStatusBadge } from "./badges";

export const recordFacts = (record: SampleRecordDto): [string, string][] => [
  ["Материал", record.material],
  ["Төсөл, объект", record.project],
  ["Авсан байршил", record.location],
  ["Хэмжээ", `${record.quantity} ${record.unit}`],
  ["Дээж авсан огноо", formatDate(record.sampledDate)],
  ["Дээж авсан ажилтан", record.sampledBy],
  ["Илгээсэн лаборатори", record.submittedLaboratory ?? "—"],
  ["Илгээсэн огноо", formatDate(record.sentDate ?? "")],
  ["Бүртгэсэн огноо", formatDate(record.registeredDate)],
  ...(record.sourceSampleId ? [["Компани руу явахаар товлосон огноо", record.companyPlannedDate ? formatDate(record.companyPlannedDate) : "Товлоогүй"] as [string, string]] : []),
];

/** Original sample information, pinned at the top of the result drawer. */
export function SampleBrief({ record }: { record: SampleRecordDto }) {
  return (
    <section className="reg-hud reg-brief" aria-label="Эх дээжийн мэдээлэл">
      <header className="reg-hud-head"><code>01</code>Эх дээжийн мэдээлэл<RecordStatusBadge status={record.status} /></header>
      <div className="reg-brief-main">
        <small>ДЭЭЖИЙН КОД</small>
        <strong>{record.code}</strong>
        <span>{record.description}</span>
        <em>{activeResults(record).length} хариу бүртгэгдсэн</em>
      </div>
      <dl className="reg-facts">
        {recordFacts(record).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
    </section>
  );
}
