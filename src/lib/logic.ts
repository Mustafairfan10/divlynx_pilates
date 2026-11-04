import { addDays, addMinutes, differenceInHours, startOfDay } from "date-fns";
import { db } from "./db";
import type { Activity, Booking, ClassType, Membership, Payment, PaymentMethod, Session, Settings } from "./types";
import { uid } from "./utils";

export const DEFAULT_SETTINGS: Settings = {
  id: "studio",
  studioName: "Divlynx Pilates",
  tagline: "Reformer & mat studio",
  email: "hello@divlynx.studio",
  phone: "+1 (555) 014-2200",
  address: "214 Linden Avenue, Suite 3",
  currency: "USD",
  locale: "en-US",
  taxRate: 0,
  cancellationWindowHours: 12,
  lateCancelForfeit: true,
  noShowForfeit: true,
  autoPromoteWaitlist: true,
  bookingWindowDays: 21,
  openingHour: 6,
  closingHour: 21,
  weekStartsOn: 1,
  ownerName: "",
};

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get("studio")) ?? DEFAULT_SETTINGS;
}

export async function log(kind: Activity["kind"], message: string, refId?: string) {
  await db.activity.add({ id: uid(), at: new Date().toISOString(), kind, message, refId });
}

/* ───────────── Memberships ───────────── */

export type MembershipState = "active" | "expired" | "frozen" | "cancelled" | "depleted" | "upcoming";

export function membershipState(m: Membership, at: Date = new Date()): MembershipState {
  if (m.status === "cancelled") return "cancelled";
  if (m.status === "frozen") return "frozen";
  if (new Date(m.startDate) > at) return "upcoming";
  if (endOfDayISO(m.endDate) < at.toISOString()) return "expired";
  if (m.creditsTotal != null && m.creditsUsed >= m.creditsTotal) return "depleted";
  return "active";
}

export const creditsLeft = (m: Membership) =>
  m.creditsTotal == null ? Infinity : Math.max(0, m.creditsTotal - m.creditsUsed);

function endOfDayISO(dateStr: string) {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

/** Picks the best membership to pay for a session: valid on the session date, has credits, matches private/group. */
export function pickMembership(memberships: Membership[], session: Session, ct: ClassType | undefined) {
  const at = new Date(session.start);
  const isPrivate = ct?.category === "private";
  const cost = ct?.creditCost ?? 1;
  const candidates = memberships.filter((m) => {
    if (m.status !== "active") return false;
    if (new Date(m.startDate) > at && startOfDay(new Date(m.startDate)) > startOfDay(at)) return false;
    if (endOfDayISO(m.endDate) < session.start) return false;
    if (m.privateOnly !== isPrivate) return false;
    return creditsLeft(m) >= cost;
  });
  // Prefer credit packs expiring soonest, then unlimited
  candidates.sort((a, b) => {
    const au = a.creditsTotal == null ? 1 : 0;
    const bu = b.creditsTotal == null ? 1 : 0;
    if (au !== bu) return au - bu;
    return a.endDate.localeCompare(b.endDate);
  });
  return candidates[0];
}

/* ───────────── Bookings ───────────── */

export const ACTIVE_BOOKING: Booking["status"][] = ["booked", "checked_in"];
export const isLive = (b: Booking) => b.status === "booked" || b.status === "checked_in" || b.status === "waitlist";

export class BookingError extends Error {}

export interface BookResult {
  booking: Booking;
  waitlisted: boolean;
  noCredit: boolean;
}

export async function bookMember(sessionId: string, memberId: string, opts: { allowNoCredit?: boolean } = {}): Promise<BookResult> {
  return db.transaction("rw", [db.sessions, db.bookings, db.memberships, db.classTypes, db.members, db.activity], async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) throw new BookingError("Session not found");
    if (session.cancelled) throw new BookingError("This session has been cancelled");
    const member = await db.members.get(memberId);
    if (!member) throw new BookingError("Member not found");

    const existing = await db.bookings.where("[sessionId+memberId]").equals([sessionId, memberId]).toArray();
    if (existing.some(isLive)) throw new BookingError(`${member.firstName} is already on this class`);

    const all = await db.bookings.where("sessionId").equals(sessionId).toArray();
    const taken = all.filter((b) => ACTIVE_BOOKING.includes(b.status));
    const full = taken.length >= session.capacity;
    const ct = await db.classTypes.get(session.classTypeId);
    const now = new Date().toISOString();

    const booking: Booking = {
      id: uid(), sessionId, memberId, status: full ? "waitlist" : "booked",
      createdAt: now, updatedAt: now, creditCharged: 0,
    };

    let noCredit = false;
    if (!full) {
      const ms = await db.memberships.where("memberId").equals(memberId).toArray();
      const m = pickMembership(ms, session, ct);
      if (m) {
        const cost = ct?.creditCost ?? 1;
        booking.membershipId = m.id;
        booking.creditCharged = m.creditsTotal == null ? 0 : cost;
        if (m.creditsTotal != null) await db.memberships.update(m.id, { creditsUsed: m.creditsUsed + cost });
      } else {
        noCredit = true;
        if (!opts.allowNoCredit) throw new BookingError(`${member.firstName} has no valid membership or credits for this class`);
      }
      const usedSpots = new Set(taken.map((b) => b.spot));
      for (let s = 1; s <= session.capacity; s++) if (!usedSpots.has(s)) { booking.spot = s; break; }
    }
    await db.bookings.add(booking);
    await log("booking", `${member.firstName} ${member.lastName} ${full ? "joined the waitlist for" : "booked"} ${ct?.name ?? "a class"}`, booking.id);
    return { booking, waitlisted: full, noCredit };
  });
}

