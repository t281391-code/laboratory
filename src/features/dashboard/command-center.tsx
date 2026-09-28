"use client";

import { motion } from "motion/react";
import { useTelemetry } from "./telemetry";
import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  Box,
  Check,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Expand,
  FlaskConical,
  Layers,
  LockKeyhole,
  Microscope,
  Minus,
  Pause,
  Play,
  Plus,
  Radio,
  Search,
  ShieldCheck,
  Thermometer,
  Timer,
  Wind,
} from "lucide-react";
import { useUI } from "@/components/ui";
import { productModulePaths } from "@/features/forms/product-module-config";
import { useProductModuleStore } from "@/features/forms/product-module-state";

import { useLabStore } from "@/lib/store";
import { TODAY } from "@/lib/utils";
import { MonitoringVisual } from "./monitoring-visual";
import { useCommandModules } from "./module-data";
import { LiveIndicator, RegistryCompact } from "@/features/registry/dashboard";

function Panel({
  title,
  code,
  action,
  children,
  className = "",
}: {
  title: string;
  code: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`hud-panel ${className}`} data-focus-target>
      <header className="hud-panel-heading">
        <h2>
          <span>{code}</span>
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function Sparkline({
  values,
  large = false,
}: {
  values: (number | null)[];
  large?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const numbers = values.filter((v): v is number => v !== null);
  const low = Math.min(...numbers, 0);
  const high = Math.max(...numbers, 1);
  const height = large ? 100 : 30;
  const points = values.map((v, i) =>
    v === null
      ? null
      : [
          5 + (i * 190) / Math.max(values.length - 1, 1),
          height - 5 - ((v - low) / (high - low || 1)) * (height - 14),
        ],
  );
  let path = "";
  points.forEach((p, i) => {
    if (p) path += `${i === 0 || !points[i - 1] ? "M" : "L"}${p[0]} ${p[1]} `;
  });
  return (
    <svg
      className={`hud-sparkline ${large ? "large" : ""}`}
      viewBox={`0 0 200 ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="currentColor" stopOpacity=".2" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {large && (
        <g stroke="currentColor" strokeOpacity=".1" strokeWidth=".6">
          {[25, 50, 75].map((y) => (
            <path key={y} d={`M0 ${y}H200`} />
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d={`M${5 + (i * 190) / 7} 0V100`} />
          ))}
        </g>
      )}
      {points.length > 1 && points.every(Boolean) && (
        <path d={`${path}L195 ${height}H5Z`} fill={`url(#${id}-fill)`} />
      )}
      <motion.path
        animate={{ d: path }}
        transition={{ duration: 0.35 }}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        vectorEffect="non-scaling-stroke"
      />
      {large &&
        points.map(
          (p, i) =>
            p && (
              <circle key={i} cx={p[0]} cy={p[1]} r="2" fill="currentColor" />
            ),
        )}
    </svg>
  );
}

export function CommandCenter({ readyCount }: { readyCount: number }) {
  const equipmentRecords = useLabStore(s => s.equipment);
  const modules = useCommandModules();
  const samples = useLabStore((s) => s.samples);
  const tests = useLabStore((s) => s.tests);
  const temperatureTracks = useProductModuleStore((s) => s.tracks);
  const tracks = temperatureTracks.map((item) => ({
    temperature: item.temperature,
    values: item.rows.map((row) => row.values.value ?? ""),
  }));
  const [selected, setSelected] = useState(0);
  const [track, setTrack] = useState(0);
  const [paused, setPaused] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const info = modules[selected];
  const readyEquipment = equipmentRecords.filter(
    (e) => e.status === "Бэлэн",
  ).length;
  const equipmentPct = Math.round(
    equipmentRecords.length ? (readyEquipment / equipmentRecords.length) * 100 : 0,
  );
  const approved = tests.filter((t) => t.approved).length;
  const connection = useLabStore(s => s.connection);
  const selectedDate = useProductModuleStore(s => s.date);
  const compositions = useProductModuleStore(s => s.records.compositions);
  const composition = compositions?.find(c => c.date === selectedDate);
  const fractions = ["fine", "medium", "coarse"].map(key => Number(composition?.totals?.[key] ?? 0));
  const telemetry = useTelemetry();
  const metricIcons = { concreteTemp: Thermometer, ambientTemp: Wind, flow: Expand, air: Activity };
  const hourValues = tracks[track].values.map((v) =>
    v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null,
  );
  const completed = hourValues.filter((v) => v !== null).length;
  const materials = Array.from(new Set(samples.map((s) => s.material))).map(
    (material) => ({
      name: material,
      count: samples.filter((s) => s.material === material).length,
    }),
  );

  return (
    <section className="command-center" aria-label="Хяналтын самбар">
      <header className="command-heading">
        <div>
          <div className="hud-eyebrow">
            <span className="hud-led" /> БҮК / LABORATORY CONTROL{" "}
            <span>СИСТЕМ 01</span>
          </div>
          <h1>
            Хяналтын самбар<span className="heading-slash"> / </span>
            <small>Лаборатори</small>
          </h1>
          <p>Өнөөдрийн ажлаа нэг дороос.</p>
        </div>
        <div className="command-actions">
          <span className="command-date">
            {TODAY.replaceAll("-", ".")}
            <small>ДОТООД АЖЛЫН ОРОН ЗАЙ</small>
          </span>
          <Link href="/reports/" className="button secondary">
            <ArrowDownToLine size={14} />
            Тайлан харах
          </Link>
          <button
            className="button primary"
            onClick={() => useUI.getState().setSampleOpen(true)}
          >
            <Plus size={15} />
            Сорьц бүртгэх
          </button>
        </div>
      </header>

      <div className="command-grid">
        <aside className="command-left">
          <Panel
            title="Тоног төхөөрөмж"
            code="01"
            action={
              <Link href="/equipment/" aria-label="Бүх тоног төхөөрөмж">
                <ChevronRight size={14} />
              </Link>
            }
          >
            <div className="hud-list-caption">
              <span>
                БҮРТГЭЛ / {String(equipmentRecords.length).padStart(2, "0")}
              </span>
              <span>ТӨЛӨВ</span>
            </div>
            <div className="hud-equipment-list">
              {equipmentRecords.map((e, i) => (
                <Link
                  href={`/equipment/?id=${e.id}`}
                  key={e.id}
                  className="hud-equipment-row"
                >
                  <span className="hud-row-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <strong>{e.name}</strong>
                    <small>{e.model}</small>
                  </span>
                  <i
                    className={`hud-led ${e.status === "Бэлэн" ? "" : e.status === "Засварт" ? "red" : "orange"}`}
                    title={e.status}
                  />
                  <span className="sr-only">{e.status}</span>
                </Link>
              ))}
            </div>
            <div className="hud-product-row">
              <Link href={productModulePaths.sleepers}>
                <Layers size={12} />
                Төмөр бетон дэр
              </Link>
              <Link href={productModulePaths.small}>
                <Box size={12} />
                Жижиг эдлэл
              </Link>
            </div>
          </Panel>
          <Panel
            title="Сүүлийн хэмжилт"
            code="02"
            action={
              <span className="hud-live">
                <Radio size={11} />
                {connection}
              </span>
            }
          >
            <div className="hud-telemetry-list">
              {telemetry.map(
                ({ label, key, value, unit, trend, updated }) => {
                  const Icon = metricIcons[key as keyof typeof metricIcons];
                  return (
                    <Link
                      href="/forms/?type=fresh"
                      className="hud-telemetry-row"
                      key={key}
                      title={updated}
                    >
                      <Icon size={13} />
                      <span>{label}</span>
                      <strong>
                        {value}
                        <small>{unit}</small>
                      </strong>
                      <Sparkline values={trend} />
                    </Link>
                  );
                },
              )}
            </div>
            <p className="hud-footnote">
              Гараар бүртгэсэн хэмжилт · {telemetry.find(t => t.timestamp)?.updated ?? "Хэмжилт байхгүй"}
            </p>
          </Panel>
          <Panel
            title="Системийн төлөв"
            code="03"
            action={<ShieldCheck size={13} className="hud-green" />}
          >
            <div className="hud-system-main">
              <div className="hud-chip">
                <Microscope size={32} strokeWidth={1} />
                <i />
                <i />
                <i />
              </div>
              <div>
                <span>АЖИЛЛАХ БЭЛЭН БАЙДАЛ</span>
                <strong>
                  {equipmentPct}
                  <small>%</small>
                </strong>
                <p>
                  {readyEquipment} / {equipmentRecords.length} төхөөрөмж бэлэн
                </p>
              </div>
            </div>
            <div className="hud-segment-meter">
              {Array.from({ length: 24 }, (_, i) => (
                <i
                  key={i}
                  className={i < Math.round(equipmentPct * 0.24) ? "on" : ""}
                />
              ))}
            </div>
            <div className="hud-system-stats">
              <span>
                Бэлэн<b className="hud-green">{readyEquipment}</b>
              </span>
              <span>
                Үзлэг
                <b className="hud-orange">
                  {
                    equipmentRecords.filter(
                      (e) => e.status === "Үзлэг шаардлагатай",
                    ).length
                  }
                </b>
              </span>
              <span>
                Засварт
                <b className="hud-red">
                  {equipmentRecords.filter((e) => e.status === "Засварт").length}
                </b>
              </span>
            </div>
          </Panel>
        </aside>

        <div className="command-middle">
          <section
            className={`hud-monitor ${expanded ? "expanded" : ""}`}
            aria-label="Лабораторийн мониторинг"
            data-focus-target
          >
            <header className="monitor-heading">
              <div>
                <span className="hud-eyebrow">ТӨВ ХЯНАЛТ / DIGITAL LAB</span>
                <h2>Лабораторийн мониторинг</h2>
              </div>
              <span className="hud-tag">
                <i className="hud-led orange" />
                {paused ? "ДҮРСЛЭЛ ЗОГССОН" : "ДҮРСЛЭЛ ИДЭВХТЭЙ"}
              </span>
            </header>
            <div className="monitor-canvas">
              <MonitoringVisual paused={paused} zoom={zoom} mode={selected} />
              <div className="monitor-tools">
                <button
                  title="Томруулах"
                  aria-label="Томруулах"
                  disabled={zoom >= 1.3}
                  onClick={() => setZoom((v) => Math.min(1.3, v + 0.1))}
                >
                  <Plus size={15} />
                </button>
                <button
                  title="Жижигрүүлэх"
                  aria-label="Жижигрүүлэх"
                  disabled={zoom <= 0.8}
                  onClick={() => setZoom((v) => Math.max(0.8, v - 0.1))}
                >
                  <Minus size={15} />
                </button>
                <button
                  title="Дүрслэл төвлөрүүлэх"
                  aria-label="Дүрслэл төвлөрүүлэх"
                  onClick={() => setZoom(1)}
                >
                  <Crosshair size={15} />
                </button>
                <button
                  title={
                    paused ? "Хөдөлгөөн үргэлжлүүлэх" : "Хөдөлгөөн түр зогсоох"
                  }
                  aria-label={
                    paused ? "Хөдөлгөөн үргэлжлүүлэх" : "Хөдөлгөөн түр зогсоох"
                  }
                  aria-pressed={paused}
                  onClick={() => setPaused((v) => !v)}
                >
                  {paused ? <Play size={14} /> : <Pause size={14} />}
                </button>
                <button
                  title={expanded ? "Хэвийн харагдац" : "Дэлгэрэнгүй харагдац"}
                  aria-label={
                    expanded ? "Хэвийн харагдац" : "Дэлгэрэнгүй харагдац"
                  }
                  aria-pressed={expanded}
                  onClick={() => setExpanded((v) => !v)}
                >
                  <Expand size={14} />
                </button>
              </div>
            </div>
            <div className="monitor-track-line">
              {tracks.map((item, i) => (
                <button
                  key={i}
                  className={track === i ? "active" : ""}
                  aria-pressed={track === i}
                  onClick={() => setTrack(i)}
                >
                  <span className="track-point">0{i + 1}</span>
                  <span>
                    {i + 1}-р зам
                    <small>
                      {item.temperature
                        ? `${item.temperature} °C`
                        : "Хэмжилт хүлээж байна"}
                    </small>
                  </span>
                  <i
                    className={`hud-led ${item.values.some(Boolean) ? "" : "idle"}`}
                  />
                </button>
              ))}
            </div>
            <footer className="monitor-footer">
              <span>
                <i className="hud-led" />
                БҮК · ТӨВ ЛАБОРАТОРИ
              </span>
              <span>
                3 ЗАМ <b>/</b> 8 ЦАГ <b>/</b> {tracks.reduce((sum, t) => sum + t.values.filter(Boolean).length, 0)} БҮРТГЭЛ
              </span>
              <span>СХЕМАТИК ДҮРСЛЭЛ</span>
            </footer>
          </section>
          <Panel
            title="Модулийн удирдлага"
            code="04"
            className="hud-console"
            action={
              <span className="hud-console-mode">
                ГАР УДИРДЛАГА <span className="hud-led" />
              </span>
            }
          >
            <div
              className="hud-module-shortcuts"
              role="group"
              aria-label="ERP модулиуд"
            >
              {modules.map((module, i) => (
                <button
                  key={module.id}
                  className={selected === i ? "selected" : ""}
                  aria-pressed={selected === i}
                  onClick={() => setSelected(i)}
                >
                  <span className="hud-shortcut-code">
                    0{i + 1}
                    <i
                      className={`hud-led ${module.statusTone === "ok" ? "" : "orange"}`}
                    />
                  </span>
                  <module.icon size={21} strokeWidth={1.25} />
                  <strong>{module.title}</strong>
                  <small>
                    {module.count}{" "}
                    {i < 3 ? "хэсэг" : i === 3 ? "төхөөрөмж" : "маягт"}
                  </small>
                </button>
              ))}
            </div>
            <div className="hud-selected-module">
              <div>
                <strong>{info.title}</strong>
                <span>{info.subtitle}</span>
              </div>
              <div className="hud-module-stepper">
                <button
                  aria-label="Өмнөх модуль"
                  disabled={selected === 0}
                  onClick={() => setSelected((v) => v - 1)}
                >
                  <ChevronLeft size={15} />
                </button>
                <output>
                  {selected + 1} / {modules.length}
                </output>
                <button
                  aria-label="Дараах модуль"
                  disabled={selected === modules.length - 1}
                  onClick={() => setSelected((v) => v + 1)}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
              <Link className="button primary small" href={info.target.href}>
                Нээх
                <ArrowRight size={13} />
              </Link>
            </div>
            <details className="hud-module-details">
              <summary>
                Модулийн мэдээлэл{" "}
                <span
                  className={`hud-${info.statusTone === "ok" ? "green" : "orange"}`}
                >
                  {info.status}
                </span>
              </summary>
              <p>{info.info}</p>
              <div className="hud-detail-metric">
                <span>{info.metric.label}</span>
                <strong>
                  {info.metric.value} {info.metric.unit}
                </strong>
                <span>
                  {info.metric.delta} · {info.metric.badge}
                </span>
              </div>
              <div className="hud-detail-tiles">
                {info.tiles.map(({ icon: Icon, value, label }) => (
                  <span key={label}>
                    <Icon size={12} />
                    <b>{value}</b>
                    {label}
                  </span>
                ))}
              </div>
              <ul>
                {info.items.map((item) => (
                  <li key={item.label}>
                    <span>{item.label}</span>
                    <span>{item.tag}</span>
                  </li>
                ))}
              </ul>
              <strong>{info.noteHead}</strong>
              <p>{info.noteText}</p>
            </details>
          </Panel>
        </div>

        <aside className="command-right">
          <Panel
            title="Туршилтын явц"
            code="05"
            action={<FlaskConical size={13} className="hud-orange" />}
          >
            <div className="hud-test-progress">
              <strong>
                {String(readyCount).padStart(2, "0")}
                <small>бүлэг сорьц</small>
              </strong>
              <span className="hud-tag orange">ТУРШИЛТАД БЭЛЭН</span>
            </div>
            <div className="hud-progress-line">
              <span
                style={{
                  width: `${tests.length ? (approved / tests.length) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="hud-progress-label">
              <span>
                <Check size={11} />
                Баталгаажсан {approved}
              </span>
              <span>Нийт {tests.length}</span>
            </div>
            <Link
              className="hud-panel-link"
              href="/samples/?status=Туршилтад бэлэн"
            >
              Хуваарь харах
              <ArrowRight size={13} />
            </Link>
            <p className="hud-footnote">
              Шинэ өдөр, найдвартай үр дүн. Өнөөдөр {readyCount} бүлэг сорьц
              туршилтад бэлэн байна. Ажлын хуваариа шалгаарай.
            </p>
          </Panel>
          <Panel
            title="Температурын хяналт"
            code="06"
            action={<Timer size={13} />}
          >
            <div className="hud-temperature-top">
              <div>
                <span>{track + 1}-Р ЗАМ / 8 ЦАГИЙН БҮРТГЭЛ</span>
                <strong>
                  {tracks[track].temperature || "—"}
                  <small>°C</small>
                </strong>
              </div>
              <span className="hud-hour-count">
                {completed}
                <small> / 8 цаг</small>
              </span>
            </div>
            <div className="hud-temperature-chart">
              <Sparkline large values={hourValues} />
              {!completed && <span>Хэмжилт хүлээж байна</span>}
            </div>
            <div className="hud-hour-axis">
              {Array.from({ length: 8 }, (_, i) => (
                <span key={i}>{temperatureTracks[track].rows[i]?.values.time || "—"}</span>
              ))}
            </div>
            <div
              className="hud-hour-slots"
              aria-label={`${completed} / 8 цаг бүртгэсэн`}
            >
              {hourValues.map((v, i) => (
                <span
                  key={i}
                  className={v === null ? "" : "complete"}
                  title={`${i + 1}-р цаг: ${v === null ? "Бүртгэлгүй" : `${v} °C`}`}
                />
              ))}
            </div>
            <Link className="hud-panel-link" href={productModulePaths.sleepers}>
              Температур бүртгэх
              <ArrowRight size={13} />
            </Link>
          </Panel>
          <Panel
            title="Материалын тойм"
            code="07"
            action={<Layers size={13} />}
          >
            <div className="hud-material-title">
              <span>БЕТОН · ТУРШИЛТ · НАЙРЛАГА</span>
              <strong>
                {samples.length}
                <small>сорьц</small>
              </strong>
            </div>
            <svg className="hud-material-surface" viewBox="0 0 260 100" role="img" aria-label="Хадгалсан найрлагын нийт утга">
              {fractions.map((value, index) => <g key={index}><motion.rect x={index * 86 + 15} width={55} fill="#fc8651" animate={{ y: 75 - value / Math.max(...fractions, 1) * 55, height: value / Math.max(...fractions, 1) * 55 }} transition={{ duration: .35 }} /><text x={index * 86 + 20} y={90} fill="#9ba8b4" fontSize="9">{["0–3", "3–8", "8–13"][index]}: {value}</text></g>)}
            </svg>
            <p className="hud-footnote">
              {composition ? `Найрлага · ${composition.date} ${composition.time || ""}` : "Найрлагын бүртгэл байхгүй"}
            </p>
            <div className="hud-materials">
              {materials.map((m) => (
                <Link
                  key={m.name}
                  href={`/samples/?material=${encodeURIComponent(m.name)}`}
                >
                  <span>{m.name}</span>
                  <div>
                    <i
                      style={{
                        width: `${(m.count / Math.max(samples.length, 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <b>{m.count}</b>
                </Link>
              ))}
            </div>
            <Link className="hud-panel-link" href={productModulePaths.secret}>
              <LockKeyhole size={12} />
              Secret лаборатори
              <ArrowRight size={13} />
            </Link>
          </Panel>
          <Panel title="Лабораторийн хариу" code="08" action={<LiveIndicator />}>
            <RegistryCompact />
          </Panel>
        </aside>
      </div>
      <div className="command-bottom-bar">
        <span>
          <span className="hud-led" />
          {samples.length} ДЭЭЖ, СОРЬЦ
        </span>
        <Link href="/samples/?status=Хугацаа хэтэрсэн" className="hud-orange">
          {samples.filter((s) => s.status === "Хугацаа хэтэрсэн").length}{" "}
          ХУГАЦАА ХЭТЭРСЭН
          <ChevronRight size={11} />
        </Link>
        <button
          onClick={() =>
            document.querySelector<HTMLButtonElement>(".header-search")?.click()
          }
        >
          <Search size={12} />
          <span>Сорьцын код, төсөл, материал...</span>
          <kbd>Ctrl K</kbd>
        </button>
      </div>
    </section>
  );
}
