"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { addDays, addWeeks, format, isSameDay, isToday, startOfDay, startOfWeek } from "date-fns";
import { CalendarPlus, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { SessionForm } from "@/components/domain/session-form";
import { SessionSheet } from "@/components/domain/session-sheet";
import { Avatar, Button, Card, EmptyState, PageHeader, Segmented, Select } from "@/components/ui";
import { db } from "@/lib/db";
import { useLookups, useNow, useSettings } from "@/lib/hooks";
import { sessionEnd } from "@/lib/logic";
import type { Session } from "@/lib/types";
import { cn, EMPTY_MAP } from "@/lib/utils";

const HOUR = 76;

type View = "week" | "day" | "list";

export default function SchedulePage() {
  return <Suspense><Schedule /></Suspense>;
}

function Schedule() {
  const lk = useLookups();
  const settings = useSettings();
  const now = useNow();
  const params = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [fIns, setFIns] = useState("");
  const [fType, setFType] = useState("");
  const [fRoom, setFRoom] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<{ date?: Date } | null>(null);

  useEffect(() => {
    if (params.get("new")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({});
      router.replace("/admin/schedule");
    }
  }, [params, router]);

  useEffect(() => {
    // default to day view on small screens
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.innerWidth < 768) setView("day");
  }, []);

  const weekStart = startOfWeek(anchor, { weekStartsOn: settings.weekStartsOn });
  const days = view === "day" ? [startOfDay(anchor)] : Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const from = days[0];
  const to = addDays(days[days.length - 1], 1);

  const sessions = useLiveQuery(() => db.sessions.where("start").between(from.toISOString(), to.toISOString()).toArray(), [from.toISOString(), to.toISOString()]);
  const counts = useLiveQuery(async () => {
    if (!sessions?.length) return new Map<string, { booked: number; wait: number }>();
    const bs = await db.bookings.where("sessionId").anyOf(sessions.map((s) => s.id)).toArray();
    const m = new Map<string, { booked: number; wait: number }>();
    bs.forEach((b) => {
      const c = m.get(b.sessionId) ?? { booked: 0, wait: 0 };
      if (b.status === "booked" || b.status === "checked_in") c.booked++;
      if (b.status === "waitlist") c.wait++;
      m.set(b.sessionId, c);
    });
    return m;
  }, [sessions]) ?? EMPTY_MAP;

  const filtered = useMemo(() => (sessions ?? []).filter((s) =>
    (!fIns || s.instructorId === fIns) && (!fType || s.classTypeId === fType) && (!fRoom || s.roomId === fRoom),
  ).sort((a, b) => a.start.localeCompare(b.start)), [sessions, fIns, fType, fRoom]);

  const step = (dir: number) => setAnchor((a) => (view === "day" ? addDays(a, dir) : addWeeks(a, dir)));
  const title = view === "day" ? format(anchor, "EEEE, MMMM d") : `${format(days[0], "MMM d")} – ${format(days[6], days[0].getMonth() === days[6].getMonth() ? "d, yyyy" : "MMM d, yyyy")}`;

  const weekStats = useMemo(() => {
    const live = filtered.filter((s) => !s.cancelled);
    const booked = live.reduce((a, s) => a + (counts.get(s.id)?.booked ?? 0), 0);
    const cap = live.reduce((a, s) => a + s.capacity, 0);
    return { classes: live.length, booked, cap };
  }, [filtered, counts]);

  return (
    <div>
      <PageHeader
        eyebrow="Timetable"
        title="Schedule"
        subtitle={`${weekStats.classes} classes · ${weekStats.booked} of ${weekStats.cap} spots booked${weekStats.cap ? ` (${Math.round((weekStats.booked / weekStats.cap) * 100)}%)` : ""}`}
        actions={<Button variant="primary" onClick={() => setForm({})}><CalendarPlus /> Schedule class</Button>}
      />

      <Card className="mb-4 flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2">
          <Button size="icon-sm" variant="ghost" onClick={() => step(-1)} aria-label="Previous"><ChevronLeft /></Button>
          <Button size="sm" onClick={() => setAnchor(new Date())}>Today</Button>
          <Button size="icon-sm" variant="ghost" onClick={() => step(1)} aria-label="Next"><ChevronRight /></Button>
          <div className="ml-2 font-display text-lg text-ink">{title}</div>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
          <Select value={fIns} onChange={(e) => setFIns(e.target.value)} className="w-[150px]">
            <option value="">All instructors</option>
            {lk.instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </Select>
          <Select value={fType} onChange={(e) => setFType(e.target.value)} className="w-[160px]">
            <option value="">All classes</option>
            {lk.classTypes.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </Select>
          <Select value={fRoom} onChange={(e) => setFRoom(e.target.value)} className="w-[150px]">
            <option value="">All rooms</option>
            {lk.rooms.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </Select>
          <Segmented value={view} onChange={setView} options={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "list", label: "List" }]} />
        </div>
      </Card>

      {view === "list" ? (
        <ListView days={days} sessions={filtered} counts={counts} lk={lk} onOpen={setOpen} now={now} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: view === "week" ? 880 : undefined }}>
              <div className="sticky top-0 z-10 grid border-b border-line bg-surface" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
                <div />
                {days.map((d) => (
                  <button key={d.toISOString()} onClick={() => { setAnchor(d); setView("day"); }} className="flex flex-col items-center gap-0.5 border-l border-line py-3 hover:bg-surface-2">
                    <span className={cn("text-[11px] font-medium uppercase tracking-wider", isToday(d) ? "text-accent" : "text-muted")}>{format(d, "EEE")}</span>
                    <span className={cn("grid size-8 place-items-center rounded-full font-display text-lg tnum", isToday(d) ? "bg-accent text-accent-ink" : "text-ink")}>{format(d, "d")}</span>
                  </button>
                ))}
              </div>
              <TimeGrid days={days} sessions={filtered} counts={counts} lk={lk} onOpen={setOpen} now={now}
                open={settings.openingHour} close={settings.closingHour} onCreate={(date) => setForm({ date })} />
            </div>
          </div>
        </Card>
      )}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
        {lk.classTypes.filter((c) => c.active).map((c) => (
          <span key={c.id} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[3px]" style={{ background: c.color }} />{c.name}</span>
        ))}
      </div>

      <SessionSheet sessionId={open} onClose={() => setOpen(null)} />
      <SessionForm open={!!form} onClose={() => setForm(null)} initial={form ?? undefined} />
    </div>
  );
}

