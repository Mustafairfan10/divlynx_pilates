"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { addMonths, addWeeks, format, startOfMonth, startOfWeek, subDays, subMonths } from "date-fns";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarList, ChartTip, Legend } from "@/components/charts";
import { Avatar, Button, Card, CardHeader, PageHeader, Segmented, Skeleton, Stat } from "@/components/ui";
import { db } from "@/lib/db";
import { useLookups, useSettings } from "@/lib/hooks";
import { cn, downloadFile, money, pct, toCSV } from "@/lib/utils";

type Range = "30" | "90" | "180";
const REV_SERIES = [
  { key: "membership", label: "Memberships", color: "var(--series-1)" },
  { key: "retail", label: "Retail", color: "var(--series-2)" },
  { key: "other", label: "Drop-ins & fees", color: "var(--series-3)" },
];

export default function ReportsPage() {
  const lk = useLookups();
  const settings = useSettings();
  const [range, setRange] = useState<Range>("90");
  const now = useMemo(() => new Date(), []);
  const from = subDays(now, +range);
  const prevFrom = subDays(from, +range);

  const sessions = useLiveQuery(() => db.sessions.where("start").between(prevFrom.toISOString(), now.toISOString()).toArray(), [range]);
  const bookings = useLiveQuery(() => db.bookings.toArray(), []);
  const payments = useLiveQuery(() => db.payments.toArray(), []);
  const memberships = useLiveQuery(() => db.memberships.toArray(), []);

  const r = useMemo(() => {
    if (!sessions || !bookings || !payments || !memberships) return null;
    const sById = new Map(sessions.map((s) => [s.id, s]));
    const f = from.toISOString(), pf = prevFrom.toISOString(), n = now.toISOString();
    const cur = sessions.filter((s) => s.start >= f && !s.cancelled);
    const prev = sessions.filter((s) => s.start >= pf && s.start < f && !s.cancelled);
    const bIn = (set: typeof sessions) => { const ids = new Set(set.map((s) => s.id)); return bookings.filter((b) => ids.has(b.sessionId)); };
    const curB = bIn(cur), prevB = bIn(prev);
    const att = curB.filter((b) => b.status === "checked_in");
    const prevAtt = prevB.filter((b) => b.status === "checked_in");
    const finished = curB.filter((b) => ["checked_in", "no_show", "late_cancel"].includes(b.status));
    const noShow = finished.length ? curB.filter((b) => b.status === "no_show" || b.status === "late_cancel").length / finished.length : 0;
    const rev = (a: string, b: string) => payments.filter((p) => p.status !== "pending" && p.date >= a && p.date < b).reduce((x, p) => x + p.amount, 0);
    const revCur = rev(f, n), revPrev = rev(pf, f);
    const newMembers = lk.members.filter((m) => m.joinedAt >= f).length;
    const prevVisitors = new Set(prevAtt.map((b) => b.memberId));
    const curVisitors = new Set(att.map((b) => b.memberId));
    const retained = [...prevVisitors].filter((id) => curVisitors.has(id)).length;
    const retention = prevVisitors.size ? retained / prevVisitors.size : 0;
    const avgSize = cur.filter((s) => s.start < n).length ? att.length / cur.filter((s) => s.start < n).length : 0;
    const fill = cur.filter((s) => s.start < n).reduce((a, s) => a + Math.min(1, att.filter((b) => b.sessionId === s.id).length / s.capacity), 0) / Math.max(1, cur.filter((s) => s.start < n).length);

    // monthly revenue by type (last 6 months, independent of range for context)
    const months = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(now, 5 - i)));
    const revByMonth = months.map((m) => {
      const a = m.toISOString(), b = addMonths(m, 1).toISOString();
      const ps = payments.filter((p) => p.status !== "pending" && p.date >= a && p.date < b);
      return {
        label: format(m, "MMM"),
        membership: Math.round(ps.filter((p) => p.type === "membership").reduce((x, p) => x + p.amount, 0)),
        retail: Math.round(ps.filter((p) => p.type === "retail").reduce((x, p) => x + p.amount, 0)),
        other: Math.round(ps.filter((p) => !["membership", "retail"].includes(p.type)).reduce((x, p) => x + p.amount, 0)),
      };
    });

    // weekly attendance trend
    const weeks: { label: string; attendance: number }[] = [];
    for (let w = startOfWeek(from, { weekStartsOn: 1 }); w < now; w = addWeeks(w, 1)) {
      const a = w.toISOString(), b = addWeeks(w, 1).toISOString();
      weeks.push({ label: format(w, "MMM d"), attendance: att.filter((x) => { const s = sById.get(x.sessionId); return s && s.start >= a && s.start < b; }).length });
    }

    // heatmap weekday x hour
    const heat = new Map<string, number>();
    att.forEach((b) => { const s = sById.get(b.sessionId)!; const d = new Date(s.start); const k = `${(d.getDay() + 6) % 7}-${d.getHours()}`; heat.set(k, (heat.get(k) ?? 0) + 1); });
    const heatMax = Math.max(1, ...heat.values());

    const byType = new Map<string, number>();
    att.forEach((b) => { const s = sById.get(b.sessionId)!; byType.set(s.classTypeId, (byType.get(s.classTypeId) ?? 0) + 1); });

    const planMix = new Map<string, { n: number; rev: number }>();
    memberships.filter((m) => m.createdAt >= f).forEach((m) => { const x = planMix.get(m.planName) ?? { n: 0, rev: 0 }; x.n++; x.rev += m.pricePaid; planMix.set(m.planName, x); });

    const instr = lk.instructors.map((i) => {
      const ss = cur.filter((s) => s.instructorId === i.id && s.start < n);
      const a = att.filter((b) => sById.get(b.sessionId)?.instructorId === i.id).length;
      const cap = ss.reduce((x, s) => x + s.capacity, 0);
      return { i, classes: ss.length, attendees: a, fill: cap ? a / cap : 0 };
    }).sort((a, b) => b.attendees - a.attendees);

    const sources = new Map<string, number>();
    lk.members.forEach((m) => sources.set(m.source ?? "Unknown", (sources.get(m.source ?? "Unknown") ?? 0) + 1));

    return { att, prevAtt, revCur, revPrev, newMembers, retention, noShow, avgSize, fill, revByMonth, weeks, heat, heatMax, byType, planMix, instr, sources };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, bookings, payments, memberships, lk.members, lk.instructors]);

  const trend = (a: number, b: number) => (b ? ((a - b) / b) * 100 : undefined);
  const hours = Array.from({ length: settings.closingHour - settings.openingHour }, (_, i) => settings.openingHour + i);
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const exportAttendance = async () => {
    if (!r) return;
    const sById = new Map((sessions ?? []).map((s) => [s.id, s]));
    downloadFile(`attendance-${format(now, "yyyy-MM-dd")}.csv`, toCSV(r.att.map((b) => {
      const s = sById.get(b.sessionId)!;
      const m = lk.member.get(b.memberId);
      return { date: format(new Date(s.start), "yyyy-MM-dd HH:mm"), class: lk.classType.get(s.classTypeId)?.name, instructor: lk.instructor.get(s.instructorId)?.name, member: m ? `${m.firstName} ${m.lastName}` : "", email: m?.email ?? "" };
    })), "text/csv");
  };

  return (
    <div>
      <PageHeader eyebrow="Business" title="Reports" subtitle="How the studio is performing — compared with the previous period."
        actions={<>
          <Segmented value={range} onChange={setRange} options={[{ value: "30", label: "30 days" }, { value: "90", label: "90 days" }, { value: "180", label: "6 months" }]} />
          <Button onClick={exportAttendance}><Download /> Attendance CSV</Button>
        </>} />

      {!r ? <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6 md:gap-4">
            <Stat className="lg:col-span-2" label="Revenue" value={money(r.revCur, { cents: false })} trend={trend(r.revCur, r.revPrev) != null ? { value: trend(r.revCur, r.revPrev)! } : undefined} sub="vs previous period" />
            <Stat className="lg:col-span-2" label="Check-ins" value={r.att.length} trend={trend(r.att.length, r.prevAtt.length) != null ? { value: trend(r.att.length, r.prevAtt.length)! } : undefined} sub="vs previous period" />
            <Stat className="lg:col-span-2" label="New members" value={r.newMembers} sub={`in the last ${range} days`} />
            <Stat className="lg:col-span-2" label="Retention" value={pct(r.retention)} sub="of previous-period visitors returned" />
            <Stat className="lg:col-span-2" label="Avg class size" value={r.avgSize.toFixed(1)} sub={`${pct(r.fill)} average fill`} />
            <Stat className="lg:col-span-2" label="No-show & late cancel" value={pct(r.noShow, 1)} sub="of finished bookings" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Revenue by month" subtitle="Last 6 months, by type" action={<Legend items={REV_SERIES.map((s) => ({ label: s.label, color: s.color }))} />} />
              <div className="h-[280px] px-2 pt-4 pb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={r.revByMonth} margin={{ top: 8, right: 16, left: 4, bottom: 0 }} barCategoryGap="28%">
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={(v) => money(v, { compact: true })} />
                    <Tooltip cursor={{ fill: "var(--bg-elev)" }} content={<ChartTip format={(v) => money(v, { cents: false })} />} />
                    {REV_SERIES.map((s, i) => (
                      <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} stroke="var(--surface)" strokeWidth={2}
                        radius={i === REV_SERIES.length - 1 ? [4, 4, 0, 0] : 0} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <CardHeader title="Weekly attendance" subtitle="Checked-in visits" />
              <div className="h-[280px] px-2 pt-4 pb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={r.weeks} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} />
                    <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                    <Tooltip cursor={{ stroke: "var(--line-strong)" }} content={<ChartTip labelFormat={(l) => `Week of ${l}`} />} />
                    <Line type="monotone" dataKey="attendance" name="Check-ins" stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Peak times" subtitle="Check-ins by weekday and hour — schedule more where it's darkest" />
            <div className="overflow-x-auto px-5 pt-4 pb-5">
              <div className="grid min-w-[640px] gap-1" style={{ gridTemplateColumns: `40px repeat(${hours.length}, 1fr)` }}>
                <div />
                {hours.map((h) => <div key={h} className="text-center text-[10.5px] text-faint tnum">{format(new Date(2000, 0, 1, h), "ha").toLowerCase()}</div>)}
                {DAYS.map((d, di) => (
                  <div key={d} className="contents">
                    <div className="flex items-center text-xs text-muted">{d}</div>
                    {hours.map((h) => {
                      const v = r.heat.get(`${di}-${h}`) ?? 0;
                      const t = v / r.heatMax;
                      return (
                        <div key={h} title={`${d} ${format(new Date(2000, 0, 1, h), "h a")}: ${v} check-ins`}
                          className={cn("grid h-8 place-items-center rounded-md text-[10px] font-medium tnum transition hover:ring-2 hover:ring-ink/20", t > 0.55 ? "text-accent-ink" : "text-ink-2")}
                          style={{ background: v ? `color-mix(in srgb, var(--accent) ${Math.round(12 + t * 88)}%, var(--surface-2))` : "var(--surface-2)" }}>
                          {v || ""}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader title="Attendance by class" subtitle={`Last ${range} days`} />
              <div className="px-5 pt-4 pb-5">
                <BarList rows={[...r.byType.entries()].map(([id, v]) => ({ label: lk.classType.get(id)?.name ?? "—", value: v, color: lk.classType.get(id)?.color })).sort((a, b) => b.value - a.value)} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Plans sold" subtitle={`Last ${range} days, by revenue`} />
              <div className="px-5 pt-4 pb-5">
                <BarList format={(v) => money(v, { cents: false })} rows={[...r.planMix.entries()].map(([k, v]) => ({ label: k, value: v.rev, sub: `×${v.n}` })).sort((a, b) => b.value - a.value)} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Where members come from" subtitle="Lead source, all time" />
              <div className="px-5 pt-4 pb-5">
                <BarList rows={[...r.sources.entries()].map(([k, v]) => ({ label: k, value: v })).sort((a, b) => b.value - a.value)} />
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Instructor performance" subtitle={`Last ${range} days`} />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="border-y border-line bg-surface-2 text-left text-[11.5px] uppercase tracking-wider text-muted">
                  <th className="px-5 py-2.5 font-medium">Instructor</th><th className="px-3 py-2.5 text-right font-medium">Classes</th><th className="px-3 py-2.5 text-right font-medium">Check-ins</th><th className="px-3 py-2.5 text-right font-medium">Avg size</th><th className="w-48 px-5 py-2.5 font-medium">Fill rate</th>
                </tr></thead>
                <tbody className="divide-y divide-line">
                  {r.instr.map(({ i, classes, attendees, fill }) => (
                    <tr key={i.id}>
                      <td className="px-5 py-3"><div className="flex items-center gap-2.5"><Avatar name={i.name} color={i.color} size={28} /><span className="font-medium text-ink">{i.name}</span></div></td>
                      <td className="px-3 py-3 text-right tnum">{classes}</td>
                      <td className="px-3 py-3 text-right tnum">{attendees}</td>
                      <td className="px-3 py-3 text-right tnum">{classes ? (attendees / classes).toFixed(1) : "—"}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-elev"><div className="h-full rounded-full bg-accent" style={{ width: `${fill * 100}%` }} /></div>
                          <span className="w-10 text-right text-xs text-ink-2 tnum">{pct(fill)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
