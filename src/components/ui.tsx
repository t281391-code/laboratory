"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Inbox,
  X,
  type LucideIcon,
} from "lucide-react";
import { create } from "zustand";
import Link from "next/link";
import { stateLabel } from "@/lib/utils";

export const useUI = create<{
  toast: string;
  sampleOpen: boolean;
  notify: (message: string) => void;
  setSampleOpen: (open: boolean) => void;
}>((set) => ({
  toast: "",
  sampleOpen: false,
  notify: (message) => set({ toast: message }),
  setSampleOpen: (sampleOpen) => set({ sampleOpen }),
}));
export function Toast() {
  const message = useUI((s) => s.toast);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => useUI.setState({ toast: "" }), 4500);
    return () => clearTimeout(timer);
  }, [message]);
  return message ? (
    <div className="toast" role="status">
      <CheckCircle2 size={19} />
      <span>{message}</span>
      <button
        aria-label="Мэдэгдэл хаах"
        onClick={() => useUI.setState({ toast: "" })}
      >
        <X size={16} />
      </button>
    </div>
  ) : null;
}
export function StatusBadge({ status }: { status: string }) {
  const label = stateLabel[status as keyof typeof stateLabel] || status;
  const tone = ["pass", "Баталгаажсан", "Бэлэн", "Туршсан"].includes(status)
    ? "green"
    : ["fail", "Хугацаа хэтэрсэн", "Засварт"].includes(status)
      ? "red"
      : ["warning", "Хянаж байгаа", "Үзлэг шаардлагатай"].includes(status)
        ? "amber"
        : status === "Туршилтад бэлэн"
          ? "blue"
          : "neutral";
  return (
    <span className={`status ${tone}`}>
      <span />
      {label}
    </span>
  );
}
export function EmptyState({
  title = "Илэрц олдсонгүй",
  description = "Хайлтын үг эсвэл шүүлтүүрээ өөрчилж үзнэ үү.",
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Inbox size={28} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  drawer = false,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  drawer?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      className={`modal ${wide ? "wide" : ""} ${drawer ? "drawer" : ""} ${className}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <h2 id={id}>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Хаах">
            <X size={21} />
          </button>
        </div>
        <div className="modal-content">{children}</div>
      </div>
    </dialog>
  );
}
export function ConfirmDialog({
  title,
  description,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="confirm-icon">
        <AlertTriangle size={25} />
      </div>
      <p className="confirm-description">{description}</p>
      <div className="dialog-actions">
        <button className="button secondary" onClick={onClose}>
          Болих
        </button>
        <button
          className="button danger"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          Тийм, үргэлжлүүлэх
        </button>
      </div>
    </Modal>
  );
}
export function MetricCard({
  label,
  value,
  icon: Icon,
  href,
  note,
  accent,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  href: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`metric-card ${accent ? "accent" : ""}`}
      data-focus-target
    >
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">
          <Icon size={20} strokeWidth={1.7} />
        </span>
      </div>
      <div className="metric-number">
        {String(value).padStart(2, "0")}
        <ArrowUpRight size={20} />
      </div>
      <div className="metric-note">
        <span className="mini-dot" />
        {note}
      </div>
    </Link>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function ProgressSteps({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <ol className="progress-steps">
      {steps.map((step, i) => (
        <li
          className={i === current ? "current" : i < current ? "done" : ""}
          key={step}
        >
          <span>
            {i < current ? <Check size={16} /> : String(i + 1).padStart(2, "0")}
          </span>
          <div>{step}</div>
        </li>
      ))}
    </ol>
  );
}
