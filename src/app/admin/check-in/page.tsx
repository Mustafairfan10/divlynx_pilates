"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { endOfDay, format, startOfDay } from "date-fns";
import { Check, HeartPulse, RotateCcw, ShieldAlert, UserPlus, UserCheck, UserX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MemberPicker } from "@/components/domain/member-picker";
import { MemberSheet } from "@/components/domain/member-sheet";
import { Modal, useConfirm, useToast } from "@/components/overlay";
import { Avatar, Badge, Button, Card, EmptyState, Meter, PageHeader, SearchInput } from "@/components/ui";
import { db } from "@/lib/db";
import { useLookups, useNow } from "@/lib/hooks";
import { BookingError, bookMember, checkIn, creditsLeft, markNoShow, sessionEnd, undoCheckIn } from "@/lib/logic";
import type { Member } from "@/lib/types";
import { cn, fullName, EMPTY } from "@/lib/utils";

export default function CheckInPage() {
  const now = useNow(15_000);
  const lk = useLookups();
  const toast = useToast();
  const confirm = useConfirm();
  const [picked, setPicked] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [walkIn, setWalkIn] = useState(false);
  const [profile, setProfile] = useState<string | null>(null);

  const sessions = useLiveQuery(() => db.sessions.where("start").between(startOfDay(now).toISOString(), endOfDay(now).toISOString()).toArray(), [startOfDay(now).toISOString()]);
  const today = useMemo(() => (sessions ?? []).filter((s) => !s.cancelled).sort((a, b) => a.start.localeCompare(b.start)), [sessions]);
  const bookings = useLiveQuery(() => (today.length ? db.bookings.where("sessionId").anyOf(today.map((s) => s.id)).toArray() : []), [today]) ?? EMPTY;
  const memberships = useLiveQuery(() => db.memberships.toArray(), []) ?? EMPTY;
  const msById = useMemo(() => new Map(memberships.map((m) => [m.id, m])), [memberships]);

  // default selection: in-progress or next upcoming class
  const auto = today.find((s) => sessionEnd(s) > now) ?? today[today.length - 1];
  const sel = today.find((s) => s.id === picked) ?? auto;
  const roster = bookings.filter((b) => b.sessionId === sel?.id && (b.status === "booked" || b.status === "checked_in" || b.status === "no_show"))
    .sort((a, b) => fullName(lk.member.get(a.memberId)).localeCompare(fullName(lk.member.get(b.memberId))));
  const rail = useRef<HTMLDivElement>(null);
  const selId = sel?.id;
  useEffect(() => {
    const box = rail.current;
    const el = box?.querySelector<HTMLElement>(`[data-sid="${selId}"]`);
    if (box && el) box.scrollTo({ left: el.offsetLeft - box.offsetLeft - (box.clientWidth - el.clientWidth) / 2, behavior: "smooth" });
  }, [selId]);
  const arrived = roster.filter((b) => b.status === "checked_in").length;

  const search = q.trim().toLowerCase();
  const results = search ? bookings.filter((b) => (b.status === "booked" || b.status === "checked_in") && fullName(lk.member.get(b.memberId)).toLowerCase().includes(search)) : [];

  const doCheckIn = async (id: string) => {
    const b = bookings.find((x) => x.id === id);
    const m = b ? lk.member.get(b.memberId) : undefined;
    try {
      await checkIn(id);
      toast.success(`Welcome, ${m?.firstName ?? "friend"}!`, !m?.waiverSigned ? "Waiver still needs a signature." : undefined);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const addWalkIn = async (m: Member) => {
    if (!sel) return;
    try {
      const r = await bookMember(sel.id, m.id);
      if (r.waitlisted) toast.warn("Class is full", `${m.firstName} was added to the waitlist.`);
      else { await checkIn(r.booking.id); toast.success(`${m.firstName} added & checked in`); }
    } catch (e) {
      if (e instanceof BookingError && /no valid membership/.test(e.message)) {
        if (await confirm({ title: "No credits available", message: `${m.firstName} has no valid plan. Add as an unpaid drop-in?`, confirmLabel: "Add drop-in" })) {
          const r = await bookMember(sel.id, m.id, { allowNoCredit: true });
          if (!r.waitlisted) await checkIn(r.booking.id);
          toast.success(`${m.firstName} added as drop-in`, "Remember to take payment.");
        }
      } else toast.error(e instanceof Error ? e.message : "Failed");
    }
    setWalkIn(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Front desk"
        title="Check-in"
        subtitle={<span className="tnum">{format(now, "EEEE, MMMM d · h:mm a")}</span>}
        actions={<SearchInput value={q} onChange={setQ} placeholder="Find a member booked today…" className="w-full sm:w-80" />}
      />

      {search && (
        <Card className="mb-5 p-2 animate-fade-in">
          {results.length === 0 ? <div className="px-4 py-6 text-center text-sm text-muted">No one named “{q}” is booked today.</div> : results.map((b) => {
            const m = lk.member.get(b.memberId);
            const s = today.find((x) => x.id === b.sessionId);
            return (
              <div key={b.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-bg-elev">
                <Avatar name={fullName(m)} id={b.memberId} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink">{fullName(m)}</div>
                  <div className="text-xs text-muted">{lk.classType.get(s?.classTypeId ?? "")?.name} · {s && format(new Date(s.start), "h:mm a")}</div>
                </div>
                {b.status === "checked_in" ? <Badge tone="good"><Check className="size-3" /> Checked in</Badge> :
                  <Button variant="primary" size="sm" onClick={() => { doCheckIn(b.id); setQ(""); }}><UserCheck /> Check in</Button>}
              </div>
            );
          })}
        </Card>
      )}

      {today.length === 0 ? (
        <Card><EmptyState icon={<UserCheck />} title="No classes today" description="When classes are scheduled for today, they'll appear here for quick check-in." /></Card>
      ) : (
        <>
          <div ref={rail} className="-mx-4 mb-5 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {today.map((s) => {
              const ct = lk.classType.get(s.classTypeId);
              const bs = bookings.filter((b) => b.sessionId === s.id && (b.status === "booked" || b.status === "checked_in"));
              const ins = bs.filter((b) => b.status === "checked_in").length;
              const ended = sessionEnd(s) < now;
              const live = new Date(s.start) <= now && !ended;
              const active = sel?.id === s.id;
              return (
                <button key={s.id} onClick={() => setPicked(s.id)} data-sid={s.id}
                  className={cn("relative min-w-[200px] snap-start overflow-hidden rounded-2xl border p-4 text-left transition",
                    active ? "border-accent bg-surface shadow-md ring-4 ring-accent/10" : "border-line bg-surface/70 hover:bg-surface", ended && !active && "opacity-60")}>
                  <span className="absolute inset-x-0 top-0 h-1" style={{ background: ct?.color }} />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink tnum">{format(new Date(s.start), "h:mm a")}</span>
                    {live ? <Badge tone="good" dot>Live</Badge> : ended ? <span className="text-muted">Done</span> : null}
                  </div>
                  <div className="mt-1.5 truncate font-medium text-ink">{ct?.name}</div>
                  <div className="truncate text-xs text-muted">{lk.instructor.get(s.instructorId)?.name}</div>
                  <div className="mt-3 flex items-center gap-2">
                    <Meter value={ins} max={Math.max(1, bs.length)} tone="good" className="flex-1" />
                    <span className="text-[11px] text-muted tnum">{ins}/{bs.length}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {sel && (
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="font-display text-xl text-ink">{lk.classType.get(sel.classTypeId)?.name}</div>
                  <div className="text-sm text-muted">{format(new Date(sel.start), "h:mm a")} · {lk.room.get(sel.roomId)?.name} · {lk.instructor.get(sel.instructorId)?.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-3xl text-ink tnum">{arrived}<span className="text-lg text-faint">/{roster.filter((b) => b.status !== "no_show").length}</span></div>
                  <div className="text-xs text-muted">arrived</div>
                </div>
                <Button onClick={() => setWalkIn(true)} className="w-full sm:w-auto"><UserPlus /> Walk-in</Button>
              </div>
              {roster.length === 0 ? (
                <EmptyState title="Nobody booked" description="Add a walk-in to start this class." />
              ) : (
                <ul className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
                  {roster.map((b) => {
                    const m = lk.member.get(b.memberId);
                    const ms = b.membershipId ? msById.get(b.membershipId) : undefined;
                    const isIn = b.status === "checked_in";
                    const noShow = b.status === "no_show";
                    return (
                      <li key={b.id} className={cn("flex items-center gap-3 rounded-2xl border p-3 transition", isIn ? "border-good/30 bg-good-soft/60" : noShow ? "border-bad/20 bg-bad-soft/40" : "border-line bg-surface")}>
                        <button onClick={() => setProfile(b.memberId)} className="relative">
                          <Avatar name={fullName(m)} id={b.memberId} size={44} />
                          {isIn && <span className="absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full bg-good text-white ring-2 ring-surface"><Check className="size-3" strokeWidth={3} /></span>}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                            <span className="truncate">{fullName(m)}</span>
                            {m?.healthNotes && <HeartPulse className="size-3.5 shrink-0 text-clay" />}
                            {!m?.waiverSigned && <ShieldAlert className="size-3.5 shrink-0 text-warn" />}
                          </div>
                          <div className="truncate text-xs text-muted">
                            {noShow ? "No-show" : ms ? (ms.creditsTotal == null ? "Unlimited" : `${creditsLeft(ms)} credits left`) : <span className="text-bad">Unpaid drop-in</span>}
                            {b.spot ? ` · Spot ${b.spot}` : ""}
                          </div>
                        </div>
                        {isIn ? (
                          <Button size="icon-sm" variant="ghost" title="Undo" onClick={() => undoCheckIn(b.id)}><RotateCcw /></Button>
                        ) : noShow ? null : (
                          <div className="flex gap-1">
                            {new Date(sel.start) < now && <Button size="icon-sm" variant="ghost" title="No-show" onClick={() => markNoShow(b.id)}><UserX /></Button>}
                            <Button variant="primary" size="sm" onClick={() => doCheckIn(b.id)}><Check /> In</Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          )}
        </>
      )}

      <Modal open={walkIn} onClose={() => setWalkIn(false)} title="Add walk-in" description="Books the member into this class and checks them in.">
        <MemberPicker onPick={addWalkIn} exclude={bookings.filter((b) => b.sessionId === sel?.id && ["booked", "checked_in", "waitlist"].includes(b.status)).map((b) => b.memberId)} />
      </Modal>
      <MemberSheet memberId={profile} onClose={() => setProfile(null)} />
    </div>
  );
}
