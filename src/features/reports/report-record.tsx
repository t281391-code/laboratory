"use client";
/* Local image data URLs stay in the browser; no image optimization server is used. */
/* eslint-disable @next/next/no-img-element */
import { CheckCircle2, Printer } from "lucide-react";
import { Modal, StatusBadge, useUI } from "@/components/ui";
import { useLabStore } from "@/lib/store";
import type { TestRecord } from "@/lib/types";
import { formCodes, formNames, formatDate } from "@/lib/utils";
import { calculate, formDefinitions } from "@/features/forms/config";
export function DocumentBrand() {
  return (
    <div className="document-brand">
      <strong className="document-lab-name">
        Улаан баатар БҮК
        <br />
        Лаборатори
      </strong>
      <div>
        БАРИЛГЫН МАТЕРИАЛЫН
        <br />
        ТӨВ ЛАБОРАТОРИ
      </div>
    </div>
  );
}
export function ReportRecord({
  record,
  onClose,
}: {
  record: TestRecord;
  onClose: () => void;
}) {
  const live =
    useLabStore((s) => s.tests.find((t) => t.id === record.id)) || record;
  const approveTest = useLabStore((s) => s.approveTest);
  const calculation = calculate(record.kind, record.values);
  return (
    <Modal title="Шинжилгээний үр дүнгийн хуудас" onClose={onClose} wide>
      <div className="print-toolbar">
        <StatusBadge status={live.approved ? "Баталгаажсан" : "Хянаж байгаа"} />
        <div>
          {!live.approved && (
            <button
              className="button primary small"
              onClick={() => {
                approveTest(record.id);
                useUI.getState().notify("Шинжилгээний үр дүн баталгаажлаа");
              }}
            >
              <CheckCircle2 size={16} />
              Баталгаажуулах
            </button>
          )}
          <button
            className="button secondary small"
            onClick={() => window.print()}
          >
            <Printer size={16} />
            Хэвлэх
          </button>
        </div>
      </div>
      <article className="print-document record-document">
        <DocumentBrand />
        <div className="document-title">
          <span>{formCodes[record.kind]} · ШИНЖИЛГЭЭНИЙ ХУУДАС</span>
          <h1>{formNames[record.kind]}</h1>
          <p>
            {formatDate(record.date)} · № {record.id.slice(-8).toUpperCase()}
          </p>
        </div>
        <div className="document-meta">
          <div>
            <span>Дээж / сорьц</span>
            <strong>{record.sampleCode}</strong>
          </div>
          <div>
            <span>Гүйцэтгэсэн</span>
            <strong>{record.technician}</strong>
          </div>
        </div>
        <h2>Хэмжилтийн анхны утгууд</h2>
        <table className="print-table">
          <thead>
            <tr>
              <th>Үзүүлэлт</th>
              <th>Утга</th>
              <th>Нэгж</th>
            </tr>
          </thead>
          <tbody>
            {formDefinitions[record.kind].sections
              .flatMap((s) => s.fields)
              .filter(
                (f) =>
                  record.values[f.name] &&
                  !["sampleCode", "technician", "testDate"].includes(f.name),
              )
              .map((f) => (
                <tr key={f.name}>
                  <td>{f.label}</td>
                  <td>{record.values[f.name]}</td>
                  <td>{f.unit || "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
        <div className="document-calculation">
          <h2>Тооцоолол, үр дүн</h2>
          <div className="document-formula">{calculation.formula}</div>
          <p>{calculation.substitution}</p>
          {calculation.extras.map((e) => (
            <p key={e.label}>
              {e.label}: <strong>{e.value}</strong>
            </p>
          ))}
          <div className="document-result">
            <span>{calculation.label}</span>
            <strong>
              {record.result.toFixed(2)} {calculation.unit}
            </strong>
            <StatusBadge status={record.state} />
          </div>
        </div>
        {record.photos.length > 0 && (
          <div className="document-photos">
            {record.photos.map((photo, i) => (
              <div key={i}>
                <img src={photo} alt={`Туршилтын зураг ${i + 1}`} />
              </div>
            ))}
          </div>
        )}
        <p className="document-note">{calculation.note}</p>
        <div className="document-signatures">
          <div>
            <span>Туршилт гүйцэтгэсэн</span>
            <strong>{record.technician}</strong>
          </div>
          <div>
            <span>Хянасан инженер</span>
            <strong>
              {live.approved
                ? "Баталгаажсан"
                : "Баталгаажуулалт хүлээж байна"}
            </strong>
          </div>
        </div>
        <div className="document-footer">
          <span>Лабораторийн бүртгэлийн мэдээлэл</span>
          <span>Улаан баатар БҮК Лаборатори / {formCodes[record.kind]}</span>
        </div>
      </article>
    </Modal>
  );
}
