"use client";
import { useLiveQuery } from "dexie-react-hooks";
import {
  CalendarDays, CalendarPlus, ChartColumn, Command, CreditCard, Download, Ellipsis, LayoutDashboard, Layers, Monitor,
  Moon, PanelLeft, PanelLeftClose, Search, Settings, Sun, Ticket, UserCheck, UserPlus, Users, Wallet, Wifi, WifiOff,
  Wrench, GraduationCap, ArrowRight, Store,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { db } from "@/lib/db";
import { useOnline, useSettings } from "@/lib/hooks";
import { seedDemo } from "@/lib/seed";
import { cn, fullName, setMoneyFormat, EMPTY } from "@/lib/utils";
import { OverlayProvider, Sheet } from "./overlay";
import { ViewSwitch } from "./view-switch";
import { Avatar, Kbd } from "./ui";

/* ───────── Theme ───────── */
type ThemePref = "light" | "dark" | "system";
const ThemeCtx = createContext<{ pref: ThemePref; setPref: (t: ThemePref) => void; resolved: "light" | "dark" }>({
  pref: "system", setPref: () => {}, resolved: "light",
});
export const useTheme = () => useContext(ThemeCtx);

function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme") as ThemePref | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setPrefState(saved);
    } catch {}
  }, []);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const r = pref === "system" ? (mq.matches ? "dark" : "light") : pref;
      setResolved(r);
      document.documentElement.classList.toggle("dark", r === "dark");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [pref]);
  const setPref = (t: ThemePref) => {
    setPrefState(t);
    try { localStorage.setItem("theme", t); } catch {}
  };
  return <ThemeCtx.Provider value={{ pref, setPref, resolved }}>{children}</ThemeCtx.Provider>;
}

/* ───────── PWA install + service worker ───────── */
type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const InstallCtx = createContext<{ canInstall: boolean; install: () => void }>({ canInstall: false, install: () => {} });
export const useInstall = () => useContext(InstallCtx);

function PwaProvider({ children }: { children: ReactNode }) {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
    const h = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  const install = useCallback(() => {
    evt?.prompt();
    evt?.userChoice.finally(() => setEvt(null));
  }, [evt]);
  return <InstallCtx.Provider value={{ canInstall: !!evt, install }}>{children}</InstallCtx.Provider>;
}

/* ───────── Data bootstrap ───────── */
function DataGate({ children, splash }: { children: ReactNode; splash?: ReactNode }) {
  const [ready, setReady] = useState(false);
  const settings = useSettings();
  useEffect(() => {
    (async () => {
      try {
        const s = await db.settings.get("studio");
        if (!s) await seedDemo();
        if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
      } finally {
        setReady(true);
      }
    })();
  }, []);
  setMoneyFormat(settings.currency, settings.locale);
  if (!ready) return <>{splash ?? <Splash />}</>;
  return <>{children}</>;
}

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center paper">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <Logo size={52} />
        <div className="font-display text-xl text-ink">Preparing your studio…</div>
        <div className="h-1 w-40 overflow-hidden rounded-full bg-line">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" />
        </div>
      </div>
    </div>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <rect width="48" height="48" rx="14" fill="var(--accent)" />
      <circle cx="24" cy="24" r="12.5" fill="none" stroke="var(--accent-ink)" strokeWidth="2.6" opacity=".9" />
      <path d="M11 30.5c4.5-3 8.8-4.4 13-4.4s8.5 1.4 13 4.4" fill="none" stroke="var(--accent-ink)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="24" cy="17.5" r="2.6" fill="var(--accent-ink)" />
    </svg>
  );
}

