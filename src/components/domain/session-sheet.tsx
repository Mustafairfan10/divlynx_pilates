"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { differenceInHours, format } from "date-fns";
import {
  Ban, Check, Clock, DoorOpen, HeartPulse, Hourglass, MapPin, Pencil, RotateCcw, Trash, UserPlus, UserX, X, ArrowUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { db } from "@/lib/db";
import { useLookups, useNow, useSettings } from "@/lib/hooks";
import {
  BookingError, bookMember, cancelBooking, cancelSession, checkIn, creditsLeft, deleteSession, markNoShow, promoteWaitlist,
  restoreSession, sessionEnd, undoCheckIn,
} from "@/lib/logic";
import type { Booking, Member } from "@/lib/types";
import { CATEGORY_LABEL, LEVEL_LABEL, cn, fullName, EMPTY } from "@/lib/utils";
import { Modal, Sheet, useConfirm, useToast } from "../overlay";
import { Avatar, Badge, Button, Meter } from "../ui";
import { MemberPicker } from "./member-picker";
import { MemberSheet } from "./member-sheet";
import { SessionForm } from "./session-form";
import { BOOKING_BADGE } from "./constants";

export function SessionSheet({ sessionId, onClose }: { sessionId: string | null; onClose: () => void }) {
  const lk = useLookups();
  const settings = useSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const now = useNow(30_000);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<string | null>(null);

  const session = useLiveQuery(() => (sessionId ? db.sessions.get(sessionId) : undefined), [sessionId]);
  const bookings = useLiveQuery(() => (sessionId ? db.bookings.where("sessionId").equals(sessionId).toArray() : []), [sessionId]) ?? EMPTY;
  const memberships = useLiveQuery(async () => {
    const ids = [...new Set(bookings.map((b) => b.membershipId).filter(Boolean))] as string[];
    return ids.length ? db.memberships.bulkGet(ids) : [];
  }, [bookings]) ?? EMPTY;
  const msById = useMemo(() => new Map(memberships.filter(Boolean).map((m) => [m!.id, m!])), [memberships]);

  const ct = session ? lk.classType.get(session.classTypeId) : undefined;
  const ins = session ? lk.instructor.get(session.instructorId) : undefined;
  const room = session ? lk.room.get(session.roomId) : undefined;

  const roster = bookings.filter((b) => b.status === "booked" || b.status === "checked_in").sort((a, b) => (a.spot ?? 99) - (b.spot ?? 99));
  const waitlist = bookings.filter((b) => b.status === "waitlist").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const inactive = bookings.filter((b) => ["cancelled", "late_cancel", "no_show"].includes(b.status));

  const started = session ? new Date(session.start) <= now : false;
  const ended = session ? sessionEnd(session) <= now : false;
  const hoursOut = session ? differenceInHours(new Date(session.start), now) : 0;
  const inLateWindow = hoursOut < settings.cancellationWindowHours;

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try { await fn(); if (ok) toast.success(ok); } catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); }
  };

  const onPick = async (m: Member) => {
    try {
      const r = await bookMember(session!.id, m.id);
      toast.success(r.waitlisted ? `${m.firstName} added to waitlist` : `${m.firstName} booked`, r.waitlisted ? "Class is full — they'll be promoted if a spot opens." : undefined);
      setAdding(false);
    } catch (e) {
      if (e instanceof BookingError && /no valid membership/.test(e.message)) {
        const ok = await confirm({
          title: "Book without credits?",
          message: <>{m.firstName} has no valid membership for this class. Book anyway as a <b>drop-in</b> to be paid at the desk?</>,
          confirmLabel: "Book as drop-in",
        });
        if (ok) await run(() => bookMember(session!.id, m.id, { allowNoCredit: true }), `${m.firstName} booked as drop-in`);
        setAdding(false);
      } else toast.error(e instanceof Error ? e.message : "Could not book");
    }
  };

  const onCancelBooking = async (b: Booking) => {
    const m = lk.member.get(b.memberId);
    if (b.status !== "waitlist" && inLateWindow && settings.lateCancelForfeit && !started) {
      const ok = await confirm({
        title: "Late cancellation",
        message: <>This is inside the {settings.cancellationWindowHours}h cancellation window. {m?.firstName}&apos;s credit will be <b>forfeited</b> per studio policy. You can waive it from the member&apos;s profile instead.</>,
        confirmLabel: "Late-cancel booking", danger: true,
      });
      if (!ok) return;
    }
    await run(() => cancelBooking(b.id), "Booking cancelled");
  };

  const waive = async (b: Booking) => run(() => cancelBooking(b.id, { waive: true }), "Cancelled — credit refunded");

  if (!sessionId) return null;

  return (
    <Sheet open={!!sessionId} onClose={onClose} title="Session">
      {!session || !ct ? (
        <div className="p-8 text-sm text-muted">Loading…</div>
      ) : (
        <>
          <div className="relative overflow-hidden border-b border-line px-6 pt-6 pb-5">
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: ct.color }} />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <Badge tone="neutral">{CATEGORY_LABEL[ct.category]}</Badge>
                  <Badge tone="neutral">{LEVEL_LABEL[ct.level]}</Badge>
                  {session.cancelled && <Badge tone="bad">Cancelled</Badge>}
                  {!session.cancelled && ended && <Badge tone="good">Completed</Badge>}
                  {!session.cancelled && started && !ended && <Badge tone="accent" dot>In progress</Badge>}
                </div>
                <h2 className="font-display text-2xl text-ink">{ct.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
                  <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" />{format(new Date(session.start), "EEE, MMM d · h:mm a")} – {format(sessionEnd(session), "h:mm a")}</span>
                  <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{room?.name}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close"><X /></Button>
            </div>

            <div className="mt-5 flex items-center gap-4">
              {ins && (
                <div className="flex items-center gap-2.5">
                  <Avatar name={ins.name} color={ins.color} size={34} />
                  <div>
                    <div className="text-sm font-medium text-ink">{ins.name}</div>
                    <div className="text-xs text-muted">Instructor</div>
                  </div>
                </div>
              )}
              <div className="ml-auto w-40">
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-muted">Booked</span>
                  <span className="font-medium text-ink tnum">{roster.length}/{session.capacity}{waitlist.length ? ` · +${waitlist.length} wl` : ""}</span>
                </div>
                <Meter value={roster.length} max={session.capacity} tone={roster.length >= session.capacity ? "warn" : "accent"} />
              </div>
            </div>
            {session.notes && <p className="mt-4 rounded-xl bg-surface-2 px-3 py-2 text-[13px] text-ink-2">{session.notes}</p>}

            <div className="mt-5 flex flex-wrap gap-2">
              {!session.cancelled && (
                <Button variant="primary" size="sm" onClick={() => setAdding(true)}><UserPlus /> Add member</Button>
              )}
              {!session.cancelled && roster.some((b) => b.status === "booked") && (
                <Button size="sm" onClick={() => run(async () => { for (const b of roster) if (b.status === "booked") await checkIn(b.id); }, "Everyone checked in")}>
                  <Check /> Check in all
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}><Pencil /> Edit</Button>
              {session.cancelled ? (
                <Button size="sm" variant="ghost" onClick={() => run(() => restoreSession(session.id), "Session restored")}><RotateCcw /> Restore</Button>
              ) : (
                <Button size="sm" variant="ghost" className="text-bad" onClick={async () => {
                  if (await confirm({ title: "Cancel this session?", message: `All ${roster.length + waitlist.length} bookings will be cancelled and credits refunded.`, confirmLabel: "Cancel session", danger: true }))
                    run(() => cancelSession(session.id), "Session cancelled, credits refunded");
                }}><Ban /> Cancel class</Button>
              )}
              <Button size="sm" variant="ghost" className="text-bad" onClick={async () => {
                if (await confirm({ title: "Delete session permanently?", message: "This removes the session and its booking history. Credits are refunded.", confirmLabel: "Delete", danger: true })) {
                  await run(() => deleteSession(session.id), "Session deleted"); onClose();
                }
              }}><Trash /></Button>
            </div>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Roster</h3>
              {roster.length === 0 && <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">No one booked yet.</div>}
              <ul className="space-y-1.5">
                {roster.map((b) => {
                  const m = lk.member.get(b.memberId);
                  const ms = b.membershipId ? msById.get(b.membershipId) : undefined;
                  return (
                    <li key={b.id} className={cn("group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition", b.status === "checked_in" ? "border-good/25 bg-good-soft/50" : "border-line bg-surface")}>
                      <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-bg-elev text-[11px] font-semibold text-muted tnum" title="Spot">{b.spot ?? "–"}</div>
                      <button onClick={() => setProfile(b.memberId)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                        <Avatar name={fullName(m)} id={b.memberId} size={32} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-ink">
                            <span className="truncate">{fullName(m)}</span>
                            {m?.healthNotes && <HeartPulse className="size-3.5 shrink-0 text-clay" aria-label={m.healthNotes} />}
                          </div>
                          <div className="truncate text-xs text-muted" title={m?.healthNotes}>
                            {ms ? `${ms.planName}${ms.creditsTotal != null ? ` · ${creditsLeft(ms)} left` : ""}` : <span className="text-bad">Drop-in · unpaid</span>}
                          </div>
                        </div>
                      </button>
                      {b.status === "checked_in" ? (
                        <>
                          <Badge tone="good"><Check className="size-3" /> In</Badge>
                          <Button size="icon-sm" variant="ghost" title="Undo check-in" onClick={() => run(() => undoCheckIn(b.id))}><RotateCcw /></Button>
                        </>
                      ) : (
                        <>
                          {!session.cancelled && <Button size="sm" variant="soft" onClick={() => run(() => checkIn(b.id), `${m?.firstName} checked in`)}><Check /> Check in</Button>}
                          {started && <Button size="icon-sm" variant="ghost" title="Mark no-show" onClick={() => run(() => markNoShow(b.id), "Marked as no-show")}><UserX /></Button>}
                          {!started && <Button size="icon-sm" variant="ghost" title="Cancel booking" onClick={() => onCancelBooking(b)}><X /></Button>}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            {waitlist.length > 0 && (
              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted"><Hourglass className="size-3.5" /> Waitlist</h3>
                <ul className="space-y-1.5">
                  {waitlist.map((b, i) => {
                    const m = lk.member.get(b.memberId);
                    return (
                      <li key={b.id} className="flex items-center gap-3 rounded-xl border border-dashed border-line-strong px-3 py-2.5">
                        <div className="grid size-7 place-items-center rounded-lg bg-warn-soft text-[11px] font-semibold text-warn">#{i + 1}</div>
                        <button onClick={() => setProfile(b.memberId)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                          <Avatar name={fullName(m)} id={b.memberId} size={30} />
                          <span className="truncate text-sm font-medium text-ink">{fullName(m)}</span>
                        </button>
                        {i === 0 && roster.length < session.capacity && (
                          <Button size="sm" variant="soft" onClick={() => run(() => promoteWaitlist(session.id), "Promoted to class")}><ArrowUp /> Promote</Button>
                        )}
                        <Button size="icon-sm" variant="ghost" title="Remove" onClick={() => run(() => cancelBooking(b.id), "Removed from waitlist")}><X /></Button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {inactive.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Cancellations & no-shows</h3>
                <ul className="space-y-1">
                  {inactive.map((b) => {
                    const m = lk.member.get(b.memberId);
                    const badge = BOOKING_BADGE[b.status];
                    return (
                      <li key={b.id} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm">
                        <Avatar name={fullName(m)} id={b.memberId} size={26} className="opacity-70" />
                        <span className="flex-1 truncate text-ink-2">{fullName(m)}</span>
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                        {(b.status === "late_cancel" || b.status === "no_show") && b.creditCharged > 0 && (
                          <Button size="sm" variant="ghost" onClick={() => waive(b)} title="Refund the forfeited credit">Waive fee</Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <div className="flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-xs text-muted">
              <DoorOpen className="mt-0.5 size-3.5 shrink-0" />
              Cancellation window: {settings.cancellationWindowHours}h. {settings.lateCancelForfeit ? "Late cancels forfeit the credit." : "Late cancels are refunded."}{" "}
              {settings.autoPromoteWaitlist ? "Waitlist auto-promotes when a spot opens." : ""}
            </div>
          </div>

          <Modal open={adding} onClose={() => setAdding(false)} title="Add member to class" description={`${ct.name} · ${format(new Date(session.start), "EEE MMM d, h:mm a")}`}>
            <MemberPicker onPick={onPick} exclude={bookings.filter((b) => ["booked", "checked_in", "waitlist"].includes(b.status)).map((b) => b.memberId)} />
          </Modal>
          <SessionForm open={editing} onClose={() => setEditing(false)} editing={session} />
          <MemberSheet memberId={profile} onClose={() => setProfile(null)} />
        </>
      )}
    </Sheet>
  );
}