type Counts = Map<string, { booked: number; wait: number }>;
type LK = ReturnType<typeof useLookups>;

function layoutDay(list: Session[]) {
  // assign lanes to overlapping sessions
  const lanes: number[] = [];
  const out = list.map((s) => {
    const st = new Date(s.start).getTime();
    let lane = lanes.findIndex((end) => end <= st);
    if (lane === -1) { lane = lanes.length; lanes.push(0); }
    lanes[lane] = sessionEnd(s).getTime();
    return { s, lane };
  });
  return out.map((o) => {
    const st = new Date(o.s.start).getTime(), en = sessionEnd(o.s).getTime();
    const overlap = out.filter((x) => new Date(x.s.start).getTime() < en && sessionEnd(x.s).getTime() > st);
    const lanesUsed = Math.max(...overlap.map((x) => x.lane)) + 1;
    return { ...o, lanes: lanesUsed };
  });
}

function TimeGrid({ days, sessions, counts, lk, onOpen, now, open, close, onCreate }: {
  days: Date[]; sessions: Session[]; counts: Counts; lk: LK; onOpen: (id: string) => void; now: Date; open: number; close: number; onCreate: (d: Date) => void;
}) {
  const hours = Array.from({ length: close - open + 1 }, (_, i) => open + i);
  const height = (close - open + 1) * HOUR;
  return (
    <div className="relative grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)`, height }}>
      <div className="relative">
        {hours.map((h) => (
          <div key={h} className="absolute right-2 -translate-y-1/2 text-[10.5px] text-faint tnum" style={{ top: (h - open) * HOUR }}>
            {h > open && format(new Date(2000, 0, 1, h), "h a")}
          </div>
        ))}
      </div>
      {days.map((d) => {
        const list = layoutDay(sessions.filter((s) => isSameDay(new Date(s.start), d)));
        const showNow = isSameDay(d, now) && now.getHours() >= open && now.getHours() <= close;
        return (
          <div key={d.toISOString()} className={cn("relative border-l border-line", isToday(d) && "bg-accent-soft/20")}>
            {hours.map((h) => (
              <button key={h} aria-label={`Create class ${format(d, "EEE")} ${h}:00`} onClick={() => { const x = new Date(d); x.setHours(h, 0, 0, 0); onCreate(x); }}
                className="group absolute inset-x-0 border-t border-line/70 transition hover:bg-accent-soft/40" style={{ top: (h - open) * HOUR, height: HOUR }}>
                <span className="hidden text-[11px] text-accent group-hover:inline">+ {format(new Date(2000, 0, 1, h), "h a")}</span>
              </button>
            ))}
            {list.map(({ s, lane, lanes }) => {
              const st = new Date(s.start);
              const top = ((st.getHours() - open) * 60 + st.getMinutes()) / 60 * HOUR;
              const h = Math.max(28, (s.duration / 60) * HOUR - 3);
              const ct = lk.classType.get(s.classTypeId);
              const ins = lk.instructor.get(s.instructorId);
              const c = counts.get(s.id) ?? { booked: 0, wait: 0 };
              const full = c.booked >= s.capacity;
              const past = sessionEnd(s) < now;
              return (
                <button
                  key={s.id}
                  onClick={() => onOpen(s.id)}
                  className={cn(
                    "absolute overflow-hidden rounded-lg border-l-[3px] px-2 py-1.5 text-left shadow-sm transition hover:z-20 hover:shadow-md hover:-translate-y-px",
                    past && "opacity-60", s.cancelled && "line-through opacity-50",
                  )}
                  style={{
                    top: top + 1, height: h,
                    left: `calc(${(lane / lanes) * 100}% + 3px)`, width: `calc(${100 / lanes}% - 6px)`,
                    borderLeftColor: ct?.color,
                    background: `color-mix(in srgb, ${ct?.color ?? "var(--accent)"} 13%, var(--surface))`,
                  }}
                >
                  <div className="truncate text-[12px] font-semibold leading-tight text-ink">{ct?.name}</div>
                  <div className="truncate text-[11px] text-ink-2 tnum">{format(st, "h:mm")} · {ins?.name.split(" ")[0]}</div>
                  {h > 48 && (
                    <div className="mt-1 flex items-center gap-1 text-[10.5px] text-ink-2 tnum">
                      <Users className="size-3" /> {c.booked}/{s.capacity}
                      {full && !s.cancelled && <span className="ml-auto rounded bg-surface/80 px-1 text-[9.5px] font-semibold uppercase text-clay">{c.wait ? `+${c.wait} wl` : "Full"}</span>}
                    </div>
                  )}
                </button>
              );
            })}
            {showNow && (
              <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: ((now.getHours() - open) * 60 + now.getMinutes()) / 60 * HOUR }}>
                <span className="-ml-1 size-2 rounded-full bg-bad" />
                <span className="h-px flex-1 bg-bad" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ListView({ days, sessions, counts, lk, onOpen, now }: { days: Date[]; sessions: Session[]; counts: Counts; lk: LK; onOpen: (id: string) => void; now: Date }) {
  if (!sessions.length) return <Card><EmptyState icon={<CalendarPlus />} title="No classes this week" description="Schedule a class or adjust your filters." /></Card>;
  return (
    <div className="space-y-4">
      {days.map((d) => {
        const list = sessions.filter((s) => isSameDay(new Date(s.start), d));
        if (!list.length) return null;
        return (
          <Card key={d.toISOString()} className="overflow-hidden">
            <div className={cn("flex items-center gap-3 border-b border-line px-5 py-3", isToday(d) && "bg-accent-soft/40")}>
              <span className="font-display text-lg text-ink">{format(d, "EEEE")}</span>
              <span className="text-sm text-muted">{format(d, "MMMM d")}</span>
              <span className="ml-auto text-xs text-muted">{list.length} classes</span>
            </div>
            <ul className="divide-y divide-line">
              {list.map((s) => {
                const ct = lk.classType.get(s.classTypeId);
                const ins = lk.instructor.get(s.instructorId);
                const c = counts.get(s.id) ?? { booked: 0, wait: 0 };
                return (
                  <li key={s.id}>
                    <button onClick={() => onOpen(s.id)} className={cn("flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-surface-2", sessionEnd(s) < now && "opacity-60")}>
                      <div className="w-20 text-sm font-semibold text-ink tnum">{format(new Date(s.start), "h:mm a")}</div>
                      <span className="h-9 w-[3px] rounded-full" style={{ background: ct?.color }} />
                      <div className="min-w-0 flex-1">
                        <div className={cn("truncate text-sm font-medium text-ink", s.cancelled && "line-through")}>{ct?.name}</div>
                        <div className="truncate text-xs text-muted">{lk.room.get(s.roomId)?.name} · {s.duration} min</div>
                      </div>
                      <div className="hidden items-center gap-2 sm:flex">{ins && <Avatar name={ins.name} color={ins.color} size={26} />}<span className="text-sm text-ink-2">{ins?.name}</span></div>
                      <div className="w-20 text-right text-sm tnum">
                        <span className={cn("font-semibold", c.booked >= s.capacity ? "text-clay" : "text-ink")}>{c.booked}</span>
                        <span className="text-muted">/{s.capacity}</span>
                        {c.wait > 0 && <div className="text-[11px] text-warn">+{c.wait} waitlist</div>}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
