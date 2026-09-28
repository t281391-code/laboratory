"use client";

import { useEffect, useRef, useState, type ChangeEvent, type TextareaHTMLAttributes } from "react";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, Plus, Save, Trash2 } from "lucide-react";
import { ConfirmDialog, PageHeading, SectionHeading } from "@/components/ui";
import { productModules, type ProductModule } from "./product-module-config";
import {
  blankRow,
  useProductModuleStore,
  type Row,
  type Product,
  type Batch,
} from "./product-module-state";
import { DraftCell } from "@/components/draft-cell";
import { api } from "@/lib/api";
import { uid } from "@/lib/utils";

type Column = {
  key: string;
  label: string;
  type?: "number" | "text" | "date" | "time";
  options?: readonly string[];
};

const hourColumns: Column[] = [
  { key: "time", label: "Цаг", type: "time" },
  { key: "value", label: "Хэмжилтийн утга", type: "number" },
  { key: "note", label: "Тайлбар" },
];
const trialColumns: Column[] = [
  { key: "number", label: "Хэддүгээр туршилт", type: "number" },
  { key: "spread", label: "Тархалт, мм", type: "number" },
  {
    key: "concreteTemperature",
    label: "Бетоны температур, °C",
    type: "number",
  },
  { key: "airTemperature", label: "Орчны температур, °C", type: "number" },
  { key: "airContent", label: "Агаарын агууламж, %", type: "number" },
  { key: "date", label: "Огноо", type: "date" },
  { key: "time", label: "Цаг", type: "time" },
];
const fractionColumns: Column[] = [
  { key: "cement", label: "Цемент", type: "number" },
  { key: "fine", label: "0–3", type: "number" },
  { key: "medium", label: "3–8", type: "number" },
  { key: "coarse", label: "8–13", type: "number" },
];
const productColumns: Column[] = [
  { key: "date", label: "Огноо", type: "date" },
  { key: "time", label: "Цаг", type: "time" },
  { key: "count", label: "Дээжийн тоо", type: "number" },
  { key: "code", label: "Бүтээгдэхүүний код" },
  { key: "size", label: "Хэмжээ" },
  {
    key: "curing",
    label: "Бэхжүүлэлтийн нөхцөл",
    options: ["Уурын нөхцөл", "Ердийн нөхцөл"],
  },
  { key: "note", label: "Тайлбар" },
];
const products = [
  { id: "pipe", title: "Төмөр бетон хоолой" },
  { id: "ring", title: "Төмөр бетон цагираг" },
] as const;

function DraftTextarea({
  value,
  onCommit,
  ...props
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  value: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const dirty = draft !== null && draft !== value;
  const commitNow = () => {
    clearTimeout(timer.current);
    if (draft !== null && draft !== value) onCommit(draft);
    setDraft(null);
  };
  return (
    <>
      <textarea
        {...props}
        value={draft ?? value}
        onFocus={() => setDraft(value)}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          clearTimeout(timer.current);
          // Autosave shortly after typing pauses, in case the button isn't clicked.
          timer.current = setTimeout(() => { if (next !== value) onCommit(next); }, 800);
        }}
      />
      <div className="product-module-actions">
        <button type="button" className="button primary" disabled={!dirty} onClick={commitNow}>
          <Save size={16} />
          Хадгалах
        </button>
      </div>
    </>
  );
}

function EditableTable({
  title,
  columns,
  rows,
  onChange,
  addLabel,
  hourly = false,
  totals = false,
}: {
  title: string;
  columns: Column[];
  rows: Row[];
  onChange: (rows: Row[]) => void;
  addLabel?: string;
  hourly?: boolean;
  totals?: boolean;
}) {
  const storedTotals = useProductModuleStore(s => s.totals);
  return (
    <>
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label={title}
      >
        <table className="data-table product-module-table" aria-label={title}>
          <thead>
            <tr>
              <th scope="col">{hourly ? "Цагийн дугаар" : "№"}</th>
              {columns.map((column) => (
                <th scope="col" key={column.key}>
                  {column.label}
                </th>
              ))}
              {addLabel && <th scope="col">Үйлдэл</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id}>
                <th scope="row">{hourly ? `${index + 1}-р цаг` : index + 1}</th>
                {columns.map((column) => {
                  const inputProps = {
                    "aria-label": `${title}, ${index + 1}-р мөр, ${column.label}`,
                    value: row.values[column.key] ?? "",
                    onChange: (
                      event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
                    ) =>
                      onChange(
                        rows.map((item) =>
                          item.id === row.id
                            ? {
                                ...item,
                                values: {
                                  ...item.values,
                                  [column.key]: event.target.value,
                                },
                              }
                            : item,
                        ),
                      ),
                  };
                  return (
                    <td key={column.key}>
                      {column.options ? (
                        <select {...inputProps}>
                          <option value="">Сонгох</option>
                          {column.options.map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <DraftCell
                          aria-label={inputProps["aria-label"]}
                          value={inputProps.value}
                          onCommit={value => onChange(rows.map(item => item.id === row.id ? { ...item, values: { ...item.values, [column.key]: value } } : item))}
                          type={column.type ?? "text"}
                          step={column.type === "number" ? "any" : undefined}
                        />
                      )}
                    </td>
                  );
                })}
                {addLabel && (
                  <td>
                    <button
                      type="button"
                      className="button secondary small"
                      aria-label={`${title}, ${index + 1}-р мөр устгах`}
                      onClick={() =>
                        onChange(rows.filter((item) => item.id !== row.id))
                      }
                    >
                      <Trash2 size={14} />
                      Устгах
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={columns.length + (addLabel ? 2 : 1)}>
                  Мөр байхгүй. Доорх товчоор мөр нэмнэ үү.
                </td>
              </tr>
            )}
          </tbody>
          {totals && (
            <tfoot>
              <tr>
                <th scope="row">Нийт</th>
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.type === "number" && (
                      <output aria-label={`${column.label} нийт`}>
                        {storedTotals[column.key] ?? "0"}
                      </output>
                    )}
                  </td>
                ))}
                {addLabel && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {addLabel && (
        <div className="product-module-actions">
          <button
            type="button"
            className="button secondary"
            onClick={() => onChange([...rows, blankRow(uid())])}
          >
            <Plus size={16} />
            {addLabel}
          </button>
        </div>
      )}
    </>
  );
}

