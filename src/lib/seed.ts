import { addDays, startOfWeek, subDays } from "date-fns";
import { ALL_TABLES, db } from "./db";
import { DEFAULT_SETTINGS } from "./logic";
import type {
  Activity, Booking, ClassType, Equipment, Instructor, Member, Membership, Payment, Plan, Room, Session,
} from "./types";
import { uid } from "./utils";

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Amelia", "Sofia", "Layla", "Nora", "Hana", "Maya", "Leila", "Chloe", "Zara", "Ines", "Mila", "Aria", "Yasmin", "Clara", "Elena", "Noor", "Isla", "Ruby", "Lina", "Dana", "Farah", "Grace", "Olivia", "Emma", "Sara", "Rania", "Lucia", "Jade", "Tala", "Mariam", "Omar", "Daniel", "Adam", "Karim", "Leo", "Sami", "Rami", "Ella", "Ava", "Reem", "Joud", "Lara", "Nadia", "Celine"];
const LAST = ["Haddad", "Bennett", "Rahman", "Silva", "Kim", "Moreau", "Nasser", "Walsh", "Okafor", "Costa", "Park", "Hughes", "Farouk", "Lindqvist", "Ortega", "Ali", "Fischer", "Tanaka", "Romano", "Saleh", "Byrne", "Mendes", "Aziz", "Novak", "Duarte", "Kaur", "Laurent", "Hassan"];
const TAGS = ["Prenatal", "Post-rehab", "Athlete", "Corporate", "Senior", "Referral", "VIP", "Morning person"];
const HEALTH = ["", "", "", "Lower back sensitivity — avoid deep flexion", "Recovering from knee surgery (2025)", "Pregnant — 2nd trimester", "Mild scoliosis", "Shoulder impingement, left side", "Hypermobile joints", ""];
const SOURCES = ["Instagram", "Walk-in", "Referral", "Google", "ClassPass", "Corporate partner"];

