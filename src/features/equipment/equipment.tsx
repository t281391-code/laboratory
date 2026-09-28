"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Pause,
  Play,
  Search,
  ShieldCheck,
  Timer,
  Wrench,
  X,
} from "lucide-react";

import { EquipmentManager } from "./manage";
import { formatTimestamp } from "@/lib/utils";
import { useLabStore } from "@/lib/store";
import {
  daysBetween,
  formatDate,
  formCodes,
  formNames,
  TODAY,
} from "@/lib/utils";
import type { Equipment } from "@/lib/types";
import {
  ConfirmDialog,
  EmptyState,
  Modal,
  PageHeading,
  SectionHeading,
  StatusBadge,
  useUI,
} from "@/components/ui";

export function EquipmentVisual({
  kind,
  large = false,
}: {
  kind: Equipment["kind"];
  large?: boolean;
}) {
  return (
    <div
      className={`equipment-visual ${large ? "large" : ""}`}
      aria-hidden="true"
    >
      <div className="visual-grid" />
      <svg viewBox="0 0 280 160" fill="none">
        <ellipse cx="144" cy="140" rx="77" ry="8" fill="#dce5df" />
        {kind === "press" ? (
          <>
            <path
              d="M77 29H185V138H77Z"
              fill="#e9eeea"
              stroke="#71877b"
              strokeWidth="1.5"
            />
            <path d="M83 32H98V137H83ZM166 32H181V137H166Z" fill="#335d4b" />
            <rect x="76" y="21" width="111" height="16" rx="3" fill="#426a54" />
            <rect x="102" y="52" width="61" height="7" rx="1" fill="#889b8e" />
            <path d="M112 58H154V73H112Z" fill="#b1beb4" />
            <path d="M110 119H158V127H110Z" fill="#5c7265" />
            <rect
              x="118"
              y="78"
              width="32"
              height="33"
              fill="#b4b6ab"
              stroke="#8e988e"
            />
            <path
              d="M118 78L126 73H157L150 78ZM150 78L157 73V105L150 111"
              fill="#cdd0c4"
              stroke="#8e988e"
            />
            <path
              d="M130 113V122M136 113V122"
              stroke="#576c5c"
              strokeWidth="4"
            />
            <rect
              x="189"
              y="71"
              width="34"
              height="65"
              rx="3"
              fill="#d1dcd3"
              stroke="#71877b"
            />
            <rect x="194" y="80" width="24" height="20" rx="2" fill="#153c31" />
            <path
              d="M199 91L203 87L207 91L213 85"
              stroke="#c0d79c"
              strokeWidth="1.5"
            />
            <circle cx="199" cy="109" r="3" fill="#bc9b57" />
            <circle cx="210" cy="109" r="3" fill="#315e4b" />
            <path d="M187 113H189" stroke="#71877b" strokeWidth="3" />
            <path d="M73 137H188" stroke="#234b39" strokeWidth="6" />
          </>
        ) : kind === "oven" ? (
          <>
            <rect
              x="87"
              y="27"
              width="107"
              height="110"
              rx="6"
              fill="#d7dfd9"
              stroke="#6e8576"
            />
            <rect x="96" y="37" width="88" height="23" rx="2" fill="#315746" />
            <rect x="107" y="44" width="36" height="10" fill="#b2ce9b" />
            <circle cx="171" cy="49" r="5" fill="#d2ab69" />
            <rect
              x="99"
              y="68"
              width="79"
              height="60"
              rx="3"
              fill="#9eafa1"
              stroke="#607d6a"
            />
            <rect x="111" y="79" width="49" height="38" fill="#d4dfd5" />
            <path
              d="M114 91H156M114 105H156M172 87V107"
              stroke="#6d8672"
              strokeWidth="3"
            />
          </>
        ) : kind === "scale" ? (
          <>
            <rect
              x="83"
              y="109"
              width="120"
              height="25"
              rx="5"
              fill="#d4dfd5"
              stroke="#6e8576"
            />
            <path
              d="M100 106L110 72H179L189 106"
              fill="#bfd0c1"
              stroke="#6e8576"
            />
            <ellipse
              cx="145"
              cy="72"
              rx="46"
              ry="7"
              fill="#e6ede7"
              stroke="#6e8576"
            />
            <rect
              x="116"
              y="115"
              width="48"
              height="12"
              rx="2"
              fill="#214c3c"
            />
            <text x="125" y="124" fontSize="10" fill="#d0e2bb">
              —
            </text>
            <circle cx="183" cy="121" r="4" fill="#b19f6a" />
          </>
        ) : kind === "cone" ? (
          <>
            <path
              d="M122 34H159L187 130H94L122 34Z"
              fill="#c1cfc3"
              stroke="#6d8372"
              strokeWidth="1.5"
            />
            <ellipse cx="140" cy="34" rx="18" ry="5" fill="#809886" />
            <path
              d="M99 75H90V98H106M179 75H190V98H183"
              stroke="#617e69"
              strokeWidth="3"
            />
            <ellipse
              cx="140"
              cy="130"
              rx="54"
              ry="7"
              fill="#b0c3b3"
              stroke="#6d8372"
            />
            <path d="M214 38V129" stroke="#728877" strokeWidth="5" />
          </>
        ) : kind === "sieve" ? (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i}>
                <path
                  d={`M91 ${55 + i * 15}V${67 + i * 15}C91 ${82 + i * 15} 189 ${82 + i * 15} 189 ${67 + i * 15}V${55 + i * 15}`}
                  fill={i % 2 ? "#bccbbd" : "#d5dfd3"}
                  stroke="#708872"
                />
                <ellipse
                  cx="140"
                  cy={55 + i * 15}
                  rx="49"
                  ry="12"
                  fill="#e2e8db"
                  stroke="#708872"
                />
              </g>
            ))}
            <path
              d="M112 47L170 59M107 52L160 64M118 43L177 55"
              stroke="#abbca6"
            />
          </>
        ) : (
          <>
            <rect
              x="108"
              y="33"
              width="67"
              height="100"
              rx="13"
              fill="#d1dfcd"
              stroke="#5d7a61"
              strokeWidth="1.5"
            />
            <rect x="118" y="49" width="47" height="41" rx="3" fill="#30523e" />
            <text x="124" y="67" fontSize="13" fill="#d4e5bc">
              —
            </text>
            <text x="129" y="82" fontSize="10" fill="#d4e5bc">
              — %
            </text>
            <circle cx="129" cy="108" r="6" fill="#6f906d" />
            <circle cx="153" cy="108" r="6" fill="#b5a774" />
            <path d="M122 23H162M126 18H158" stroke="#91a68c" strokeWidth="4" />
          </>
        )}
      </svg>
      <span className="visual-caption">ЛАБОРАТОРИЙН ТОНОГЛОЛ</span>
    </div>
  );
}
export function EquipmentCard({
  equipment,
  onClick,
}: {
  equipment: Equipment;
  onClick: () => void;
}) {
  const days = equipment.calibrationDate ? daysBetween(TODAY, equipment.calibrationDate) : null;
  return (
    <button className="equipment-card" onClick={onClick}>
      <EquipmentVisual kind={equipment.kind} />
      <div className="equipment-card-content">
        <div className="equipment-card-id">
          <span>{equipment.serial}</span>
          <StatusBadge status={equipment.status} />
        </div>
        <h2>{equipment.name}</h2>
        <p className="equipment-model">{equipment.model}</p>
        <dl>
          <div>
            <dt>Сүүлийн үзлэг</dt>
            <dd>{formatDate(equipment.lastInspection)}</dd>
          </div>
          <div>
            <dt>Дараагийн үзлэг</dt>
            <dd>{formatDate(equipment.nextInspection)}</dd>
          </div>
        </dl>
        <div className={`calibration-line ${days !== null && days < 30 ? "soon" : ""}`}>
          <ShieldCheck size={15} />
          <span>
            {days === null ? "Калибровкийн огноо байхгүй" : days < 30
              ? `Калибровк · ${days} хоног үлдсэн`
              : "Калибровк хүчинтэй"}
          </span>
        </div>
        <div className="equipment-card-bottom">
          <span>
            Заавар харах
            <ArrowRight size={15} />
          </span>
        </div>
      </div>
    </button>
  );
}
const preChecks = [
  "Төхөөрөмжийн гадна байдал, холболт бүрэн",
  "Калибровкийн хугацаа хүчинтэй",
  "Ажлын талбай, багаж хэрэгсэл цэвэр",
  "Хамгаалах хэрэгсэл бүрэн өмссөн",
];
export function EquipmentInstruction({
  equipment,
  onClose,
  onGuide,
}: {
  equipment: Equipment;
  onClose: () => void;
  onGuide: () => void;
}) {
  const [tab, setTab] = useState("Заавар");
  const checks = useLabStore((s) => s.checklists[equipment.id]) || [
    false,
    false,
    false,
    false,
  ];
  const setChecklist = useLabStore((s) => s.setChecklist);
  return (
    <Modal title="Төхөөрөмжийн мэдээлэл" onClose={onClose} drawer>
      <div className="equipment-detail-hero">
        <EquipmentVisual kind={equipment.kind} />
        <div>
          <span className="eyebrow">{equipment.serial}</span>
          <h2>{equipment.name}</h2>
          <p>{equipment.model}</p>
          <StatusBadge status={equipment.status} />
        </div>
      </div>
      <EquipmentManager equipment={equipment} onDeleted={onClose} />
      <p className="muted">Сүүлийн гараар бүртгэсэн хэмжилт: {equipment.readings?.[0] ? `${equipment.readings[0].value} ${equipment.readings[0].unit} · ${formatTimestamp(equipment.latestMeasurementAt)}` : "Хэмжилт байхгүй"}</p>
      <button
        className="button primary full-width guide-start"
        onClick={onGuide}
        disabled={equipment.status === "Засварт" || !equipment.steps.length}
      >
        <Play size={18} />
        Алхамчилсан заавар эхлүүлэх
        <ArrowRight size={17} />
      </button>
      {equipment.status === "Засварт" && (
        <div className="warning-banner">
          <Wrench size={18} />
          Засварт байгаа төхөөрөмжөөр туршилт эхлүүлэхгүй.
        </div>
      )}
      <div className="tabs">
        {["Заавар", "Шалгах хуудас", "Калибровк, түүх"].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Заавар" && (
        <>
          <SectionHeading title="Төхөөрөмжийн зориулалт" />
          <p className="instruction-text">{equipment.purpose}</p>
          <dl className="detail-grid">
            <div>
              <dt>Туршилтад хэрэглэх сорьц</dt>
              <dd>{equipment.specimens}</dd>
            </div>
            <div>
              <dt>Шаардлагатай багаж</dt>
              <dd>{equipment.tools}</dd>
            </div>
          </dl>
          <div className="warning-banner">
            <ShieldCheck size={21} />
            <div>
              <strong>Аюулгүй ажиллагаа</strong>
              <p>
                Хамгаалах хэрэгсэл өмсөнө. Хөдөлгөөнт хэсэгт гар хүрэхгүй.
                Гэмтэл илэрвэл ажлыг зогсоож хариуцсан ажилтанд мэдэгдэнэ.
              </p>
            </div>
          </div>
          <SectionHeading title="Алхамчилсан ажиллуулах заавар" />
          <ol className="instruction-steps">
            {equipment.steps.map((step, i) => (
              <li key={step.title}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="instruction-notes">
            <div>
              <h3>Түгээмэл гаргадаг алдаа</h3>
              <p>
                Сорьцын код зөрүүлэх, нэгж буруу оруулах, тохируулгыг шалгахгүй
                эхлүүлэхээс сэргийлнэ.
              </p>
            </div>
            <div>
              <h3>Цэвэрлэх заавар</h3>
              <p>
                Төхөөрөмжийг зогсоосны дараа үлдэгдлийг зөөлөн сойзоор
                цэвэрлэнэ. Цахилгаан хэсэгт ус хүргэхгүй.
              </p>
            </div>
            <div>
              <h3>Ажил дуусгах заавар</h3>
              <p>
                Үр дүнгээ хадгалж, багажийг байранд нь буцаана. Төхөөрөмжийн
                төлөвийг хариуцсан ажилтанд мэдээлнэ.
              </p>
            </div>
          </div>
          <Link
            className="related-link"
            href={`/forms/?type=${equipment.form}`}
          >
            <ClipboardCheck size={20} />
            <span>
              {formCodes[equipment.form]} · {formNames[equipment.form]}
            </span>
            <ArrowRight size={17} />
          </Link>
          <p className="fine-print">
            Танилцуулгын заавар. Бодит ажилд үйлдвэрлэгчийн заавар, лабораторийн
            батлагдсан журмыг хэрэглэнэ.
          </p>
        </>
      )}
      {tab === "Шалгах хуудас" && (
        <>
          <SectionHeading
            title="Ашиглахын өмнөх шалгах хуудас"
            subtitle="Шалгалт бүрийн төлөв MySQL санд хадгалагдана."
          />
          <div className="checklist">
            {preChecks.map((label, i) => (
              <label key={label} className={checks[i] ? "checked" : ""}>
                <input
                  type="checkbox"
                  checked={!!checks[i]}
                  onChange={(e) => {
                    const list = [...checks];
                    list[i] = e.target.checked;
                    setChecklist(equipment.id, list);
                  }}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <div className="checklist-progress">
            <span>
              {checks.filter(Boolean).length} / {preChecks.length} шалгалт
              хийгдсэн
            </span>
            <div>
              <i
                style={{
                  width: `${(checks.filter(Boolean).length / preChecks.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </>
      )}
      {tab === "Калибровк, түүх" && (
        <>
          <SectionHeading title="Калибровкийн мэдээлэл" />
          <dl className="detail-grid">
            <div>
              <dt>Серийн дугаар</dt>
              <dd>{equipment.serial}</dd>
            </div>
            <div>
              <dt>Сүүлийн үзлэг</dt>
              <dd>{formatDate(equipment.lastInspection)}</dd>
            </div>
            <div>
              <dt>Дараагийн үзлэг</dt>
              <dd>{formatDate(equipment.nextInspection)}</dd>
            </div>
            <div>
              <dt>Калибровк хүчинтэй хугацаа</dt>
              <dd>{formatDate(equipment.calibrationDate)}</dd>
            </div>
            <div>
              <dt>Үлдсэн хугацаа</dt>
              <dd>{daysBetween(TODAY, equipment.calibrationDate)} хоног</dd>
            </div>
          </dl>
          <SectionHeading title="Засвар, үйлчилгээний түүх" />
          <div className="activity-timeline">{equipment.maintenance?.length ? equipment.maintenance.map(entry => <div key={entry.id}><strong>{formatTimestamp(entry.performedAt)}</strong><p>{entry.description}</p></div>) : <p className="muted">Үйлчилгээний бүртгэл байхгүй.</p>}</div>
          <Link
            className="button secondary full-width"
            href="/reports/?type=calibration"
          >
            Калибровкийн тайлан харах
            <ArrowRight size={16} />
          </Link>
        </>
      )}
    </Modal>
  );
}
export function GuidedSteps({
  equipment,
  onClose,
}: {
  equipment: Equipment;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  const key = `${equipment.id}-guide`;
  const stored = useLabStore((s) => s.checklists[key]);
  const [step, setStep] = useState(0);
  const [checks, setChecks] = useState<boolean[]>(
    stored || equipment.steps.map(() => false),
  );
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [exit, setExit] = useState(false);
  const [complete, setComplete] = useState(false);
  const setChecklist = useLabStore((s) => s.setChecklist);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  const final = step === equipment.steps.length;
  return (
    <dialog
      ref={dialogRef}
      className="guided-overlay"
      onCancel={(e) => {
        e.preventDefault();
        setExit(true);
      }}
      aria-label="Алхамчилсан төхөөрөмжийн заавар"
    >
      <header className="guided-header">
        <div className="guided-brand">
          <span className="brand-symbol">
            <FlaskIcon />
          </span>
          <div>
            <strong>Алхамчилсан заавар</strong>
            <small>{equipment.name}</small>
          </div>
        </div>
        <button className="button secondary" onClick={() => setExit(true)}>
          <X size={17} />
          Гарах
        </button>
      </header>
      <div className="guided-body">
        <aside className="guided-sidebar">
          <div className="eyebrow">АЖЛЫН ДАРААЛАЛ</div>
          {equipment.steps.map((s, i) => (
            <div
              key={s.title}
              className={`guided-step-label ${step === i ? "active" : ""} ${checks[i] ? "done" : ""}`}
            >
              <span>{checks[i] ? <Check size={14} /> : i + 1}</span>
              <p>{s.title}</p>
            </div>
          ))}
          <div className={`guided-step-label ${final ? "active" : ""}`}>
            <span>
              <ClipboardCheck size={15} />
            </span>
            <p>Эцсийн хяналт</p>
          </div>
          <div className="guided-timer">
            <Timer size={19} />
            <span>
              {String(Math.floor(seconds / 60)).padStart(2, "0")}:
              {String(seconds % 60).padStart(2, "0")}
            </span>
            <button
              className="icon-button"
              aria-label={running ? "Цаг түр зогсоох" : "Цаг эхлүүлэх"}
              onClick={() => setRunning((v) => !v)}
            >
              {running ? <Pause size={17} /> : <Play size={17} />}
            </button>
          </div>
        </aside>
        <main className="guided-main">
          <div className="guide-progress">
            <span>
              {final
                ? "ЭЦСИЙН ХЯНАЛТ"
                : `АЛХАМ ${step + 1} / ${equipment.steps.length}`}
            </span>
            <span>
              {Math.round(
                (checks.filter(Boolean).length / checks.length) * 100,
              )}
              %
            </span>
            <div>
              <i
                style={{
                  width: `${(checks.filter(Boolean).length / checks.length) * 100}%`,
                }}
              />
            </div>
          </div>
          {!final ? (
            <>
              <h1>{equipment.steps[step].title}</h1>
              <p className="guided-description">
                {equipment.steps[step].description}
              </p>
              <EquipmentVisual kind={equipment.kind} large />
              <div className="warning-banner">
                <ShieldCheck size={22} />
                <div>
                  <strong>Аюулгүй ажиллагааг нэн түрүүнд</strong>
                  <p>
                    Хамгаалах хэрэгслээ өмсөж, үйлдвэрлэгчийн зааврыг мөрдөнө.
                    Ачаалалтай үед хамгаалалтын хаалтыг нээхгүй.
                  </p>
                </div>
              </div>
              <label
                className={`guided-confirm ${checks[step] ? "checked" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checks[step]}
                  onChange={(e) => {
                    const next = [...checks];
                    next[step] = e.target.checked;
                    setChecks(next);
                    setChecklist(key, next);
                  }}
                />
                <span>Энэ алхмыг гүйцэтгэж, шалгасан.</span>
              </label>
            </>
          ) : (
            <div className="guided-review">
              <span className="success-circle">
                <CheckCircle2 size={35} />
              </span>
              <h1>
                {complete
                  ? "Заавар амжилттай дууслаа."
                  : "Ажлын гүйцэтгэлээ шалгаарай."}
              </h1>
              <p>
                {checks.filter(Boolean).length} / {checks.length} алхам
                гүйцэтгэсэн
              </p>
              <div className="checklist">
                {equipment.steps.map((s, i) => (
                  <label key={s.title} className={checks[i] ? "checked" : ""}>
                    <input
                      type="checkbox"
                      checked={checks[i]}
                      onChange={(e) => {
                        const next = [...checks];
                        next[i] = e.target.checked;
                        setChecks(next);
                        setChecklist(key, next);
                        setComplete(false);
                      }}
                    />
                    <span>{s.title}</span>
                  </label>
                ))}
              </div>
              {complete && (
                <Link
                  className="button primary full-width"
                  href={`/forms/?type=${equipment.form}`}
                  onClick={onClose}
                >
                  <ClipboardCheck size={18} />
                  {formCodes[equipment.form]} маягтад үр дүн оруулах
                  <ArrowRight size={16} />
                </Link>
              )}
            </div>
          )}
          <div className="guided-actions">
            <button
              className="button secondary"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft size={17} />
              Өмнөх
            </button>
            {!final ? (
              <button
                className="button primary"
                disabled={!checks[step]}
                onClick={() => setStep((s) => s + 1)}
              >
                Дараах алхам
                <ArrowRight size={17} />
              </button>
            ) : !complete ? (
              <button
                className="button primary"
                disabled={!checks.every(Boolean)}
                onClick={() => {
                  setComplete(true);
                  setRunning(false);
                  setChecklist(key, checks);
                  useUI
                    .getState()
                    .notify("Ажиллуулах зааврын гүйцэтгэл хадгалагдлаа");
                }}
              >
                <Check size={17} />
                Дуусгаж хадгалах
              </button>
            ) : (
              <button className="button secondary" onClick={onClose}>
                Төхөөрөмж рүү буцах
              </button>
            )}
          </div>
        </main>
      </div>
      {exit && (
        <ConfirmDialog
          title="Заавраас гарах уу?"
          description="Гүйцэтгэсэн алхмууд MySQL санд хадгалагдсан. Дараа үргэлжлүүлж болно."
          onClose={() => setExit(false)}
          onConfirm={onClose}
        />
      )}
    </dialog>
  );
}
function FlaskIcon() {
  return <BookOpen size={23} />;
}
export function EquipmentPage() {
  const equipmentRecords = useLabStore(s => s.equipment);
  const params = useSearchParams();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(params.get("filter") || "all");
  const [selected, setSelected] = useState<Equipment | null>(
    equipmentRecords.find((e) => e.id === params.get("id")) || null,
  );
  const [guide, setGuide] = useState<Equipment | null>(null);
  const equipment = equipmentRecords.filter(
    (e) =>
      `${e.name} ${e.model} ${e.serial}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "all" ||
        (filter === "calibration" &&
          daysBetween(TODAY, e.calibrationDate) <= 30) ||
        e.status === filter),
  );
  return (
    <>
      <PageHeading
        eyebrow="НАЙДВАРТАЙ ХЭМЖИЛТИЙН ҮНДЭС"
        title="Тоног төхөөрөмж"
        description="Ашиглалтын заавар, үзлэг, калибровк — нэг бүртгэлд."
      >
        <EquipmentManager />
        <Link href="/reports/?type=equipment" className="button secondary">
          <ClipboardCheck size={17} />
          Үзлэгийн тайлан
        </Link>
      </PageHeading>
      <div className="equipment-summary">
        <div>
          <span className="square-icon">
            <Wrench size={20} />
          </span>
          <p>
            Нийт төхөөрөмж<strong>{equipmentRecords.length}</strong>
          </p>
        </div>
        <div>
          <span className="square-icon green">
            <CheckCircle2 size={20} />
          </span>
          <p>
            Ашиглахад бэлэн
            <strong>
              {equipmentRecords.filter((e) => e.status === "Бэлэн").length}
            </strong>
          </p>
        </div>
        <div>
          <span className="square-icon amber">
            <CalendarDays size={20} />
          </span>
          <p>
            Калибровк ойртсон<strong>{equipmentRecords.filter(e => e.calibrationDate && daysBetween(TODAY, e.calibrationDate) <= 30).length}</strong>
          </p>
        </div>
        <div>
          <span className="square-icon red">
            <Wrench size={20} />
          </span>
          <p>
            Засварт<strong>{equipmentRecords.filter(e => e.status === "Засварт").length}</strong>
          </p>
        </div>
      </div>
      <div className="equipment-toolbar">
        <div className="segmented">
          {[
            ["all", "Бүх төхөөрөмж"],
            ["Бэлэн", "Бэлэн"],
            ["calibration", "Калибровк ойртсон"],
            ["Засварт", "Засварт"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={filter === value ? "active" : ""}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="search-input">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Төхөөрөмж хайх"
            placeholder="Нэр, загвар, серийн дугаар..."
          />
        </label>
      </div>
      {equipment.length ? (
        <div className="equipment-grid">
          {equipment.map((e) => (
            <EquipmentCard
              key={e.id}
              equipment={e}
              onClick={() => setSelected(e)}
            />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
      {selected && !guide && (
        <EquipmentInstruction
          equipment={equipmentRecords.find(e => e.id === selected.id) ?? selected}
          onClose={() => {
            setSelected(null);
            if (params.has("id")) router.replace("/equipment/");
          }}
          onGuide={() => setGuide(selected)}
        />
      )}
      {guide && (
        <GuidedSteps equipment={equipmentRecords.find(e => e.id === guide.id) ?? guide} onClose={() => setGuide(null)} />
      )}
    </>
  );
}
