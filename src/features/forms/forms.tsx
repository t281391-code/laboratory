"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileCheck2,
  FlaskConical,
  Leaf,
  Mountain,
  Printer,
  RotateCcw,
  Save,
  Thermometer,
  Waves,
} from "lucide-react";
import { useLabStore } from "@/lib/store";
import type { FormKind, FormValues, TestRecord } from "@/lib/types";
import { formCodes, formNames, formatDate, TODAY, uid } from "@/lib/utils";
import {
  ConfirmDialog,
  EmptyState,
  PageHeading,
  ProgressSteps,
  StatusBadge,
  useUI,
} from "@/components/ui";
import { PhotoUpload } from "@/components/photo-upload";
import { calculate, defaultsFor, formDefinitions, schemaFor } from "./config";
import { ReportRecord } from "@/features/reports/report-record";

const icons = {
  environment: Thermometer,
  fresh: Waves,
  compression: FlaskConical,
  sand: Leaf,
  aggregate: Mountain,
  cement: BoxIcon,
};
function BoxIcon({ size = 22 }: { size?: number }) {
  return <ClipboardList size={size} />;
}
export function CalculationResult({
  kind,
  values,
}: {
  kind: FormKind;
  values: FormValues;
}) {
  const result = calculate(kind, values);
  return (
    <aside className={`calculation-result ${result.state}`}>
      <div className="calculation-heading">
        <span className="square-icon">
          <Calculator size={18} />
        </span>
        <div>
          <strong>Автомат тооцоолол</strong>
          <small>Хэмжилт өөрчлөгдөхөд шинэчлэгдэнэ</small>
        </div>
      </div>
      <div className="calculation-formula">{result.formula}</div>
      <p className="substitution">{result.substitution}</p>
      <div className="calculation-answer">
        <span>{result.label}</span>
        <div>
          <strong>
            {Number.isFinite(result.value) ? result.value.toFixed(2) : "—"}
          </strong>
          <span>{result.unit}</span>
        </div>
        <StatusBadge status={result.state} />
      </div>
      <dl>
        {result.extras.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      <p className="calculation-note">{result.note}</p>
    </aside>
  );
}
export function SmartForm({
  kind,
  sampleCode,
}: {
  kind: FormKind;
  sampleCode?: string;
}) {
  const definition = formDefinitions[kind];
  const draft = useLabStore((s) => s.drafts[kind]);
  const samples = useLabStore((s) => s.samples);
  const sample = samples.find((s) => s.code === sampleCode);
  const saveDraft = useLabStore((s) => s.saveDraft);
  const saveTest = useLabStore((s) => s.saveTest);
  const clearDraft = useLabStore((s) => s.clearDraft);
  const [step, setStep] = useState(draft && !sampleCode ? draft.step : 0);
  const [resetOpen, setResetOpen] = useState(false);
  const [photos, setPhotos] = useState<string[]>(
    draft && !sampleCode ? draft.photos : [],
  );
  const [saved, setSaved] = useState<TestRecord | null>(null);
  const [print, setPrint] = useState(false);
  const base = {
    ...defaultsFor(kind),
    technician: useLabStore.getState().user?.fullName || "",
    ...(sample
      ? {
          sampleCode: sample.code,
          grade: sample.grade,
          castingDate: sample.castingDate,
          element: sample.element,
          technician: sample.technician,
        }
      : {}),
  };
  const {
    register,
    handleSubmit,
    control,
    trigger,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schemaFor(kind)),
    defaultValues: draft && !sampleCode ? { ...base, ...draft.values } : base,
    mode: "onTouched",
  });
  const values = useWatch({ control }) as FormValues;
  const save = async (form: FormValues) => {
    const result = calculate(kind, form);
    const record: TestRecord = {
      id: uid(),
      kind,
      sampleCode: form.sampleCode || "Лабораторийн орчин",
      date: form.testDate,
      values: form,
      result: result.value,
      state: result.state,
      approved: false,
      technician: form.technician,
      photos,
    };
    try {
      const saved = await saveTest(record);
      setSaved(saved);
      useUI.getState().notify(`${formCodes[kind]} маягт хадгалагдлаа`);
    } catch (error) { useUI.getState().notify(error instanceof Error ? error.message : "Хадгалж чадсангүй."); }
  };
  if (saved)
    return (
      <>
        <div className="saved-success panel">
          <span className="success-circle">
            <CheckCircle2 size={38} />
          </span>
          <div className="eyebrow">АМЖИЛТТАЙ ХАДГАЛАГДЛАА</div>
          <h1>Үр дүн хянахад бэлэн боллоо.</h1>
          <p>
            {formNames[kind]} · {saved.sampleCode}
          </p>
          <div className="saved-result">
            <strong>
              {saved.result.toFixed(2)}{" "}
              <small>{calculate(kind, saved.values).unit}</small>
            </strong>
            <StatusBadge status={saved.state} />
          </div>
          <p className="muted">
            Маягт энэ хөтөч дээр хадгалагдаж, шинжилгээний бүртгэл шинэчлэгдлээ.
          </p>
          <div className="button-row">
            <button className="button secondary" onClick={() => setPrint(true)}>
              <Printer size={17} />
              Үр дүнгийн хуудас
            </button>
            <Link className="button primary" href="/tests/?filter=review">
              Шинжилгээний бүртгэл
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
        {print && (
          <ReportRecord record={saved} onClose={() => setPrint(false)} />
        )}
      </>
    );
  return (
    <>
      <Link href="/forms/" className="back-link">
        <ArrowLeft size={16} />
        Цахим маягтууд
      </Link>
      <PageHeading
        eyebrow={`${formCodes[kind]} · ${definition.material}`}
        title={formNames[kind]}
        description={definition.description}
      >
        <button
          className="button secondary"
          onClick={() => {
            saveDraft(kind, {
              values: getValues(),
              photos,
              step,
              updated: TODAY,
            });
            useUI.getState().notify("Ноорог энэ хөтөч дээр хадгалагдлаа");
          }}
        >
          <Save size={16} />
          Ноорог хадгалах
        </button>
      </PageHeading>
      <div className="form-workspace">
        <section className="panel smart-form">
          <ProgressSteps
            steps={["Үндсэн мэдээлэл", "Хэмжилт оруулах", "Хянаж хадгалах"]}
            current={step}
          />
          {draft && !sampleCode && (
            <div className="draft-banner">
              <Clock3 size={16} />
              <span>
                {formatDate(draft.updated)}-нд хадгалсан нооргийг сэргээв.
              </span>
            </div>
          )}
          <form
            noValidate
            onSubmit={handleSubmit(save, (fieldErrors) => {
              const firstStep = definition.sections.findIndex((section) =>
                section.fields.some((f) => fieldErrors[f.name]),
              );
              setStep(Math.max(0, firstStep));
            })}
          >
            {step < 2 ? (
              <div className="form-section">
                <div className="form-section-heading">
                  <span>АЛХАМ {step + 1} / 3</span>
                  <h2>{definition.sections[step].title}</h2>
                  <p>{definition.sections[step].description}</p>
                </div>
                <div className="form-grid">
                  {definition.sections[step].fields.map((field) => (
                    <label
                      className={`field ${field.type === "textarea" ? "span-2" : ""}`}
                      key={field.name}
                    >
                      <span>
                        {field.label} {!field.optional && <b>*</b>}
                      </span>
                      <div className="input-with-unit">
                        {field.type === "select" ? (
                          <select
                            {...register(field.name)}
                            aria-invalid={!!errors[field.name]}
                          >
                            <option value="">Сонгох...</option>
                            {field.options?.map((option) => (
                              <option key={option}>{option}</option>
                            ))}
                          </select>
                        ) : field.type === "textarea" ? (
                          <textarea
                            {...register(field.name)}
                            rows={3}
                            placeholder="Тэмдэглэлээ энд бичнэ үү..."
                            aria-invalid={!!errors[field.name]}
                          />
                        ) : (
                          <input
                            {...register(field.name)}
                            type={field.type || "text"}
                            step={field.type === "number" ? "any" : undefined}
                            min={field.min}
                            max={field.type === "date" ? TODAY : field.max}
                            placeholder={
                              field.type === "number" ? "0.00" : field.label
                            }
                            list={
                              field.name === "sampleCode"
                                ? "sample-codes"
                                : undefined
                            }
                            aria-invalid={!!errors[field.name]}
                          />
                        )}
                        {field.unit && <span>{field.unit}</span>}
                      </div>
                      {errors[field.name] && (
                        <span className="field-error" role="alert">
                          {String(errors[field.name]?.message)}
                        </span>
                      )}
                      {field.hint && <small>{field.hint}</small>}
                    </label>
                  ))}
                </div>
                <datalist id="sample-codes">
                  {samples
                    .filter((s) => s.material === definition.material)
                    .map((s) => (
                      <option key={s.id} value={s.code}>
                        {s.project}
                      </option>
                    ))}
                </datalist>
                {step === 1 && kind !== "environment" && (
                  <div className="form-photo-section">
                    <h3>Туршилтын зураг</h3>
                    <p>Хадгалсан зураг MySQL бүртгэлтэй хамт хадгалагдана.</p>
                    <PhotoUpload photos={photos} onChange={setPhotos} />
                  </div>
                )}
              </div>
            ) : (
              <div className="form-section">
                <div className="form-section-heading">
                  <span>АЛХАМ 3 / 3</span>
                  <h2>Хадгалахын өмнө шалгана уу</h2>
                  <p>Таны хэмжилт, тооцоолол хяналтад шилжинэ.</p>
                </div>
                <dl className="review-values">
                  {definition.sections
                    .flatMap((s) => s.fields)
                    .filter((f) => values[f.name])
                    .map((f) => (
                      <div key={f.name}>
                        <dt>{f.label}</dt>
                        <dd>
                          {values[f.name]} {f.unit}
                        </dd>
                      </div>
                    ))}
                </dl>
                <div className="info-banner">
                  <CheckCircle2 size={20} />
                  <p>
                    Хадгалсны дараа үр дүн шинжилгээний жагсаалтад шууд
                    харагдана. Инженерийн хяналтаар баталгаажуулна.
                  </p>
                </div>
              </div>
            )}
            <div className="form-actions">
              <button
                className="icon-button"
                type="button"
                aria-label="Маягт цэвэрлэх"
                title="Маягт цэвэрлэх"
                onClick={() => setResetOpen(true)}
              >
                <RotateCcw size={17} />
              </button>
              <span className="form-step-count">{step + 1} / 3 алхам</span>
              {step > 0 && (
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                >
                  <ArrowLeft size={16} />
                  Өмнөх
                </button>
              )}
              {step < 2 ? (
                <button
                  className="button primary"
                  key="continue"
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    if (
                      await trigger(
                        definition.sections[step].fields.map((f) => f.name),
                      )
                    )
                      setStep((s) => s + 1);
                  }}
                >
                  Үргэлжлүүлэх
                  <ArrowRight size={17} />
                </button>
              ) : (
                <button key="save" className="button primary" type="submit" disabled={isSubmitting}>
                  <Check size={17} />
                  Үр дүн хадгалах
                </button>
              )}
            </div>
          </form>
        </section>
        <div className="form-side">
          <CalculationResult kind={kind} values={values} />
          <div className="form-help">
            <span>
              <FileCheck2 size={20} />
            </span>
            <strong>Цааснаас илүү хялбар.</strong>
            <p>
              Тооцоолол автоматаар хийгдэнэ. Та зөвхөн хэмжилтээ оруулж, үр
              дүнгээ хянаарай.
            </p>
            <Link href="/standards/">
              Холбогдох аргачлал
              <ArrowUpRightIcon />
            </Link>
          </div>
        </div>
      </div>
      {resetOpen && (
        <ConfirmDialog
          title="Маягтыг цэвэрлэх үү?"
          description="Оруулсан хэмжилт, зураг болон энэ маягтын хадгалсан ноорог арилна."
          onClose={() => setResetOpen(false)}
          onConfirm={() => {
            reset(
              Object.fromEntries(Object.keys(base).map((key) => [key, ""])),
            );
            setPhotos([]);
            setStep(0);
            clearDraft(kind);
          }}
        />
      )}
    </>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={14} />;
}
export function FormsPage() {
  const params = useSearchParams();
  const drafts = useLabStore((s) => s.drafts);
  const tests = useLabStore((s) => s.tests);
  const [selectedRecord, setSelectedRecord] = useState<TestRecord | null>(null);
  const kind = params.get("type") as FormKind;
  const sampleCode = params.get("sample") || undefined;
  if (kind && formDefinitions[kind])
    return (
      <SmartForm
        key={`${kind}-${sampleCode || ""}`}
        kind={kind}
        sampleCode={sampleCode}
      />
    );
  return (
    <>
      <PageHeading
        eyebrow="ЦААСГҮЙ ЛАБОРАТОРИ"
        title="Цахим маягтууд"
        description="Хэмжилтээ оруул. Тооцооллоо бидэнд даатга."
      />
      <div className="forms-intro">
        <span className="forms-intro-icon">
          <ClipboardList size={31} strokeWidth={1.5} />
        </span>
        <div>
          <h2>Танил маягт. Илүү хялбар арга.</h2>
          <p>
            Алхам бүрээр бөглөж, автоматаар тооцоолж, үр дүнгээ найдвартай
            хадгалаарай.
          </p>
        </div>
        <span className="intro-chip">6 цахим маягт</span>
      </div>
      <div className="forms-grid">
        {(Object.keys(formDefinitions) as FormKind[]).map((k) => {
          const Icon = icons[k];
          return (
            <Link href={`/forms/?type=${k}`} className="form-card" key={k}>
              <div className="form-card-top">
                <span className={`form-type-icon ${k}`}>
                  <Icon size={23} />
                </span>
                <span className="form-code">{formCodes[k]}</span>
              </div>
              <h2>{formNames[k]}</h2>
              <p>{formDefinitions[k].description}</p>
              <div className="form-card-footer">
                {drafts[k] ? (
                  <span className="draft-indicator">
                    <span />
                    Хадгалсан ноорогтой
                  </span>
                ) : (
                  <span>{formDefinitions[k].material}</span>
                )}
                <span>
                  {drafts[k] ? "Үргэлжлүүлэх" : "Бөглөх"}
                  <ArrowRight size={16} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      <section className="panel saved-forms">
        <div className="section-heading">
          <div>
            <h2>Сүүлд хадгалсан маягтууд</h2>
            <p>Хөтөч дээр хадгалагдсан бүртгэлүүд</p>
          </div>
          <Link href="/tests/" className="text-button">
            Бүгдийг харах
            <ArrowRight size={16} />
          </Link>
        </div>
        {tests.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Маягт</th>
                  <th>Сорьцын код</th>
                  <th>Огноо</th>
                  <th>Үр дүн</th>
                  <th>Хяналт</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tests.slice(0, 5).map((t) => (
                  <tr key={t.id} onClick={() => setSelectedRecord(t)}>
                    <td>
                      <button
                        className="table-text-button"
                        onClick={() => setSelectedRecord(t)}
                      >
                        {formCodes[t.kind]}
                      </button>
                      <small>{formNames[t.kind]}</small>
                    </td>
                    <td className="mono">{t.sampleCode}</td>
                    <td>{formatDate(t.date)}</td>
                    <td>
                      <StatusBadge status={t.state} />
                    </td>
                    <td>{t.approved ? "Баталгаажсан" : "Хянаж байгаа"}</td>
                    <td>
                      <ChevronRight size={16} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Хадгалсан маягт байхгүй"
            description="Дээрх маягтаас сонгож эхний хэмжилтээ оруулаарай."
          />
        )}
      </section>
      {selectedRecord && (
        <ReportRecord
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </>
  );
}
