"use client";
import { useLiveQuery } from "dexie-react-hooks";
import {
  addDays, endOfDay, endOfMonth, format, isSameDay, startOfDay, startOfMonth, startOfWeek, subMonths, subWeeks,
} from "date-fns";
import {
  ArrowRight, ArrowUpRight, CalendarPlus, Cake, CircleCheck, Clock, CreditCard, HeartPulse, Receipt, ShieldCheck, Sparkles,
  TrendingUp, UserCheck, UserPlus, Users, Wrench, CalendarDays, Hourglass,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarList, ChartTip } from "@/components/charts";
import { SessionSheet } from "@/components/domain/session-sheet";
import { MemberSheet } from "@/components/domain/member-sheet";
import { Avatar, Button, Card, CardHeader, Meter, Skeleton, Stat } from "@/components/ui";
import { db } from "@/lib/db";
import { useLookups, useNow, useSettings } from "@/lib/hooks";
import { creditsLeft, membershipState, sessionEnd } from "@/lib/logic";
import { ago, cn, fullName, money, pct } from "@/lib/utils";

export default function Dashboard() {
  const now = useNow();
  const lk = useLookups();
  const settings = useSettings();
  const [openSession, setOpenSession] = useState<string | null>(null);
  const [openMember, setOpenMember] = useState<string | null>(null);

  const rangeStart = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 11).toISOString();
  const sessions = useLiveQuery(() => db.sessions.where("start").between(rangeStart, addDays(now, 8).toISOString()).toArray(), [rangeStart]);
  const bookings = useLiveQuery(() => db.bookings.toArray(), []);
  const payments = useLiveQuery(() => db.payments.where("date").above(subMonths(startOfMonth(now), 3).toISOString()).toArray(), []);
  const memberships = useLiveQuery(() => db.memberships.toArray(), []);
  const equipment = useLiveQuery(() => db.equipment.toArray(), []);
  const activity = useLiveQuery(() => db.activity.orderBy("at").reverse().limit(8).toArray(), []);

  const data = useMemo(() => {
    if (!sessions || !bookings || !payments || !memberships) return null;
    const bySession = new Map<string, typeof bookings>();
    bookings.forEach((b) => bySession.set(b.sessionId, [...(bySession.get(b.sessionId) ?? []), b]));
    const live = (sid: string) => (bySession.get(sid) ?? []).filter((b) => b.status === "booked" || b.status === "checked_in");

    const today = sessions.filter((s) => isSameDay(new Date(s.start), now) && !s.cancelled).sort((a, b) => a.start.localeCompare(b.start));
    const todayBooked = today.reduce((a, s) => a + live(s.id).length, 0);
    const todayIn = today.reduce((a, s) => a + live(s.id).filter((b) => b.status === "checked_in").length, 0);

    const mStart = startOfMonth(now), lmStart = startOfMonth(subMonths(now, 1));
    const lmSameDay = addDays(lmStart, now.getDate());
    const rev = (from: Date, to: Date) => payments.filter((p) => p.status !== "pending" && p.date >= from.toISOString() && p.date < to.toISOString()).reduce((a, p) => a + p.amount, 0);
    const revMonth = rev(mStart, endOfMonth(now));
    const revLastSame = rev(lmStart, lmSameDay);

    const weekAgo = addDays(startOfDay(now), -7).toISOString();
    const past7 = sessions.filter((s) => !s.cancelled && s.start >= weekAgo && s.start < now.toISOString());
    const occ = past7.length ? past7.reduce((a, s) => a + Math.min(1, live(s.id).length / s.capacity), 0) / past7.length : 0;

    // weekly revenue for 12 weeks (payments only cover ~3 months; it's fine)
    const weeks = Array.from({ length: 12 }, (_, i) => {
      const ws = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 11 - i);
      const we = addDays(ws, 7);
      const attended = sessions.filter((s) => s.start >= ws.toISOString() && s.start < we.toISOString())
        .reduce((a, s) => a + (bySession.get(s.id) ?? []).filter((b) => b.status === "checked_in").length, 0);
      return { label: format(ws, "MMM d"), revenue: Math.round(rev(ws, we)), attended };
    });

    const activeMemberIds = new Set(memberships.filter((m) => membershipState(m, now) === "active").map((m) => m.memberId));
    const newThisMonth = lk.members.filter((m) => m.joinedAt >= mStart.toISOString()).length;

    // attention
    const soon = addDays(now, 7).toISOString();
    const expiring = memberships.filter((m) => membershipState(m, now) === "active" && m.endDate <= soon);
    const lowCredit = memberships.filter((m) => membershipState(m, now) === "active" && m.creditsTotal != null && creditsLeft(m) <= 1);
    const pending = payments.filter((p) => p.status === "pending");

    // class mix this month (attendance)
    const mix = new Map<string, number>();
    sessions.filter((s) => s.start >= mStart.toISOString() && s.start < now.toISOString()).forEach((s) => {
      mix.set(s.classTypeId, (mix.get(s.classTypeId) ?? 0) + (bySession.get(s.id) ?? []).filter((b) => b.status === "checked_in").length);
    });

    return {
      today, live, todayBooked, todayIn, revMonth, revLastSame, occ, weeks, activeCount: activeMemberIds.size, newThisMonth,
      expiring, lowCredit, pending, mix,
    };
  }, [sessions, bookings, payments, memberships, now, lk.members]);

  const birthdays = lk.members.filter((m) => m.birthday && (() => {
    const b = new Date(m.birthday!); const d = new Date(now.getFullYear(), b.getMonth(), b.getDate());
    return d >= startOfDay(now) && d <= endOfDay(addDays(now, 7));
  })());
  const unsigned = lk.members.filter((m) => m.status === "active" && !m.waiverSigned);
  const serviceDue = (equipment ?? []).filter((e) => e.status !== "operational" || (e.lastServiceAt && (now.getTime() - new Date(e.lastServiceAt).getTime()) / 86400000 > e.serviceIntervalDays));

  const hour = now.getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const trend = data && data.revLastSame > 0 ? ((data.revMonth - data.revLastSame) / data.revLastSame) * 100 : undefined;

  const attention = data ? [
    ...data.expiring.slice(0, 4).map((m) => ({ key: m.id, icon: <Hourglass />, tone: "warn" as const, title: fullName(lk.member.get(m.memberId)), desc: `${m.planName} expires ${format(new Date(m.endDate), "EEE MMM d")}`, member: m.memberId })),
    ...data.lowCredit.slice(0, 4).map((m) => ({ key: "c" + m.id, icon: <CreditCard />, tone: "clay" as const, title: fullName(lk.member.get(m.memberId)), desc: `${creditsLeft(m)} credit left on ${m.planName}`, member: m.memberId })),
    ...unsigned.slice(0, 3).map((m) => ({ key: "w" + m.id, icon: <ShieldCheck />, tone: "info" as const, title: fullName(m), desc: "Waiver not signed", member: m.id })),
    ...data.pending.slice(0, 3).map((p) => ({ key: p.id, icon: <Receipt />, tone: "bad" as const, title: `${money(p.amount)} pending`, desc: `${p.description} · ${fullName(lk.member.get(p.memberId ?? ""))}`, member: p.memberId })),
    ...serviceDue.slice(0, 3).map((e) => ({ key: e.id, icon: <Wrench />, tone: "neutral" as const, title: e.name, desc: e.status === "operational" ? "Service overdue" : e.status === "maintenance" ? "In maintenance" : "Out of service", member: undefined })),
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between animate-rise">
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted">{format(now, "EEEE, MMMM d")}</div>
          <h1 className="font-display text-3xl font-medium tracking-tight text-ink md:text-[40px] md:leading-[1.1]">
            {greet}{settings.ownerName.trim() ? <>, <span className="italic text-accent">{settings.ownerName.trim().split(" ")[0]}</span></> : "."}
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            {data ? <>You have <b className="font-semibold text-ink">{data.today.length} classes</b> and <b className="font-semibold text-ink">{data.todayBooked} bookings</b> today.</> : "Loading your day…"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/members?new=1"><Button><UserPlus /> New member</Button></Link>
          <Link href="/schedule?new=1"><Button><CalendarPlus /> Schedule class</Button></Link>
          <Link href="/check-in"><Button variant="primary"><UserCheck /> Check-in desk</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 md:gap-4">
        {!data ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[132px]" />) : (
          <>
            <Stat label="Today's attendance" value={<>{data.todayIn}<span className="text-xl text-faint">/{data.todayBooked}</span></>} sub="checked in / booked" icon={<UserCheck />} />
            <Stat label="Active members" value={data.activeCount} sub={`+${data.newThisMonth} joined this month`} icon={<Users />} />
            <Stat label="Revenue this month" value={money(data.revMonth, { cents: false })} trend={trend != null ? { value: trend } : undefined} sub="vs. same point last month" icon={<TrendingUp />} />
            <Stat label="Avg. occupancy" value={pct(data.occ)} sub="last 7 days" icon={<Sparkles />} />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Weekly revenue" subtitle="Last 12 weeks, all payment types" action={<Link href="/reports" className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">Reports <ArrowUpRight className="size-3.5" /></Link>} />
          <div className="h-[260px] px-2 pt-4 pb-3">
            {data ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.weeks} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="0" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={(v) => money(v, { compact: true })} />
                  <Tooltip cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }} content={<ChartTip format={(v) => money(v, { cents: false })} labelFormat={(l) => `Week of ${l}`} />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="var(--accent)" strokeWidth={2} fill="url(#rev)" activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <Skeleton className="h-full" />}
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader title="Today's classes" subtitle={format(now, "EEEE")} icon={<CalendarDays />}
            action={<Link href="/schedule" className="text-[13px] font-medium text-accent hover:underline">Week</Link>} />
          <div className="mt-3 flex-1 space-y-1 overflow-y-auto px-3 pb-4 lg:max-h-[268px]">
            {data?.today.length === 0 && <div className="px-3 py-10 text-center text-sm text-muted">No classes today — enjoy the quiet.</div>}
            {data?.today.map((s) => {
              const ct = lk.classType.get(s.classTypeId);
              const n = data.live(s.id).length;
              const ended = sessionEnd(s) < now;
              const live = new Date(s.start) <= now && !ended;
              return (
                <button key={s.id} onClick={() => setOpenSession(s.id)} className={cn("flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-bg-elev", ended && "opacity-60")}>
                  <div className="w-14 shrink-0 text-right">
                    <div className="text-[13px] font-semibold text-ink tnum">{format(new Date(s.start), "h:mm")}</div>
                    <div className="text-[10.5px] uppercase text-muted">{format(new Date(s.start), "a")}</div>
                  </div>
                  <span className="h-9 w-[3px] shrink-0 rounded-full" style={{ background: ct?.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate text-sm font-medium text-ink">{ct?.name}{live && <span className="size-1.5 animate-pulse rounded-full bg-good" />}</div>
                    <div className="truncate text-xs text-muted">{lk.instructor.get(s.instructorId)?.name}</div>
                  </div>
                  <div className="w-14 shrink-0">
                    <div className="mb-1 text-right text-[11px] text-muted tnum">{n}/{s.capacity}</div>
                    <Meter value={n} max={s.capacity} tone={n >= s.capacity ? "warn" : "accent"} />
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Needs attention" subtitle="Renewals, credits, waivers & gear" />
          <div className="mt-3 space-y-1 px-3 pb-4">
            {attention.length === 0 && <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted"><CircleCheck className="size-6 text-good" />All clear</div>}
            {attention.slice(0, 8).map((a) => (
              <button key={a.key} disabled={!a.member} onClick={() => a.member && setOpenMember(a.member)} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition enabled:hover:bg-bg-elev">
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg [&_svg]:size-4", {
                  warn: "bg-warn-soft text-warn", clay: "bg-clay-soft text-clay", info: "bg-info-soft text-info", bad: "bg-bad-soft text-bad", neutral: "bg-bg-elev text-ink-2",
                }[a.tone])}>{a.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">{a.title}</div>
                  <div className="truncate text-xs text-muted">{a.desc}</div>
                </div>
                {a.member && <ArrowRight className="size-3.5 text-faint" />}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Class mix" subtitle={`Check-ins in ${format(now, "MMMM")}`} />
          <div className="px-5 pt-4 pb-5">
            {data ? (
              <BarList rows={[...data.mix.entries()].map(([id, v]) => ({ label: lk.classType.get(id)?.name ?? "—", value: v, color: lk.classType.get(id)?.color })).sort((a, b) => b.value - a.value)} />
            ) : <Skeleton className="h-48" />}
            {birthdays.length > 0 && (
              <div className="mt-6 rounded-2xl border border-clay/20 bg-clay-soft/50 p-3">
                <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-ink"><Cake className="size-4 text-clay" /> Birthdays this week</div>
                <div className="flex flex-wrap gap-1.5">
                  {birthdays.map((m) => (
                    <button key={m.id} onClick={() => setOpenMember(m.id)} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2 py-1 text-xs text-ink-2 shadow-sm hover:text-ink">
                      <Avatar name={fullName(m)} id={m.id} size={18} className="ring-0" /> {m.firstName} · {format(new Date(m.birthday!), "MMM d")}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent activity" subtitle="Saved on this device" icon={<Clock />} />
          <ul className="mt-3 px-5 pb-5">
            {(activity ?? []).map((a, i, arr) => (
              <li key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
                {i < arr.length - 1 && <span className="absolute left-[7px] top-4 bottom-0 w-px bg-line" />}
                <span className={cn("relative mt-1 size-[15px] shrink-0 rounded-full border-[3px] border-surface", {
                  checkin: "bg-good", booking: "bg-info", cancel: "bg-clay", payment: "bg-accent", member: "bg-ink-2", membership: "bg-accent", session: "bg-warn", system: "bg-faint",
                }[a.kind])} />
                <div className="min-w-0">
                  <div className="text-[13px] text-ink-2">{a.message}</div>
                  <div className="text-[11px] text-faint">{ago(a.at)}</div>
                </div>
              </li>
            ))}
            {activity?.length === 0 && <li className="py-8 text-center text-sm text-muted">No activity yet.</li>}
          </ul>
        </Card>
      </div>

      {data && data.today.some((s) => data.live(s.id).some((b) => lk.member.get(b.memberId)?.healthNotes)) && (
        <Card className="flex items-center gap-3 border-clay/20 bg-clay-soft/40 p-4 text-sm">
          <HeartPulse className="size-5 shrink-0 text-clay" />
          <span className="text-ink-2">Some members in today&apos;s classes have <b className="text-ink">health notes</b>. Instructors can see them on each roster.</span>
        </Card>
      )}

      <SessionSheet sessionId={openSession} onClose={() => setOpenSession(null)} />
      <MemberSheet memberId={openMember} onClose={() => setOpenMember(null)} />
    </div>
  );
}