async function refundCredit(b: Booking) {
  if (b.membershipId && b.creditCharged > 0) {
    const m = await db.memberships.get(b.membershipId);
    if (m) await db.memberships.update(m.id, { creditsUsed: Math.max(0, m.creditsUsed - b.creditCharged) });
  }
}

export async function cancelBooking(bookingId: string, opts: { waive?: boolean } = {}) {
  return db.transaction("rw", [db.sessions, db.bookings, db.memberships, db.classTypes, db.members, db.activity, db.settings], async () => {
    const b = await db.bookings.get(bookingId);
    if (!b) return { late: false };
    const session = await db.sessions.get(b.sessionId);
    const settings = await getSettings();
    const member = await db.members.get(b.memberId);
    const now = new Date();
    let late = false;
    if (b.status === "waitlist") {
      await db.bookings.update(b.id, { status: "cancelled", updatedAt: now.toISOString() });
    } else {
      const hoursOut = session ? differenceInHours(new Date(session.start), now) : 999;
      late = !opts.waive && settings.lateCancelForfeit && hoursOut < settings.cancellationWindowHours;
      if (!late) await refundCredit(b);
      await db.bookings.update(b.id, {
        status: late ? "late_cancel" : "cancelled",
        creditCharged: late ? b.creditCharged : 0,
        updatedAt: now.toISOString(),
      });
      if (settings.autoPromoteWaitlist && session && new Date(session.start) > now) await promoteWaitlist(session.id);
    }
    await log("cancel", `${member?.firstName ?? "Member"} ${member?.lastName ?? ""} ${late ? "late-cancelled" : "cancelled"} a booking`, b.id);
    return { late };
  });
}

/** Move the earliest waitlisted member into the class if a spot is free. Returns promoted booking id. */
export async function promoteWaitlist(sessionId: string): Promise<string | undefined> {
  const session = await db.sessions.get(sessionId);
  if (!session || session.cancelled) return;
  const all = await db.bookings.where("sessionId").equals(sessionId).toArray();
  const taken = all.filter((b) => ACTIVE_BOOKING.includes(b.status));
  if (taken.length >= session.capacity) return;
  const queue = all.filter((b) => b.status === "waitlist").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const next = queue[0];
  if (!next) return;
  const ct = await db.classTypes.get(session.classTypeId);
  const ms = await db.memberships.where("memberId").equals(next.memberId).toArray();
  const m = pickMembership(ms, session, ct);
  const cost = ct?.creditCost ?? 1;
  const usedSpots = new Set(taken.map((b) => b.spot));
  let spot: number | undefined;
  for (let s = 1; s <= session.capacity; s++) if (!usedSpots.has(s)) { spot = s; break; }
  if (m && m.creditsTotal != null) await db.memberships.update(m.id, { creditsUsed: m.creditsUsed + cost });
  await db.bookings.update(next.id, {
    status: "booked", spot, membershipId: m?.id, creditCharged: m && m.creditsTotal != null ? cost : 0,
    updatedAt: new Date().toISOString(),
  });
  const member = await db.members.get(next.memberId);
  await log("booking", `${member?.firstName ?? "Member"} was promoted from the waitlist`, next.id);
  return next.id;
}

