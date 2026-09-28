/* A new authentication context must discard all cached ERP data. */
/* eslint-disable @next/next/no-location-assign-relative-destination */
"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  Box,
  Building2,
  ChevronRight,
  ClipboardList,
  FileChartColumn,
  FlaskConical,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  Microscope,
  Package,
  Pin,
  Rows3,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useLabStore } from "@/lib/store";
import { EmptyState, Modal, Toast, useUI } from "./ui";
import { NewSampleModal } from "@/features/samples/samples";
import { useRegistryStore } from "@/features/registry/store";

type NavItem = { href: string; title: string; icon: typeof LayoutDashboard; statusKey?: "samples" | "tests" | "equipment" | "registry" };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "ҮНДСЭН",
    items: [
      { href: "/", title: "Хяналтын самбар", icon: LayoutDashboard },
      { href: "/samples/", title: "Дээж, сорьц", icon: Box, statusKey: "samples" },
    ],
  },
  {
    label: "БАРИЛГА АРХИТЕКТУР КОМПАНИ",
    items: [{ href: "/sample-registry/", title: "Дээжийн бүртгэл", icon: Building2, statusKey: "registry" }],
  },
  {
    label: "ЛАБОРАТОРИ",
    items: [
      { href: "/tests/", title: "Шинжилгээ", icon: FlaskConical, statusKey: "tests" },
      { href: "/sleepers/", title: "Төмөр бетон дэр", icon: Rows3 },
      { href: "/secret/", title: "Secret лаборатори", icon: LockKeyhole },
      { href: "/small/", title: "Жижиг эдлэл", icon: Package },
      { href: "/equipment/", title: "Тоног төхөөрөмж", icon: Microscope, statusKey: "equipment" },
    ],
  },
  {
    label: "ТАЙЛАН",
    items: [
      { href: "/reports/", title: "Тайлан", icon: FileChartColumn },
      { href: "/standards/", title: "Стандарт, заавар", icon: BookOpen },
    ],
  },
  {
    label: "СИСТЕМ",
    items: [{ href: "/forms/", title: "Цахим маягтууд", icon: ClipboardList }],
  },
];
const adminItem: NavItem = { href: "/admin/users/", title: "Хэрэглэгчийн удирдлага", icon: ShieldCheck };
export const navigation = [...navGroups.flatMap((g) => g.items), adminItem];

function isActiveHref(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href.slice(0, -1)));
}
function useNavStatus() {
  const samples = useLabStore((s) => s.samples);
  const tests = useLabStore((s) => s.tests);
  const equipment = useLabStore((s) => s.equipment);
  const pendingSamples = samples.filter((s) => !["Хянаж байгаа", "Баталгаажсан", "Туршсан"].includes(s.status)).length;
  const reviewTests = tests.filter((t) => !t.approved).length;
  const equipmentIssues = equipment.filter((e) => e.status !== "Бэлэн").length;
  // Registry badge: samples still waiting on a laboratory (sent with no result, or only partial results). Updates live over SSE.
  const awaitingResults = useRegistryStore((s) => s.records.filter((r) => r.status === "Лабораторид илгээсэн" || r.status === "Хариу хэсэгчлэн авсан").length);
  return { samples: pendingSamples, tests: reviewTests, equipment: equipmentIssues, registry: awaitingResults } as Record<string, number>;
}

export function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`brand buk-brand ${dark ? "brand-dark" : ""}`}>
      <div className="brand-symbol">
        <FlaskConical size={25} strokeWidth={1.65} />
      </div>
      <div>
        <strong>Улаан баатар БҮК</strong>
        <small>Лаборатори</small>
      </div>
    </div>
  );
}

