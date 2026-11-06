"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { Mark, MarkerText } from "@/components/kokonutui/marker-text";
import { useToast } from "@/components/overlay";
import SquigglyArrow from "@/components/registry/squiggle-arrow";
import { useCart } from "@/components/site/cart";
import {
  CapacityBoxes, CheckBox, FormHeading, Hand, HiliteButton, HiliteLink, Label, LineInput, MarginArrow, PenButton, PenLink, Stamp,
} from "@/components/site/paper";
import { ReserveModal } from "@/components/site/reserve";
import { ExerciseFigure } from "@/components/site/sketch";
import { AccordionApp } from "@/components/watermelon/card-split-accordian";
import { db } from "@/lib/db";
import { useLookups, useNow, useSettings } from "@/lib/hooks";
import type { ClassType, Session } from "@/lib/types";
import { CATEGORY_LABEL, EMPTY, EMPTY_MAP, LEVEL_LABEL, cn, money } from "@/lib/utils";

/* Beginner-first order: the sequence a new client is actually walked through. */
const ORDER = ["reformer", "mat", "tower", "barre", "chair", "private", "other"];
const LEVELS = ["beginner", "all", "intermediate", "advanced"];
const sortTypes = (list: ClassType[]) =>
  [...list].sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || ORDER.indexOf(a.category) - ORDER.indexOf(b.category) || a.name.localeCompare(b.name));

const NOTE: Record<string, string> = {
  beginner: "start here",
  all: "any time",
  intermediate: "after ~5 classes",
  advanced: "when you feel ready",
};

/** Live sessions for the next 7 days, with booked counts. */
function useWeek() {
  const now = useNow(60_000);
  const from = startOfDay(now).toISOString();
  const to = addDays(startOfDay(now), 8).toISOString();
  const sessions = useLiveQuery(() => db.sessions.where("start").between(from, to).toArray(), [from]) ?? EMPTY;
  const counts = useLiveQuery(async () => {
    if (!sessions.length) return new Map<string, number>();
    const bs = await db.bookings.where("sessionId").anyOf(sessions.map((s) => s.id)).toArray();
    const m = new Map<string, number>();
    bs.forEach((b) => (b.status === "booked" || b.status === "checked_in") && m.set(b.sessionId, (m.get(b.sessionId) ?? 0) + 1));
    return m;
  }, [sessions]) ?? EMPTY_MAP;
  const upcoming = useMemo(() => sessions.filter((s) => !s.cancelled && new Date(s.start) > now).sort((a, b) => a.start.localeCompare(b.start)), [sessions, now]);
  const nextFor = (classTypeId: string) => upcoming.find((s) => s.classTypeId === classTypeId && (counts.get(s.id) ?? 0) < s.capacity) ?? upcoming.find((s) => s.classTypeId === classTypeId);
  return { now, sessions, counts, upcoming, nextFor };
}

export default function Landing() {
  const lk = useLookups();
  const week = useWeek();
  const [reserve, setReserve] = useState<Session | null>(null);
  const types = sortTypes(lk.classTypes.filter((c) => c.active));
  return (
    <div className="mx-auto max-w-[1240px] space-y-10 px-4 pt-6 pb-14 md:space-y-14 md:px-8 md:pt-10">
      <FirstSheet types={types} week={week} onReserve={setReserve} />
      <Programme types={types} week={week} onReserve={setReserve} />
      <FirstClass />
      <Appointments week={week} onReserve={setReserve} />
      <Fees />
      <Questions />
      <Instructors />
      <ReserveModal session={reserve} ct={reserve ? lk.classType.get(reserve.classTypeId) : undefined} ins={reserve ? lk.instructor.get(reserve.instructorId) : undefined} onClose={() => setReserve(null)} />
    </div>
  );
}

type Week = ReturnType<typeof useWeek>;

