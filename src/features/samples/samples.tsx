"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowDownToLine,
  ArrowRight,
  Box,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Filter,
  Plus,
  Search,
} from "lucide-react";
import { useLabStore } from "@/lib/store";
import { RequestError } from "@/lib/api";
import type { Sample, SampleStatus } from "@/lib/types";
import {
  sampleProducts,
  sampleTracks,
  sampleTrackingFields,
  sampleTrackSummary,
  totalTrackSamples,
  validateSampleTracking,
  type SampleProduct,
  type SampleTrackKey,
} from "@/lib/sample-products";
import { dayOffset, formatDate, TODAY, uid } from "@/lib/utils";
import {
  EmptyState,
  Modal,
  PageHeading,
  SectionHeading,
  StatusBadge,
  useUI,
} from "@/components/ui";
import { PhotoUpload } from "@/components/photo-upload";
import { CompanyTransfer } from "./company-transfer";

const statuses: SampleStatus[] = [
  "Бүртгэсэн",
  "Бэхжүүлж байгаа",
  "Туршилтад бэлэн",
  "Туршсан",
  "Хянаж байгаа",
  "Баталгаажсан",
  "Хугацаа хэтэрсэн",
];
const materialGrades: Record<string, string[]> = {
  Бетон: ["M400", "M600"],
  Цемент: ["PC 52.5"],
  Элс: ["0–5 мм"],
  Дайрга: ["10–20 мм"],
};
const schema = z.object({
  ...sampleTrackingFields,
  code: z.string().trim().min(3, "Сорьцын кодыг оруулна уу."),
  material: z.string().min(1, "Материал сонгоно уу."),
  grade: z.string().min(1, "Марк, ангилал сонгоно уу."),
  project: z.string().trim().min(2, "Төслийн нэрийг оруулна уу."),
  element: z.string().trim().min(2, "Бүтээцийн нэрийг оруулна уу."),
  castingDate: z
    .string()
    .min(1, "Огноо сонгоно уу.")
    .refine((v) => v <= TODAY, "Өнөөдрөөс хойших огноо сонгох боломжгүй."),
  companyPlannedDate: z.union([z.literal(""), z.iso.date("Огноо зөв оруулна уу.")]),
  age: z
    .string()
    .refine(
      (v) => ["3", "7", "28"].includes(v),
      "3, 7 эсвэл 28 хоног сонгоно уу.",
    ),
  count: z
    .number({ error: "Тоо ширхэгийг оруулна уу." })
    .int("Бүхэл тоо оруулна уу.")
    .min(1, "Хамгийн багадаа 1 сорьц байна.")
    .max(100, "100-аас ихгүй байна."),
  technician: z.string().min(1, "Ажилтан сонгоно уу."),
}).superRefine(validateSampleTracking).refine((v) => !v.companyPlannedDate || v.companyPlannedDate >= v.castingDate, {
  path: ["companyPlannedDate"], message: "Явах огноо дээж авсан огнооноос өмнө байж болохгүй.",
});
type SampleInput = z.infer<typeof schema>;
export function NewSampleModal({ onClose }: { onClose: () => void }) {
  const [photos, setPhotos] = useState<string[]>([]);
  const addSample = useLabStore((s) => s.addSample);
  const samples = useLabStore((s) => s.samples);
  const {
    register,
    handleSubmit,
    control,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SampleInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      product: "other",
      track1Count: 0,
      track2Count: 0,
      track3Count: 0,
      material: "Бетон",
      grade: "M400",
      castingDate: TODAY,
      companyPlannedDate: "",
      count: 6,
      age: "28",
      technician: useLabStore.getState().user?.fullName || "",
    },
  });
  const castingDate = useWatch({ control, name: "castingDate" });
  const material = useWatch({ control, name: "material" });
  const product = useWatch({ control, name: "product" });
  const hasTracks = product !== "other";
  const fieldError = (name: keyof SampleInput) =>
    errors[name] ? (
      <span className="field-error">{errors[name]?.message}</span>
    ) : null;
  return (
    <Modal title="Шинэ дээж, сорьц бүртгэх" onClose={onClose} wide>
      <p className="modal-intro">
        Сорьцын үндсэн мэдээллийг оруулна уу. Туршилтын хуваарь автоматаар
        үүснэ.
      </p>
      <form
        noValidate
        onSubmit={handleSubmit(async (values) => {
          if (
            samples.some(
              (s) => s.code.toLowerCase() === values.code.toLowerCase(),
            )
          ) {
            setError("code", { message: "Энэ кодтой сорьц бүртгэлтэй байна." });
            return;
          }
          try { await addSample({
            ...values,
            companyPlannedDate: values.companyPlannedDate || null,
            id: uid(),
            age: Number(values.age),
            registeredDate: TODAY,
            status: "Бүртгэсэн",
            photos,
          });
          useUI.getState().notify(`${values.code} сорьц амжилттай бүртгэгдлээ`);
          onClose();
          } catch (error) {
            let fieldError = false;
            if (error instanceof RequestError) {
              for (const issue of error.fields) {
                const name = issue.path.replace(/^data\./, "");
                if (name in schema.shape) {
                  setError(name as keyof SampleInput, { type: "server", message: issue.message });
                  fieldError = true;
                }
              }
            }
            if (!fieldError) setError("root.server", { message: error instanceof Error ? error.message : "Хадгалж чадсангүй." });
          }
        })}
      >
        <div className="form-grid">
          <label className="field span-2">
            <span>Бүтээгдэхүүн <b>*</b></span>
            <select {...register("product", {
              onChange: (event) => {
                const next = event.target.value as SampleProduct;
                if (next === "other") {
                  sampleTracks.forEach(({ key }) => setValue(key, 0));
                  setValue("count", 6, { shouldValidate: true });
                } else {
                  if (getValues("material") !== "Бетон") setValue("grade", "M400");
                  setValue("material", "Бетон");
                  setValue("element", sampleProducts[next]);
                  if (next === "ot-slab" && !getValues("project")) setValue("project", "Оюу толгой");
                  setValue("count", totalTrackSamples(getValues()));
                }
              },
            })}>
              {Object.entries(sampleProducts).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {fieldError("product")}
          </label>
          <label className="field">
            <span>
              Сорьцын код <b>*</b>
            </span>
            <input
              {...register("code")}
              placeholder="Жишээ: U-C-3681–3686"
              aria-invalid={!!errors.code}
            />
            {fieldError("code")}
          </label>
          <label className="field">
            <span>
              Материал <b>*</b>
            </span>
            <select
              {...register("material", {
                onChange: (e) =>
                  setValue("grade", materialGrades[e.target.value][0]),
              })}
            >
              {(hasTracks ? ["Бетон"] : ["Бетон", "Цемент", "Элс", "Дайрга"]).map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            {fieldError("material")}
          </label>
          <label className="field">
            <span>
              Марк / ангилал <b>*</b>
            </span>
            <select {...register("grade")}>
              {(materialGrades[material] || []).map((grade) => (
                <option key={grade}>{grade}</option>
              ))}
            </select>
            {fieldError("grade")}
          </label>
          <label className="field">
            <span>
              Төсөл <b>*</b>
            </span>
            <input {...register("project")} placeholder="Төслийн нэр" />
            {fieldError("project")}
          </label>
          <label className="field">
            <span>
              Бүтээц / авсан байршил <b>*</b>
            </span>
            <input {...register("element")} placeholder="Суурийн хавтан" />
            {fieldError("element")}
          </label>
          <label className="field">
            <span>
              {material === "Бетон" ? "Цутгасан" : "Дээж авсан"} огноо <b>*</b>
            </span>
            <input type="date" max={TODAY} {...register("castingDate")} />
            {fieldError("castingDate")}
          </label>
          <label className="field span-2">
            <span>БАРИЛГА АРХИТЕКТУР КОМПАНИ руу явах огноо</span>
            <input type="date" min={castingDate || undefined} {...register("companyPlannedDate")} aria-invalid={!!errors.companyPlannedDate} />
            <small>Огноо тэмдэглэвэл компанийн «Дээжийн бүртгэл»-д «Явахаар товлосон» төлөвтэй шууд харагдана.</small>
            {fieldError("companyPlannedDate")}
          </label>
          {hasTracks && (
            <fieldset className="sample-track-fields span-2">
              <legend>Замаар авсан дээжийн тоо</legend>
              <p>Дээж авсан замын тоог оруулна уу. Аваагүй замыг 0 гэж үлдээнэ.</p>
              <div className="sample-track-grid">
                {sampleTracks.map(({ key, label }) => (
                  <label className="field" key={key}>
                    <span>{label}</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      aria-label={`${label} — дээжийн тоо`}
                      aria-invalid={!!errors[key]}
                      {...register(key, {
                        setValueAs: (value) => value === "" ? 0 : Number(value),
                        onChange: () => setValue("count", totalTrackSamples(getValues()), { shouldValidate: true }),
                      })}
                    />
                    {fieldError(key)}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <label className="field">
            <span>Туршилтын хоног</span>
            <select {...register("age")}>
              <option value="3">3 хоног</option>
              <option value="7">7 хоног</option>
              <option value="28">28 хоног</option>
            </select>
          </label>
          <label className="field">
            <span>
              Сорьцын тоо <b>*</b>
            </span>
            <input
              type="number"
              min={1}
              max={100}
              step={1}
              readOnly={hasTracks}
              aria-invalid={!!errors.count}
              {...register("count", { valueAsNumber: true })}
            />
            {hasTracks && <small>3 замын нийлбэрээр автоматаар бодно.</small>}
            {fieldError("count")}
          </label>
          <label className="field span-2">
            <span>Хариуцсан ажилтан</span>
            <select {...register("technician")}>
              {[...new Set([useLabStore.getState().user?.fullName || "", ...samples.map(s => s.technician)])].map(
                (v) => (
                  <option key={v}>{v}</option>
                ),
              )}
            </select>
          </label>
        </div>
        {castingDate && !Number.isNaN(Date.parse(castingDate)) && (
          <div className="schedule-preview">
            <CalendarDays size={21} />
            <div>
              <strong>Автомат туршилтын хуваарь</strong>
              <div>
                {[3, 7, 28].map((age) => (
                  <span key={age}>
                    {age} хоног <b>{formatDate(dayOffset(castingDate, age))}</b>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
        <PhotoUpload photos={photos} onChange={setPhotos} />
        {errors.root?.server && <p className="field-error" role="alert">{errors.root.server.message}</p>}
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Болих
          </button>
          <button className="button primary" type="submit" disabled={isSubmitting}>
            <Plus size={17} />
            Сорьц бүртгэх
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function SampleTable({
  samples,
  onSelect,
  compact = false,
}: {
  samples: Sample[];
  onSelect: (sample: Sample) => void;
  compact?: boolean;
}) {
  if (!samples.length) return <EmptyState />;
  return (
    <div className="table-scroll">
      <table className={`data-table ${compact ? "compact" : ""}`}>
        <thead>
          <tr>
            <th>Сорьцын код / Материал</th>
            <th>Төсөл, бүтээц</th>
            {!compact && (
              <>
                <th>Цутгасан огноо</th>
                <th>Туршилтын хоног / Тоо</th>
                <th>Дараагийн туршилт</th>
                <th>Компани руу явах</th>
              </>
            )}
            <th>Төлөв</th>
            {!compact && <th>Хариуцагч</th>}
            <th>
              <span className="sr-only">Дэлгэрэнгүй</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {samples.map((s) => (
            <tr key={s.id} onClick={() => onSelect(s)}>
              <td>
                <button
                  className="table-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(s);
                  }}
                >
                  <span className="sample-table-icon">
                    <Box size={18} />
                  </span>
                  <span>
                    <strong>{s.code}</strong>
                    <small>
                      {s.material} <span className="text-divider">/</span>{" "}
                      {s.grade}
                    </small>
                  </span>
                </button>
              </td>
              <td>
                <span className="table-project">{s.project}</span>
                <small>{s.element}</small>
                {s.product && s.product !== "other" && (
                  <div className="sample-track-summary">
                    {s.element !== sampleProducts[s.product] && <strong>{sampleProducts[s.product]}</strong>}
                    <small>{sampleTrackSummary(s)}</small>
                  </div>
                )}
              </td>
              {!compact && (
                <>
                  <td className="mono">{formatDate(s.castingDate)}</td>
                  <td>
                    {s.age} хоног<small>{s.count} ширхэг</small>
                  </td>
                  <td className="mono">
                    {formatDate(dayOffset(s.castingDate, s.age))}
                  </td>
                  <td className="mono" title="БАРИЛГА АРХИТЕКТУР КОМПАНИ">
                    {s.companyPlannedDate ? formatDate(s.companyPlannedDate) : "Товлоогүй"}
                  </td>
                </>
              )}
              <td>
                <StatusBadge status={s.status} />
              </td>
              {!compact && (
                <td>
                  <span className="person-cell">
                    <span className="tiny-avatar">
                      {s.technician.slice(0, 1)}
                    </span>
                    {s.technician}
                  </span>
                </td>
              )}
              <td>
                <ChevronRight size={16} className="muted" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function SampleTimeline({ sample }: { sample: Sample }) {
  return (
    <div className="sample-timeline">
      {[3, 7, 28].map((age) => {
        const date = dayOffset(sample.castingDate, age);
        const past = date < TODAY;
        const today = date === TODAY;
        return (
          <div key={age} className={today ? "today" : past ? "past" : ""}>
            <span className="timeline-point">
              {past ? <Check size={16} /> : <Clock3 size={16} />}
            </span>
            <strong>{age} хоног</strong>
            <span className="mono">{formatDate(date)}</span>
            <small>
              {today
                ? "Өнөөдөр туршина"
                : past
                  ? "Хуваарь өнгөрсөн"
                  : "Бэхжүүлэлт"}
            </small>
          </div>
        );
      })}
    </div>
  );
}
export function SampleDetail({
  sample,
  onClose,
}: {
  sample: Sample;
  onClose: () => void;
}) {
  const [tab, setTab] = useState("Мэдээлэл");
  const tests = useLabStore((s) => s.tests).filter(
    (t) => t.sampleCode === sample.code,
  );
  return (
    <Modal title="Сорьцын дэлгэрэнгүй" drawer onClose={onClose}>
      <div className="detail-hero">
        <span className="detail-icon">
          <Box size={28} />
        </span>
        <div>
          <div className="eyebrow">
            {sample.material} · {sample.grade}
          </div>
          <h2>{sample.code}</h2>
          <p>{sample.project}</p>
        </div>
        <StatusBadge status={sample.status} />
      </div>
      <div className="tabs">
        {["Мэдээлэл", "Сорьц, зураг", "Үр дүн", "Үйл ажиллагаа"].map((t) => (
          <button
            className={t === tab ? "active" : ""}
            onClick={() => setTab(t)}
            key={t}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Мэдээлэл" && (
        <>
          <SectionHeading title="Ерөнхий мэдээлэл" />
          <dl className="detail-grid">
            {[
              ["Бүтээц", sample.element],
              ["Цутгасан огноо", formatDate(sample.castingDate)],
              ["Сорьцын тоо", `${sample.count} ширхэг`],
              ["Хариуцсан ажилтан", sample.technician],
              ["Туршилтын хоног", `${sample.age} хоног`],
              ["Бүртгэсэн огноо", formatDate(sample.registeredDate)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {sample.product && sample.product !== "other" && (
            <>
              <SectionHeading title={sampleProducts[sample.product]} subtitle="Замаар авсан дээжийн тоо" />
              <dl className="sample-track-grid sample-track-detail">
                {sampleTracks.map(({ key, label }) => (
                  <div key={key}>
                    <dt>{label}</dt>
                    <dd>{sample[key] ?? 0} <small>дээж</small></dd>
                  </div>
                ))}
              </dl>
            </>
          )}
          <CompanyTransfer key={sample.id} sample={sample} />
          <SectionHeading title="Бэхжүүлэлт, туршилтын хуваарь" />
          <SampleTimeline sample={sample} />
          <div className="qr-block">
            <QRCodeSVG
              value={`СОРЬЦ | ${sample.code} | ${sample.material} ${sample.grade} | ${sample.project} | ${sample.castingDate}`}
              size={88}
              level="M"
            />
            <div>
              <strong>Сорьцын таних тэмдэг</strong>
              <p>{sample.code}</p>
              <small>Кодоор сорьцын мэдээллийг уншина.</small>
            </div>
          </div>
          <SectionHeading title="Холбогдох цахим маягт" />
          <Link
            className="related-link"
            href={`/forms/?type=${sample.material === "Цемент" ? "cement" : sample.material === "Элс" ? "sand" : sample.material === "Дайрга" ? "aggregate" : "compression"}&sample=${encodeURIComponent(sample.code)}`}
          >
            <ClipboardList size={20} />
            <span>
              {sample.material === "Бетон"
                ? "Матл-17 · Бетоны шахалтын бат бэх"
                : `${sample.material} · Материалын шинжилгээ`}
            </span>
            <ArrowRight size={18} />
          </Link>
        </>
      )}
      {tab === "Сорьц, зураг" && (
        <>
          <SectionHeading
            title={`${sample.count} ширхэг сорьц`}
            subtitle="Сорьц бүрийг дугаараар ялган бүртгэнэ."
          />
          <div className="specimen-grid">
            {Array.from({ length: sample.count }, (_, i) => (
              <div className="specimen" key={i}>
                <Box size={32} strokeWidth={1} />
                <strong>Сорьц {String(i + 1).padStart(2, "0")}</strong>
                <small>
                  {sample.material === "Бетон"
                    ? "150 × 150 × 150 мм"
                    : sample.grade}
                </small>
                <StatusBadge status={sample.status} />
              </div>
            ))}
          </div>
          <SectionHeading title="Хавсаргасан зураг" />
          <PhotoUpload
            photos={sample.photos}
            onChange={(photos) =>
              useLabStore.setState((s) => ({
                samples: s.samples.map((v) =>
                  v.id === sample.id ? { ...v, photos } : v,
                ),
              }))
            }
          />
        </>
      )}
      {tab === "Үр дүн" && (
        <>
          <SectionHeading title="Шинжилгээний үр дүн" />
          {tests.length ? (
            <div className="result-list">
              {tests.map((t) => (
                <Link href={`/tests/?id=${t.id}`} key={t.id}>
                  <div>
                    <strong>{t.result.toFixed(1)} МПа</strong>
                    <small>
                      {formatDate(t.date)} · {t.values.age || sample.age} хоног
                      · {t.technician}
                    </small>
                  </div>
                  <StatusBadge status={t.state} />
                  <ChevronRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Туршилтын үр дүн бүртгэгдээгүй"
              description="Сорьцын насанд тохирсон туршилтыг хийж, үр дүнгээ оруулна уу."
            />
          )}
          <Link
            href={`/forms/?type=compression&sample=${encodeURIComponent(sample.code)}`}
            className="button primary full-width"
          >
            <Plus size={17} />
            Үр дүн оруулах
          </Link>
        </>
      )}
      {tab === "Үйл ажиллагаа" && (
        <div className="activity-timeline">
          <div>
            <span>
              <Check size={15} />
            </span>
            <strong>Сорьц бүртгэгдсэн</strong>
            <p>
              {sample.technician} · {formatDate(sample.registeredDate)}
            </p>
          </div>
          <div>
            <span>
              <CalendarDays size={15} />
            </span>
            <strong>3, 7, 28 хоногийн хуваарь үүссэн</strong>
            <p>Цутгасан огнооноос автоматаар тооцоолов.</p>
          </div>
          {tests.map((t) => (
            <div key={t.id}>
              <span>
                <ClipboardList size={15} />
              </span>
              <strong>
                {t.approved ? "Үр дүн баталгаажсан" : "Үр дүн хяналтад шилжсэн"}
              </strong>
              <p>
                {formatDate(t.date)} · {t.technician} · {t.result.toFixed(1)}{" "}
                МПа
              </p>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
function SampleScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const samples = useLabStore((s) => s.samples);
  const [search, setSearch] = useState(params.get("q") || "");
  const [material, setMaterial] = useState(params.get("material") || "");
  const [grade, setGrade] = useState("");
  const [product, setProduct] = useState<SampleProduct | "">("");
  const [track, setTrack] = useState<SampleTrackKey | "">("");
  const [age, setAge] = useState(params.get("age") || "");
  const [status, setStatus] = useState(params.get("status") || "");
  const [date, setDate] = useState(params.get("date") || "");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(params.get("id"));
  const selected = samples.find((s) => s.id === selectedId);
  const filtered = samples.filter(
    (s) =>
      (!search ||
        `${s.code} ${s.project} ${s.element} ${sampleProducts[s.product ?? "other"]} ${sampleTrackSummary(s)}`
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (!material || s.material === material) &&
      (!grade || s.grade === grade) &&
      (!product || (s.product ?? "other") === product) &&
      (!track || (s[track] ?? 0) > 0) &&
      (!age || s.age === +age) &&
      (!status ||
        (status === "pending"
          ? !["Туршсан", "Баталгаажсан", "Хянаж байгаа"].includes(s.status)
          : s.status === status)) &&
      (!date || s.registeredDate === date),
  );
  const reset = () => {
    setSearch("");
    setMaterial("");
    setGrade("");
    setProduct("");
    setTrack("");
    setAge("");
    setStatus("");
    setDate("");
    setPage(1);
  };
  const exportCsv = () => {
    const rows = [
      ["Код", "Материал", "Марк", "Төсөл", "Бүтээгдэхүүн", "1-р зам", "2-р зам", "3-р зам", "Огноо", "Туршилтын хоног", "Тоо", "Төлөв", "Компани руу явах огноо"],
      ...filtered.map((s) => [
        s.code,
        s.material,
        s.grade,
        s.project,
        sampleProducts[s.product ?? "other"],
        ...sampleTracks.map(({ key }) => s.product && s.product !== "other" ? s[key] ?? 0 : ""),
        s.castingDate,
        s.age,
        s.count,
        s.status,
        s.companyPlannedDate ?? "",
      ]),
    ];
    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "сорьцын-бүртгэл.csv";
    a.click();
    URL.revokeObjectURL(url);
    useUI.getState().notify("Сорьцын жагсаалт татагдлаа");
  };
  return (
    <>
      <PageHeading
        eyebrow="БҮРТГЭЛ БА ХЯНАЛТ"
        title="Дээж, сорьц"
        description="Сорьц бүрийн түүх, бэхжүүлэлт, туршилтын хуваарь нэг дор."
      >
        <button className="button secondary" onClick={exportCsv}>
          <ArrowDownToLine size={17} />
          Татах
        </button>
        <button
          className="button primary"
          onClick={() => useUI.getState().setSampleOpen(true)}
        >
          <Plus size={18} />
          Сорьц бүртгэх
        </button>
      </PageHeading>
      <div className="summary-strip">
        {[
          ["Нийт сорьц", samples.length, ""],
          [
            "Бэхжүүлж байгаа",
            samples.filter((s) => s.status === "Бэхжүүлж байгаа").length,
            "Бэхжүүлж байгаа",
          ],
          [
            "Туршилтад бэлэн",
            samples.filter((s) => s.status === "Туршилтад бэлэн").length,
            "Туршилтад бэлэн",
          ],
          [
            "Хугацаа хэтэрсэн",
            samples.filter((s) => s.status === "Хугацаа хэтэрсэн").length,
            "Хугацаа хэтэрсэн",
          ],
        ].map(([label, value, key]) => (
          <button
            className={status === key ? "active" : ""}
            onClick={() => {
              setStatus(String(key));
              setPage(1);
            }}
            key={label}
          >
            <span>{label}</span>
            <strong>{value}</strong>
          </button>
        ))}
      </div>
      <div className="sample-products-heading">
        <h2>Замаар авсан дээж</h2>
        <button className="text-button" onClick={() => { setProduct(""); setTrack(""); setPage(1); }}>
          Бүх бүтээгдэхүүн
        </button>
      </div>
      <div className="sample-product-cards">
        {(["sleeper", "ot-slab"] as const).map((key) => {
          const records = samples.filter((sample) => sample.product === key);
          return (
            <button
              key={key}
              className={`sample-product-card ${product === key ? "active" : ""}`}
              aria-pressed={product === key}
              onClick={() => { setProduct(product === key ? "" : key); setPage(1); }}
            >
              <span className="sample-product-title">
                <strong>{sampleProducts[key]}</strong>
                <span>Нийт {records.reduce((total, sample) => total + sample.count, 0)} дээж</span>
              </span>
              <span className="sample-track-grid">
                {sampleTracks.map(({ key: countKey, label }) => (
                  <span key={countKey}>
                    <span>{label}</span>
                    <strong>{records.reduce((total, sample) => total + (sample[countKey] ?? 0), 0)} <small>дээж</small></strong>
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <section className="panel">
        <div className="filter-toolbar">
          <label className="search-input">
            <Search size={18} />
            <input
              aria-label="Сорьц хайх"
              placeholder="Сорьцын код, төсөл хайх..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <div className="sample-track-filters">
            <select aria-label="Бүтээгдэхүүнээр шүүх" value={product} onChange={(event) => { setProduct(event.target.value as SampleProduct | ""); setPage(1); }}>
              <option value="">Бүх бүтээгдэхүүн</option>
              {Object.entries(sampleProducts).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select aria-label="Замаар шүүх" value={track} onChange={(event) => { setTrack(event.target.value as SampleTrackKey | ""); setPage(1); }}>
              <option value="">Бүх зам</option>
              {sampleTracks.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          <div className="filter-count">
            <Filter size={16} />
            {filtered.length} илэрц
          </div>
        </div>
        <div className="filters-grid">
          {[
            {
              label: "Бүх материал",
              value: material,
              setter: setMaterial,
              options: ["Бетон", "Цемент", "Элс", "Дайрга"],
            },
            {
              label: "Бүх марк",
              value: grade,
              setter: setGrade,
              options: ["M400", "M600", "PC 52.5", "0–5 мм", "10–20 мм"],
            },
            {
              label: "Бүх хоног",
              value: age,
              setter: setAge,
              options: ["3", "7", "28"],
            },
            {
              label: "Бүх төлөв",
              value: status,
              setter: setStatus,
              options: statuses,
            },
          ].map((f) => (
            <select
              key={f.label}
              aria-label={f.label}
              value={f.value}
              onChange={(e) => {
                f.setter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{f.label}</option>
              {f.options.map((o) => (
                <option key={o} value={o}>
                  {f.label === "Бүх хоног" ? `${o} хоног` : o}
                </option>
              ))}
              {f.value === "pending" && (
                <option value="pending">Хүлээгдэж буй</option>
              )}
            </select>
          ))}
          <input
            type="date"
            aria-label="Бүртгэсэн огноогоор шүүх"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setPage(1);
            }}
          />
          <button className="text-button" onClick={reset}>
            Цэвэрлэх
          </button>
        </div>
        <SampleTable
          samples={filtered.slice((page - 1) * 8, page * 8)}
          onSelect={(s) => setSelectedId(s.id)}
        />
        <div className="table-footer">
          <span>
            Нийт {filtered.length} сорьцоос{" "}
            {filtered.length ? (page - 1) * 8 + 1 : 0}–
            {Math.min(page * 8, filtered.length)}
          </span>
          <div className="pagination">
            <button
              className="icon-button"
              aria-label="Өмнөх хуудас"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            <span>
              {page} / {Math.max(1, Math.ceil(filtered.length / 8))}
            </span>
            <button
              className="icon-button"
              aria-label="Дараах хуудас"
              disabled={page * 8 >= filtered.length}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>
      {selected && (
        <SampleDetail
          sample={selected}
          onClose={() => {
            setSelectedId(null);
            if (params.has("id")) router.replace("/samples/");
          }}
        />
      )}
    </>
  );
}
export function SamplesPage() {
  const params = useSearchParams();
  return <SampleScreen key={params.toString()} />;
}
