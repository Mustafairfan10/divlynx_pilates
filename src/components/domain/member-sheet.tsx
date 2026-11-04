"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import {
  Cake, CircleCheck, CreditCard, HeartPulse, Mail, Minus, Pencil, Phone, Plus, ShieldCheck, Snowflake, Sun, Trash, TriangleExclamationPoint, X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { db } from "@/lib/db";
import { useLookups } from "@/lib/hooks";
import { adjustCredits, cancelBooking, creditsLeft, deleteMember, freezeMembership, membershipState } from "@/lib/logic";
import { ago, cn, fmtDate, fullName, money, EMPTY } from "@/lib/utils";
import { Sheet, useConfirm, useToast } from "../overlay";
import { Avatar, Badge, Button, Meter, Segmented } from "../ui";
import { MemberForm } from "./member-form";
import { SellModal } from "./sell-modal";
import { BOOKING_BADGE, MEMBER_STATUS } from "./constants";

const MS_STATE: Record<string, { label: string; tone: "good" | "info" | "neutral" | "warn" | "bad" }> = {
  active: { label: "Active", tone: "good" }, expired: { label: "Expired", tone: "neutral" }, frozen: { label: "Frozen", tone: "info" },
  cancelled: { label: "Cancelled", tone: "bad" }, depleted: { label: "Used up", tone: "warn" }, upcoming: { label: "Starts soon", tone: "info" },
};