export function ProductModulePage({ module }: { module: ProductModule }) {
  const {
    date, setDate, saving, error,
    track,
    setTrack,
    tracks,
    setTracks,
    secretTab,
    setSecretTab,
    trials,
    setTrials,
    recipe,
    setRecipe,
    result,
    setResult,
    product,
    setProduct,
    batches,
    setBatches,
    addBatch,
  } = useProductModuleStore();
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [deleting, setDeleting] = useState<{
    product: Product;
    batch: Batch;
  } | null>(null);

  const lock = () => {
    setPin("");
    setPinError("");
    setUnlocked(false);
    setDeleting(null);
  };

  const locked = module === "secret" && !unlocked;
  const info = productModules.find((item) => item.id === module)!;
  const productTitle = products.find((item) => item.id === product)!.title;

  return (
    <>
      <section className="product-module-page">
        <PageHeading
          eyebrow="ЛАБОРАТОРИЙН МОДУЛЬ"
          title={locked ? "Secret · Нууц үг" : info.title}
          description={info.description}
        >
          {module === "secret" && unlocked && (
            <button type="button" className="button secondary" onClick={lock}>
              <LockKeyhole size={15} /> Түгжих
            </button>
          )}
          <Link href="/" className="button secondary">
            <ArrowLeft size={15} />
            Хяналтын самбар
          </Link>
        </PageHeading>
        {locked ? (
          <form
            className="panel product-pin-panel"
            onSubmit={async (event) => {
              event.preventDefault();
              try { await api("/api/auth/verify/", { method: "POST", body: JSON.stringify({ password: pin }) }); setUnlocked(true); setPin(""); setPinError(""); }
              catch (error) { setPinError(error instanceof Error ? error.message : "Нууц үг буруу байна."); }
            }}
          >
            <p className="modal-intro">
              Хамгаалалттай хэсгийг нээхийн тулд Нууц үгоо оруулна уу.
            </p>
            <label className="field">
              <span>Нууц үг</span>
              <input
                autoFocus
                type="password"
                autoComplete="off"
                maxLength={128}
                value={pin}
                aria-invalid={!!pinError}
                aria-describedby={pinError ? "product-pin-error" : undefined}
                onChange={(event) => {
                  setPin(event.target.value);
                  setPinError("");
                }}
              />
            </label>
            {pinError && (
              <p id="product-pin-error" className="field-error" role="alert">
                {pinError}
              </p>
            )}
            <div className="dialog-actions">
              <Link href="/" className="button secondary">
                Болих
              </Link>
              <button type="submit" className="button primary">
                Нээх
              </button>
            </div>
          </form>
        ) : (
          <div className="product-module">
            <p className="modal-intro">
              {saving ? "Хадгалж байна…" : "Утга оруулаад талбараас гарахад MySQL санд хадгалагдана."}
            </p>
            {error && <p className="field-error" role="alert">{error}</p>}
            <label className="field product-module-temperature"><span>Бүртгэлийн огноо</span><input type="date" value={date} disabled={saving > 0} onChange={event => { if (event.target.value) setDate(event.target.value); }} /></label>
            <fieldset className="erp-fields" disabled={saving > 0}>
            {module === "sleepers" && (
              <>
                <div className="segmented" role="group" aria-label="Зам сонгох">
                  {tracks.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      className={track === index ? "active" : ""}
                      aria-pressed={track === index}
                      onClick={() => setTrack(index)}
                    >
                      {index + 1}-р зам
                    </button>
                  ))}
                </div>
                <label className="field product-module-temperature">
                  <span>{track + 1}-р зам · Температур, °C</span>
                  <div className="input-with-unit">
                    <DraftCell
                      type="number"
                      step="any"
                      value={tracks[track].temperature}
                      onCommit={(temperature) => {
                        setTracks((current) =>
                          current.map((item, index) =>
                            index === track ? { ...item, temperature } : item,
                          ),
                        );
                      }}
                    />
                    <span>°C</span>
                  </div>
                </label>
                <section className="panel">
                  <SectionHeading
                    title={`${track + 1}-р зам · 8 цагийн бүртгэл`}
                  />
                  <EditableTable
                    title={`${track + 1}-р зам`}
                    columns={hourColumns}
                    rows={tracks[track].rows}
                    hourly
                    onChange={(rows) =>
                      setTracks((current) =>
                        current.map((item, index) =>
                          index === track ? { ...item, rows } : item,
                        ),
                      )
                    }
                  />
                </section>
              </>
            )}
            {module === "secret" && unlocked && (
              <>
                <div
                  className="segmented"
                  role="group"
                  aria-label="Secret хэсэг сонгох"
                >
                  <button
                    type="button"
                    className={secretTab === "trials" ? "active" : ""}
                    aria-pressed={secretTab === "trials"}
                    onClick={() => setSecretTab("trials")}
                  >
                    Туршилт
                  </button>
                  <button
                    type="button"
                    className={secretTab === "recipe" ? "active" : ""}
                    aria-pressed={secretTab === "recipe"}
                    onClick={() => setSecretTab("recipe")}
                  >
                    Найрлага
                  </button>
                  <button
                    type="button"
                    className={secretTab === "result" ? "active" : ""}
                    aria-pressed={secretTab === "result"}
                    onClick={() => setSecretTab("result")}
                  >
                    Үр дүн
                  </button>
                </div>
                <section className="panel">
                  <SectionHeading
                    title={secretTab === "trials" ? "Туршилт" : secretTab === "recipe" ? "Найрлага" : "Үр дүн"}
                    subtitle={secretTab === "result" ? "Туршилтын эцсийн дүгнэлтийг гараар бичнэ үү." : "Хэмжилтийн утгыг гараар оруулна уу."}
                  />
                  {secretTab === "trials" ? (
                    <EditableTable
                      title="Туршилт"
                      columns={trialColumns}
                      rows={trials}
                      onChange={setTrials}
                      addLabel="Туршилт нэмэх"
                    />
                  ) : secretTab === "recipe" ? (
                    <EditableTable
                      title="Найрлага"
                      columns={fractionColumns}
                      rows={recipe}
                      onChange={setRecipe}
                      addLabel="Мөр нэмэх"
                      totals
                    />
                  ) : (
                    <DraftTextarea
                      aria-label="Үр дүн"
                      className="result-textarea"
                      rows={10}
                      placeholder="Туршилтын эцсийн үр дүн, дүгнэлтийг энд бичнэ үү."
                      value={result}
                      onCommit={setResult}
                    />
                  )}
                </section>
              </>
            )}
            {module === "small" && (
              <>
                <div
                  className="segmented"
                  role="group"
                  aria-label="Бүтээгдэхүүн сонгох"
                >
                  {products.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={product === item.id ? "active" : ""}
                      aria-pressed={product === item.id}
                      onClick={() => setProduct(item.id)}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
                {batches[product].map((batch) => (
                  <section className="panel" key={batch.id}>
                    <SectionHeading
                      title={`Тогоо №${batch.number}`}
                      subtitle={productTitle}
                      action={
                        <button
                          type="button"
                          className="button secondary small"
                          onClick={() => setDeleting({ product, batch })}
                        >
                          <Trash2 size={14} />
                          Тогоо устгах
                        </button>
                      }
                    />
                    <EditableTable
                      title={`${productTitle}, Тогоо №${batch.number}`}
                      columns={productColumns}
                      rows={batch.rows}
                      addLabel="Мөр нэмэх"
                      onChange={(rows) =>
                        setBatches((current) => ({
                          ...current,
                          [product]: current[product].map((item) =>
                            item.id === batch.id ? { ...item, rows } : item,
                          ),
                        }))
                      }
                    />
                  </section>
                ))}
                {!batches[product].length && (
                  <p className="muted">Тогоо байхгүй. Шинэ тогоо нэмнэ үү.</p>
                )}
                <button
                  type="button"
                  className="button primary"
                  onClick={() => addBatch(product)}
                >
                  <Plus size={16} />
                  Тогоо нэмэх
                </button>
              </>
            )}
            </fieldset>
          </div>
        )}
      </section>
      {deleting && (
        <ConfirmDialog
          title={`Тогоо №${deleting.batch.number}-г устгах уу?`}
          description="Энэ тогооны бүх мөр устах бөгөөд буцаах боломжгүй."
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            setBatches((current) => ({
              ...current,
              [deleting.product]: current[deleting.product].filter(
                (item) => item.id !== deleting.batch.id,
              ),
            }))
          }
        />
      )}
    </>
  );
}
