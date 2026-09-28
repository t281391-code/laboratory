"use client";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownToLine, Box, CalendarDays, ChevronLeft, ChevronRight, Filter, Plus, Search, Send } from "lucide-react";
import { EmptyState, PageHeading, useUI } from "@/components/ui";
import { useLabStore, type Saved } from "@/lib/store";
import type { Sample } from "@/lib/types";
import { activeResults, canEditRecord, conclusionLabels, conclusions, isSent, plannedRegistrySamples, plannedRegistryStatus, recordOutcome, recordStatuses, responseDays, type SampleRecordDto } from "@/lib/registry";
import { formatDate } from "@/lib/utils";
import { ConclusionBadge, RecordStatusBadge } from "./badges";
import { RegistryGraphics, RegistryKpis, type RegistryFilter } from "./dashboard";
import { exportRegistryExcel } from "./export";
import { PrintView } from "./print";
import { RecordDetail, type DetailTab } from "./record-detail";
import { RecordFormModal, SendModal } from "./record-forms";
import { ResultDrawer } from "./result-drawer";
import { useRegistryStore } from "./store";
import { SuggestionLists } from "./suggestions";

const PAGE_SIZE = 8;
type RegistryRow = { kind: "planned"; sample: Saved<Sample> } | { kind: "registered"; record: SampleRecordDto };
const uniq = (values: (string | null | undefined)[]) => [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b, "mn"));
const haystack = (r: SampleRecordDto) => [
  r.code, r.material, r.description, r.project, r.location, r.sampledBy, r.submittedLaboratory, r.status,
  ...r.results.flatMap((x) => [x.reportNumber, x.resultLaboratory, x.testedBy]),
].join(" ").toLowerCase();
const resolveId = (records: SampleRecordDto[], id: string | null) => id ? records.find((r) => r.id === id || r.results.some((x) => x.id === id))?.id ?? null : null;

function RegistryScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const records = useRegistryStore((s) => s.records);
  const error = useRegistryStore((s) => s.error);
  const user = useLabStore((s) => s.user);
  const samples = useLabStore((s) => s.samples);
  const planned = useMemo(() => plannedRegistrySamples(samples, records), [samples, records]);
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [conclusion, setConclusion] = useState(params.get("conclusion") ?? "");
  const [material, setMaterial] = useState("");
  const [laboratory, setLaboratory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<string | null>(() => resolveId(useRegistryStore.getState().records, params.get("id")));
  const [tab, setTab] = useState<DetailTab>("info");
  const [form, setForm] = useState<{ record?: SampleRecordDto; sourceSampleId?: string } | null>(() => params.get("sourceSample") ? { sourceSampleId: params.get("sourceSample")! } : null);
  const [sending, setSending] = useState<string | null>(null);
  const [resulting, setResulting] = useState<{ recordId: string; resultId?: string } | null>(null);
  const [printing, setPrinting] = useState<{ recordId: string; resultId?: string } | null>(null);

  const materials = useMemo(() => uniq([...records.map((r) => r.material), ...planned.map((s) => s.material)]), [records, planned]);
  const laboratories = useMemo(() => uniq(records.flatMap((r) => [r.submittedLaboratory, ...r.results.map((x) => x.resultLaboratory)])), [records]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) =>
      (!q || haystack(r).includes(q)) && (!status || r.status === status) && (!conclusion || recordOutcome(r) === conclusion) && (!material || r.material === material) &&
      (!laboratory || r.submittedLaboratory === laboratory || activeResults(r).some((x) => x.resultLaboratory === laboratory)) &&
      (!from || r.registeredDate >= from) && (!to || r.registeredDate <= to));
  }, [records, search, status, conclusion, material, laboratory, from, to]);
  const filteredPlans = useMemo(() => {
    if (conclusion || laboratory || (status && status !== plannedRegistryStatus)) return [];
    const q = search.trim().toLowerCase();
    return planned.filter((s) =>
      (!q || [s.code, s.material, s.grade, s.project, s.element, s.technician, s.companyPlannedDate, plannedRegistryStatus].join(" ").toLowerCase().includes(q)) &&
      (!material || s.material === material) && (!from || s.companyPlannedDate! >= from) && (!to || s.companyPlannedDate! <= to));
  }, [planned, search, status, conclusion, material, laboratory, from, to]);
  const entries: RegistryRow[] = [
    ...filteredPlans.map((sample) => ({ kind: "planned" as const, sample })),
    ...filtered.map((record) => ({ kind: "registered" as const, record })),
  ];
  const pages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE)), current = Math.min(page, pages);
  const rows = entries.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const find = (id: string | null) => records.find((r) => r.id === id);
  const sendingRecord = find(sending), printRecord = find(printing?.recordId ?? null);
  const printResult = printRecord?.results.find((r) => r.id === printing?.resultId);
  const reset = () => { setSearch(""); setStatus(""); setConclusion(""); setMaterial(""); setLaboratory(""); setFrom(""); setTo(""); setPage(1); };
  const open = (id: string, next: DetailTab = "info") => { setTab(next); setDetail(id); };
  const closeDetail = () => { setDetail(null); if (params.has("id")) router.replace("/sample-registry/"); };
  const filter: RegistryFilter = { ...(status ? { status } : {}), ...(conclusion ? { conclusion } : {}) };

  return (
    <>
      <SuggestionLists />
      <PageHeading
        eyebrow="БАРИЛГА АРХИТЕКТУР КОМПАНИ"
        title="Дээжийн бүртгэл"
        description="Явахаар товлосон дээж огноотойгоо автоматаар харагдана. Ирсэн дээжээ бүртгэж, лабораторийн хариуг хянана."
      >
        <button className="button secondary" disabled={!entries.length} onClick={() => { exportRegistryExcel(filtered, filteredPlans); useUI.getState().notify("Excel файл татагдлаа"); }}>
          <ArrowDownToLine size={17} />Excel татах
        </button>
      </PageHeading>
      {error && (
        <div className="reg-banner warn" role="alert">
          {error}
          <button className="button secondary small" onClick={() => void useRegistryStore.getState().refresh()}>Дахин оролдох</button>
        </div>
      )}
      <RegistryKpis current={filter} onSelect={(next) => { setStatus(next.status ?? ""); setConclusion(next.conclusion ?? ""); setPage(1); }} />
      <RegistryGraphics />
      <section className="panel reg-panel">
        <div className="reg-planned-summary">
          <div><CalendarDays size={20} /><span>Явах огноотой сорьцууд энд автоматаар орж ирнэ.</span></div>
          <button className="button secondary small" aria-pressed={status === plannedRegistryStatus} onClick={() => {
            reset(); setStatus(status === plannedRegistryStatus ? "" : plannedRegistryStatus);
          }}>{plannedRegistryStatus} <strong>{planned.length}</strong></button>
        </div>
        <div className="filter-toolbar">
          <label className="search-input">
            <Search size={18} />
            <input aria-label="Дээж хайх" placeholder="Дээжийн код, төсөл, хариуны дугаар, лаборатори хайх..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </label>
          <div className="filter-count"><Filter size={16} />{entries.length} илэрц</div>
        </div>
        <div className="filters-grid reg-filters">
          <select aria-label="Төлвөөр шүүх" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Бүх төлөв</option>
            <option>{plannedRegistryStatus}</option>
            {recordStatuses.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select aria-label="Дүгнэлтээр шүүх" value={conclusion} onChange={(e) => { setConclusion(e.target.value); setPage(1); }}>
            <option value="">Бүх дүгнэлт</option>
            {conclusions.map((c) => <option key={c} value={c}>{conclusionLabels[c]}</option>)}
          </select>
          <select aria-label="Материалаар шүүх" value={material} onChange={(e) => { setMaterial(e.target.value); setPage(1); }}>
            <option value="">Бүх материал</option>
            {materials.map((m) => <option key={m}>{m}</option>)}
          </select>
          <select aria-label="Лабораториор шүүх" value={laboratory} onChange={(e) => { setLaboratory(e.target.value); setPage(1); }}>
            <option value="">Бүх лаборатори</option>
            {laboratories.map((l) => <option key={l}>{l}</option>)}
          </select>
          <input type="date" aria-label="Бүртгэсэн / явах огноо — эхлэх" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          <input type="date" aria-label="Бүртгэсэн / явах огноо — дуусах" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          <button className="text-button" onClick={reset}>Цэвэрлэх</button>
        </div>
        {!records.length && !planned.length ? (
          <EmptyState title="Дээжийн бүртгэл хоосон байна" description="Лабораторид илгээх эхний дээжээ бүртгэнэ үү.">
            <button className="button primary small" onClick={() => setForm({})}><Plus size={15} />Дээж бүртгэх</button>
          </EmptyState>
        ) : !rows.length ? <EmptyState /> : (
          <div className="table-scroll">
            <table className="data-table reg-table">
              <thead>
                <tr><th>Дээжийн код / Материал</th><th>Төсөл, байршил</th><th>Компани руу явах</th><th>Лаборатори</th><th>Төлөв</th><th>Лабораторийн хариу</th><th>Үйлдэл</th></tr>
              </thead>
              <tbody>
                {rows.map((entry) => {
                  if (entry.kind === "planned") {
                    const s = entry.sample, mine = !!user && canEditRecord(user, s);
                    const openPlanned = () => mine ? setForm({ sourceSampleId: s.id }) : router.push(`/samples/?id=${s.id}`);
                    return (
                      <tr key={`planned-${s.id}`} className="reg-planned-row" onClick={openPlanned}>
                        <td><button className="table-primary" onClick={(e) => { e.stopPropagation(); openPlanned(); }}>
                          <span className="sample-table-icon"><Box size={18} /></span>
                          <span><strong>{s.code}</strong><small>{s.material} <span className="text-divider">/</span> {s.grade}</small></span>
                        </button></td>
                        <td><span className="table-project">{s.project}</span><small>{s.element}</small></td>
                        <td><strong className="reg-planned-date">{formatDate(s.companyPlannedDate!)}</strong><small>Энэ өдөр явна · {s.count} ширхэг</small></td>
                        <td><span className="reg-muted">—</span></td>
                        <td><span className="status reg-status reg-amber"><span />{plannedRegistryStatus}</span></td>
                        <td><span className="reg-muted">Ирэхийг хүлээж байна</span></td>
                        <td onClick={(e) => e.stopPropagation()}><span className="reg-row-actions">
                          {mine && <button className="button primary small" onClick={() => setForm({ sourceSampleId: s.id })}><Plus size={14} />Бүртгэл баталгаажуулах</button>}
                          <button className="icon-button" aria-label={`${s.code} — эх сорьц`} onClick={() => router.push(`/samples/?id=${s.id}`)}><ChevronRight size={16} /></button>
                        </span></td>
                      </tr>
                    );
                  }
                  const r = entry.record;
                  const active = activeResults(r), latest = active[active.length - 1], outcome = recordOutcome(r), days = responseDays(r);
                  const sent = isSent(r.status), mine = !!user && canEditRecord(user, r);
                  return (
                    <tr key={r.id} onClick={() => open(r.id)}>
                      <td>
                        <button className="table-primary" onClick={(e) => { e.stopPropagation(); open(r.id); }}>
                          <span className="sample-table-icon"><Box size={18} /></span>
                          <span><strong>{r.code}</strong><small>{r.material} <span className="text-divider">/</span> {r.description}</small></span>
                        </button>
                      </td>
                      <td><span className="table-project">{r.project}</span><small>{r.location}</small></td>
                      <td className="mono">{r.companyPlannedDate ? formatDate(r.companyPlannedDate) : "—"}</td>
                      <td>{r.submittedLaboratory ?? <span className="reg-muted">Илгээгээгүй</span>}<small>{r.sentDate ? formatDate(r.sentDate) : `Бүртгэсэн ${formatDate(r.registeredDate)}`}</small></td>
                      <td><RecordStatusBadge status={r.status} /></td>
                      <td>
                        {active.length ? (
                          <span className="reg-result-cell">
                            {outcome && <ConclusionBadge value={outcome} />}
                            <small>{active.length} хариу · № {latest.reportNumber}</small>
                            <small>{formatDate(latest.receivedDate)}{days !== null ? ` · ${days} хоног` : ""}</small>
                          </span>
                        ) : <span className="reg-muted">{sent ? "Хариу хүлээж байна" : "—"}</span>}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <span className="reg-row-actions">
                          <button className="button primary small" disabled={!sent} title={sent ? undefined : "Дээжийг лабораторид илгээсний дараа хариу оруулна"} onClick={() => setResulting({ recordId: r.id })}>
                            <Plus size={14} />Хариу оруулах
                          </button>
                          {!sent && mine && <button className="button secondary small" onClick={() => setSending(r.id)}><Send size={14} />Лабораторид илгээх</button>}
                          <button className="icon-button" aria-label={`${r.code} — дэлгэрэнгүй`} onClick={() => open(r.id)}><ChevronRight size={16} /></button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="table-footer">
          <span>Нийт {entries.length} дээжээс {entries.length ? (current - 1) * PAGE_SIZE + 1 : 0}–{Math.min(current * PAGE_SIZE, entries.length)}</span>
          <div className="pagination">
            <button className="icon-button" aria-label="Өмнөх хуудас" disabled={current === 1} onClick={() => setPage(current - 1)}><ChevronLeft size={17} /></button>
            <span>{current} / {pages}</span>
            <button className="icon-button" aria-label="Дараах хуудас" disabled={current >= pages} onClick={() => setPage(current + 1)}><ChevronRight size={17} /></button>
          </div>
        </div>
      </section>
      {detail && !printing && (
        <RecordDetail
          recordId={detail} tab={tab} onTab={setTab} onClose={closeDetail}
          onEdit={(record) => setForm({ record })} onSend={(record) => setSending(record.id)}
          onResult={(recordId, resultId) => setResulting({ recordId, resultId })} onPrint={(recordId, resultId) => setPrinting({ recordId, resultId })}
        />
      )}
      {form && <RecordFormModal record={form.record} sourceSampleId={form.sourceSampleId} onClose={() => {
        setForm(null);
        if (params.has("sourceSample")) {
          const saved = useRegistryStore.getState().records.find((r) => r.sourceSampleId === params.get("sourceSample"));
          router.replace(saved ? `/sample-registry/?id=${saved.id}` : "/sample-registry/");
        }
      }} onSaved={(saved) => { if (!form.record) { if (status === plannedRegistryStatus) setStatus(""); open(saved.id); } }} />}
      {sendingRecord && <SendModal record={sendingRecord} onClose={() => setSending(null)} />}
      {resulting && <ResultDrawer recordId={resulting.recordId} resultId={resulting.resultId} onClose={() => setResulting(null)} />}
      {printing && printRecord && <PrintView record={printRecord} result={printResult} onClose={() => setPrinting(null)} />}
    </>
  );
}
export function SampleRegistryPage() {
  const params = useSearchParams();
  return <RegistryScreen key={params.toString()} />;
}
