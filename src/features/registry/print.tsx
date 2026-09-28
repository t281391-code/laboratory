"use client";
import { Printer } from "lucide-react";
import { Modal } from "@/components/ui";
import { DocumentBrand } from "@/features/reports/report-record";
import { activeResults, conclusionLabels, itemConclusionLabels, recordOutcome, versionLabel, type LabResultDto, type SampleRecordDto } from "@/lib/registry";
import { formatDate, formatTimestamp } from "@/lib/utils";
import { RecordStatusBadge } from "./badges";
import { recordFacts } from "./brief";

function MetaGrid({ rows }: { rows: [string, string][] }) {
  return (
    <div className="document-meta reg-print-meta">
      {rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || "—"}</strong></div>)}
    </div>
  );
}
function ItemsTable({ result }: { result: LabResultDto }) {
  return (
    <table className="print-table reg-print-table">
      <thead>
        <tr><th>№</th><th>Үзүүлэлт</th><th>Үр дүн</th><th>Нэгж</th><th>Стандартын шаардлага</th><th>Туршилтын стандарт</th><th>Дүгнэлт</th><th>Тайлбар</th></tr>
      </thead>
      <tbody>
        {result.items.map((item, i) => (
          <tr key={item.id}>
            <td>{i + 1}</td><td><strong>{item.testName}</strong></td><td>{item.resultValue || "—"}</td><td>{item.unit || "—"}</td>
            <td>{item.standardRequirement || "—"}</td><td>{item.testStandard || "—"}</td><td>{itemConclusionLabels[item.itemConclusion]}</td><td>{item.notes || "—"}</td>
          </tr>
        ))}
        {!result.items.length && <tr><td colSpan={8} className="report-empty">Үзүүлэлт бүртгэгдээгүй.</td></tr>}
      </tbody>
    </table>
  );
}
const resultFacts = (record: SampleRecordDto, result: LabResultDto): [string, string][] => [
  ["Хариуны дугаар", result.reportNumber], ["Хариу өгсөн лаборатори", result.resultLaboratory],
  ["Хариу авсан огноо", formatDate(result.receivedDate)], ["Шинжилгээ хийсэн ажилтан", result.testedBy],
  ["Ерөнхий дүгнэлт", conclusionLabels[result.conclusion]], ["Хариуны байдал", result.isComplete ? "Бүрэн дууссан" : "Хэсэгчилсэн"],
  ["Хувилбар", versionLabel(record, result)], ["Оруулсан", `${result.createdByName} · ${formatTimestamp(result.createdAt)}`],
];

/** Individual laboratory-result report: original sample, both laboratories, report number, every measurement, dates and notes. */
function ResultReport({ record, result }: { record: SampleRecordDto; result: LabResultDto }) {
  return (
    <article className="print-document record-document">
      <DocumentBrand />
      <div className="document-title">
        <span>ЛАБОРАТОРИЙН ХАРИУНЫ ТАЙЛАН</span>
        <h1>Хариу № {result.reportNumber}</h1>
        <p>{record.code} · {formatDate(result.receivedDate)}</p>
      </div>
      <h2>Эх дээжийн мэдээлэл</h2>
      <MetaGrid rows={[["Дээжийн код", record.code], ["Дээжийн нэр", record.description], ...recordFacts(record)]} />
      <h2>Лабораторийн хариу</h2>
      <MetaGrid rows={resultFacts(record, result)} />
      <h2>Шинжилгээний үзүүлэлтүүд</h2>
      <ItemsTable result={result} />
      {result.notes && <div className="document-summary"><h2>Нэмэлт тайлбар</h2><p>{result.notes}</p></div>}
      {result.attachments.length > 0 && <p className="document-note">Хавсралт: {result.attachments.map((a) => a.name).join(", ")}</p>}
      <div className="document-signatures">
        <div><span>Шинжилгээ хийсэн</span><strong>{result.testedBy}</strong></div>
        <div><span>Бүртгэсэн</span><strong>{result.createdByName}</strong><small>{formatTimestamp(result.createdAt)}</small></div>
      </div>
      <div className="document-footer"><span>Дээжийн бүртгэл · Лабораторийн хариу</span><span>Улаан баатар БҮК Лаборатори</span></div>
    </article>
  );
}

/** Record detail print view: sample information plus every active result version with its measurements. */
function RecordSheet({ record }: { record: SampleRecordDto }) {
  const outcome = recordOutcome(record);
  return (
    <article className="print-document record-document">
      <DocumentBrand />
      <div className="document-title">
        <span>ДЭЭЖИЙН БҮРТГЭЛ · ДЭЛГЭРЭНГҮЙ</span>
        <h1>{record.code}</h1>
        <p>{record.description} · {record.status}</p>
      </div>
      <h2>Дээжийн мэдээлэл</h2>
      <MetaGrid rows={[...recordFacts(record), ["Төлөв", record.status], ["Нийт дүгнэлт", outcome ? conclusionLabels[outcome] : "Хариу ороогүй"]]} />
      {record.notes && <div className="document-summary"><h2>Тайлбар</h2><p>{record.notes}</p></div>}
      <h2>Лабораторийн хариу ({activeResults(record).length})</h2>
      {activeResults(record).map((result) => (
        <section className="reg-print-result" key={result.id}>
          <h3>{versionLabel(record, result)} · № {result.reportNumber}</h3>
          <MetaGrid rows={resultFacts(record, result).filter(([label]) => label !== "Хувилбар")} />
          <ItemsTable result={result} />
          {result.notes && <p className="document-note">Тайлбар: {result.notes}</p>}
          {result.attachments.length > 0 && <p className="document-note">Хавсралт: {result.attachments.map((a) => a.name).join(", ")}</p>}
        </section>
      ))}
      {!activeResults(record).length && <p className="document-note">Лабораторийн хариу бүртгэгдээгүй байна.</p>}
      <div className="document-signatures">
        <div><span>Бүртгэсэн</span><strong>{record.createdByName}</strong><small>{formatTimestamp(record.createdAt)}</small></div>
        <div><span>Сүүлд шинэчилсэн</span><strong>{record.updatedByName}</strong><small>{formatTimestamp(record.updatedAt)}</small></div>
      </div>
      <div className="document-footer"><span>Дээжийн бүртгэл · Хэвлэсэн {formatTimestamp(new Date().toISOString())}</span><span>Улаан баатар БҮК Лаборатори</span></div>
    </article>
  );
}

export function PrintView({ record, result, onClose }: { record: SampleRecordDto; result?: LabResultDto; onClose: () => void }) {
  return (
    <Modal title={result ? "Лабораторийн хариуны тайлан" : "Дээжийн бүртгэл — хэвлэх харагдац"} onClose={onClose} wide>
      <div className="print-toolbar">
        <RecordStatusBadge status={record.status} />
        <div>
          <button className="button secondary small" onClick={() => window.print()}><Printer size={16} />Хэвлэх</button>
        </div>
      </div>
      {result ? <ResultReport record={record} result={result} /> : <RecordSheet record={record} />}
    </Modal>
  );
}
