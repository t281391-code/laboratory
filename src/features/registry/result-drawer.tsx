"use client";
import { useMemo, useRef, useState, type DragEvent } from "react";
import { useFieldArray, useForm, useWatch, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calculator, FileText, Lock, Plus, RefreshCw, Save, Trash2, Upload, X } from "lucide-react";
import { Modal, useUI } from "@/components/ui";
import { useLabStore } from "@/lib/store";
import {
  canEditResult, canManageCompletion, conclusionLabels, conclusions, deriveStatus, fileRules, formatBytes, itemConclusionLabels, itemConclusions, suggestConclusion,
  type LabResultDto, type SampleRecordDto,
} from "@/lib/registry";
import { TODAY } from "@/lib/utils";
import { AttachmentList } from "./attachments";
import { RecordStatusBadge } from "./badges";
import { SampleBrief } from "./brief";
import { registryApi, useRegistryStore } from "./store";

const MAX_ATTACHMENTS = 10;
const itemSchema = z.object({
  testName: z.string().trim().min(1, "Үзүүлэлтийн нэрийг оруулна уу.").max(200),
  resultValue: z.string().trim().max(200),
  unit: z.string().trim().max(50),
  standardRequirement: z.string().trim().max(300),
  testStandard: z.string().trim().max(200),
  itemConclusion: z.enum(itemConclusions),
  notes: z.string().trim().max(1000),
});
const buildSchema = (sentDate: string | null) => z.object({
  reportNumber: z.string().trim().min(1, "Хариуны дугаарыг оруулна уу.").max(100),
  receivedDate: z.string().min(1, "Огноо сонгоно уу."),
  resultLaboratory: z.string().trim().min(1, "Хариу өгсөн лабораторийг оруулна уу.").max(200),
  testedBy: z.string().trim().min(1, "Шинжилгээ хийсэн ажилтныг оруулна уу.").max(120),
  conclusion: z.enum(conclusions),
  isComplete: z.boolean(),
  notes: z.string().trim().max(4000, "4000 тэмдэгтээс ихгүй байна."),
  items: z.array(itemSchema).max(100),
}).superRefine((v, ctx) => {
  if (v.receivedDate > TODAY) ctx.addIssue({ code: "custom", path: ["receivedDate"], message: "Өнөөдрөөс хойших огноо сонгох боломжгүй." });
  else if (sentDate && v.receivedDate < sentDate) ctx.addIssue({ code: "custom", path: ["receivedDate"], message: "Дээжийг илгээсэн огнооноос өмнө байж болохгүй." });
  if (!v.isComplete) return;
  if (!v.items.length) ctx.addIssue({ code: "custom", path: ["items"], message: "Бүрэн дууссан хариунд дор хаяж нэг үзүүлэлт байна." });
  v.items.forEach((item, i) => { if (!item.resultValue) ctx.addIssue({ code: "custom", path: ["items", i, "resultValue"], message: "Үр дүнг оруулна уу." }); });
});
type FormValues = z.infer<ReturnType<typeof buildSchema>>;
const blankItem = (): FormValues["items"][number] => ({ testName: "", resultValue: "", unit: "", standardRequirement: "", testStandard: "", itemConclusion: "NOT_EVALUATED", notes: "" });
const toValues = (record: SampleRecordDto, result?: LabResultDto): FormValues => result
  ? {
    reportNumber: result.reportNumber, receivedDate: result.receivedDate, resultLaboratory: result.resultLaboratory, testedBy: result.testedBy,
    conclusion: result.conclusion, isComplete: result.isComplete, notes: result.notes,
    items: result.items.map((i) => ({ testName: i.testName, resultValue: i.resultValue, unit: i.unit, standardRequirement: i.standardRequirement, testStandard: i.testStandard, itemConclusion: i.itemConclusion, notes: i.notes })),
  }
  : { reportNumber: "", receivedDate: TODAY, resultLaboratory: record.submittedLaboratory ?? "", testedBy: "", conclusion: "NOT_EVALUATED", isComplete: false, notes: "", items: [blankItem()] };
function itemMessages(errors: FieldErrors<FormValues>) {
  const rows = errors.items as unknown;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row, i) => row ? Object.values(row as Record<string, { message?: string }>).map((f) => `Мөр ${i + 1}: ${f?.message ?? "буруу утга"}`) : []);
}

