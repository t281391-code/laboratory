"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  FileChartColumn,
  FileText,
  Printer,
  ShieldCheck,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import { useLabStore } from "@/lib/store";

import {
  dayOffset,
  daysBetween,
  formNames,
  formatDate,
  TODAY,
} from "@/lib/utils";
import { PageHeading, StatusBadge } from "@/components/ui";
import { calculate } from "@/features/forms/config";
import { DocumentBrand } from "./report-record";
const reportTypes = [
  { key: "daily", title: "Өдрийн лабораторийн тайлан", icon: FileChartColumn },
  {
    key: "specimens",
    title: "Сорьцын 3/7/28 хоногийн тайлан",
    icon: CalendarDays,
  },
  { key: "materials", title: "Материалын шинжилгээний тайлан", icon: FileText },
  { key: "equipment", title: "Төхөөрөмжийн үзлэгийн тайлан", icon: Wrench },
  {
    key: "calibration",
    title: "Калибровкийн хугацааны тайлан",
    icon: ShieldCheck,
  },
];
export function ReportPreview({
  type,
  from,
  to,
  material,
}: {
  type: string;
  from: string;
  to: string;
  material: string;
}) {
  const allSamples = useLabStore((s) => s.samples);
  const equipmentRecords = useLabStore(s => s.equipment);
  const allTests = useLabStore((s) => s.tests);
  const samples = allSamples.filter(
    (s) =>
      s.registeredDate >= from &&
      s.registeredDate <= to &&
      (!material || s.material === material),
  );
  const tests = allTests.filter(
    (t) =>
      t.date >= from &&
      t.date <= to &&
      (!material ||
        allSamples.find((s) => s.code === t.sampleCode)?.material ===
          material) &&
      (type !== "materials" || t.kind !== "environment"),
  );
  const equipment = equipmentRecords.filter((e) =>
    type === "calibration"
      ? e.calibrationDate >= from && e.calibrationDate <= to
      : e.lastInspection >= from && e.lastInspection <= to,
  );
  const report = reportTypes.find((r) => r.key === type) || reportTypes[0];
  const list = [...equipment].sort((a, b) =>
    a.calibrationDate.localeCompare(b.calibrationDate),
  );
  return (
    <article className="print-document">
      <DocumentBrand />
      <div className="document-title">
        <span>ЛАБОРАТОРИЙН НЭГДСЭН БҮРТГЭЛ</span>
        <h1>{report.title}</h1>
        <p>ЛАБ · {from} — {to}</p>
      </div>
      <div className="document-meta">
        <div>
          <span>Тайлангийн хугацаа</span>
          <strong>
            {formatDate(from)} — {formatDate(to)}
          </strong>
        </div>
        <div>
          <span>Материал / хамрах хүрээ</span>
          <strong>
            {type === "equipment" || type === "calibration"
              ? "Лабораторийн төхөөрөмжүүд"
              : material || "Бүх материал"}
          </strong>
        </div>
      </div>
      {["daily", "materials"].includes(type) ? (
        <>
          <div className="report-stats">
            <div>
              <span>Шинжилгээ</span>
              <strong>{tests.length}</strong>
            </div>
            <div>
              <span>Хангасан</span>
              <strong>{tests.filter((t) => t.state === "pass").length}</strong>
            </div>
            <div>
              <span>Анхаарах / хангаагүй</span>
              <strong>{tests.filter((t) => t.state !== "pass").length}</strong>
            </div>
            <div>
              <span>Баталгаажсан</span>
              <strong>{tests.filter((t) => t.approved).length}</strong>
            </div>
          </div>
          <h2>Шинжилгээний үр дүнгийн нэгтгэл</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Сорьц / шинжилгээ</th>
                <th>Огноо</th>
                <th>Үр дүн</th>
                <th>Үнэлгээ</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t, i) => (
                <tr key={t.id}>
                  <td>{i + 1}</td>
                  <td>
                    <strong>{t.sampleCode}</strong>
                    <small>{formNames[t.kind]}</small>
                  </td>
                  <td>{formatDate(t.date)}</td>
                  <td>
                    {t.result.toFixed(2)} {calculate(t.kind, t.values).unit}
                  </td>
                  <td>
                    <StatusBadge status={t.state} />
                  </td>
                </tr>
              ))}
              {!tests.length && (
                <tr>
                  <td colSpan={5} className="report-empty">
                    Сонгосон хугацаанд шинжилгээ бүртгэгдээгүй.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      ) : type === "specimens" ? (
        <>
          <h2>Бэхжүүлэлт ба туршилтын хуваарь</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Сорьцын код</th>
                <th>3 хоног</th>
                <th>7 хоног</th>
                <th>28 хоног</th>
                <th>Төлөв</th>
              </tr>
            </thead>
            <tbody>
              {samples.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.code}</strong>
                    <small>
                      {s.material} · {s.grade}
                    </small>
                  </td>
                  {[3, 7, 28].map((age) => (
                    <td key={age}>
                      {formatDate(dayOffset(s.castingDate, age))}
                      <small>
                        {allTests
                          .filter(
                            (t) =>
                              t.sampleCode === s.code &&
                              Number(
                                t.values.age ||
                                  daysBetween(t.values.castingDate, t.date),
                              ) === age,
                          )
                          .slice(0, 1)
                          .map((t) => `${t.result.toFixed(1)} МПа`)}
                      </small>
                    </td>
                  ))}
                  <td>{s.status}</td>
                </tr>
              ))}
              {!samples.length && (
                <tr>
                  <td colSpan={5} className="report-empty">
                    Сонгосон хугацаанд бүртгэсэн сорьц байхгүй.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="document-note">
            Шүүлтүүр нь сорьцын бүртгэсэн огноогоор үйлчилнэ. Туршилтын хугацааг
            цутгасан өдрөөс тооцоолов.
          </p>
        </>
      ) : (
        <>
          <h2>
            {type === "calibration"
              ? "Калибровкийн хугацааны хяналт"
              : "Төлөвлөгөөт үзлэгийн бүртгэл"}
          </h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Төхөөрөмж</th>
                <th>
                  {type === "calibration"
                    ? "Хүчинтэй хугацаа"
                    : "Сүүлийн үзлэг"}
                </th>
                <th>
                  {type === "calibration" ? "Үлдсэн хоног" : "Дараагийн үзлэг"}
                </th>
                <th>Төлөв</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.name}</strong>
                    <small>{e.serial}</small>
                  </td>
                  <td>
                    {formatDate(
                      type === "calibration"
                        ? e.calibrationDate
                        : e.lastInspection,
                    )}
                  </td>
                  <td>
                    {type === "calibration"
                      ? `${daysBetween(TODAY, e.calibrationDate)} хоног`
                      : formatDate(e.nextInspection)}
                  </td>
                  <td>{e.status}</td>
                </tr>
              ))}
              {!list.length && (
                <tr>
                  <td colSpan={5} className="report-empty">
                    Сонгосон хугацаанд бүртгэл байхгүй.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="document-note">
            {type === "calibration"
              ? "Калибровк дуусах огноогоор шүүсэн. Үлдсэн хугацааг 2026.09.22-ны өдрөөр тооцоолов."
              : "Сүүлийн үзлэгийн огноогоор шүүсэн."}
          </p>
        </>
      )}
      <div className="document-summary">
        <h2>Тэмдэглэл</h2>
        <p>
          Энэ тайлан нь лабораторийн танилцуулгын ажлын орон зай дахь бүртгэлээс
          үүсэв. Үр дүнгийн эцсийн хяналт, баталгаажуулалтыг хариуцсан инженер
          гүйцэтгэнэ.
        </p>
      </div>
      <div className="document-signatures">
        <div>
          <span>Тайлан бэлтгэсэн</span>
          <strong>____________________</strong>
        </div>
        <div>
          <span>Хянасан</span>
          <strong>____________________</strong>
          <small>Лабораторийн эрхлэгч</small>
        </div>
      </div>
      <div className="document-footer">
        <span>Танилцуулгын мэдээлэл · Албан ёсны дүгнэлт биш</span>
        <span>Улаан баатар БҮК Лаборатори / 2026</span>
      </div>
    </article>
  );
}
export function ReportsPage() {
  const params = useSearchParams();
  const initial = reportTypes.some((t) => t.key === params.get("type"))
    ? params.get("type")!
    : "daily";
  const [type, setType] = useState(initial);
  const [from, setFrom] = useState(
    initial === "calibration"
      ? TODAY
      : initial === "equipment"
        ? dayOffset(TODAY, -90)
        : TODAY,
  );
  const [to, setTo] = useState(
    initial === "calibration" ? dayOffset(TODAY, 365) : TODAY,
  );
  const [material, setMaterial] = useState("");
  return (
    <>
      <PageHeading
        eyebrow="ТАЙЛАГНАЛ БА ХЯНАЛТ"
        title="Тайлан"
        description="Бүртгэлээс шууд үүсэх, хэвлэхэд бэлэн тайлангууд."
      >
        <button
          className="button primary"
          disabled={from > to || !from || !to}
          onClick={() => window.print()}
        >
          <Printer size={18} />
          Тайлан хэвлэх
        </button>
      </PageHeading>
      <div className="reports-layout">
        <aside className="report-settings">
          <section className="panel">
            <SectionTitle />
            <div className="report-type-list">
              {reportTypes.map((r) => (
                <button
                  key={r.key}
                  className={type === r.key ? "active" : ""}
                  onClick={() => {
                    setType(r.key);
                    setFrom(
                      r.key === "calibration"
                        ? TODAY
                        : r.key === "equipment"
                          ? dayOffset(TODAY, -90)
                          : r.key === "specimens"
                            ? dayOffset(TODAY, -35)
                            : TODAY,
                    );
                    setTo(
                      r.key === "calibration" ? dayOffset(TODAY, 365) : TODAY,
                    );
                  }}
                >
                  <r.icon size={18} />
                  <span>{r.title}</span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
          </section>
          <section className="panel report-filters">
            <h3>
              <SlidersHorizontal size={17} />
              Шүүлтүүр
            </h3>
            <label className="field">
              <span>Эхлэх огноо</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Дуусах огноо</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            {!["equipment", "calibration"].includes(type) && (
              <label className="field">
                <span>Материал</span>
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                >
                  <option value="">Бүх материал</option>
                  {["Бетон", "Цемент", "Элс", "Дайрга"].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
            )}
            {(from > to || !from || !to) && (
              <p role="alert" className="field-error">
                Эхлэх огноо дуусах огнооноос өмнө байна. Хоёр огноог сонгоно уу.
              </p>
            )}
            <p className="fine-print">
              Шүүлтүүр өөрчлөгдөхөд тайлан шууд шинэчлэгдэнэ.
            </p>
          </section>
          <div className="report-print-hint">
            <Printer size={21} />
            <strong>А4 хэмжээ, хэвлэхэд бэлэн</strong>
            <p>
              Хэвлэх цонхноос хэвлэгч эсвэл PDF хэлбэрээр хадгалах сонголтыг
              ашиглаарай.
            </p>
          </div>
        </aside>
        <div className="report-preview-wrap">
          <div className="preview-label">
            <span>
              <FileText size={15} />
              Урьдчилан харах
            </span>
            <span>A4 · 210 × 297 мм</span>
          </div>
          {from && to && from <= to ? (
            <ReportPreview
              type={type}
              from={from}
              to={to}
              material={material}
            />
          ) : (
            <div className="empty-state">
              <CalendarDays size={30} />
              <h2>Тайлангийн хугацааг сонгоно уу</h2>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
function SectionTitle() {
  return (
    <h3 className="report-section-title">
      <FileText size={18} />
      Тайлангийн төрөл
    </h3>
  );
}
