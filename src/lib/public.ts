import { db } from "./db";
import { bookMember, log, getSettings, sellPlan, recordPayment, BookingError } from "./logic";
import type { Intake, Member } from "./types";
import { uid } from "./utils";

export interface Contact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const norm = (e: string) => e.trim().toLowerCase();

export async function findMemberByEmail(email: string) {
  const e = norm(email);
  if (!e) return undefined;
  return db.members.filter((m) => norm(m.email) === e).first();
}

/** Creates (or updates) a member from a public contact. New people arrive as leads. */
async function upsertContact(c: Contact, source = "Website"): Promise<Member> {
  const existing = await findMemberByEmail(c.email);
  if (existing) {
    const patch: Partial<Member> = {};
    if (!existing.phone && c.phone) patch.phone = c.phone;
    if (Object.keys(patch).length) await db.members.update(existing.id, patch);
    return { ...existing, ...patch };
  }
  const m: Member = {
    id: uid(), firstName: c.firstName.trim(), lastName: c.lastName.trim(), email: c.email.trim(), phone: c.phone.trim(),
    status: "lead", joinedAt: new Date().toISOString(), source, tags: [], waiverSigned: false,
  };
  await db.members.add(m);
  return m;
}

export interface IntakeSubmission extends Contact {
  birthday?: string;
  emergencyName: string;
  emergencyPhone: string;
  intake: Omit<Intake, "submittedAt" | "needsClearance">;
}

export async function submitIntake(s: IntakeSubmission) {
  const needsClearance = s.intake.conditions.length > 0;
  const intake: Intake = { ...s.intake, submittedAt: new Date().toISOString(), needsClearance };
  const healthBits = [
    s.intake.injuries.length ? `Injuries/sensitive: ${s.intake.injuries.join(", ")}` : "",
    s.intake.conditions.length ? `Conditions: ${s.intake.conditions.join(", ")}` : "",
    s.intake.medications ? `Medications: ${s.intake.medications}` : "",
    s.intake.bodyNotes ?? "",
  ].filter(Boolean);
  const member = await upsertContact(s, "Website");
  const fresh = (await db.members.get(member.id))!;
  await db.members.update(member.id, {
    birthday: s.birthday || fresh.birthday,
    emergencyName: s.emergencyName, emergencyPhone: s.emergencyPhone,
    healthNotes: healthBits.join(" · ") || fresh.healthNotes,
    goals: s.intake.goals.join(", ") || fresh.goals,
    waiverSigned: true,
    tags: Array.from(new Set([...fresh.tags, "Web intake", ...(needsClearance ? ["Needs clearance"] : [])])),
    intake,
  });
  await log("member", `New intake form: ${fresh.firstName} ${fresh.lastName}${needsClearance ? " (medical clearance flagged)" : ""}`, member.id);
  return { memberId: member.id };
}

export interface CartLine {
  kind: "plan" | "product";
  id: string;
  qty: number;
}

export async function placeOrder(contact: Contact, lines: CartLine[]) {
  const member = await upsertContact(contact, "Online shop");
  const settings = await getSettings();
  const ref = `WEB-${Date.now().toString(36).slice(-5).toUpperCase()}`;
  const invoices: string[] = [];
  let total = 0;

  for (const l of lines.filter((x) => x.kind === "plan")) {
    for (let i = 0; i < l.qty; i++) {
      const r = await sellPlan({ memberId: member.id, planId: l.id, method: "other", startDate: new Date().toISOString().slice(0, 10), paid: false });
      await db.payments.update(r.payment.id, { description: `${r.payment.description} · online ${ref}` });
      invoices.push(r.payment.invoiceNo);
      total += r.payment.amount;
    }
  }

  const products = lines.filter((x) => x.kind === "product");
  if (products.length) {
    const items = await db.products.bulkGet(products.map((x) => x.id));
    let sub = 0;
    const desc: string[] = [];
    for (const [i, l] of products.entries()) {
      const p = items[i];
      if (!p) continue;
      sub += p.price * l.qty;
      desc.push(`${l.qty}× ${p.name}`);
      await db.products.update(p.id, { stock: Math.max(0, p.stock - l.qty) });
    }
    const tax = +(sub * (settings.taxRate / 100)).toFixed(2);
    const pay = await recordPayment({
      memberId: member.id, amount: +(sub + tax).toFixed(2), tax, method: "other", type: "retail",
      description: `Online order ${ref}: ${desc.join(", ")}`, date: new Date().toISOString(), status: "pending",
    });
    invoices.push(pay.invoiceNo);
    total += pay.amount;
  }
  await log("payment", `Online order ${ref} from ${member.firstName} ${member.lastName}`, member.id);
  return { ref, invoices, total, memberId: member.id, isNew: member.status === "lead" && !member.intake };
}

/** Public booking: identifies a member by email and books with their credits. */
export async function reserveByEmail(sessionId: string, email: string) {
  const m = await findMemberByEmail(email);
  if (!m) return { status: "unknown" as const };
  try {
    const r = await bookMember(sessionId, m.id);
    return { status: r.waitlisted ? ("waitlisted" as const) : ("booked" as const), name: m.firstName };
  } catch (e) {
    if (e instanceof BookingError && /no valid membership/.test(e.message)) return { status: "nocredit" as const, name: m.firstName };
    return { status: "error" as const, message: e instanceof Error ? e.message : "Could not book", name: m.firstName };
  }
}
