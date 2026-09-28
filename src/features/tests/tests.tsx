"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Plus,
  Search,
} from "lucide-react";
import { useLabStore } from "@/lib/store";
import { EmptyState, PageHeading, StatusBadge } from "@/components/ui";
import { calculate } from "@/features/forms/config";
import { ReportRecord } from "@/features/reports/report-record";
import { formNames, formatDate } from "@/lib/utils";

export function TestsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const tests = useLabStore((s) => s.tests);
  const [filter, setFilter] = useState(params.get("filter") || "all");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [date, setDate] = useState("");
  const [selectedId, setSelectedId] = useState(params.get("id"));
  const [page, setPage] = useState(1);
  const filtered = tests.filter(
    (t) =>
      (!query ||
        `${t.sampleCode} ${t.technician}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (!kind || t.kind === kind) &&
      (!date || t.date === date) &&
      (filter === "all" ||
        (filter === "review" && !t.approved) ||
        (filter === "approved" && t.approved) ||
        (filter === "issues" && t.state !== "pass")),
  );
  const selected = tests.find((t) => t.id === selectedId);
  return (
    <>
      <PageHeading
        eyebrow="ХЭМЖИЛТЭЭС БАТАЛГААТ ҮР ДҮН"
        title="Шинжилгээ"
        description="Туршилтын үр дүнгээ хянаж, баталгаажуулна уу."
      >
        <Link className="button primary" href="/forms/">
          <Plus size={18} />
          Шинжилгээ бүртгэх
        </Link>
      </PageHeading>
      <div className="summary-strip">
        {[
          ["all", "Нийт шинжилгээ", tests.length],
          [
            "review",
            "Хяналт хүлээж буй",
            tests.filter((t) => !t.approved).length,
          ],
          ["approved", "Баталгаажсан", tests.filter((t) => t.approved).length],
          [
            "issues",
            "Анхаарах үр дүн",
            tests.filter((t) => t.state !== "pass").length,
          ],
        ].map(([key, title, count]) => (
          <button
            key={key}
            onClick={() => {
              setFilter(String(key));
              setPage(1);
            }}
            className={filter === key ? "active" : ""}
          >
            <span>{title}</span>
            <strong>{count}</strong>
          </button>
        ))}
      </div>
      <section className="panel">
        <div className="filter-toolbar tests-filters">
          <label className="search-input">
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Сорьцын код, ажилтан хайх..."
              aria-label="Шинжилгээ хайх"
            />
          </label>
          <select
            aria-label="Шинжилгээний төрөл"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Бүх шинжилгээ</option>
            {Object.entries(formNames).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
          <input
            type="date"
            aria-label="Шинжилгээний огноо"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setPage(1);
            }}
          />
          <button
            className="text-button"
            onClick={() => {
              setQuery("");
              setKind("");
              setDate("");
              setFilter("all");
              setPage(1);
            }}
          >
            Цэвэрлэх
          </button>
        </div>
        {filtered.length ? (
          <div className="table-scroll">
            <table className="data-table tests-table">
              <thead>
                <tr>
                  <th>Шинжилгээ / Сорьц</th>
                  <th>Огноо</th>
                  <th>Үр дүн</th>
                  <th>Үнэлгээ</th>
                  <th>Хяналтын төлөв</th>
                  <th>Гүйцэтгэсэн</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.slice((page - 1) * 10, page * 10).map((t) => (
                  <tr key={t.id} onClick={() => setSelectedId(t.id)}>
                    <td>
                      <button
                        className="table-primary"
                        onClick={() => setSelectedId(t.id)}
                      >
                        <span className="sample-table-icon">
                          <FlaskConical size={18} />
                        </span>
                        <span>
                          <strong>{t.sampleCode}</strong>
                          <small>{formNames[t.kind]}</small>
                        </span>
                      </button>
                    </td>
                    <td className="mono">{formatDate(t.date)}</td>
                    <td className="test-result-number">
                      {t.result.toFixed(2)}{" "}
                      <small>{calculate(t.kind, t.values).unit}</small>
                    </td>
                    <td>
                      <StatusBadge status={t.state} />
                    </td>
                    <td>
                      <StatusBadge
                        status={t.approved ? "Баталгаажсан" : "Хянаж байгаа"}
                      />
                    </td>
                    <td>{t.technician}</td>
                    <td>
                      <ChevronRight size={16} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState />
        )}
        <div className="table-footer">
          <span>
            {filtered.length} шинжилгээ · {page} /{" "}
            {Math.max(1, Math.ceil(filtered.length / 10))} хуудас
          </span>
          <div className="pagination">
            <button
              className="icon-button"
              disabled={page === 1}
              aria-label="Өмнөх хуудас"
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            <button
              className="icon-button"
              disabled={page * 10 >= filtered.length}
              aria-label="Дараах хуудас"
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>
      <div className="info-banner tests-info">
        <FlaskConical size={20} />
        <p>
          Шинэ үр дүн оруулахын тулд цахим маягтыг сонгоно уу. Хадгалсан үр дүн
          энэ жагсаалтад автоматаар нэмэгдэнэ.
        </p>
        <Link href="/forms/">
          Маягтууд
          <ArrowRight size={16} />
        </Link>
      </div>
      {selected && (
        <ReportRecord
          record={selected}
          onClose={() => {
            setSelectedId(null);
            if (params.has("id")) router.replace("/tests/");
          }}
        />
      )}
    </>
  );
}
