"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { Download, Mail, Pencil, Phone, Plus, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Modal, useToast } from "@/components/overlay";
import { Avatar, Badge, Button, Card, CardHeader, Field, Input, PageHeader, Segmented, Switch, Textarea } from "@/components/ui";
import { db } from "@/lib/db";
import { useLookups } from "@/lib/hooks";
import type { ClassCategory, Instructor } from "@/lib/types";
import { CATEGORY_LABEL, cn, downloadFile, money, toCSV, uid, EMPTY } from "@/lib/utils";

type Period = "this" | "last";
const COLORS = ["#3d6b58", "#c0704a", "#2f6f8f", "#6a5d8f", "#9a6b2f", "#8a4f5f", "#4f7a3a", "#5b6470"];

export default function InstructorsPage() {
  const lk = useLookups();
  const [period, setPeriod] = useState<Period>("this");
  const [editing, setEditing] = useState<Instructor | null | "new">(null);
  const base = period === "this" ? new Date() : subMonths(new Date(), 1);
  const from = startOfMonth(base), to = endOfMonth(base);
  const nowIso = new Date().toISOString();

  const sessions = useLiveQuery(() => db.sessions.where("start").between(from.toISOString(), to.toISOString()).toArray(), [from.toISOString()]) ?? EMPTY;
  const bookings = useLiveQuery(() => (sessions.length ? db.bookings.where("sessionId").anyOf(sessions.map((s) => s.id)).toArray() : []), [sessions]) ?? EMPTY;

  const stats = useMemo(() => {
    const att = new Map<string, number>();
    bookings.forEach((b) => b.status === "checked_in" && att.set(b.sessionId, (att.get(b.sessionId) ?? 0) + 1));
    return new Map(lk.instructors.map((i) => {
      const mine = sessions.filter((s) => s.instructorId === i.id && !s.cancelled);
      const taught = mine.filter((s) => s.start < nowIso);
      const priv = taught.filter((s) => lk.classType.get(s.classTypeId)?.category === "private");
      const group = taught.length - priv.length;
      const attendees = taught.reduce((a, s) => a + (att.get(s.id) ?? 0), 0);
      const fill = taught.length ? taught.reduce((a, s) => a + (att.get(s.id) ?? 0) / s.capacity, 0) / taught.length : 0;
      return [i.id, {
        scheduled: mine.length, taught: taught.length, group, priv: priv.length, attendees,
        avg: taught.length ? attendees / taught.length : 0, fill,
        pay: group * i.ratePerClass + priv.length * i.ratePerPrivate,
      }];
    }));
  }, [lk.instructors, lk.classType, sessions, bookings, nowIso]);

  const totalPay = [...stats.values()].reduce((a, s) => a + s.pay, 0);

  const exportPayroll = () => downloadFile(`payroll-${format(from, "yyyy-MM")}.csv`, toCSV(lk.instructors.map((i) => {
    const s = stats.get(i.id)!;
    return { instructor: i.name, group_classes: s.group, private_sessions: s.priv, rate_group: i.ratePerClass, rate_private: i.ratePerPrivate, attendees: s.attendees, total_pay: s.pay.toFixed(2) };
  })), "text/csv");

  return (
    <div>
      <PageHeader eyebrow="People" title="Instructors" subtitle={`${lk.instructors.filter((i) => i.active).length} active teachers`}
        actions={<Button variant="primary" onClick={() => setEditing("new")}><Plus /> Add instructor</Button>} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lk.instructors.map((i, idx) => {
          const s = stats.get(i.id);
          return (
            <Card key={i.id} className={cn("flex flex-col p-5 animate-rise", !i.active && "opacity-60")} style={{ animationDelay: `${idx * 40}ms` }}>
              <div className="flex items-start gap-4">
                <Avatar name={i.name} color={i.color} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-display text-xl text-ink">{i.name}</h3>
                    {!i.active && <Badge>Inactive</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">{i.specialties.map((sp) => <Badge key={sp} tone="accent">{CATEGORY_LABEL[sp]}</Badge>)}</div>
                </div>
                <Button size="icon-sm" variant="ghost" onClick={() => setEditing(i)} aria-label="Edit"><Pencil /></Button>
              </div>
              {i.bio && <p className="mt-4 line-clamp-2 text-sm text-muted">{i.bio}</p>}
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2">
                <a href={`mailto:${i.email}`} className="inline-flex items-center gap-1.5 hover:text-ink"><Mail className="size-3.5 text-muted" />{i.email}</a>
                <a href={`tel:${i.phone}`} className="inline-flex items-center gap-1.5 hover:text-ink"><Phone className="size-3.5 text-muted" />{i.phone}</a>
              </div>
              <div className="mt-auto grid grid-cols-3 gap-2 pt-5 text-center">
                {[["Classes", s?.taught ?? 0], ["Avg class", (s?.avg ?? 0).toFixed(1)], ["Fill rate", `${Math.round((s?.fill ?? 0) * 100)}%`]].map(([k, v]) => (
                  <div key={k as string} className="rounded-xl bg-surface-2 px-2 py-2.5">
                    <div className="text-[11px] text-muted">{k}</div>
                    <div className="text-sm font-semibold text-ink tnum">{v}</div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader title="Payroll" subtitle={`${format(from, "MMMM yyyy")} · taught classes × rate`} icon={<Star />}
          action={<div className="flex items-center gap-2">
            <Segmented size="sm" value={period} onChange={setPeriod} options={[{ value: "this", label: "This month" }, { value: "last", label: "Last month" }]} />
            <Button size="sm" onClick={exportPayroll}><Download /> CSV</Button>
          </div>} />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-y border-line bg-surface-2 text-left text-[11.5px] uppercase tracking-wider text-muted">
                <th className="px-5 py-2.5 font-medium">Instructor</th>
                <th className="px-3 py-2.5 text-right font-medium">Group</th>
                <th className="px-3 py-2.5 text-right font-medium">Private</th>
                <th className="px-3 py-2.5 text-right font-medium">Rates</th>
                <th className="px-3 py-2.5 text-right font-medium">Attendees</th>
                <th className="px-5 py-2.5 text-right font-medium">Pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lk.instructors.map((i) => {
                const s = stats.get(i.id)!;
                return (
                  <tr key={i.id}>
                    <td className="px-5 py-3"><div className="flex items-center gap-2.5"><Avatar name={i.name} color={i.color} size={28} /><span className="font-medium text-ink">{i.name}</span></div></td>
                    <td className="px-3 py-3 text-right tnum">{s?.group ?? 0}</td>
                    <td className="px-3 py-3 text-right tnum">{s?.priv ?? 0}</td>
                    <td className="px-3 py-3 text-right text-muted tnum">{money(i.ratePerClass, { cents: false })} / {money(i.ratePerPrivate, { cents: false })}</td>
                    <td className="px-3 py-3 text-right tnum">{s?.attendees ?? 0}</td>
                    <td className="px-5 py-3 text-right font-semibold text-ink tnum">{money(s?.pay ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-line-strong">
                <td className="px-5 py-3 font-semibold text-ink" colSpan={5}>Total</td>
                <td className="px-5 py-3 text-right font-display text-lg text-ink tnum">{money(totalPay)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <InstructorForm open={editing !== null} instructor={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function InstructorForm({ open, onClose, instructor }: { open: boolean; onClose: () => void; instructor: Instructor | null }) {
  const toast = useToast();
  const blank = (): Instructor => ({ id: "", name: "", email: "", phone: "", bio: "", specialties: ["reformer"], color: COLORS[Math.floor(Math.random() * COLORS.length)], ratePerClass: 40, ratePerPrivate: 65, active: true, hiredAt: new Date().toISOString() });
  const [i, setI] = useState<Instructor>(blank);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setI(instructor ?? blank());
  }, [open, instructor]);
  const set = <K extends keyof Instructor>(k: K, v: Instructor[K]) => setI((x) => ({ ...x, [k]: v }));
  const save = async () => {
    if (!i.name.trim()) return toast.error("Name is required");
    await db.instructors.put({ ...i, id: i.id || uid() });
    toast.success(i.id ? "Instructor updated" : "Instructor added");
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={instructor ? "Edit instructor" : "Add instructor"}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" className="sm:col-span-2" required><Input value={i.name} onChange={(e) => set("name", e.target.value)} autoFocus /></Field>
        <Field label="Email"><Input type="email" value={i.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Phone"><Input value={i.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Rate per group class"><Input type="number" min={0} value={i.ratePerClass} onChange={(e) => set("ratePerClass", +e.target.value)} /></Field>
        <Field label="Rate per private"><Input type="number" min={0} value={i.ratePerPrivate} onChange={(e) => set("ratePerPrivate", +e.target.value)} /></Field>
        <div className="sm:col-span-2">
          <div className="mb-1.5 text-[13px] font-medium text-ink-2">Specialties</div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(CATEGORY_LABEL) as ClassCategory[]).map((c) => {
              const on = i.specialties.includes(c);
              return <button key={c} onClick={() => set("specialties", on ? i.specialties.filter((x) => x !== c) : [...i.specialties, c])}
                className={cn("h-8 rounded-lg border px-3 text-[13px] font-medium", on ? "border-accent bg-accent text-accent-ink" : "border-line text-ink-2 hover:border-line-strong")}>{CATEGORY_LABEL[c]}</button>;
            })}
          </div>
        </div>
        <div className="sm:col-span-2">
          <div className="mb-1.5 text-[13px] font-medium text-ink-2">Color</div>
          <div className="flex gap-2">
            {COLORS.map((c) => <button key={c} onClick={() => set("color", c)} className={cn("size-8 rounded-full ring-offset-2 ring-offset-surface transition", i.color === c && "ring-2 ring-ink")} style={{ background: c }} aria-label={c} />)}
          </div>
        </div>
        <Field label="Bio" className="sm:col-span-2"><Textarea value={i.bio} onChange={(e) => set("bio", e.target.value)} /></Field>
        <div className="sm:col-span-2"><Switch checked={i.active} onChange={(v) => set("active", v)} label="Active" description="Inactive instructors can't be assigned to new classes." /></div>
      </div>
    </Modal>
  );
}