export function MemberSheet({ memberId, onClose }: { memberId: string | null; onClose: () => void }) {
  const lk = useLookups();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<"overview" | "plans" | "visits" | "payments">("overview");
  const [editing, setEditing] = useState(false);
  const [selling, setSelling] = useState(false);

  const member = useLiveQuery(() => (memberId ? db.members.get(memberId) : undefined), [memberId]);
  const memberships = useLiveQuery(() => (memberId ? db.memberships.where("memberId").equals(memberId).toArray() : []), [memberId]) ?? EMPTY;
  const bookings = useLiveQuery(() => (memberId ? db.bookings.where("memberId").equals(memberId).toArray() : []), [memberId]) ?? EMPTY;
  const payments = useLiveQuery(() => (memberId ? db.payments.where("memberId").equals(memberId).toArray() : []), [memberId]) ?? EMPTY;
  const sessions = useLiveQuery(async () => {
    const ids = [...new Set(bookings.map((b) => b.sessionId))];
    return ids.length ? (await db.sessions.bulkGet(ids)).filter(Boolean) : [];
  }, [bookings]) ?? EMPTY;
  const sById = useMemo(() => new Map(sessions.map((s) => [s!.id, s!])), [sessions]);

  const now = new Date().toISOString();
  const visits = bookings.filter((b) => b.status === "checked_in").length;
  const lastVisit = bookings.filter((b) => b.status === "checked_in").map((b) => sById.get(b.sessionId)?.start ?? "").sort().pop();
  const ltv = payments.filter((p) => p.status !== "pending").reduce((a, p) => a + p.amount, 0);
  const upcoming = bookings.filter((b) => ["booked", "waitlist"].includes(b.status) && (sById.get(b.sessionId)?.start ?? "") > now)
    .sort((a, b) => (sById.get(a.sessionId)?.start ?? "").localeCompare(sById.get(b.sessionId)?.start ?? ""));
  const history = bookings.filter((b) => !upcoming.includes(b)).sort((a, b) => (sById.get(b.sessionId)?.start ?? "").localeCompare(sById.get(a.sessionId)?.start ?? ""));
  const msSorted = [...memberships].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const activeMs = msSorted.filter((m) => membershipState(m) === "active");

  if (!memberId) return null;
  return (
    <Sheet open={!!memberId} onClose={onClose} width="max-w-2xl" title="Member profile">
      {!member ? <div className="p-8 text-sm text-muted">Loading…</div> : (
        <>
          <div className="border-b border-line bg-surface-2/60 px-6 pt-6 pb-4">
            <div className="flex items-start gap-4">
              <Avatar name={fullName(member)} id={member.id} size={64} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl text-ink">{fullName(member)}</h2>
                  <Badge tone={MEMBER_STATUS[member.status].tone} dot>{MEMBER_STATUS[member.status].label}</Badge>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
                  {member.email && <a href={`mailto:${member.email}`} className="inline-flex items-center gap-1.5 hover:text-ink"><Mail className="size-3.5" />{member.email}</a>}
                  {member.phone && <a href={`tel:${member.phone}`} className="inline-flex items-center gap-1.5 hover:text-ink"><Phone className="size-3.5" />{member.phone}</a>}
                </div>
                {member.tags.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{member.tags.map((t) => <Badge key={t} tone="accent">{t}</Badge>)}</div>}
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close"><X /></Button>
            </div>
            <div className="mt-5 grid grid-cols-4 gap-2">
              {[
                ["Visits", visits],
                ["Last visit", lastVisit ? ago(lastVisit) : "—"],
                ["Member since", fmtDate(member.joinedAt, "MMM yyyy")],
                ["Lifetime value", money(ltv, { cents: false })],
              ].map(([k, v]) => (
                <div key={k as string} className="rounded-xl border border-line bg-surface px-3 py-2.5">
                  <div className="text-[11px] text-muted">{k}</div>
                  <div className="mt-0.5 truncate text-sm font-semibold text-ink tnum">{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="primary" onClick={() => setSelling(true)}><CreditCard /> Sell plan</Button>
              <Button size="sm" onClick={() => setEditing(true)}><Pencil /> Edit</Button>
              <Button size="sm" variant="ghost" className="ml-auto text-bad" onClick={async () => {
                if (await confirm({ title: `Delete ${member.firstName}?`, message: "This removes the member, their memberships and booking history. Payments are kept for accounting.", confirmLabel: "Delete member", danger: true })) {
                  await deleteMember(member.id); toast.success("Member deleted"); onClose();
                }
              }}><Trash /> Delete</Button>
            </div>
            <Segmented className="mt-4" value={tab} onChange={setTab} options={[
              { value: "overview", label: "Overview" },
              { value: "plans", label: "Memberships", count: memberships.length },
              { value: "visits", label: "Bookings", count: bookings.length },
              { value: "payments", label: "Payments", count: payments.length },
            ]} />
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {tab === "overview" && (
              <div className="space-y-5 animate-fade-in">
                {member.healthNotes && (
                  <div className="flex gap-3 rounded-2xl border border-clay/25 bg-clay-soft/60 p-4">
                    <HeartPulse className="mt-0.5 size-5 shrink-0 text-clay" />
                    <div><div className="text-sm font-semibold text-ink">Health notes</div><div className="mt-0.5 text-sm text-ink-2">{member.healthNotes}</div></div>
                  </div>
                )}
                {!member.waiverSigned && (
                  <div className="flex items-center gap-3 rounded-2xl border border-warn/25 bg-warn-soft/60 p-4 text-sm">
                    <TriangleExclamationPoint className="size-5 text-warn" />
                    <span className="flex-1 text-ink-2">Liability waiver not signed.</span>
                    <Button size="sm" onClick={async () => { await db.members.update(member.id, { waiverSigned: true }); toast.success("Waiver marked as signed"); }}>Mark signed</Button>
                  </div>
                )}
                <div className="rounded-2xl border border-line p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-ink">Current plan</h4>
                    {activeMs.length === 0 && <Badge tone="bad">None</Badge>}
                  </div>
                  {activeMs.length === 0 ? <p className="text-sm text-muted">No active membership. Sell a plan to let {member.firstName} book classes.</p> : activeMs.map((m) => (
                    <div key={m.id} className="mb-3 last:mb-0">
                      <div className="flex justify-between text-sm"><span className="font-medium text-ink">{m.planName}</span><span className="text-muted">until {fmtDate(m.endDate, "MMM d")}</span></div>
                      {m.creditsTotal != null ? (
                        <>
                          <Meter className="mt-2" value={m.creditsTotal - m.creditsUsed} max={m.creditsTotal} tone={creditsLeft(m) <= 2 ? "warn" : "accent"} />
                          <div className="mt-1 text-xs text-muted tnum">{creditsLeft(m)} of {m.creditsTotal} credits left</div>
                        </>
                      ) : <div className="mt-1 text-xs text-muted">Unlimited group classes</div>}
                    </div>
                  ))}
                </div>
                <dl className="grid gap-x-6 gap-y-4 rounded-2xl border border-line p-4 text-sm sm:grid-cols-2">
                  {[
                    ["Birthday", member.birthday ? <span className="inline-flex items-center gap-1.5"><Cake className="size-3.5 text-clay" />{fmtDate(member.birthday, "MMMM d")}</span> : "—"],
                    ["Emergency contact", member.emergencyName ? `${member.emergencyName} · ${member.emergencyPhone ?? ""}` : "—"],
                    ["Goals", member.goals || "—"],
                    ["Source", member.source || "—"],
                    ["Waiver", member.waiverSigned ? <span className="inline-flex items-center gap-1 text-good"><ShieldCheck className="size-3.5" /> Signed</span> : "Not signed"],
                    ["Joined", fmtDate(member.joinedAt)],
                  ].map(([k, v]) => (
                    <div key={k as string}><dt className="text-xs text-muted">{k}</dt><dd className="mt-0.5 text-ink">{v}</dd></div>
                  ))}
                </dl>
                {member.notes && <div className="rounded-2xl border border-line p-4 text-sm"><div className="mb-1 text-xs text-muted">Notes</div><p className="whitespace-pre-wrap text-ink-2">{member.notes}</p></div>}
                {upcoming.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-ink">Upcoming classes</h4>
                    <BookingList items={upcoming.slice(0, 5)} sById={sById} lk={lk} onCancel={async (id) => { const r = await cancelBooking(id); toast.success(r.late ? "Late-cancelled (credit forfeited)" : "Booking cancelled"); }} />
                  </div>
                )}
              </div>
            )}

            {tab === "plans" && (
              <div className="space-y-3 animate-fade-in">
                {msSorted.length === 0 && <p className="py-8 text-center text-sm text-muted">No memberships yet.</p>}
                {msSorted.map((m) => {
                  const st = membershipState(m);
                  return (
                    <div key={m.id} className={cn("rounded-2xl border p-4", st === "active" ? "border-accent/30 bg-accent-soft/30" : "border-line")}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-ink">{m.planName}</div>
                          <div className="mt-0.5 text-xs text-muted">{fmtDate(m.startDate)} → {fmtDate(m.endDate)} · {money(m.pricePaid)}</div>
                        </div>
                        <Badge tone={MS_STATE[st].tone}>{MS_STATE[st].label}</Badge>
                      </div>
                      {m.creditsTotal != null && (
                        <div className="mt-3 flex items-center gap-3">
                          <Meter value={m.creditsUsed} max={m.creditsTotal} className="flex-1" tone="accent" />
                          <span className="text-xs text-muted tnum">{m.creditsUsed}/{m.creditsTotal} used</span>
                        </div>
                      )}
                      {(st === "active" || st === "frozen" || st === "depleted") && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {m.creditsTotal != null && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => adjustCredits(m.id, 1)}><Plus /> Credit</Button>
                              <Button size="sm" variant="ghost" onClick={() => adjustCredits(m.id, -1)}><Minus /> Credit</Button>
                            </>
                          )}
                          {st !== "depleted" && (
                            <Button size="sm" variant="ghost" onClick={async () => { await freezeMembership(m.id, st !== "frozen"); toast.success(st === "frozen" ? "Unfrozen — end date extended" : "Membership frozen"); }}>
                              {st === "frozen" ? <><Sun /> Unfreeze</> : <><Snowflake /> Freeze</>}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-bad" onClick={async () => {
                            if (await confirm({ title: "Cancel membership?", message: "Remaining credits will no longer be usable. Refunds are handled from Payments.", confirmLabel: "Cancel membership", danger: true }))
                              await db.memberships.update(m.id, { status: "cancelled" });
                          }}>Cancel</Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {tab === "visits" && (
              <div className="space-y-5 animate-fade-in">
                {upcoming.length > 0 && <div><h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Upcoming</h4>
                  <BookingList items={upcoming} sById={sById} lk={lk} onCancel={async (id) => { const r = await cancelBooking(id); toast.success(r.late ? "Late-cancelled" : "Booking cancelled"); }} /></div>}
                <div><h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">History</h4>
                  {history.length ? <BookingList items={history} sById={sById} lk={lk} /> : <p className="text-sm text-muted">No past bookings.</p>}</div>
              </div>
            )}

            {tab === "payments" && (
              <div className="animate-fade-in divide-y divide-line rounded-2xl border border-line">
                {payments.length === 0 && <p className="py-8 text-center text-sm text-muted">No payments yet.</p>}
                {[...payments].sort((a, b) => b.date.localeCompare(a.date)).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-ink">{p.description}</div>
                      <div className="text-xs text-muted">{p.invoiceNo} · {fmtDate(p.date)} · {p.method}</div>
                    </div>
                    {p.status !== "paid" && <Badge tone={p.status === "pending" ? "warn" : "neutral"}>{p.status}</Badge>}
                    <div className={cn("font-medium tnum", p.amount < 0 ? "text-bad" : "text-ink")}>{money(p.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <MemberForm open={editing} onClose={() => setEditing(false)} member={member} />
          <SellModal open={selling} onClose={() => setSelling(false)} memberId={member.id} />
        </>
      )}
    </Sheet>
  );
}

function BookingList({ items, sById, lk, onCancel }: {
  items: { id: string; sessionId: string; status: keyof typeof BOOKING_BADGE }[];
  sById: Map<string, { start: string; classTypeId: string; instructorId: string }>;
  lk: ReturnType<typeof useLookups>;
  onCancel?: (id: string) => void;
}) {
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line">
      {items.map((b) => {
        const s = sById.get(b.sessionId);
        const ct = s ? lk.classType.get(s.classTypeId) : undefined;
        const badge = BOOKING_BADGE[b.status];
        return (
          <li key={b.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span className="h-8 w-1 rounded-full" style={{ background: ct?.color }} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-ink">{ct?.name ?? "Class"}</div>
              <div className="text-xs text-muted">{s ? format(new Date(s.start), "EEE MMM d · h:mm a") : ""} · {s ? lk.instructor.get(s.instructorId)?.name : ""}</div>
            </div>
            <Badge tone={badge.tone}>{b.status === "checked_in" && <CircleCheck className="size-3" />}{badge.label}</Badge>
            {onCancel && <Button size="icon-sm" variant="ghost" title="Cancel booking" onClick={() => onCancel(b.id)}><X /></Button>}
          </li>
        );
      })}
    </ul>
  );
}