export async function seedDemo() {
  const r = rng(20261104);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const now = new Date();

  await db.transaction("rw", ALL_TABLES.map((t) => db.table(t)), async () => {
    for (const t of ALL_TABLES) await db.table(t).clear();

    await db.settings.put({ ...DEFAULT_SETTINGS, seededAt: now.toISOString() });

    const rooms: Room[] = [
      { id: uid(), name: "Reformer Studio", capacity: 10, description: "10 Balanced Body Allegro reformers" },
      { id: uid(), name: "Mat & Barre Room", capacity: 16, description: "Sprung floor, barre wall, mirrors" },
      { id: uid(), name: "Private Suite", capacity: 2, description: "Cadillac, Wunda chair, ladder barrel" },
    ];
    await db.rooms.bulkAdd(rooms);
    const [reformerRoom, matRoom, privateRoom] = rooms;

    const classTypes: ClassType[] = [
      { id: uid(), name: "Reformer Foundations", category: "reformer", level: "beginner", duration: 50, defaultCapacity: 10, creditCost: 1, color: "var(--series-1)", description: "Learn the fundamentals — springs, footwork and the powerhouse.", active: true },
      { id: uid(), name: "Reformer Flow", category: "reformer", level: "intermediate", duration: 50, defaultCapacity: 10, creditCost: 1, color: "var(--series-2)", description: "A flowing, full-body session with smooth transitions.", active: true },
      { id: uid(), name: "Mat Classical", category: "mat", level: "all", duration: 45, defaultCapacity: 16, creditCost: 1, color: "var(--series-3)", description: "Joseph Pilates' original 34 mat exercises.", active: true },
      { id: uid(), name: "Reformer Sculpt", category: "reformer", level: "advanced", duration: 55, defaultCapacity: 10, creditCost: 1, color: "var(--series-4)", description: "High-intensity reformer with jumpboard and weights.", active: true },
      { id: uid(), name: "Pilates Barre", category: "barre", level: "all", duration: 45, defaultCapacity: 14, creditCost: 1, color: "var(--series-5)", description: "Ballet-inspired strength with Pilates core work.", active: true },
      { id: uid(), name: "Tower & Springs", category: "tower", level: "intermediate", duration: 50, defaultCapacity: 8, creditCost: 1, color: "var(--series-7)", description: "Tower units for spring-loaded strength and mobility.", active: true },
      { id: uid(), name: "Private Session", category: "private", level: "all", duration: 55, defaultCapacity: 1, creditCost: 1, color: "var(--series-6)", description: "One-on-one tailored session on all apparatus.", active: true },
    ];
    await db.classTypes.bulkAdd(classTypes);
    const [foundations, flow, mat, sculpt, barre, tower, priv] = classTypes;

    const instructors: Instructor[] = [
      { id: uid(), name: "Lena Marquez", email: "lena@divlynx.studio", phone: "+1 555 201 3301", bio: "STOTT-certified, 9 years teaching. Loves a slow, precise burn.", specialties: ["reformer", "tower", "private"], color: "#3d6b58", ratePerClass: 45, ratePerPrivate: 70, active: true, hiredAt: subDays(now, 900).toISOString() },
      { id: uid(), name: "Yara Khoury", email: "yara@divlynx.studio", phone: "+1 555 201 3302", bio: "Former dancer, barre & classical mat specialist.", specialties: ["mat", "barre"], color: "#c0704a", ratePerClass: 40, ratePerPrivate: 65, active: true, hiredAt: subDays(now, 620).toISOString() },
      { id: uid(), name: "Theo Grant", email: "theo@divlynx.studio", phone: "+1 555 201 3303", bio: "Physio background — post-rehab and athletic conditioning.", specialties: ["reformer", "private", "chair"], color: "#2f6f8f", ratePerClass: 48, ratePerPrivate: 80, active: true, hiredAt: subDays(now, 410).toISOString() },
      { id: uid(), name: "Maya Chen", email: "maya@divlynx.studio", phone: "+1 555 201 3304", bio: "Energetic sculpt sessions with a great playlist.", specialties: ["reformer", "barre"], color: "#6a5d8f", ratePerClass: 42, ratePerPrivate: 65, active: true, hiredAt: subDays(now, 200).toISOString() },
      { id: uid(), name: "Sami Aziz", email: "sami@divlynx.studio", phone: "+1 555 201 3305", bio: "Classical lineage, tower and mat.", specialties: ["tower", "mat"], color: "#9a6b2f", ratePerClass: 40, ratePerPrivate: 60, active: true, hiredAt: subDays(now, 120).toISOString() },
    ];
    await db.instructors.bulkAdd(instructors);
    const [lena, yara, theo, maya, sami] = instructors;

    const plans: Plan[] = [
      { id: uid(), name: "Intro Offer · 3 Classes", type: "intro", credits: 3, validityDays: 14, price: 49, description: "New clients only. Three classes to find your flow.", active: true, privateOnly: false },
      { id: uid(), name: "Single Drop-in", type: "pack", credits: 1, validityDays: 30, price: 32, description: "One class, any group format.", active: true, privateOnly: false },
      { id: uid(), name: "10 Class Pack", type: "pack", credits: 10, validityDays: 90, price: 260, description: "Best for 1–2 classes a week.", active: true, privateOnly: false, popular: true },
      { id: uid(), name: "20 Class Pack", type: "pack", credits: 20, validityDays: 150, price: 460, description: "Our best per-class value.", active: true, privateOnly: false },
      { id: uid(), name: "Unlimited Monthly", type: "unlimited", credits: null, validityDays: 30, price: 289, description: "All group classes, every day.", active: true, privateOnly: false },
      { id: uid(), name: "Private · 5 Sessions", type: "private", credits: 5, validityDays: 60, price: 425, description: "One-on-one on all apparatus.", active: true, privateOnly: true },
    ];
    await db.plans.bulkAdd(plans);

    // Members
    const members: Member[] = [];
    const used = new Set<string>();
    for (let i = 0; i < 88; i++) {
      let fn = pick(FIRST), ln = pick(LAST);
      while (used.has(fn + ln)) { fn = pick(FIRST); ln = pick(LAST); }
      used.add(fn + ln);
      const joined = subDays(now, i < 4 ? 1 + Math.floor(r() * 3) : i < 10 ? 5 + Math.floor(r() * 26) : Math.floor(r() * 520) + 30);
      const statusRoll = r();
      members.push({
        id: uid(), firstName: fn, lastName: ln,
        email: `${fn}.${ln}`.toLowerCase() + "@mail.com",
        phone: `+1 555 ${String(100 + Math.floor(r() * 899))} ${String(1000 + Math.floor(r() * 8999))}`,
        birthday: new Date(1975 + Math.floor(r() * 30), Math.floor(r() * 12), 1 + Math.floor(r() * 27)).toISOString(),
        status: statusRoll < 0.78 ? "active" : statusRoll < 0.88 ? "lead" : statusRoll < 0.95 ? "inactive" : "frozen",
        joinedAt: joined.toISOString(), source: pick(SOURCES),
        tags: r() < 0.4 ? [pick(TAGS)] : [],
        emergencyName: r() < 0.7 ? `${pick(FIRST)} ${ln}` : undefined,
        emergencyPhone: r() < 0.7 ? `+1 555 ${String(100 + Math.floor(r() * 899))} ${String(1000 + Math.floor(r() * 8999))}` : undefined,
        healthNotes: pick(HEALTH) || undefined,
        goals: pick(["Core strength", "Posture", "Flexibility", "Rehab after injury", "Tone & sculpt", "Stress relief", ""]) || undefined,
        waiverSigned: r() < 0.9,
      });
    }
    await db.members.bulkAdd(members);

    // Memberships & payments
    const memberships: Membership[] = [];
    const payments: Payment[] = [];
    let inv = 1001;
    const addPayment = (p: Omit<Payment, "id" | "invoiceNo">) =>
      payments.push({ ...p, id: uid(), invoiceNo: `INV-${String(inv++).padStart(5, "0")}` });

    const horizon = subDays(now, 26 * 7);
    type Profile = { freq: number; fav: Plan; priv: boolean; churnAt?: Date };
    const profile = new Map<string, Profile>();
    const groupPlans = [plans[2], plans[2], plans[3], plans[4], plans[4], plans[1]];
    const msByMember = new Map<string, Membership[]>();
    const buy = (m: Member, plan: Plan, at: Date) => {
      const end = addDays(at, plan.validityDays - 1);
      const ms: Membership = {
        id: uid(), memberId: m.id, planId: plan.id, planName: plan.name, planType: plan.type,
        startDate: at.toISOString(), endDate: end.toISOString(), creditsTotal: plan.credits, creditsUsed: 0,
        pricePaid: plan.price, status: "active", privateOnly: plan.privateOnly, createdAt: at.toISOString(),
      };
      memberships.push(ms);
      msByMember.set(m.id, [...(msByMember.get(m.id) ?? []), ms]);
      addPayment({
        memberId: m.id, membershipId: ms.id, amount: plan.price, tax: 0, method: pick(["card", "card", "card", "cash", "transfer"]),
        type: "membership", description: plan.name, date: at.toISOString(), status: "paid",
      });
      return ms;
    };
    for (const m of members) {
      if (m.status === "lead") continue;
      const prof: Profile = {
        freq: 0.6 + r() * 2.6, fav: pick(groupPlans), priv: r() < 0.14,
        churnAt: m.status === "inactive" ? subDays(now, 30 + Math.floor(r() * 90)) : undefined,
      };
      profile.set(m.id, prof);
      const joined = new Date(m.joinedAt);
      const first = joined > horizon ? joined : subDays(horizon, Math.floor(r() * 20));
      buy(m, joined > horizon && r() < 0.7 ? plans[0] : prof.fav, first);
      if (prof.priv) buy(m, plans[5], first);
    }
    // retail
    for (let i = 0; i < 70; i++) {
      addPayment({
        memberId: pick(members).id, amount: pick([12, 18, 24, 38, 45]), tax: 0, method: pick(["card", "cash"]), type: "retail",
        description: pick(["Grip socks", "Water bottle", "Studio tote", "Resistance band set", "Mat towel"]),
        date: subDays(now, Math.floor(r() * 180)).toISOString(), status: "paid",
      });
    }

    // Weekly timetable template
    type T = { day: number; time: string; ct: ClassType; ins: Instructor; room: Room };
    const tpl: T[] = [];
    const add = (days: number[], time: string, ct: ClassType, ins: Instructor, room: Room) =>
      days.forEach((day) => tpl.push({ day, time, ct, ins, room }));
    add([1, 3, 5], "07:00", flow, lena, reformerRoom);
    add([2, 4], "07:00", sculpt, maya, reformerRoom);
    add([1, 2, 3, 4, 5], "09:30", foundations, theo, reformerRoom);
    add([1, 3], "12:15", mat, yara, matRoom);
    add([2, 4], "12:15", barre, yara, matRoom);
    add([1, 2, 3, 4], "18:00", sculpt, maya, reformerRoom);
    add([1, 3, 5], "19:15", flow, lena, reformerRoom);
    add([2, 4], "18:30", tower, sami, reformerRoom);
    add([5], "17:30", barre, maya, matRoom);
    add([6], "09:00", flow, lena, reformerRoom);
    add([6], "10:15", foundations, theo, reformerRoom);
    add([6], "11:30", mat, sami, matRoom);
    add([0], "10:00", barre, yara, matRoom);
    add([0], "11:15", tower, sami, reformerRoom);
    add([2, 4], "15:00", priv, theo, privateRoom);
    add([1, 3], "14:00", priv, lena, privateRoom);

    const sessions: Session[] = [];
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    for (let w = -26; w <= 2; w++) {
      for (const t of tpl) {
        const offset = (t.day + 6) % 7; // Monday = 0
        const d = addDays(weekStart, w * 7 + offset);
        const [h, mi] = t.time.split(":").map(Number);
        d.setHours(h, mi, 0, 0);
        sessions.push({
          id: uid(), classTypeId: t.ct.id, instructorId: t.ins.id, roomId: t.room.id, start: d.toISOString(),
          duration: t.ct.duration, capacity: Math.min(t.ct.defaultCapacity, t.room.capacity), cancelled: r() < 0.012,
        });
      }
    }
    await db.sessions.bulkAdd(sessions);

    // Bookings — chronological, with renewals when plans run out
    sessions.sort((a, b) => a.start.localeCompare(b.start));
    const bookings: Booking[] = [];
    const ctById = new Map(classTypes.map((c) => [c.id, c]));
    const activeMembers = members.filter((m) => m.status !== "lead");
    const hourPop = (h: number) => (h <= 7 ? 1 : h >= 18 ? 1.05 : h === 12 ? 0.8 : 0.75);
    const usable = (memberId: string, isPrivate: boolean, at: Date) => (msByMember.get(memberId) ?? []).find((x) =>
      x.privateOnly === isPrivate && new Date(x.startDate) <= at && new Date(x.endDate) >= at &&
      (x.creditsTotal == null || x.creditsUsed < x.creditsTotal));

    for (const s of sessions) {
      if (s.cancelled) continue;
      const ct = ctById.get(s.classTypeId)!;
      const isPrivate = ct.category === "private";
      const start = new Date(s.start);
      const isFuture = start > now;
      const daysOut = (start.getTime() - now.getTime()) / 86400000;
      // gentle growth over time + fewer bookings far in the future
      const growth = 0.78 + 0.22 * (1 - Math.min(1, Math.max(0, -daysOut) / 180));
      const pop = hourPop(start.getHours()) * growth * (isFuture ? Math.max(0.3, 1 - daysOut / 12) : 1);
      const target = isPrivate ? (r() < 0.8 ? 1 : 0) : Math.min(s.capacity + (r() < 0.2 ? 2 : 0), Math.round(s.capacity * (0.4 + r() * 0.6) * pop));
      const pool = activeMembers.filter((m) => !isPrivate || profile.get(m.id)!.priv).sort(() => r() - 0.5);
      let count = 0;
      for (const m of pool) {
        if (count >= target) break;
        const prof = profile.get(m.id)!;
        if (new Date(m.joinedAt) > start) continue;
        if (prof.churnAt && start > prof.churnAt) continue;
        if (!isPrivate && r() > prof.freq / 3.4) continue;
        let ms = usable(m.id, isPrivate, start);
        if (!ms) {
          if (r() > 0.85) continue;
          const plan = isPrivate ? plans[5] : (r() < 0.8 ? prof.fav : pick(groupPlans));
          const buyAt = subDays(start, 1 + Math.floor(r() * 2));
          // never create payments in the future: upcoming-class renewals happened recently
          ms = buy(m, plan, buyAt > now ? subDays(now, r() * 6) : buyAt);
        }
        const waitlist = count >= s.capacity;
        if (waitlist && !isFuture) continue;
        let status: Booking["status"] = waitlist ? "waitlist" : "booked";
        if (!isFuture) {
          const roll = r();
          status = roll < 0.87 ? "checked_in" : roll < 0.93 ? "late_cancel" : roll < 0.97 ? "no_show" : "cancelled";
        }
        const charged = (status === "cancelled" || status === "waitlist") ? 0 : (ms.creditsTotal == null ? 0 : ct.creditCost);
        if (charged) ms.creditsUsed += charged;
        const created = subDays(start, 1 + Math.floor(r() * 6));
        bookings.push({
          id: uid(), sessionId: s.id, memberId: m.id, membershipId: status === "waitlist" ? undefined : ms.id, status,
          createdAt: created.toISOString(), updatedAt: created.toISOString(),
          checkedInAt: status === "checked_in" ? start.toISOString() : undefined,
          creditCharged: charged, spot: waitlist ? undefined : count + 1,
        });
        count++;
      }
    }
    // frozen members: freeze their current plan
    for (const m of members.filter((x) => x.status === "frozen")) {
      const cur = (msByMember.get(m.id) ?? []).find((x) => new Date(x.endDate) > now);
      if (cur) { cur.status = "frozen"; cur.frozenAt = subDays(now, 5).toISOString(); }
    }
    payments.sort((a, b) => a.date.localeCompare(b.date)).forEach((p, i) => (p.invoiceNo = `INV-${String(1001 + i).padStart(5, "0")}`));
    await db.bookings.bulkAdd(bookings);
    await db.memberships.bulkAdd(memberships);
    await db.payments.bulkAdd(payments);

    const equipment: Equipment[] = [];
    for (let i = 1; i <= 10; i++) {
      const last = subDays(now, Math.floor(r() * 200));
      equipment.push({
        id: uid(), name: `Reformer #${String(i).padStart(2, "0")}`, type: "reformer", roomId: reformerRoom.id,
        serial: `BB-ALG-${2300 + i}`, purchasedAt: subDays(now, 700 + i * 3).toISOString(), lastServiceAt: last.toISOString(),
        serviceIntervalDays: 180, status: i === 7 ? "maintenance" : "operational",
        notes: i === 7 ? "Spring #3 worn — replacement ordered" : undefined,
      });
    }
    equipment.push(
      { id: uid(), name: "Cadillac / Trapeze Table", type: "cadillac", roomId: privateRoom.id, serial: "BB-CAD-118", lastServiceAt: subDays(now, 210).toISOString(), serviceIntervalDays: 180, status: "operational" },
      { id: uid(), name: "Wunda Chair", type: "chair", roomId: privateRoom.id, serial: "BB-EXO-40", lastServiceAt: subDays(now, 40).toISOString(), serviceIntervalDays: 180, status: "operational" },
      { id: uid(), name: "Ladder Barrel", type: "barrel", roomId: privateRoom.id, lastServiceAt: subDays(now, 300).toISOString(), serviceIntervalDays: 365, status: "operational" },
      { id: uid(), name: "Tower Unit A", type: "tower", roomId: reformerRoom.id, lastServiceAt: subDays(now, 95).toISOString(), serviceIntervalDays: 180, status: "operational" },
      { id: uid(), name: "Tower Unit B", type: "tower", roomId: reformerRoom.id, lastServiceAt: subDays(now, 260).toISOString(), serviceIntervalDays: 180, status: "out_of_service", notes: "Push-through bar bracket cracked" },
      { id: uid(), name: "Mats (set of 16)", type: "mat", roomId: matRoom.id, lastServiceAt: subDays(now, 30).toISOString(), serviceIntervalDays: 90, status: "operational" },
      { id: uid(), name: "Magic circles (x16)", type: "accessory", roomId: matRoom.id, serviceIntervalDays: 365, status: "operational" },
    );
    await db.equipment.bulkAdd(equipment);

    const acts: Activity[] = [
      { id: uid(), at: now.toISOString(), kind: "system", message: "Demo studio data loaded" },
    ];
    const recent = bookings.filter((b) => b.status === "checked_in").sort((a, b) => (b.checkedInAt ?? "").localeCompare(a.checkedInAt ?? "")).slice(0, 8);
    const mById = new Map(members.map((m) => [m.id, m]));
    recent.forEach((b) => acts.push({ id: uid(), at: b.checkedInAt!, kind: "checkin", message: `${mById.get(b.memberId)?.firstName} ${mById.get(b.memberId)?.lastName} checked in`, refId: b.id }));
    payments.slice(-5).forEach((p) => acts.push({ id: uid(), at: p.date, kind: "payment", message: `${p.description} — ${mById.get(p.memberId ?? "")?.firstName ?? "Walk-in"}`, refId: p.id }));
    await db.activity.bulkAdd(acts);
  });
}

export async function clearAll() {
  await db.transaction("rw", ALL_TABLES.map((t) => db.table(t)), async () => {
    for (const t of ALL_TABLES) await db.table(t).clear();
    await db.settings.put({ ...DEFAULT_SETTINGS, seededAt: new Date().toISOString() });
  });
}

export async function exportAll() {
  const out: Record<string, unknown[]> = {};
  for (const t of ALL_TABLES) out[t] = await db.table(t).toArray();
  return { app: "pilates-studio", version: 1, exportedAt: new Date().toISOString(), data: out };
}

export async function importAll(json: { data: Record<string, unknown[]> }) {
  if (!json?.data) throw new Error("Invalid backup file");
  await db.transaction("rw", ALL_TABLES.map((t) => db.table(t)), async () => {
    for (const t of ALL_TABLES) {
      await db.table(t).clear();
      const rows = json.data[t];
      if (Array.isArray(rows) && rows.length) await db.table(t).bulkAdd(rows);
    }
  });
}