/* ───────── Navigation ───────── */
const NAV = [
  {
    group: "Studio", items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/schedule", label: "Schedule", icon: CalendarDays },
      { href: "/admin/check-in", label: "Check-in", icon: UserCheck },
    ],
  },
  {
    group: "People", items: [
      { href: "/admin/members", label: "Members", icon: Users },
      { href: "/admin/instructors", label: "Instructors", icon: GraduationCap },
    ],
  },
  {
    group: "Business", items: [
      { href: "/admin/plans", label: "Plans & Pricing", icon: Ticket },
      { href: "/admin/payments", label: "Payments", icon: Wallet },
      { href: "/admin/reports", label: "Reports", icon: ChartColumn },
    ],
  },
  {
    group: "Operations", items: [
      { href: "/admin/classes", label: "Classes & Rooms", icon: Layers },
      { href: "/admin/equipment", label: "Equipment", icon: Wrench },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];
const ALL_NAV = NAV.flatMap((g) => g.items);

const isActive = (path: string, href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));

function Sidebar({ collapsed, setCollapsed, openPalette }: { collapsed: boolean; setCollapsed: (v: boolean) => void; openPalette: () => void }) {
  const path = usePathname();
  const settings = useSettings();
  const online = useOnline();
  const { canInstall, install } = useInstall();
  const { pref, setPref } = useTheme();

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-bg-elev/80 backdrop-blur md:flex transition-[width] duration-300",
        collapsed ? "w-[76px]" : "w-[264px]",
      )}
    >
      <div className={cn("flex items-center gap-3 px-5 pt-6 pb-5", collapsed && "justify-center px-0")}>
        <Logo />
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate font-display text-[17px] leading-tight text-ink">{settings.studioName}</div>
            <div className="truncate text-xs text-muted">{settings.tagline}</div>
          </div>
        )}
      </div>

      <div className={cn("px-4 pb-3", collapsed && "px-3")}>
        <button
          onClick={openPalette}
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm text-muted shadow-sm transition hover:border-line-strong hover:text-ink",
            collapsed && "justify-center px-0",
          )}
          aria-label="Search"
        >
          <Search className="size-4" />
          {!collapsed && <><span className="flex-1 text-left">Search…</span><Kbd>Ctrl K</Kbd></>}
        </button>
      </div>

      <div className={cn("px-4 pb-3", collapsed && "px-3")}>
        <ViewSwitch current="staff" tone="app" compact={collapsed} className={collapsed ? "flex-col" : undefined} />
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {NAV.map((g) => (
          <div key={g.group}>
            {!collapsed && <div className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint">{g.group}</div>}
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const active = isActive(path, it.href);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    title={collapsed ? it.label : undefined}
                    className={cn(
                      "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors",
                      active ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:bg-surface/60 hover:text-ink",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />}
                    <it.icon className={cn("size-[18px] shrink-0", active ? "text-accent" : "text-muted group-hover:text-ink-2")} />
                    {!collapsed && it.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn("space-y-3 border-t border-line p-4", collapsed && "px-3")}>
        {canInstall && !collapsed && (
          <button onClick={install} className="flex w-full items-center gap-3 rounded-xl bg-accent-soft px-3 py-2.5 text-left text-[13px] font-medium text-accent-strong dark:text-accent">
            <Download className="size-4" /> Install app on this device
          </button>
        )}
        <div className={cn("flex items-center gap-2", collapsed ? "flex-col" : "justify-between")}>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium",
              online ? "bg-good-soft text-good" : "bg-warn-soft text-warn",
            )}
            title={online ? "Online — all data is stored on this device" : "Offline — everything keeps working, data is saved locally"}
          >
            {online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
            {!collapsed && (online ? "Online" : "Offline mode")}
          </div>
          <div className={cn("flex items-center rounded-lg border border-line bg-surface p-0.5", collapsed && "flex-col")}>
            {([["light", Sun], ["system", Monitor], ["dark", Moon]] as const).map(([v, I]) => (
              <button
                key={v}
                onClick={() => setPref(v)}
                className={cn("grid size-7 place-items-center rounded-md transition", pref === v ? "bg-bg-elev text-ink" : "text-faint hover:text-ink")}
                aria-label={`${v} theme`}
                title={`${v[0].toUpperCase()}${v.slice(1)} theme`}
              >
                <I className="size-3.5" />
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-surface/60 hover:text-ink", collapsed && "justify-center")}
        >
          {collapsed ? <PanelLeft className="size-4" /> : <><PanelLeftClose className="size-4" /> Collapse sidebar</>}
        </button>
      </div>
    </aside>
  );
}

function MobileNav({ openPalette }: { openPalette: () => void }) {
  const path = usePathname();
  const [more, setMore] = useState(false);
  const settings = useSettings();
  const online = useOnline();
  const { pref, setPref } = useTheme();
  const primary = [ALL_NAV[0], ALL_NAV[1], ALL_NAV[2], ALL_NAV[3]];

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-md md:hidden">
        <Logo size={30} />
        <div className="min-w-0 flex-1 truncate font-display text-[16px] text-ink">{settings.studioName}</div>
        {!online && <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-medium text-warn"><WifiOff className="size-3" /> Offline</span>}
        <Link href="/" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line px-2.5 text-[12.5px] font-medium text-ink-2 hover:bg-bg-elev" aria-label="Switch to client site">
          <Store className="size-4" /> Client
        </Link>
        <button onClick={openPalette} className="grid size-9 place-items-center rounded-xl text-ink-2 hover:bg-bg-elev" aria-label="Search"><Search className="size-[18px]" /></button>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <div className="grid h-16 grid-cols-5">
          {primary.map((it) => {
            const active = isActive(path, it.href);
            return (
              <Link key={it.href} href={it.href} className={cn("flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium", active ? "text-accent" : "text-muted")}>
                <it.icon className="size-5" />
                {it.label}
              </Link>
            );
          })}
          <button onClick={() => setMore(true)} className="flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium text-muted">
            <Ellipsis className="size-5" /> More
          </button>
        </div>
      </nav>

      <Sheet open={more} onClose={() => setMore(false)} width="max-w-sm" title="Menu">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="font-display text-lg">Menu</div>
          <div className="flex items-center rounded-lg border border-line bg-surface p-0.5">
            {([["light", Sun], ["system", Monitor], ["dark", Moon]] as const).map(([v, I]) => (
              <button key={v} onClick={() => setPref(v)} className={cn("grid size-8 place-items-center rounded-md", pref === v ? "bg-bg-elev text-ink" : "text-faint")} aria-label={`${v} theme`}>
                <I className="size-4" />
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          {NAV.map((g) => (
            <div key={g.group}>
              <div className="mb-1.5 px-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint">{g.group}</div>
              {g.items.map((it) => (
                <Link key={it.href} href={it.href} onClick={() => setMore(false)}
                  className={cn("flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium", isActive(path, it.href) ? "bg-accent-soft text-accent-strong dark:text-accent" : "text-ink-2")}>
                  <it.icon className="size-[18px]" /> {it.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </Sheet>
    </>
  );
}

/* ───────── Command palette ───────── */
function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const members = useLiveQuery(() => (open ? db.members.toArray() : []), [open]) ?? EMPTY;

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    const actions = [
      { id: "a-member", label: "Add new member", hint: "Action", icon: UserPlus, href: "/admin/members?new=1" },
      { id: "a-session", label: "Schedule a class", hint: "Action", icon: CalendarPlus, href: "/admin/schedule?new=1" },
      { id: "a-sell", label: "Sell a membership", hint: "Action", icon: CreditCard, href: "/admin/payments?sell=1" },
      { id: "a-checkin", label: "Open check-in desk", hint: "Action", icon: UserCheck, href: "/admin/check-in" },
    ];
    const pages = ALL_NAV.map((n) => ({ id: n.href, label: n.label, hint: "Page", icon: n.icon, href: n.href }));
    const ms = members
      .filter((m) => !s || fullName(m).toLowerCase().includes(s) || m.email.toLowerCase().includes(s) || m.phone.includes(s))
      .slice(0, s ? 8 : 4)
      .map((m) => ({ id: m.id, label: fullName(m), hint: m.email, icon: null as null | typeof Users, href: `/admin/members?id=${m.id}`, member: m }));
    const f = <T extends { label: string }>(a: T[]) => (s ? a.filter((x) => x.label.toLowerCase().includes(s)) : a);
    return [...f(actions), ...ms, ...f(pages)];
  }, [q, members]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ(""); setIdx(0);
  }, [open]);

  if (!open) return null;
  const go = (href: string) => { onClose(); router.push(href); };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-[#1a140c]/40 backdrop-blur-[3px] animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-lg animate-pop">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-[18px] text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => { setQ(e.target.value); setIdx(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(items.length - 1, i + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
              if (e.key === "Enter" && items[idx]) go(items[idx].href);
              if (e.key === "Escape") onClose();
            }}
            placeholder="Search members, pages, actions…"
            className="h-14 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 && <div className="px-4 py-10 text-center text-sm text-muted">No results for “{q}”</div>}
          {items.map((it, i) => (
            <button
              key={it.id}
              onMouseEnter={() => setIdx(i)}
              onClick={() => go(it.href)}
              className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left", i === idx ? "bg-bg-elev" : "")}
            >
              {"member" in it && it.member ? (
                <Avatar name={it.label} id={it.id} size={28} />
              ) : (
                <span className="grid size-7 place-items-center rounded-lg bg-accent-soft text-accent">{it.icon && <it.icon className="size-4" />}</span>
              )}
              <span className="flex-1 truncate text-sm font-medium text-ink">{it.label}</span>
              <span className="truncate text-xs text-muted">{it.hint}</span>
              {i === idx && <ArrowRight className="size-4 text-muted" />}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t border-line bg-surface-2 px-4 py-2 text-[11px] text-muted">
          <Command className="size-3.5" /> <span><Kbd>↑</Kbd> <Kbd>↓</Kbd> navigate</span><span><Kbd>Enter</Kbd> open</span>
        </div>
      </div>
    </div>
  );
}

/* ───────── Public site providers (no admin chrome) ───────── */
export function SiteProviders({ children, bodyClass = "" }: { children: ReactNode; bodyClass?: string }) {
  useEffect(() => {
    // The public site has its own fixed paper palette and fonts; apply them to <body>
    // so portalled dialogs, sheets and toasts pick them up too.
    const classes = ["site", ...bodyClass.split(/\s+/).filter(Boolean)];
    document.documentElement.classList.remove("dark");
    document.body.classList.add(...classes);
    return () => document.body.classList.remove(...classes);
  }, [bodyClass]);
  return (
    <PwaProvider>
      <OverlayProvider>
        <DataGate splash={<PaperSplash />}>{children}</DataGate>
      </OverlayProvider>
    </PwaProvider>
  );
}

/** First-load state for the public site: a blank sheet, no spinner. */
function PaperSplash() {
  return (
    <div className="mx-auto grid min-h-[70dvh] max-w-[1240px] place-items-center px-4">
      <p className="f-narrow text-[14px] font-semibold uppercase tracking-[0.12em] text-form" role="status">Opening the timetable…</p>
    </div>
  );
}

/* ───────── App shell ───────── */
export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);
  const [palette, setPalette] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsedState(localStorage.getItem("sidebar-collapsed") === "1");
    } catch {}
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  const setCollapsed = (v: boolean) => {
    setCollapsedState(v);
    try { localStorage.setItem("sidebar-collapsed", v ? "1" : "0"); } catch {}
  };

  return (
    <ThemeProvider>
      <PwaProvider>
        <OverlayProvider>
          <DataGate>
            <div className="flex min-h-dvh paper">
              <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} openPalette={() => setPalette(true)} />
              <div className="flex min-w-0 flex-1 flex-col">
                <MobileNav openPalette={() => setPalette(true)} />
                <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-6 pb-28 sm:px-6 md:px-10 md:pt-10 md:pb-12">{children}</main>
              </div>
            </div>
            <CommandPalette open={palette} onClose={() => setPalette(false)} />
          </DataGate>
        </OverlayProvider>
      </PwaProvider>
    </ThemeProvider>
  );
}