export async function checkIn(bookingId: string) {
  const b = await db.bookings.get(bookingId);
  if (!b) return;
  if (b.status === "waitlist") throw new BookingError("Promote this member from the waitlist first");
  await db.bookings.update(bookingId, { status: "checked_in", checkedInAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const member = await db.members.get(b.memberId);
  await log("checkin", `${member?.firstName ?? "Member"} ${member?.lastName ?? ""} checked in`, bookingId);
}

export async function undoCheckIn(bookingId: string) {
  await db.bookings.update(bookingId, { status: "booked", checkedInAt: undefined, updatedAt: new Date().toISOString() });
}

export async function markNoShow(bookingId: string) {
  await db.transaction("rw", [db.bookings, db.memberships, db.settings, db.members, db.activity], async () => {
    const b = await db.bookings.get(bookingId);
    if (!b) return;
    const settings = await getSettings();
    if (!settings.noShowForfeit) await refundCredit(b);
    await db.bookings.update(bookingId, {
      status: "no_show", creditCharged: settings.noShowForfeit ? b.creditCharged : 0, updatedAt: new Date().toISOString(),
    });
    const member = await db.members.get(b.memberId);
    await log("cancel", `${member?.firstName ?? "Member"} marked as no-show`, bookingId);
  });
}

/* ───────────── Sessions ───────────── */

export async function cancelSession(sessionId: string) {
  await db.transaction("rw", [db.sessions, db.bookings, db.memberships, db.activity, db.classTypes], async () => {
    const s = await db.sessions.get(sessionId);
    if (!s) return;
    const bookings = await db.bookings.where("sessionId").equals(sessionId).toArray();
    for (const b of bookings) {
      if (!isLive(b)) continue;
      await refundCredit(b);
      await db.bookings.update(b.id, { status: "cancelled", creditCharged: 0, updatedAt: new Date().toISOString() });
    }
    await db.sessions.update(sessionId, { cancelled: true });
    const ct = await db.classTypes.get(s.classTypeId);
    await log("session", `${ct?.name ?? "Class"} session cancelled — ${bookings.filter(isLive).length} members refunded`, sessionId);
  });
}

export async function restoreSession(sessionId: string) {
  await db.sessions.update(sessionId, { cancelled: false });
}

export async function deleteSession(sessionId: string) {
  await cancelSession(sessionId);
  await db.transaction("rw", [db.sessions, db.bookings], async () => {
    await db.bookings.where("sessionId").equals(sessionId).delete();
    await db.sessions.delete(sessionId);
  });
}

export interface SessionDraft {
  classTypeId: string;
  instructorId: string;
  roomId: string;
  date: string; // yyyy-MM-dd
  time: string; // HH:mm
  duration: number;
  capacity: number;
  notes?: string;
  repeatWeeks: number; // 1 = no repeat
  weekdays: number[]; // 0-6, used when repeating; empty = same weekday as date
}

export async function createSessions(d: SessionDraft) {
  const [hh, mm] = d.time.split(":").map(Number);
  const base = new Date(`${d.date}T00:00:00`);
  base.setHours(hh, mm, 0, 0);
  const seriesId = d.repeatWeeks > 1 || d.weekdays.length > 1 ? uid() : undefined;
  const days = d.weekdays.length ? d.weekdays : [base.getDay()];
  const out: Session[] = [];
  for (let w = 0; w < Math.max(1, d.repeatWeeks); w++) {
    for (const wd of days) {
      const offset = (wd - base.getDay() + 7) % 7;
      const start = addDays(base, w * 7 + offset);
      out.push({
        id: uid(), classTypeId: d.classTypeId, instructorId: d.instructorId, roomId: d.roomId,
        start: start.toISOString(), duration: d.duration, capacity: d.capacity, cancelled: false,
        notes: d.notes, seriesId,
      });
    }
  }
  await db.sessions.bulkAdd(out);
  await log("session", `${out.length} session${out.length > 1 ? "s" : ""} scheduled`);
  return out;
}

export const sessionEnd = (s: Session) => addMinutes(new Date(s.start), s.duration);

/* ───────────── Sales ───────────── */

export async function nextInvoiceNo() {
  const count = await db.payments.count();
  return `INV-${String(1001 + count).padStart(5, "0")}`;
}

export async function sellPlan(args: {
  memberId: string; planId: string; method: PaymentMethod; startDate: string; discount?: number; paid?: boolean;
}) {
  return db.transaction("rw", [db.plans, db.memberships, db.payments, db.members, db.activity, db.settings], async () => {
    const plan = await db.plans.get(args.planId);
    const member = await db.members.get(args.memberId);
    if (!plan || !member) throw new Error("Plan or member not found");
    const settings = await getSettings();
    const start = new Date(`${args.startDate}T00:00:00`);
    const end = addDays(start, plan.validityDays - 1);
    const price = Math.max(0, plan.price - (args.discount ?? 0));
    const tax = +(price * (settings.taxRate / 100)).toFixed(2);
    const now = new Date().toISOString();
    const membership: Membership = {
      id: uid(), memberId: member.id, planId: plan.id, planName: plan.name, planType: plan.type,
      startDate: start.toISOString(), endDate: end.toISOString(), creditsTotal: plan.credits, creditsUsed: 0,
      pricePaid: price + tax, status: "active", privateOnly: plan.privateOnly, createdAt: now,
    };
    const payment: Payment = {
      id: uid(), invoiceNo: await nextInvoiceNo(), memberId: member.id, membershipId: membership.id,
      amount: +(price + tax).toFixed(2), tax, method: args.method, type: "membership",
      description: plan.name + (args.discount ? ` (discount ${args.discount})` : ""), date: now,
      status: args.paid === false ? "pending" : "paid",
    };
    await db.memberships.add(membership);
    await db.payments.add(payment);
    if (member.status !== "active") await db.members.update(member.id, { status: "active" });
    await log("membership", `${member.firstName} ${member.lastName} purchased ${plan.name}`, membership.id);
    return { membership, payment };
  });
}

export async function recordPayment(p: Omit<Payment, "id" | "invoiceNo" | "tax"> & { tax?: number }) {
  const payment: Payment = { ...p, id: uid(), invoiceNo: await nextInvoiceNo(), tax: p.tax ?? 0 };
  await db.payments.add(payment);
  await log("payment", `${p.type === "refund" ? "Refund" : "Payment"} recorded: ${p.description}`, payment.id);
  return payment;
}

export async function refundPayment(paymentId: string, cancelMembership: boolean) {
  await db.transaction("rw", [db.payments, db.memberships, db.activity], async () => {
    const p = await db.payments.get(paymentId);
    if (!p || p.status === "refunded") return;
    await db.payments.update(p.id, { status: "refunded" });
    await db.payments.add({
      id: uid(), invoiceNo: await nextInvoiceNo(), memberId: p.memberId, membershipId: p.membershipId,
      amount: -Math.abs(p.amount), tax: -Math.abs(p.tax), method: p.method, type: "refund",
      description: `Refund · ${p.invoiceNo}`, date: new Date().toISOString(), status: "paid",
    });
    if (cancelMembership && p.membershipId) await db.memberships.update(p.membershipId, { status: "cancelled" });
    await log("payment", `Refund issued for ${p.invoiceNo}`, p.id);
  });
}

export async function deleteMember(memberId: string) {
  await db.transaction("rw", [db.members, db.bookings, db.memberships, db.payments], async () => {
    await db.bookings.where("memberId").equals(memberId).delete();
    await db.memberships.where("memberId").equals(memberId).delete();
    await db.payments.where("memberId").equals(memberId).modify({ memberId: undefined });
    await db.members.delete(memberId);
  });
}

export async function freezeMembership(id: string, freeze: boolean) {
  const m = await db.memberships.get(id);
  if (!m) return;
  if (freeze) {
    await db.memberships.update(id, { status: "frozen", frozenAt: new Date().toISOString() });
  } else {
    // extend the end date by the frozen duration
    const frozenDays = m.frozenAt ? Math.ceil((Date.now() - new Date(m.frozenAt).getTime()) / 86400000) : 0;
    await db.memberships.update(id, {
      status: "active", frozenAt: undefined, endDate: addDays(new Date(m.endDate), frozenDays).toISOString(),
    });
  }
}

export async function adjustCredits(id: string, delta: number) {
  const m = await db.memberships.get(id);
  if (!m || m.creditsTotal == null) return;
  await db.memberships.update(id, { creditsTotal: Math.max(m.creditsUsed, m.creditsTotal + delta) });
}
