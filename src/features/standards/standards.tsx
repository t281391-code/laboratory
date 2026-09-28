"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  FileText,
  Search,
} from "lucide-react";
import { useLabStore } from "@/lib/store";
import type { Standard } from "@/lib/types";
import { formCodes, formNames } from "@/lib/utils";
import {
  EmptyState,
  Modal,
  PageHeading,
  SectionHeading,
} from "@/components/ui";
export function StandardsPage() {
  const standards = useLabStore(s => s.standards);
  const [query, setQuery] = useState("");
  const [material, setMaterial] = useState("");
  const [selected, setSelected] = useState<Standard | null>(null);
  const filtered = standards.filter(
    (s) =>
      `${s.number} ${s.title} ${s.material}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!material || s.material === material),
  );
  return (
    <>
      <PageHeading
        eyebrow="МЭДЛЭГ, АРГАЧЛАЛЫН САН"
        title="Стандарт, заавар"
        description="Өдөр тутмын туршилтад хэрэгтэй аргачлалыг хялбархан олоорой."
      />
      <div className="standards-banner">
        <span>
          <BookOpen size={32} strokeWidth={1.4} />
        </span>
        <div>
          <h2>Нэг аргачлал. Найдвартай үр дүн.</h2>
          <p>Сорьц бэлтгэхээс тооцоолол хүртэл — туршилтын алхам бүрд.</p>
        </div>
        <span className="intro-chip">{standards.length} баримт бичиг</span>
      </div>
      <section className="panel">
        <div className="filter-toolbar">
          <label className="search-input">
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Стандартын дугаар, нэр, материал..."
              aria-label="Стандарт хайх"
            />
          </label>
          <select
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            aria-label="Материалаар шүүх"
          >
            <option value="">Бүх материал</option>
            {["Бетон", "Цемент", "Элс", "Дайрга"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="standards-list">
          {filtered.map((s) => (
            <button key={s.id} onClick={() => setSelected(s)}>
              <span className="standard-file">
                <FileText size={25} strokeWidth={1.5} />
              </span>
              <div>
                <span className="standard-number">{s.number}</span>
                <h2>{s.title}</h2>
                <p>
                  {s.equipment} · {formCodes[s.form]}
                </p>
              </div>
              <span className="material-chip">{s.material}</span>
              <ChevronRight size={19} />
            </button>
          ))}
          {!filtered.length && <EmptyState />}
        </div>
        <div className="standards-disclaimer">
          <BookOpen size={16} />
          <p>
            Энд танилцуулгын хураангуй харагдана. Бодит туршилтад стандартын
            хүчин төгөлдөр, албан ёсны бүрэн эхийг хэрэглэнэ.
          </p>
        </div>
      </section>
      {selected && (
        <Modal
          title="Стандарт, аргачлал"
          onClose={() => setSelected(null)}
          drawer
        >
          <div className="standard-detail-heading">
            <span className="standard-number">{selected.number}</span>
            <h2>{selected.title}</h2>
            <span className="material-chip">{selected.material}</span>
          </div>
          <dl className="detail-grid">
            <div>
              <dt>Шаардлагатай сорьц</dt>
              <dd>{selected.size}</dd>
            </div>
            <div>
              <dt>Туршилтын нөхцөл</dt>
              <dd>{selected.condition}</dd>
            </div>
          </dl>
          <SectionHeading title="Тооцооллын хураангуй" />
          <div className="standard-formula">{selected.formula}</div>
          <SectionHeading title="Гүйцэтгэх дараалал" />
          <ol className="instruction-steps">
            {selected.steps.map((step, i) => (
              <li key={step}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{step}</strong>
                </div>
              </li>
            ))}
          </ol>
          <SectionHeading title="Холбогдох төхөөрөмж, маягт" />
          <Link
            href={`/equipment/?id=${selected.equipmentId}`}
            className="related-link"
          >
            <BookOpen size={20} />
            <span>{selected.equipment}</span>
            <ArrowRight size={17} />
          </Link>
          <Link href={`/forms/?type=${selected.form}`} className="related-link">
            <FileText size={20} />
            <span>
              {formCodes[selected.form]} · {formNames[selected.form]}
            </span>
            <ArrowRight size={17} />
          </Link>
          <p className="fine-print">
            Танилцуулгын хураангуй. Стандартын бүрэн эхийг орлохгүй.
          </p>
        </Modal>
      )}
    </>
  );
}