function ResultForm({ record, result, onClose }: { record: SampleRecordDto; result?: LabResultDto; onClose: () => void }) {
  const user = useLabStore((s) => s.user);
  const editing = !!result;
  const locked = !!result && !!user && !canEditResult(user, result);
  const isAdmin = !!user && canManageCompletion(user);
  const schema = useMemo(() => buildSchema(record.sentDate), [record.sentDate]);
  const [baseVersion, setBaseVersion] = useState(result?.version ?? 0);
  const [files, setFiles] = useState<File[]>([]);
  const [fileIssues, setFileIssues] = useState<string[]>([]);
  const [serverError, setServerError] = useState("");
  const [over, setOver] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const { register, control, handleSubmit, reset, setValue, getValues, formState: { errors, isDirty, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema), defaultValues: toValues(record, result),
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = useWatch({ control, name: "items" });
  const isComplete = useWatch({ control, name: "isComplete" });
  const stale = !!result && result.version !== baseVersion;
  const rowMessages = itemMessages(errors);
  const itemsRoot = errors.items as unknown as { message?: string; root?: { message?: string } } | undefined;
  const nextStatus = deriveStatus(record.status, [...record.results.filter((r) => r.isActive && r.id !== result?.id), { isActive: true, isComplete }]);
  const error = (message?: string) => message ? <span className="field-error">{message}</span> : null;

  const requestClose = () => {
    if ((isDirty || files.length) && !window.confirm("Хадгалаагүй өөрчлөлт устана. Гарах уу?")) return;
    onClose();
  };
  const addFiles = (incoming: FileList | File[]) => {
    const next = [...files], issues: string[] = [], existing = result?.attachments.length ?? 0;
    for (const file of Array.from(incoming)) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!(fileRules.extensions as readonly string[]).includes(extension)) issues.push(`${file.name}: зөвхөн PDF, JPG, JPEG, PNG файл хавсаргана.`);
      else if (!fileRules.mimeByExtension[extension].includes(file.type.toLowerCase())) issues.push(`${file.name}: файлын төрөл өргөтгөлтэйгээ таарахгүй байна.`);
      else if (!file.size) issues.push(`${file.name}: файл хоосон байна.`);
      else if (file.size > fileRules.maxBytes) issues.push(`${file.name}: 10 МБ-аас хэтэрсэн (${formatBytes(file.size)}).`);
      else if (next.some((f) => f.name === file.name && f.size === file.size)) continue;
      else if (next.length >= fileRules.maxFiles || next.length + existing >= MAX_ATTACHMENTS) issues.push(`${file.name}: хавсралтын дээд тоонд хүрсэн.`);
      else next.push(file);
    }
    setFiles(next); setFileIssues(issues);
  };
  const onDrop = (event: DragEvent) => { event.preventDefault(); setOver(false); if (!locked) addFiles(event.dataTransfer.files); };

  const submit = handleSubmit(async (values) => {
    setServerError("");
    try {
      if (result) await registryApi.updateResult(result.id, baseVersion, values, files);
      else await registryApi.createResult(record.id, values, files);
      useUI.getState().notify(editing ? `${record.code} · хариу шинэчлэгдлээ` : `${record.code} · хариу хадгалагдлаа`);
      onClose();
    } catch (e) { setServerError(e instanceof Error ? e.message : "Хадгалж чадсангүй."); }
  });

  return (
    <Modal title={editing ? "Лабораторийн хариу засах" : "Хариу оруулах"} drawer className="reg-drawer" onClose={requestClose}>
      <SampleBrief record={record} />
      {locked && <p className="reg-banner warn" role="alert"><Lock size={15} />Дууссан хариуг зөвхөн администратор өөрчилнө.</p>}
      {stale && result && (
        <p className="reg-banner warn" role="alert">
          <RefreshCw size={15} />Өөр хэрэглэгч энэ хариуг өөрчилсөн байна.
          <button type="button" className="button secondary small" onClick={() => { reset(toValues(record, result)); setFiles([]); setBaseVersion(result.version); }}>Шинэ утгыг ачаалах</button>
        </p>
      )}
      <form noValidate onSubmit={submit}>
        <fieldset className="reg-fieldset" disabled={locked}>
          <section className="reg-hud">
            <header className="reg-hud-head"><code>02</code>Хариуны мэдээлэл</header>
            <div className="form-grid">
              <label className="field">
                <span>Хариуны дугаар <b>*</b></span>
                <input {...register("reportNumber")} placeholder="Жишээ: ЛХ-2026/0142" aria-invalid={!!errors.reportNumber} />
                {error(errors.reportNumber?.message)}
              </label>
              <label className="field">
                <span>Хариу авсан огноо <b>*</b></span>
                <input type="date" min={record.sentDate ?? undefined} max={TODAY} {...register("receivedDate")} aria-invalid={!!errors.receivedDate} />
                {error(errors.receivedDate?.message)}
              </label>
              <label className="field">
                <span>Хариу өгсөн лаборатори <b>*</b></span>
                <input {...register("resultLaboratory")} list="reg-labs" aria-invalid={!!errors.resultLaboratory} />
                {error(errors.resultLaboratory?.message)}
              </label>
              <label className="field">
                <span>Шинжилгээ хийсэн ажилтан <b>*</b></span>
                <input {...register("testedBy")} list="reg-staff" aria-invalid={!!errors.testedBy} />
                {error(errors.testedBy?.message)}
              </label>
            </div>
          </section>

          <section className="reg-hud">
            <header className="reg-hud-head">
              <code>03</code>Шинжилгээний үзүүлэлтүүд
              <button type="button" className="button primary small reg-head-action" onClick={() => append(blankItem())}><Plus size={14} />Үзүүлэлт нэмэх</button>
            </header>
            <p className="reg-muted">Материал бүрд өөр шинжилгээ шаардлагатай тул үзүүлэлтийг хүссэн хэмжээгээрээ нэмнэ.</p>
            <div className="reg-items-scroll">
              <table className="reg-items">
                <thead>
                  <tr>
                    <th>№</th><th>Үзүүлэлтийн нэр</th><th>Үр дүн</th><th>Нэгж</th><th>Стандартын шаардлага</th><th>Туршилтын стандарт</th><th>Дүгнэлт</th><th>Тайлбар</th>
                    <th><span className="sr-only">Мөр хасах</span></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => {
                    const rowErrors = (errors.items as unknown as (Record<string, unknown> | undefined)[] | undefined)?.[index];
                    return (
                      <tr key={field.id} data-tone={items?.[index]?.itemConclusion ?? "NOT_EVALUATED"}>
                        <td className="reg-row-no">{index + 1}</td>
                        <td><input list="reg-tests" aria-label={`Үзүүлэлтийн нэр, мөр ${index + 1}`} aria-invalid={!!rowErrors?.testName} {...register(`items.${index}.testName`)} /></td>
                        <td><input aria-label={`Үр дүн, мөр ${index + 1}`} aria-invalid={!!rowErrors?.resultValue} {...register(`items.${index}.resultValue`)} /></td>
                        <td><input list="reg-item-units" aria-label={`Нэгж, мөр ${index + 1}`} {...register(`items.${index}.unit`)} /></td>
                        <td><input aria-label={`Стандартын шаардлага, мөр ${index + 1}`} {...register(`items.${index}.standardRequirement`)} /></td>
                        <td><input list="reg-standards" aria-label={`Туршилтын стандарт, мөр ${index + 1}`} {...register(`items.${index}.testStandard`)} /></td>
                        <td>
                          <select aria-label={`Дүгнэлт, мөр ${index + 1}`} {...register(`items.${index}.itemConclusion`)}>
                            {itemConclusions.map((value) => <option key={value} value={value}>{itemConclusionLabels[value]}</option>)}
                          </select>
                        </td>
                        <td><input aria-label={`Тайлбар, мөр ${index + 1}`} {...register(`items.${index}.notes`)} /></td>
                        <td><button type="button" className="icon-button" aria-label={`Мөр ${index + 1} хасах`} onClick={() => remove(index)}><Trash2 size={15} /></button></td>
                      </tr>
                    );
                  })}
                  {!fields.length && <tr><td colSpan={9} className="reg-items-empty">Үзүүлэлт нэмээгүй байна. «Үзүүлэлт нэмэх» товчийг ашиглана уу.</td></tr>}
                </tbody>
              </table>
            </div>
            {(itemsRoot?.message || itemsRoot?.root?.message) && <span className="field-error">{itemsRoot.message ?? itemsRoot.root?.message}</span>}
            {rowMessages.length > 0 && <ul className="reg-errors">{rowMessages.slice(0, 6).map((m) => <li key={m}>{m}</li>)}</ul>}
          </section>

          <section className="reg-hud">
            <header className="reg-hud-head"><code>04</code>Дүгнэлт</header>
            <div className="form-grid">
              <label className="field">
                <span>Ерөнхий дүгнэлт</span>
                <select {...register("conclusion")}>
                  {conclusions.map((value) => <option key={value} value={value}>{conclusionLabels[value]}</option>)}
                </select>
                <button type="button" className="text-button reg-inline-action" onClick={() => setValue("conclusion", suggestConclusion(getValues("items")), { shouldDirty: true })}>
                  <Calculator size={13} />Үзүүлэлтээс тооцох
                </button>
              </label>
              <div className="field">
                <span>Төлөв</span>
                <label className="reg-check">
                  <input type="checkbox" disabled={!isAdmin} {...register("isComplete")} />
                  <span>Хариуг бүрэн дууссан</span>
                </label>
                {!isAdmin && <small>Хариуг бүрэн дуусгахыг зөвхөн администратор баталгаажуулна.</small>}
              </div>
              <label className="field span-2">
                <span>Нэмэлт тайлбар</span>
                <textarea rows={3} {...register("notes")} />
                {error(errors.notes?.message)}
              </label>
            </div>
          </section>

          <section className="reg-hud">
            <header className="reg-hud-head"><code>05</code>Хавсралт<small className="reg-head-note">PDF · JPG · JPEG · PNG · ≤ 10 МБ</small></header>
            {result && <AttachmentList attachments={result.attachments} canRemove={!locked} />}
            <div
              className={`reg-drop ${over ? "over" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => picker.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); picker.current?.click(); } }}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={onDrop}
            >
              <Upload size={22} />
              <strong>Файл чирж оруулах эсвэл сонгох</strong>
              <small>Нэг удаад {fileRules.maxFiles} хүртэл файл</small>
            </div>
            <input ref={picker} type="file" className="sr-only" tabIndex={-1} multiple accept={fileRules.accept} onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
            {fileIssues.length > 0 && <ul className="reg-errors" role="alert">{fileIssues.map((m) => <li key={m}>{m}</li>)}</ul>}
            {files.length > 0 && (
              <ul className="reg-files">
                {files.map((file) => (
                  <li className="reg-file pending" key={`${file.name}-${file.size}`}>
                    <span className="reg-file-icon"><FileText size={18} /></span>
                    <span className="reg-file-name"><strong title={file.name}>{file.name}</strong><small>{formatBytes(file.size)} · хадгалахад хавсрагдана</small></span>
                    <button type="button" className="icon-button" aria-label={`${file.name} хасах`} onClick={() => setFiles(files.filter((f) => f !== file))}><X size={15} /></button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </fieldset>

        {serverError && <p className="field-error reg-server-error" role="alert">{serverError}</p>}
        <div className="dialog-actions reg-actions">
          <span className="reg-next-status">Хадгалсны дараах төлөв: <RecordStatusBadge status={nextStatus} /></span>
          <button type="button" className="button secondary" onClick={requestClose}>Болих</button>
          <button className="button primary" type="submit" disabled={isSubmitting || locked}><Save size={16} />{isSubmitting ? "Хадгалж байна..." : "Хадгалах"}</button>
        </div>
      </form>
    </Modal>
  );
}

/** Opens for a sent sample; resolves the live record/result from the store so the drawer always shows the current server state. */
export function ResultDrawer({ recordId, resultId, onClose }: { recordId: string; resultId?: string; onClose: () => void }) {
  const record = useRegistryStore((s) => s.records.find((r) => r.id === recordId));
  const result = resultId ? record?.results.find((r) => r.id === resultId) : undefined;
  if (!record || (resultId && !result)) return null;
  return <ResultForm record={record} result={result} onClose={onClose} />;
}