export function AppSidebar({
  open,
  onClose,
  expanded,
  pinned,
  onTogglePinned,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
}: {
  open: boolean;
  onClose: () => void;
  expanded: boolean;
  pinned: boolean;
  onTogglePinned: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
  onBlur: (e: React.FocusEvent<HTMLElement>) => void;
}) {
  const pathname = usePathname();
  const user = useLabStore((s) => s.user);
  const connection = useLabStore((s) => s.connection);
  const status = useNavStatus();
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [liquidHeight, setLiquidHeight] = useState(0);
  const [tubeHeight, setTubeHeight] = useState(0);

  const activeHref =
    navigation.find((n) => isActiveHref(pathname, n.href))?.href ?? "/";

  const measure = useCallback(() => {
    const container = navRef.current;
    const activeEl = itemRefs.current.get(activeHref);
    if (!container) return;
    setTubeHeight(container.offsetHeight);
    if (!activeEl) return;
    setLiquidHeight(container.offsetHeight - (activeEl.offsetTop + activeEl.offsetHeight / 2));
  }, [activeHref]);

  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    const container = navRef.current;
    const observer = container ? new ResizeObserver(() => measure()) : null;
    if (container && observer) observer.observe(container);
    return () => { window.removeEventListener("resize", measure); observer?.disconnect(); };
  }, [measure]);

  let index = 0;
  const renderItem = (item: NavItem) => {
    index += 1;
    const active = item.href === activeHref;
    const count = item.statusKey ? status[item.statusKey] : 0;
    return (
      <Link
        href={item.href}
        key={item.href}
        ref={(el) => { if (el) itemRefs.current.set(item.href, el); else itemRefs.current.delete(item.href); }}
        data-focus-target
        onClick={onClose}
        title={item.title}
        aria-current={active ? "page" : undefined}
        className={`instrument-item ${active ? "active" : ""}`}
      >
        <span className="instrument-index">{String(index).padStart(2, "0")}</span>
        <item.icon size={18} strokeWidth={1.6} className="instrument-icon" />
        <span className="instrument-label">{item.title}</span>
        <span className={`instrument-led ${count > 0 ? "warn" : "ok"}`} aria-hidden="true" />
        {count > 0 && <span className="instrument-badge">{count}</span>}
        {active && (
          <>
            <i className="instrument-corner tl" />
            <i className="instrument-corner tr" />
            <i className="instrument-corner bl" />
            <i className="instrument-corner br" />
          </>
        )}
      </Link>
    );
  };

  return (
    <>
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="Цэс хаах"
          onClick={onClose}
        />
      )}
      <aside
        className={`sidebar instrument-rail ${open ? "open" : ""} ${expanded ? "expanded" : ""} ${pinned ? "pinned" : ""}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        <div className="instrument-top-row">
          <Link
            href="/"
            className="brand-link"
            onClick={onClose}
            aria-label="Улаан баатар БҮК Лаборатори · Хяналтын самбар"
            title="Улаан баатар БҮК Лаборатори"
          >
            <Brand />
          </Link>
          <button
            type="button"
            className="instrument-toggle"
            aria-pressed={pinned}
            aria-label={pinned ? "Цэсийг тогтоосон, тайлах (Ctrl+B)" : "Цэсийг тогтоож нээлттэй байлгах (Ctrl+B)"}
            title={pinned ? "Тайлах (Ctrl+B)" : "Тогтоох (Ctrl+B)"}
            onClick={onTogglePinned}
          >
            <Pin size={14} strokeWidth={1.8} />
          </button>
        </div>
        <div className="instrument-nav-wrap">
          <div className="instrument-tube" style={{ height: tubeHeight || undefined }} aria-hidden="true">
            <div
              className="instrument-liquid"
              style={{ height: liquidHeight }}
            >
              <div className="instrument-liquid-fill">
                <span className="instrument-bubble" style={{ "--bx": "35%", "--bdelay": "0s" } as React.CSSProperties} />
                <span className="instrument-bubble" style={{ "--bx": "60%", "--bdelay": "0.9s" } as React.CSSProperties} />
                <span className="instrument-bubble" style={{ "--bx": "45%", "--bdelay": "1.7s" } as React.CSSProperties} />
              </div>
            </div>
          </div>
          <nav aria-label="Үндсэн цэс" className="instrument-groups" ref={navRef}>
            {navGroups.map((group) => (
              <div className="instrument-group" key={group.label}>
                <div className="instrument-group-label">{group.label}</div>
                {group.items.map(renderItem)}
              </div>
            ))}
            {user?.role === "ADMIN" && (
              <div className="instrument-group">
                <div className="instrument-group-label">ЭРХ</div>
                {renderItem(adminItem)}
              </div>
            )}
          </nav>
        </div>
        <div className="instrument-bottom">
          <div className="instrument-user">
            <span className="instrument-avatar" aria-hidden="true">ТЛ</span>
            <div className="instrument-user-info">
              <strong>{user?.fullName || "Хэрэглэгч"}</strong>
              <small>{user?.role || ""}</small>
            </div>
          </div>
          <div className="instrument-status">
            <span className={`instrument-live-dot ${connection === "LIVE" ? "live" : connection === "RECONNECTING" ? "warn" : "off"}`} />
            <span>СИСТЕМ ОНЛАЙН</span>
          </div>
          <button
            className="instrument-logout"
            data-focus-target
            onClick={async () => { try { await api("/api/auth/logout/", { method: "POST" }); location.assign("/login/"); } catch { useUI.getState().notify("Гарах үйлдэл амжилтгүй боллоо."); } }}
          >
            <LogOut size={15} strokeWidth={1.8} />
            <span>Гарах</span>
          </button>
        </div>
      </aside>
    </>
  );
}
export function TopHeader({ onMenu }: { onMenu: () => void }) {
  const connection = useLabStore(s => s.connection);
  const user = useLabStore(s => s.user);
  const path = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifications = useLabStore((s) => s.notifications);
  const readNotification = useLabStore((s) => s.readNotification);
  const samples = useLabStore((s) => s.samples);
  const title =
    navigation.find(
      (n) =>
        n.href === path ||
        (n.href !== "/" && path.startsWith(n.href.slice(0, -1))),
    )?.title || "Хяналтын самбар";
  const unread = notifications.filter((n) => !n.read).length;
  const results = samples
    .filter((s) =>
      `${s.code} ${s.project} ${s.material}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .slice(0, 6);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearch(true);
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);
  return (
    <>
      <header className="top-header">
        <div className="breadcrumb">
          <button
            className="icon-button mobile-menu"
            aria-label="Цэс нээх"
            onClick={onMenu}
          >
            <Menu size={22} />
          </button>
          <span>Ажлын орон зай</span>
          <ChevronRight size={13} />
          <strong>{title}</strong>
        </div>
        <div className="top-actions">
          <button
            className="header-search"
            data-focus-target
            onClick={() => setSearch(true)}
            aria-label="Системээс хайх"
          >
            <Search size={17} />
            <span>Хайх...</span>
            <kbd>Ctrl K</kbd>
          </button>
          <span className="demo-pill">
            <span />
            {connection}
          </span>
          <button
            className="icon-button notification-button"
            data-focus-target
            aria-label={`Мэдэгдэл, ${unread} уншаагүй`}
            onClick={() => setNotificationsOpen(true)}
          >
            <Bell size={20} />
            {unread > 0 && <i />}
          </button>
          <div className="profile">
            <span className="avatar" aria-hidden="true">
              ТЛ
            </span>
            <span>
              {user?.fullName || "Төв лаборатори"}<small>{user?.role || ""}</small>
            </span>
          </div>
        </div>
      </header>
      {search && (
        <Modal title="Ажлын орон зайгаас хайх" onClose={() => setSearch(false)}>
          <label className="search-input">
            <Search size={19} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Сорьцын код, төсөл, материал..."
              aria-label="Хайлтын үг"
            />
            {query && (
              <button aria-label="Хайлт арилгах" onClick={() => setQuery("")}>
                <X size={16} />
              </button>
            )}
          </label>
          <div className="search-results">
            {results.length ? (
              results.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    router.push(`/samples/?id=${s.id}`);
                    setSearch(false);
                  }}
                >
                  <span className="square-icon">
                    <Box size={18} />
                  </span>
                  <span>
                    <strong>{s.code}</strong>
                    <small>
                      {s.project} · {s.grade}
                    </small>
                  </span>
                  <ArrowUpRight size={17} />
                </button>
              ))
            ) : (
              <EmptyState />
            )}
          </div>
          <div className="quick-links">
            {navigation
              .filter((n) => n.href !== "/")
              .map((n) => (
                <Link
                  onClick={() => setSearch(false)}
                  key={n.href}
                  href={n.href}
                >
                  {n.title}
                  <ChevronRight size={14} />
                </Link>
              ))}
          </div>
        </Modal>
      )}
      {notificationsOpen && (
        <Modal title="Мэдэгдэл" onClose={() => setNotificationsOpen(false)}>
          <div className="notification-top">
            <span>{unread} уншаагүй мэдэгдэл</span>
            <button className="text-button" onClick={() => readNotification()}>
              Бүгдийг уншсан
            </button>
          </div>
          <div className="notification-list">
            {notifications.slice(0, 20).map((n) => (
              <Link
                href={n.href}
                className={n.read ? "read" : ""}
                key={n.id}
                onClick={() => {
                  readNotification(n.id);
                  setNotificationsOpen(false);
                }}
              >
                <span className="square-icon">
                  <Bell size={17} />
                </span>
                <div>
                  <strong>{n.title}</strong>
                  <p>{n.description}</p>
                </div>
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
const SIDEBAR_PINNED_KEY = "lab-sidebar-pinned";
const HOVER_OPEN_DELAY = 200;
const HOVER_CLOSE_DELAY = 300;
export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const enterTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hydrated = useLabStore((s) => s.hydrated);
  const error = useLabStore((s) => s.error);
  const sampleOpen = useUI((s) => s.sampleOpen);
  const expanded = pinned || hovering || focusWithin;

  useEffect(() => {
    try { if (localStorage.getItem(SIDEBAR_PINNED_KEY) === "1") setPinned(true); } catch { /* ignore */ }
  }, []);
  const togglePinned = useCallback(() => {
    setPinned((v) => {
      const next = !v;
      try { localStorage.setItem(SIDEBAR_PINNED_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        togglePinned();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePinned]);
  useEffect(() => () => { clearTimeout(enterTimer.current); clearTimeout(leaveTimer.current); }, []);

  const onSidebarMouseEnter = useCallback(() => {
    clearTimeout(leaveTimer.current);
    clearTimeout(enterTimer.current);
    enterTimer.current = setTimeout(() => setHovering(true), HOVER_OPEN_DELAY);
  }, []);
  const onSidebarMouseLeave = useCallback(() => {
    clearTimeout(enterTimer.current);
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setHovering(false), HOVER_CLOSE_DELAY);
  }, []);
  // Keyboard users get the labels immediately (no 200ms delay) as soon as focus
  // lands inside the sidebar, and it stays open until focus truly leaves it —
  // never collapses out from under someone tabbing through the links.
  const onSidebarFocus = useCallback(() => {
    clearTimeout(leaveTimer.current);
    setFocusWithin(true);
  }, []);
  const onSidebarBlur = useCallback((e: React.FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocusWithin(false);
  }, []);

  useEffect(() => {
    // Any canvas/chart content sized off window "resize" also settles once the
    // grid-column transition (sidebar push) finishes, not just on real resizes.
    const el = shellRef.current;
    if (!el) return;
    const onEnd = (e: TransitionEvent) => { if (e.propertyName === "grid-template-columns") window.dispatchEvent(new Event("resize")); };
    el.addEventListener("transitionend", onEnd);
    return () => el.removeEventListener("transitionend", onEnd);
  }, []);

  return (
    <div className="app-shell" ref={shellRef} style={{ "--sidebar-w": expanded ? "248px" : "68px" } as React.CSSProperties}>
      <AppSidebar
        open={open}
        onClose={() => setOpen(false)}
        expanded={expanded}
        pinned={pinned}
        onTogglePinned={togglePinned}
        onMouseEnter={onSidebarMouseEnter}
        onMouseLeave={onSidebarMouseLeave}
        onFocus={onSidebarFocus}
        onBlur={onSidebarBlur}
      />
      <div className="main-shell">
        <TopHeader onMenu={() => setOpen(true)} />
        {error && (
          <div className="storage-error" role="alert">
            {error}
          </div>
        )}
        <main id="main-content" className="main-content">
          {hydrated ? (
            children
          ) : (
            <div className="loading-state" role="status">
              <span className="loading-spinner" />
              Лабораторийн мэдээллийг бэлтгэж байна...
            </div>
          )}
        </main>
        <footer className="app-footer">
          <span>© 2026 Улаан баатар БҮК Лаборатори.</span>
          <span>
            <span className="mini-dot" />
            Мэдээлэл MySQL санд хадгалагдана
          </span>
        </footer>
      </div>
      {sampleOpen && (
        <NewSampleModal onClose={() => useUI.getState().setSampleOpen(false)} />
      )}
      <Toast />
    </div>
  );
}