function slotLabel(s: Session) {
  return `${format(new Date(s.start), "EEE d MMM")} · ${format(new Date(s.start), "h:mm a")}`;
}

/* ───────────────────────── First viewport: the top of the sheet ───────────────────────── */
function FirstSheet({ types, week, onReserve }: { types: ClassType[]; week: Week; onReserve: (s: Session) => void }) {
  const settings = useSettings();
  const router = useRouter();
  const intro = useLiveQuery(() => db.plans.filter((p) => p.active && p.type === "intro").first(), []);
  const [name, setName] = useState("");
  const first3 = types.slice(0, 3);

  const start = (e: FormEvent) => {
    e.preventDefault();
    const [first, ...rest] = name.trim().split(/\s+/);
    const q = new URLSearchParams();
    if (first) q.set("first", first);
    if (rest.length) q.set("last", rest.join(" "));
    router.push(`/join${q.toString() ? `?${q}` : ""}`);
  };

  return (
    <section aria-labelledby="sheet-title" className="relative bg-paper sheet-shadow">
      {/* Printed form header */}
      <div className="grid grid-cols-2 border-b-[1.5px] border-print text-[14px] md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        {[
          ["Form", <span key="f" className="f-print font-bold text-print">Client programme · DP-1</span>],
          ["Studio", <span key="s" className="text-print">{settings.studioName}</span>],
          ["Date", <Hand key="d" className="text-[24px] leading-none">{format(week.now, "d MMMM yyyy")}</Hand>],
          ["Instructor", <Hand key="i" className="text-[24px] leading-none">assigned at your first visit</Hand>],
        ].map(([k, v], i) => (
          <div key={k as string} className={cn("flex min-h-[64px] flex-col justify-between gap-1 px-4 py-2.5", i > 0 && "border-l border-rule max-md:[&:nth-child(3)]:border-l-0", i > 1 && "max-md:border-t")}>
            <span className="f-narrow text-[11.5px] font-semibold uppercase tracking-[0.1em] text-form">{k}</span>
            {v}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 px-5 pt-8 pb-10 md:px-10 md:pt-12">
          <MarkerText>
            <h1 id="sheet-title" className="f-wide max-w-[14ch] text-balance text-[clamp(1.85rem,6.4vw,5.6rem)] font-black uppercase leading-[0.92] tracking-[-0.035em] text-print">
              Your first <Mark type="highlight" color="#f8ec3a">Pilates</Mark> programme
            </h1>
          </MarkerText>
          <p className="mt-6 max-w-[54ch] text-[19px] leading-relaxed text-print-2">
            Never done Pilates? Good — this sheet is how every beginner starts here. Tell us about your body, take three small classes, and an instructor adjusts each one for you.
            {intro && <> All three cost <strong className="font-bold text-print">{money(intro.price, { cents: false })}</strong>.</>}
          </p>

          <form onSubmit={start} className="mt-9 flex max-w-xl flex-col gap-5 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="prescribed-for">Prescribed for</Label>
              <LineInput id="prescribed-for" hand value={name} onChange={(e) => setName(e.target.value)} placeholder="write your name" autoComplete="name" />
            </div>
            <HiliteButton type="submit" size="lg">Start my programme</HiliteButton>
          </form>

          <ol className="mt-12 border-t-2 border-print">
            {first3.map((c, i) => {
              const next = week.nextFor(c.id);
              const taken = next ? week.counts.get(next.id) ?? 0 : 0;
              return (
                <li key={c.id} className="grid grid-cols-[2.2rem_1fr] items-center gap-x-4 gap-y-3 border-b border-rule py-5 sm:grid-cols-[2.2rem_120px_1fr_auto]">
                  <span className="f-wide self-start pt-1 text-[22px] font-black text-print">{i + 1}.</span>
                  <ExerciseFigure kind={c.category} className="hidden h-[74px] w-[120px] sm:block" />
                  <div className="min-w-0">
                    <div className="f-print text-[19px] font-bold text-print">{c.name}</div>
                    <div className="f-narrow mt-0.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-form">{c.duration} min · {LEVEL_LABEL[c.level]} · max {c.defaultCapacity}</div>
                  </div>
                  <div className="col-start-2 sm:col-start-auto sm:text-right">
                    {next ? (
                      <button onClick={() => onReserve(next)} className="group text-left sm:text-right" aria-label={`Reserve ${c.name}, ${slotLabel(next)}`}>
                        <div className="text-[15px] font-semibold text-print group-hover:text-ballpoint">{slotLabel(next)}</div>
                        <div className="mt-1.5 flex items-center gap-2 sm:justify-end">
                          <CapacityBoxes taken={taken} capacity={next.capacity} size={11} />
                          <span className="text-[13px] text-muted">{Math.max(0, next.capacity - taken)} left</span>
                        </div>
                      </button>
                    ) : <span className="text-[14px] text-muted">No class this week</span>}
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="mt-5"><PenLink href="#programme">See the whole programme</PenLink></div>
        </div>

        {/* The margin, where the instructor writes */}
        <aside className="relative border-t border-rule px-5 py-8 md:px-10 lg:border-t-0 lg:border-l-[1.5px] lg:border-l-[var(--stamp)]/40 lg:px-7 lg:py-12" aria-label="Instructor's notes">
          <div className="flex items-start gap-3">
            <Hand as="p" className="text-[30px] leading-[1.05]">{first3[0] ? <>new here? book<br />#1 first</> : "new here? start with the form"}</Hand>
            <MarginArrow className="mt-6 hidden h-16 w-16 lg:block" d="M60 6 C 40 10, 22 26, 18 54 M18 54 l-7 -9 M18 54 l9 -6" />
          </div>
          {intro && (
            <div className="mt-10 flex flex-col items-start gap-3">
              <Stamp className="text-[22px]" rot={-7}>
                <span className="text-[12px] tracking-[0.18em]">Intro offer</span>
                <span className="text-[34px] tracking-[-0.01em]">{money(intro.price, { cents: false })}</span>
                <span className="text-[12px] tracking-[0.14em]">{intro.credits} classes · {intro.validityDays} days</span>
              </Stamp>
              <p className="mt-3 text-[15px] text-print-2">For first-timers only. Pay at the front desk on your first visit.</p>
            </div>
          )}
          <div className="mt-10 space-y-5">
            <Hand as="p" className="text-[26px] leading-tight">bring grip socks + water</Hand>
            <Hand as="p" className="text-[26px] leading-tight">tell us about any injury — we adapt everything</Hand>
          </div>
          {week.upcoming.length > 0 && (
            <Hand as="p" className="mt-8 border-t border-rule pt-5 text-[26px] leading-tight">
              {week.upcoming.length} classes on this week — plenty of beginner spots
            </Hand>
          )}
        </aside>
      </div>
    </section>
  );
}

/* ───────────────────────── The full programme ───────────────────────── */
function Programme({ types, week, onReserve }: { types: ClassType[]; week: Week; onReserve: (s: Session) => void }) {
  return (
    <section id="programme" aria-labelledby="programme-title" className="scroll-mt-24 bg-paper px-5 py-10 sheet-shadow md:px-10 md:py-12">
      <FormHeading id="programme-title" aside={<Hand className="hidden text-[24px] sm:inline">in the order we suggest</Hand>}>The programme</FormHeading>
      <p className="mt-4 max-w-[62ch] text-[17px] text-print-2">Every format, numbered in the order most beginners take them. Each line shows the next real class on the timetable and how many places are left.</p>
      <div className="mt-6 hidden grid-cols-[2.4rem_150px_1.4fr_1fr_1.1fr] gap-5 border-b-[1.5px] border-print pb-2 md:grid">
        {["No.", "Exercise", "Class", "Prescription", "Next appointment"].map((h) => <span key={h} className="f-narrow text-[12px] font-semibold uppercase tracking-[0.1em] text-form">{h}</span>)}
      </div>
      <ol>
        {types.map((c, i) => {
          const next = week.nextFor(c.id);
          const taken = next ? week.counts.get(next.id) ?? 0 : 0;
          const note = c.category === "private" ? "good with an injury" : NOTE[c.level];
          return (
            <li key={c.id} className="grid grid-cols-[2.4rem_1fr] gap-x-5 gap-y-2 border-b border-rule py-6 md:grid-cols-[2.4rem_150px_1.4fr_1fr_1.1fr] md:items-center">
              <span className="f-wide text-[22px] font-black text-print">{i + 1}.</span>
              <ExerciseFigure kind={c.category} title={`${CATEGORY_LABEL[c.category]} exercise sketch`} className="col-start-2 h-[80px] w-[140px] md:col-start-auto" />
              <div className="col-start-2 md:col-start-auto">
                <div className="f-print text-[20px] font-bold text-print">{c.name}</div>
                <p className="mt-1 max-w-[46ch] text-[15.5px] text-print-2">{c.description}</p>
                {note && <Hand as="p" className="mt-1 text-[24px] leading-none">{note}</Hand>}
              </div>
              <dl className="col-start-2 grid grid-cols-3 gap-2 text-[15px] md:col-start-auto md:grid-cols-1 md:gap-1">
                <div className="flex gap-2"><dt className="sr-only">Length</dt><dd className="text-print">{c.duration} min</dd></div>
                <div className="flex gap-2"><dt className="sr-only">Level</dt><dd className="text-print">{LEVEL_LABEL[c.level]}</dd></div>
                <div className="flex gap-2"><dt className="sr-only">Class size</dt><dd className="text-print">Max {c.defaultCapacity} people</dd></div>
              </dl>
              <div className="col-start-2 md:col-start-auto">
                {next ? (
                  <>
                    <div className="text-[15.5px] font-semibold text-print">{slotLabel(next)}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <CapacityBoxes taken={taken} capacity={next.capacity} size={11} />
                      <span className="text-[13px] text-muted">{Math.max(0, next.capacity - taken)} left</span>
                    </div>
                    <PenButton className="mt-2 text-[15px]" onClick={() => onReserve(next)}>{taken >= next.capacity ? "Join waitlist" : "Reserve"}</PenButton>
                  </>
                ) : <span className="text-[14px] text-muted">Not on this week&apos;s timetable</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ───────────────────────── Before your first class (pink copy) ───────────────────────── */
function FirstClass() {
  const settings = useSettings();
  const [bring, setBring] = useState<Record<string, boolean>>({});
  const steps = [
    { t: "Fill in your intake form", d: "Three minutes: goals, injuries, and anything your instructor should know. It goes straight to them.", href: "/join", cta: "Open the form" },
    { t: "Take the intro offer", d: "Three classes over two weeks. Book them one at a time, whenever suits you.", href: "/shop#passes", cta: "See prices" },
    { t: "Arrive 10 minutes early", d: "We show you the reformer, set your springs and your footbar, and answer questions." },
    { t: "During class", d: "Small group, slow and controlled. Your instructor gives you options for anything that doesn't feel right." },
    { t: "Afterwards", d: `Book your next class here or at the desk. Changed your mind? Cancel free up to ${settings.cancellationWindowHours} hours before.` },
  ];
  const items = [
    ["socks", "Grip socks (we sell them at the desk)"],
    ["water", "A water bottle"],
    ["clothes", "Fitted, comfortable clothes — no zips"],
    ["notes", "Your intake form done, or 5 spare minutes"],
  ] as const;
  return (
    <section id="first-class" aria-labelledby="first-title" className="scroll-mt-24 bg-pink px-5 py-10 sheet-shadow md:px-10 md:py-12">
      <FormHeading id="first-title" aside={<span className="f-narrow hidden text-[12px] font-semibold uppercase tracking-[0.1em] text-form sm:inline">Patient copy · keep this</span>}>Before your first class</FormHeading>
      <div className="mt-8 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <ol className="space-y-7">
          {steps.map((s, i) => (
            <li key={s.t} className="grid grid-cols-[2.4rem_1fr] gap-4">
              <span className="f-wide text-[22px] font-black text-print">{i + 1}.</span>
              <div>
                <div className="f-print text-[19px] font-bold text-print">{s.t}</div>
                <p className="mt-1 max-w-[56ch] text-[16px] leading-relaxed text-print-2">{s.d}</p>
                {s.href && <div className="mt-2"><PenLink href={s.href}>{s.cta}</PenLink></div>}
              </div>
            </li>
          ))}
        </ol>
        <div>
          <div className="border-t-2 border-print pt-3 lg:border-l lg:border-t-0 lg:border-l-print/20 lg:pt-0 lg:pl-10">
            <div className="f-narrow border-b-[1.5px] border-print pb-2 text-[13px] font-bold uppercase tracking-[0.1em] text-print">Bring with you</div>
            <ul className="mt-4 space-y-4">
              {items.map(([k, label]) => (
                <li key={k}><CheckBox checked={!!bring[k]} onChange={(v) => setBring((b) => ({ ...b, [k]: v }))}>{label}</CheckBox></li>
              ))}
            </ul>
            <Hand as="p" className="mt-6 text-[24px] leading-tight">{Object.values(bring).filter(Boolean).length === items.length ? "perfect — see you on the reformer!" : "tick them off as you pack"}</Hand>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Appointment book ───────────────────────── */
function Appointments({ week, onReserve }: { week: Week; onReserve: (s: Session) => void }) {
  const lk = useLookups();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(startOfDay(week.now), i)), [week.now]);
  const [day, setDay] = useState(0);
  const list = week.sessions.filter((s) => !s.cancelled && isSameDay(new Date(s.start), days[day])).sort((a, b) => a.start.localeCompare(b.start));
  return (
    <section id="appointments" aria-labelledby="appt-title" className="scroll-mt-24 bg-paper sheet-shadow">
      <div className="px-5 pt-10 md:px-10 md:pt-12">
        <FormHeading id="appt-title" aside={<span className="hidden text-[14px] text-muted sm:inline">Live from the studio timetable</span>}>Appointment book</FormHeading>
      </div>
      <div role="tablist" aria-label="Day" className="mt-6 flex overflow-x-auto border-b-[1.5px] border-print px-5 [scrollbar-width:none] md:px-10">
        {days.map((d, i) => (
          <button key={d.toISOString()} role="tab" aria-selected={i === day} onClick={() => setDay(i)}
            className={cn("relative -mb-[1.5px] min-w-[84px] shrink-0 border-[1.5px] border-b-0 px-3 pt-2 pb-2.5 text-left transition-colors",
              i === day ? "border-print bg-paper" : "border-transparent text-muted hover:text-print")}>
            <span className="f-narrow block text-[12px] font-semibold uppercase tracking-[0.1em]">{i === 0 ? "Today" : format(d, "EEE")}</span>
            <span className="f-wide block text-[22px] font-black leading-tight">{format(d, "d")}</span>
            {i === day && <span className="absolute inset-x-0 -bottom-[1.5px] h-[1.5px] bg-paper" />}
          </button>
        ))}
      </div>
      <div className="px-5 pb-10 md:px-10">
        {list.length === 0 ? (
          <p className="py-14 text-center text-[16px] text-muted">No classes on this day. The studio is resting.</p>
        ) : (
          <ul>
            {list.map((s) => {
              const ct = lk.classType.get(s.classTypeId);
              const ins = lk.instructor.get(s.instructorId);
              const taken = week.counts.get(s.id) ?? 0;
              const left = Math.max(0, s.capacity - taken);
              const past = new Date(s.start) < week.now;
              return (
                <li key={s.id} className={cn("grid grid-cols-[4.6rem_1fr_auto] items-center gap-x-4 gap-y-2 border-b border-rule py-4 md:grid-cols-[6rem_1.3fr_1fr_1.3fr_8rem]", past && "[&_*]:text-muted")}>
                  <div className="f-wide text-[20px] font-black text-print tnum">{format(new Date(s.start), "h:mm")}<span className="f-narrow ml-1 text-[12px] font-semibold uppercase text-form">{format(new Date(s.start), "a")}</span></div>
                  <div className="min-w-0">
                    <div className="f-print truncate text-[17px] font-bold text-print">{ct?.name}</div>
                    <div className="text-[14px] text-muted">{s.duration} min · {ct && LEVEL_LABEL[ct.level]}<span className="md:hidden"> · {ins?.name}</span></div>
                  </div>
                  <div className="hidden text-[15px] text-print-2 md:block">{ins?.name}<div className="text-[13px] text-muted">{lk.room.get(s.roomId)?.name}</div></div>
                  <div className="col-span-2 col-start-2 flex items-center gap-2 md:col-span-1 md:col-start-auto">
                    <CapacityBoxes taken={taken} capacity={s.capacity} size={11} />
                    <span className={cn("text-[13px]", left <= 2 && left > 0 ? "font-semibold text-stamp" : "text-muted")}>{left === 0 ? "Full" : `${left} left`}</span>
                  </div>
                  <div className="row-start-1 col-start-3 text-right md:row-start-auto md:col-start-auto">
                    {past ? <span className="text-[14px] text-muted">Done</span> :
                      <PenButton onClick={() => onReserve(s)} className="text-[15px]">{left === 0 ? "Waitlist" : "Reserve"}</PenButton>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-5 text-[14px] text-muted">Already a member? Reserve with the email you signed up with. New here? <PenLink href="/join" className="text-[14px]">Fill in the intake form</PenLink> first.</p>
      </div>
    </section>
  );
}

/* ───────────────────────── Fee schedule (canary copy) ───────────────────────── */
function Fees() {
  const plans = useLiveQuery(() => db.plans.filter((p) => p.active).toArray(), []) ?? EMPTY;
  const { add, setOpen } = useCart();
  const toast = useToast();
  const list = [...plans].sort((a, b) => (a.type === "intro" ? -1 : b.type === "intro" ? 1 : a.price - b.price));
  return (
    <section id="fees" aria-labelledby="fees-title" className="scroll-mt-24 bg-canary px-5 py-10 sheet-shadow md:px-10 md:py-12">
      <FormHeading id="fees-title" aside={<span className="f-narrow hidden text-[12px] font-semibold uppercase tracking-[0.1em] text-form sm:inline">Customer copy</span>}>Fee schedule</FormHeading>
      <ul className="mt-6">
        {list.map((p) => (
          <li key={p.id} className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1 border-b border-print/15 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div className="flex min-w-0 items-baseline gap-3">
              <span className="f-print shrink-0 text-[18px] font-bold text-print">{p.name}</span>
              <span className="hidden flex-1 translate-y-[-4px] border-b-2 border-dotted border-print/35 sm:block" aria-hidden />
            </div>
            <span className="f-wide text-right text-[22px] font-black text-print tnum">{money(p.price, { cents: false })}</span>
            <PenButton className="col-span-2 justify-self-start text-[15px] sm:col-span-1 sm:justify-self-end" onClick={() => { add({ kind: "plan", id: p.id }); toast.success(`${p.name} added to your order`); setOpen(true); }}>Add to order</PenButton>
            <span className="col-span-2 text-[14px] text-print-2 sm:col-span-3">
              {p.credits == null ? "Unlimited group classes" : `${p.credits} ${p.privateOnly ? "private session" : "class"}${p.credits > 1 ? "es" : ""}${p.credits > 1 ? ` · ${money(p.price / p.credits)} each` : ""}`} · valid {p.validityDays} days
              {p.type === "intro" && <Hand className="ml-2 text-[22px]">← new clients</Hand>}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap items-center gap-6">
        <HiliteLink href="/shop">Open the order form</HiliteLink>
        <span className="text-[14px] text-print-2">Pay at the studio. No card details online.</span>
      </div>
    </section>
  );
}

/* ───────────────────────── Questions beginners ask ───────────────────────── */
function Questions() {
  const settings = useSettings();
  const lk = useLookups();
  const maxReformer = Math.max(0, ...lk.classTypes.filter((c) => c.category === "reformer").map((c) => c.defaultCapacity));
  const items = [
    { id: 1, title: "Am I fit enough to start?", content: "Yes. Beginner classes assume you have never done Pilates. Springs make the reformer lighter or heavier, so the same class works for very different bodies." },
    { id: 2, title: "What should I wear?", content: "Fitted clothes you can move in, without zips or buckles that catch on the equipment. Grip socks are required on the reformer; we sell them at the desk." },
    { id: 3, title: "I have an injury or back pain. Can I come?", content: "Often, yes — many people start Pilates for exactly that. Mark it on the intake form's body map. Your instructor adapts exercises, and for some conditions we may ask for a note from your doctor first." },
    { id: 4, title: "Is it safe during or after pregnancy?", content: "Tell us on the intake form. We adjust positions and intensity, and a private session is a good first step if you're unsure." },
    { id: 5, title: "How big are the classes?", content: maxReformer ? `Reformer classes are capped at ${maxReformer} people, so the instructor can correct each person.` : "Small. The instructor can correct each person." },
    { id: 6, title: "What if I need to cancel?", content: `Cancel free up to ${settings.cancellationWindowHours} hours before class. Later than that, the class credit is used.` },
  ];
  return (
    <section aria-labelledby="faq-title" className="grid gap-10 bg-paper px-5 py-10 sheet-shadow md:px-10 md:py-12 lg:grid-cols-[1fr_1.35fr]">
      <div>
        <FormHeading id="faq-title">Questions beginners ask</FormHeading>
        <div className="mt-6 flex items-start gap-2">
          <Hand as="p" className="text-[28px] leading-tight">ask us anything at the desk — no question is silly</Hand>
          <SquigglyArrow width={90} height={45} className="mt-4 hidden shrink-0 text-ballpoint lg:block" variant="smooth" strokeWidth={2} />
        </div>
      </div>
      <AccordionApp items={items} defaultOpen={1} />
    </section>
  );
}

/* ───────────────────────── Instructors ───────────────────────── */
function Instructors() {
  const lk = useLookups();
  const active = lk.instructors.filter((i) => i.active);
  return (
    <section aria-labelledby="team-title" className="bg-paper px-5 py-10 sheet-shadow md:px-10 md:py-12">
      <FormHeading id="team-title">Your instructors</FormHeading>
      <ul className="mt-2 grid sm:grid-cols-2 lg:grid-cols-3">
        {active.map((ins) => (
          <li key={ins.id} className="border-b border-rule py-6 sm:pr-8">
            <Hand as="p" className="text-[34px] leading-none" aria-hidden>{ins.name}</Hand>
            <div className="mt-1 border-t border-print pt-1.5">
              <p className="f-print text-[17px] font-bold text-print">{ins.name}</p>
              <span className="f-narrow text-[12px] font-semibold uppercase tracking-[0.1em] text-form">{ins.specialties.map((s) => CATEGORY_LABEL[s]).join(" · ")}</span>
            </div>
            {ins.bio && <p className="mt-3 max-w-[40ch] text-[15.5px] text-print-2">{ins.bio}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
