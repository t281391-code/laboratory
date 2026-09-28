"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Box,
  CalendarDays,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FlaskConical,
  Minus,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { MetricCard, SectionHeading } from "@/components/ui";
import { useLabStore } from "@/lib/store";
import { useTelemetry } from "./telemetry";
import { dayOffset, daysBetween, formatTimestamp, TODAY } from "@/lib/utils";

import { SampleTable } from "@/features/samples/samples";
import { CommandCenter } from "./command-center";

type TelemetryReading = {
  name: string;
  tone: "normal" | "warning" | "critical" | "empty";
  value: string;
  unit: string;
  gauge: number | null;
  measurements: [string, string][];
  health: number | null;
  healthLabel: string;
  trend: "up" | "down" | "flat";
  change: string;
  updated: string;
};


const telemetryStatus = {
  normal: "Бүртгэгдсэн",
  warning: "Анхаарах",
  critical: "Хугацаа хэтэрсэн",
  empty: "Мэдээлэлгүй",
};

function TelemetryCards() {
  const telemetry = useTelemetry();
  const equipment = useLabStore(s => s.equipment);
  const telemetryReadings: TelemetryReading[] = [
    ...telemetry.map(t => ({ name: t.label, tone: (t.timestamp ? "normal" : "empty") as TelemetryReading["tone"], value: t.value, unit: t.unit, gauge: null, measurements: [["Өмнөх", t.previous + " " + t.unit], ["Эх үүсвэр", "Гараар бүртгэсэн"]] as [string,string][], health: null, healthLabel: "Гараар бүртгэсэн хэмжилт", trend: (t.change === null || t.change === 0 ? "flat" : t.change > 0 ? "up" : "down") as TelemetryReading["trend"], change: t.change === null ? "Мэдээлэлгүй" : t.change.toFixed(2) + " " + t.unit, updated: t.updated })),
    ...equipment.map(e => ({ name: e.name, tone: (e.status === "Засварт" ? "critical" : e.status === "Үзлэг шаардлагатай" ? "warning" : e.readings?.length ? "normal" : "empty") as TelemetryReading["tone"], value: e.readings?.[0]?.value ?? "—", unit: e.readings?.[0]?.unit ?? "", gauge: null, measurements: [["Төлөв", e.status], ["Эх үүсвэр", "Гараар бүртгэсэн"]] as [string,string][], health: null, healthLabel: e.healthStatus || "Мэдээлэлгүй", trend: "flat" as const, change: "Бүртгэлийн утга", updated: formatTimestamp(e.latestMeasurementAt) })),
  ];
  const railRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const updateEdges = useCallback(() => {
    const rail = railRef.current;
    if (rail)
      setEdges({
        start: rail.scrollLeft < 2,
        end: rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2,
      });
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.visible = "true";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.35 },
    );
    rail
      .querySelectorAll(".telemetry-card")
      .forEach((card) => observer.observe(card));
    const resizeObserver = new ResizeObserver(updateEdges);
    resizeObserver.observe(rail);
    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, [updateEdges]);

  const scroll = (direction: number) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction * rail.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };

  return (
    <>
      <div
        className="telemetry-rail"
        id="dashboard-telemetry"
        ref={railRef}
        onScroll={updateEdges}
        role="region"
        aria-label="Лабораторийн 8 жишээ үзүүлэлт. Хажуу тийш гүйлгэж харна уу."
        tabIndex={0}
      >
        {telemetryReadings.map((reading) => {
          const Trend =
            reading.trend === "up"
              ? ArrowUpRight
              : reading.trend === "down"
                ? ArrowDownRight
                : Minus;
          return (
            <article
              className={`telemetry-card telemetry-${reading.tone}`}
              key={reading.name}
              data-focus-target
              aria-label={`${reading.name}: ${reading.value} ${reading.unit}, ${telemetryStatus[reading.tone]}`}
              style={
                {
                  "--gauge-offset": 100 - (reading.gauge ?? 0),
                  "--health-scale": (reading.health ?? 0) / 100,
                } as CSSProperties
              }
            >
              <div className="telemetry-card-heading">
                <span className="telemetry-dot" aria-hidden="true" />
                <h3>{reading.name}</h3>
              </div>
              <span className="telemetry-badge">
                {telemetryStatus[reading.tone]}
              </span>
              <div className="telemetry-gauge">
                <svg viewBox="0 0 180 106" aria-hidden="true">
                  <path
                    className="telemetry-gauge-track"
                    d="M16 92 A74 74 0 0 1 164 92"
                  />
                  {reading.gauge !== null && (
                    <path
                      className="telemetry-gauge-fill"
                      d="M16 92 A74 74 0 0 1 164 92"
                      pathLength="100"
                    />
                  )}
                  <path
                    className="telemetry-gauge-ticks"
                    d="M7 92h4 M90 8v5 M169 92h4"
                  />
                </svg>
                <div className="telemetry-reading">
                  <strong
                    className={
                      reading.value.length > 5 ? "telemetry-value-wide" : ""
                    }
                  >
                    {reading.value}
                  </strong>
                  <span>{reading.unit}</span>
                </div>
              </div>
              <dl className="telemetry-measurements">
                {reading.measurements.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="telemetry-health-label">
                <span>{reading.healthLabel}</span>
                <strong>
                  {reading.health === null ? "—" : `${reading.health}%`}
                </strong>
              </div>
              <div className="telemetry-health" aria-hidden="true">
                <span />
              </div>
              <div className="telemetry-card-footer">
                <span className="telemetry-trend">
                  <Trend size={13} aria-hidden="true" />
                  {reading.change}
                </span>
                <span>
                  Сүүлд{" "}
                  <time>
                    {reading.updated}
                  </time>
                </span>
              </div>
            </article>
          );
        })}
      </div>
      <div className="telemetry-navigation">
        <span>{telemetryReadings.length} үзүүлэлт · Хажуу тийш гүйлгэх</span>
        <div>
          <button
            type="button"
            className="icon-button"
            aria-label="Өмнөх үзүүлэлтүүд"
            aria-controls="dashboard-telemetry"
            disabled={edges.start}
            onClick={() => scroll(-1)}
          >
            <ChevronLeft size={17} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Дараах үзүүлэлтүүд"
            aria-controls="dashboard-telemetry"
            disabled={edges.end}
            onClick={() => scroll(1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </>
  );
}

export function Dashboard() {
  const equipmentRecords = useLabStore(s => s.equipment);
  const router = useRouter();
  const samples = useLabStore((s) => s.samples);
  const tests = useLabStore((s) => s.tests);
  const drafts = useLabStore((s) => s.drafts);
  const [days, setDays] = useState(7);
  const registered = samples.filter((s) => s.registeredDate === TODAY).length;
  const pending = samples.filter(
    (s) => !["Хянаж байгаа", "Баталгаажсан", "Туршсан"].includes(s.status),
  ).length;
  const ready = samples.filter((s) => s.status === "Туршилтад бэлэн");
  const overdue = samples.filter((s) => s.status === "Хугацаа хэтэрсэн");
  const review = tests.filter((t) => !t.approved);
  const weeklyTotal = tests.filter(
    (test) => test.date >= dayOffset(TODAY, 1 - days) && test.date <= TODAY,
  ).length;
  const ready28 = ready.filter((s) => s.age === 28).length;
  const dueEquipment = equipmentRecords.filter(e => e.calibrationDate && daysBetween(TODAY, e.calibrationDate) <= 30);
  return (
    <div className="dashboard">
      <CommandCenter readyCount={ready.length} />
      <div className="metrics-grid">
        <MetricCard
          label="Өнөөдөр бүртгэсэн дээж"
          value={registered}
          icon={Box}
          href={`/samples/?date=${TODAY}`}
          note="Шинээр хүлээн авсан"
        />
        <MetricCard
          label="Хүлээгдэж буй шинжилгээ"
          value={pending}
          icon={FlaskConical}
          href="/samples/?status=pending"
          note="Туршилтын хуваарийн дагуу"
        />
        <MetricCard
          label="28 хоногт хүрсэн сорьц"
          value={ready28}
          icon={CalendarDays}
          href="/samples/?age=28&status=Туршилтад бэлэн"
          note="Өнөөдөр туршихад бэлэн"
          accent
        />
        <MetricCard
          label="Баталгаажуулах үр дүн"
          value={review.length}
          icon={ClipboardCheck}
          href="/tests/?filter=review"
          note="Инженерийн хяналт хүлээж байна"
        />
      </div>
      <div className="dashboard-overview">
        <section className="panel chart-panel telemetry-panel">
          <SectionHeading
            title="Лабораторийн хяналт"
            subtitle="MySQL · Гараар бүртгэсэн хэмжилт"
            action={
              <select
                aria-label="Гүйцэтгэлийн хугацаа"
                className="small-select"
                value={days}
                onChange={(e) => setDays(+e.target.value)}
              >
                <option value={7}>Сүүлийн 7 хоног</option>
                <option value={14}>Сүүлийн 14 хоног</option>
              </select>
            }
          />
          <div className="chart-summary">
            <strong>
              {weeklyTotal}
              <span>шинжилгээ гүйцэтгэсэн</span>
            </strong>
          </div>
          <TelemetryCards />
          <Link href="/tests/" className="chart-footer">
            <TrendingUp size={15} />
            <span>Гүйцэтгэлийн дүнг бүртгэлээс тооцоолов</span>
            <ArrowUpRight size={16} />
          </Link>
        </section>
        <section className="panel schedule-panel">
          <SectionHeading
            title="Сорьцын бэхжүүлэлт"
            subtitle="Өнөөдөр турших насанд хүрсэн"
            action={
              <span className="square-icon soft">
                <CalendarDays size={18} />
              </span>
            }
          />
          <div className="age-cards">
            {[3, 7, 28].map((age) => (
              <Link
                key={age}
                className={age === 28 ? "highlight" : ""}
                href={`/samples/?age=${age}&status=Туршилтад бэлэн`}
              >
                <div>
                  <span>
                    {age}
                    <small>хоног</small>
                  </span>
                  <ArrowUpRight size={17} />
                </div>
                <strong>
                  {String(ready.filter((s) => s.age === age).length).padStart(
                    2,
                    "0",
                  )}
                  <small>бүлэг сорьц</small>
                </strong>
                <div className="age-progress">
                  <i style={{ width: `${ready.length ? ready.filter(s => s.age === age).length / ready.length * 100 : 0}%` }} />
                </div>
              </Link>
            ))}
          </div>
          <Link
            href="/samples/?status=Хугацаа хэтэрсэн"
            className="overdue-banner"
          >
            <span className="warning-icon">
              <Clock3 size={18} />
            </span>
            <div>
              <strong>{overdue.length} сорьцын хугацаа хэтэрсэн</strong>
              <span>Туршилтыг эрэмбэлж гүйцэтгэнэ үү.</span>
            </div>
            <ChevronRight size={18} />
          </Link>
          <Link href="/samples/" className="schedule-link">
            Бүх сорьцын хуваарь
            <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      <div className="dashboard-work">
        <section className="panel today-panel">
          <SectionHeading
            title="Өнөөдрийн ажил"
            subtitle="Чухал ажлуудаа эрэмбэлэн гүйцэтгээрэй"
            action={
              <Link
                className="text-button"
                href="/samples/?status=Туршилтад бэлэн"
              >
                Бүгдийг харах
                <ArrowRight size={15} />
              </Link>
            }
          />
          <div className="task-list">
            {ready.slice(0, 3).map((s, i) => (
              <Link
                key={s.id}
                href={`/forms/?type=${s.material === "Цемент" ? "cement" : "compression"}&sample=${encodeURIComponent(s.code)}`}
              >
                <span className={`task-icon task-${i}`}>
                  <FlaskConical size={18} strokeWidth={1.6} />
                </span>
                <div>
                  <strong>{s.code}</strong>
                  <span>
                    {s.age} хоногийн{" "}
                    {s.material === "Цемент"
                      ? "цементийн шинжилгээ"
                      : "шахалтын туршилт"}
                  </span>
                </div>
                <span className="task-time">
                  {dayOffset(s.castingDate, s.age)}
                </span>
                <span className="task-label">Туршилт</span>
                <ChevronRight size={17} />
              </Link>
            ))}
          </div>
          <div className="today-footer">
            <CheckCheck size={17} />
            <span>
              Өнөөдөр <b>{tests.filter((t) => t.date === TODAY).length}</b>{" "}
              шинжилгээ бүртгэгдсэн
            </span>
            <Link href="/tests/">
              Бүртгэл харах
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </section>
        <section className="panel attention-panel">
          <SectionHeading
            title="Анхаарах зүйлс"
            action={
              <span className="count-badge">{dueEquipment.length + (review.length ? 1 : 0) + (drafts.fresh ? 1 : 0)}</span>
            }
          />
          <div className="attention-list">
            {dueEquipment.map(e => <Link key={e.id} href={`/equipment/?id=${e.id}`}>
              <span className="alert-dot amber" />
              <div>
                <span className="attention-eyebrow">ТОНОГ ТӨХӨӨРӨМЖ</span>
                <strong>Калибровк · {daysBetween(TODAY, e.calibrationDate)} хоног</strong>
                <p>{e.name}</p>
              </div>
              <ChevronRight size={16} />
            </Link>)}
            <Link href="/tests/?filter=review">
              <span className="alert-dot blue" />
              <div>
                <span className="attention-eyebrow">ЧАНАРЫН ХЯНАЛТ</span>
                <strong>{review.length} үр дүн баталгаажуулах</strong>
                <p>Хэмжилт, тооцооллыг хянана уу.</p>
              </div>
              <ChevronRight size={16} />
            </Link>
            {drafts.fresh && (
              <Link href="/forms/?type=fresh">
                <span className="alert-dot gray" />
                <div>
                  <span className="attention-eyebrow">ЦАХИМ МАЯГТ</span>
                  <strong>Матл-13 · Дуусаагүй ноорог</strong>
                  <p>Маягтаа үргэлжлүүлэн бөглөөрэй.</p>
                </div>
                <ChevronRight size={16} />
              </Link>
            )}
          </div>
          <Link
            href="/equipment/?filter=calibration"
            className="equipment-status"
          >
            <ShieldCheck size={17} />
            <span>{dueEquipment.length} төхөөрөмжийн калибровк ойртож байна</span>
            <ArrowUpRight size={15} />
          </Link>
        </section>
      </div>
      <section className="panel recent-panel">
        <SectionHeading
          title="Сүүлд бүртгэсэн сорьцууд"
          subtitle="Лабораторид шинээр ирсэн дээжүүд"
          action={
            <Link className="text-button" href="/samples/">
              Бүх сорьц
              <ArrowRight size={15} />
            </Link>
          }
        />
        <SampleTable
          compact
          samples={[...samples]
            .sort((a, b) => b.registeredDate.localeCompare(a.registeredDate))
            .slice(0, 3)}
          onSelect={(s) => router.push(`/samples/?id=${s.id}`)}
        />
      </section>
    </div>
  );
}
