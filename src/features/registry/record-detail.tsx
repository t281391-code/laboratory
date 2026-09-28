"use client";
import { useEffect, useState } from "react";
import { Box, Check, CheckCircle2, Clock3, FlaskConical, Pencil, Plus, Printer, RotateCcw, Send, Trash2 } from "lucide-react";
import { ConfirmDialog, EmptyState, Modal, SectionHeading, useUI } from "@/components/ui";
import { useLabStore } from "@/lib/store";
import {
  activeResults, auditActionLabels, canEditRecord, canEditResult, canManageCompletion, conclusionLabels, fieldLabels, isSent, recordOutcome,
  responseDays, versionLabel, type Conclusion, type HistoryEntry, type LabResultDto, type SampleRecordDto,
} from "@/lib/registry";
import { formatDate, formatTimestamp } from "@/lib/utils";
import { AttachmentList } from "./attachments";
import { ConclusionBadge, FlagBadge, RecordStatusBadge } from "./badges";
import { recordFacts } from "./brief";
import { registryApi, useRegistryStore } from "./store";

export type DetailTab = "info" | "results" | "history";
const tabs: [DetailTab, string][] = [["info", "Дээжийн мэдээлэл"], ["results", "Лабораторийн хариу"], ["history", "Өөрчлөлтийн түүх"]];
const fail = (error: unknown) => useUI.getState().notify(error instanceof Error ? error.message : "Үйлдэл амжилтгүй боллоо.");

function Progress({ record }: { record: SampleRecordDto }) {
  const active = activeResults(record), first = active.map((r) => r.receivedDate).sort()[0];
  const days = responseDays(record);
  const steps = [
    { title: "Бүртгэсэн", note: formatDate(record.registeredDate), state: "done" },
    { title: "Лабораторид илгээсэн", note: isSent(record.status) ? `${record.submittedLaboratory} · ${formatDate(record.sentDate ?? "")}` : "Илгээгээгүй", state: isSent(record.status) ? "done" : "current" },
    { title: "Хариу авсан", note: first ? `${formatDate(first)}${days !== null ? ` · ${days} хоногийн дараа` : ""}` : isSent(record.status) ? "Хариу хүлээж байна" : "—", state: record.status === "Хариу авсан" ? "done" : isSent(record.status) ? "current" : "" },
  ];
  return (
    <ol className="reg-steps">
      {steps.map((step) => (
        <li className={step.state} key={step.title}>
          <span>{step.state === "done" ? <Check size={14} /> : <Clock3 size={14} />}</span>
          <strong>{step.title}</strong><small>{step.note}</small>
        </li>
      ))}
    </ol>
  );
}

function ResultCard({ record, result, onEdit, onPrint }: { record: SampleRecordDto; result: LabResultDto; onEdit: () => void; onPrint: () => void }) {
  const user = useLabStore((s) => s.user);
  const [confirming, setConfirming] = useState(false);
  const editable = !!user && canEditResult(user, result), admin = !!user && canManageCompletion(user);
  const toggle = (complete: boolean) => registryApi.setCompletion(result.id, result.version, complete)
    .then(() => useUI.getState().notify(complete ? "Хариу бүрэн дууссан гэж тэмдэглэгдлээ" : "Хариу дахин нээгдлээ")).catch(fail);
  return (
    <article className={`reg-result-card ${result.isActive ? "" : "inactive"}`}>
      <header>
        <div><strong>{versionLabel(record, result)}</strong><span>Хариу № {result.reportNumber}</span></div>
        <div className="reg-badges">
          <ConclusionBadge value={result.conclusion} />
          <FlagBadge tone={result.isComplete ? "green" : "amber"}>{result.isComplete ? "Бүрэн дууссан" : "Хэсэгчилсэн"}</FlagBadge>
          {!result.isActive && <FlagBadge tone="neutral">Идэвхгүй</FlagBadge>}
        </div>
      </header>
      <dl className="reg-facts">
        {([
          ["Хариу өгсөн лаборатори", result.resultLaboratory], ["Хариу авсан огноо", formatDate(result.receivedDate)], ["Шинжилгээ хийсэн ажилтан", result.testedBy],
          ["Оруулсан", `${result.createdByName} · ${formatTimestamp(result.createdAt)}`], ["Сүүлд засварласан", `${result.updatedByName} · ${formatTimestamp(result.updatedAt)}`],
          ["Дууссан огноо", result.completedAt ? formatTimestamp(result.completedAt) : "—"],
        ] as [string, string][]).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <div className="table-scroll">
        <table className="reg-result-table">
          <thead><tr><th>№</th><th>Үзүүлэлт</th><th>Үр дүн</th><th>Нэгж</th><th>Стандартын шаардлага</th><th>Туршилтын стандарт</th><th>Дүгнэлт</th><th>Тайлбар</th></tr></thead>
          <tbody>
            {result.items.map((item, i) => (
              <tr key={item.id}>
                <td>{i + 1}</td><td><strong>{item.testName}</strong></td><td className="mono">{item.resultValue || "—"}</td><td>{item.unit || "—"}</td>
                <td>{item.standardRequirement || "—"}</td><td>{item.testStandard || "—"}</td>
                <td><ConclusionBadge value={item.itemConclusion} /></td><td>{item.notes || "—"}</td>
              </tr>
            ))}
            {!result.items.length && <tr><td colSpan={8} className="reg-items-empty">Үзүүлэлт бүртгэгдээгүй.</td></tr>}
          </tbody>
        </table>
      </div>
      {result.notes && <p className="reg-notes"><b>Нэмэлт тайлбар:</b> {result.notes}</p>}
      <div className="reg-attachments-block"><h4>Хавсралт ({result.attachments.length})</h4><AttachmentList attachments={result.attachments} canRemove={editable} /></div>
      <footer className="reg-card-actions">
        {editable && <button className="button secondary small" onClick={onEdit}><Pencil size={14} />Засах</button>}
        {admin && result.isActive && !result.isComplete && <button className="button secondary small" onClick={() => toggle(true)}><CheckCircle2 size={14} />Дуусгах</button>}
        {admin && result.isActive && result.isComplete && <button className="button secondary small" onClick={() => toggle(false)}><RotateCcw size={14} />Дахин нээх</button>}
        <button className="button secondary small" onClick={onPrint}><Printer size={14} />Тайлан хэвлэх</button>
        {admin && result.isActive && <button className="button secondary small reg-danger" onClick={() => setConfirming(true)}><Trash2 size={14} />Идэвхгүй болгох</button>}
      </footer>
      {confirming && (
        <ConfirmDialog
          title="Хариуг идэвхгүй болгох"
          description="Хариу тоологдохоо болиж, дээжийн төлөв өмнөх байдалд нь буцна. Хариу устахгүй бөгөөд өөрчлөлтийн түүхэнд хадгалагдана."
          onClose={() => setConfirming(false)}
          onConfirm={() => { registryApi.deactivateResult(result.id, result.version).then(() => useUI.getState().notify("Хариу идэвхгүй болгогдлоо")).catch(fail); }}
        />
      )}
    </article>
  );
}

const show = (key: string, value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Тийм" : "Үгүй";
  if (key === "conclusion" && typeof value === "string" && value in conclusionLabels) return conclusionLabels[value as Conclusion];
  if (/Date$/.test(key) && typeof value === "string") return formatDate(value);
  return String(value);
};
function changes(entry: HistoryEntry) {
  const before = entry.before ?? {}, after = entry.after ?? {};
  const rows: { label: string; from?: string; to: string }[] = [];
  if (entry.action === "ATTACHMENT_REMOVE") {
    const file = before.attachment as { name?: string } | undefined;
    return file?.name ? [{ label: "Файл", to: file.name }] : rows;
  }
  const keys = entry.action === "CREATE"
    ? (entry.entityType === "laboratoryResults" ? ["reportNumber", "resultLaboratory", "conclusion", "isComplete"] : ["code", "project", "material", "status"])
    : Object.keys(fieldLabels).filter((key) => key !== "items" && key !== "attachments");
  for (const key of keys) {
    if (!(key in after) && !(key in before)) continue;
    if (entry.action !== "CREATE" && JSON.stringify(before[key]) === JSON.stringify(after[key])) continue;
    rows.push({ label: fieldLabels[key], from: entry.action === "CREATE" ? undefined : show(key, before[key]), to: show(key, after[key]) });
  }
  if (entry.action === "UPDATE" && Array.isArray(before.items) && Array.isArray(after.items) && JSON.stringify(before.items) !== JSON.stringify(after.items))
    rows.push({ label: fieldLabels.items, from: `${before.items.length} мөр`, to: `${after.items.length} мөр` });
  if (entry.action === "UPDATE" && Array.isArray(before.attachments) && Array.isArray(after.attachments) && before.attachments.length !== after.attachments.length)
    rows.push({ label: fieldLabels.attachments, from: `${before.attachments.length} файл`, to: `${after.attachments.length} файл` });
  return rows;
}
function HistoryTab({ record }: { record: SampleRecordDto }) {
  const signature = `${record.version}|${record.results.map((r) => `${r.id}:${r.version}:${r.updatedAt}:${r.attachments.length}`).join(",")}`;
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    registryApi.history(record.id)
      .then((rows) => { if (active) { setEntries(rows); setError(""); } })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Түүх ачаалж чадсангүй."); });
    return () => { active = false; };
  }, [record.id, signature]);
  if (error) return <p className="field-error" role="alert">{error}</p>;
  if (!entries) return <div className="loading-state" role="status"><span className="loading-spinner" />Түүх ачаалж байна...</div>;
  if (!entries.length) return <EmptyState title="Өөрчлөлтийн түүх алга" description="Энэ бүртгэлд хийгдсэн үйлдэл олдсонгүй." />;
  return (
    <ol className="reg-history">
      {entries.map((entry) => {
        const index = entry.entityType === "laboratoryResults" ? record.results.findIndex((r) => r.id === entry.entityId) : -1;
        return (
          <li key={entry.id}>
            <span className="reg-history-dot" data-action={entry.action} />
            <div>
              <header><strong>{auditActionLabels[entry.action] ?? entry.action}</strong><span>{entry.entityType === "laboratoryResults" ? (index >= 0 ? `Хувилбар ${index + 1}` : "Хариу") : "Дээж"}</span></header>
              <small>{entry.userName} · {formatTimestamp(entry.createdAt)}</small>
              {changes(entry).length > 0 && (
                <ul>{changes(entry).map((c) => <li key={c.label}><b>{c.label}:</b> {c.from !== undefined && <><s>{c.from}</s> → </>}{c.to}</li>)}</ul>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function RecordDetail({ recordId, tab, onTab, onClose, onEdit, onSend, onResult, onPrint }: {
  recordId: string; tab: DetailTab; onTab: (tab: DetailTab) => void; onClose: () => void;
  onEdit: (record: SampleRecordDto) => void; onSend: (record: SampleRecordDto) => void;
  onResult: (recordId: string, resultId?: string) => void; onPrint: (recordId: string, resultId?: string) => void;
}) {
  const record = useRegistryStore((s) => s.records.find((r) => r.id === recordId));
  const user = useLabStore((s) => s.user);
  const [deactivating, setDeactivating] = useState(false);
  if (!record) return null;
  const sent = isSent(record.status), mine = !!user && canEditRecord(user, record), admin = !!user && canManageCompletion(user);
  const outcome = recordOutcome(record);
  return (
    <Modal title="Дээжийн бүртгэл" drawer className="reg-detail" onClose={onClose}>
      <div className="detail-hero">
        <span className="detail-icon"><Box size={28} /></span>
        <div>
          <div className="eyebrow">{record.material}</div>
          <h2>{record.code}</h2>
          <p>{record.project}</p>
        </div>
        <RecordStatusBadge status={record.status} />
      </div>
      <div className="reg-detail-actions">
        <button className="button primary small" disabled={!sent} title={sent ? undefined : "Дээжийг лабораторид илгээсний дараа хариу оруулна"} onClick={() => onResult(record.id)}><Plus size={14} />Хариу оруулах</button>
        {!sent && mine && <button className="button secondary small" onClick={() => onSend(record)}><Send size={14} />Лабораторид илгээх</button>}
        {mine && <button className="button secondary small" onClick={() => onEdit(record)}><Pencil size={14} />Засах</button>}
        <button className="button secondary small" onClick={() => onPrint(record.id)}><Printer size={14} />Хэвлэх</button>
        {admin && !activeResults(record).length && <button className="button secondary small reg-danger" onClick={() => setDeactivating(true)}><Trash2 size={14} />Идэвхгүй болгох</button>}
      </div>
      <div className="tabs" role="tablist">
        {tabs.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? "active" : ""} onClick={() => onTab(key)}>{label}</button>
        ))}
      </div>
      {tab === "info" && (
        <>
          <SectionHeading title="Ерөнхий мэдээлэл" />
          <dl className="detail-grid">
            {[["Дээжийн нэр", record.description], ...recordFacts(record), ["Нийт дүгнэлт", outcome ? conclusionLabels[outcome] : "Хариу ороогүй"], ["Бүртгэсэн хэрэглэгч", `${record.createdByName} · ${formatTimestamp(record.createdAt)}`], ["Сүүлд шинэчилсэн", `${record.updatedByName} · ${formatTimestamp(record.updatedAt)}`]].map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
          {record.notes && <p className="reg-notes"><b>Тайлбар:</b> {record.notes}</p>}
          <SectionHeading title="Явц" subtitle="Бүртгэлээс хариу авах хүртэлх шат" />
          <Progress record={record} />
        </>
      )}
      {tab === "results" && (
        <>
          <SectionHeading
            title={`Лабораторийн хариу (${activeResults(record).length})`}
            subtitle="Бүх хувилбар, үзүүлэлт, дүгнэлт, хавсралтыг оруулсан хэрэглэгч, цагийн хамт харуулна."
            action={<button className="button primary small" disabled={!sent} onClick={() => onResult(record.id)}><Plus size={14} />Хариу оруулах</button>}
          />
          {record.results.length ? (
            <div className="reg-results">
              {record.results.map((result) => <ResultCard key={result.id} record={record} result={result} onEdit={() => onResult(record.id, result.id)} onPrint={() => onPrint(record.id, result.id)} />)}
            </div>
          ) : (
            <EmptyState title="Лабораторийн хариу оруулаагүй" description={sent ? "Лабораторийн хариу ирмэгц «Хариу оруулах» товчийг дарна уу." : "Эхлээд дээжийг лабораторид илгээнэ үү."}>
              {sent ? null : mine && <button className="button primary small" onClick={() => onSend(record)}><FlaskConical size={14} />Лабораторид илгээх</button>}
            </EmptyState>
          )}
        </>
      )}
      {tab === "history" && <><SectionHeading title="Өөрчлөлтийн түүх" subtitle="Бүртгэл, хариу, хавсралт, төлөвийн бүх өөрчлөлт." /><HistoryTab record={record} /></>}
      {deactivating && (
        <ConfirmDialog
          title="Дээжийн бүртгэлийг идэвхгүй болгох"
          description={`${record.code} бүртгэлийг жагсаалтаас хасах уу? Үйлдэл өөрчлөлтийн түүхэнд хадгалагдана.`}
          onClose={() => setDeactivating(false)}
          onConfirm={() => { registryApi.deactivate(record.id, record.version).then(() => { useUI.getState().notify("Дээжийн бүртгэл идэвхгүй болгогдлоо"); onClose(); }).catch(fail); }}
        />
      )}
    </Modal>
  );
}
