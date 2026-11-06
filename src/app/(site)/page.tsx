"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { ArrowDown, ArrowRight, ArrowUpRight, Clock, Plus, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BreathingOrb, MethodArt, Springs } from "@/components/site/art";
import { useCart } from "@/components/site/cart";
import { Counter, Marquee, Reveal, RiseText, useInView, useSpotlight, WordReveal } from "@/components/site/motion";
import { ReserveModal } from "@/components/site/reserve";
import { useToast } from "@/components/overlay";
import { db } from "@/lib/db";
import { useLookups, useNow, useSettings } from "@/lib/hooks";
import type { Session } from "@/lib/types";
import { CATEGORY_LABEL, EMPTY, EMPTY_MAP, LEVEL_LABEL, cn, money } from "@/lib/utils";

const TESTIMONIALS = [
  { q: "Six weeks in and my back pain is basically gone. The instructors notice everything.", n: "Rania, member since spring" },
  { q: "Small classes, real corrections. It feels like a private session every time.", n: "Daniel, reformer regular" },
  { q: "I came for core strength and stayed for the calm. Best hour of my week.", n: "Mila, Tuesday 7am crew" },
  { q: "Post-natal recovery done properly. They adapted every exercise for me.", n: "Sara, new mum" },
  { q: "As a runner I finally understand what 'engage your core' means.", n: "Omar, marathoner" },
  { q: "The studio is beautiful, quiet and spotless. I never want to leave.", n: "Grace, mat classes" },
];

const ORDER = ["reformer", "mat", "tower", "barre", "chair", "private", "other"];
const LEVELS = ["beginner", "all", "intermediate", "advanced"];
function sortTypes<T extends { category: string; level: string; name: string }>(list: T[]) {
  return [...list].sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category) || LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.name.localeCompare(b.name));
}

export default function Landing() {
  return (
    <>
      <Hero />
      <Manifesto />
      <Methods />
      <Numbers />
      <Team />
      <Timetable />
      <Pricing />
      <Voices />
      <FirstVisit />
    </>
  );
}

/* ───────────────────────── Hero ───────────────────────── */
function Hero() {
  const spot = useSpotlight<HTMLElement>();
  const lk = useLookups();
  const settings = useSettings();
  const names = sortTypes(lk.classTypes.filter((c) => c.active)).map((c) => c.name);
  return (
    <section
      ref={spot}
      className="relative flex min-h-[100svh] flex-col overflow-hidden bg-forest text-cream grain"
      style={{ backgroundImage: "radial-gradient(520px circle at var(--mx, 72%) var(--my, 42%), rgb(143 174 148 / .20), transparent 65%), radial-gradient(900px circle at 85% 110%, rgb(192 102 63 / .22), transparent 60%), radial-gradient(700px circle at -10% -10%, rgb(143 174 148 / .14), transparent 60%)" }}
    >
      <Springs className="absolute inset-0 h-full w-full opacity-70" />
      <div className="relative z-10 mx-auto grid w-full max-w-[1320px] flex-1 items-center gap-10 px-5 pt-32 pb-10 md:px-10 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-cream/15 bg-cream/5 px-4 py-1.5 text-[13px] text-cream/75 backdrop-blur" style={{ animation: "fade-in 1s both .1s" }}>
            <span className="size-1.5 animate-pulse rounded-full bg-moss" /> Reformer · Mat · Tower · Barre
          </div>
          <h1 className="font-display text-[clamp(3.4rem,9.5vw,8.6rem)] font-light leading-[0.9] tracking-[-0.03em]">
            <span className="block"><RiseText text="Strength," delay={150} /></span>
            <span className="block"><RiseText text="found" delay={420} /> <em className="font-normal text-moss"><RiseText text="slowly." delay={620} /></em></span>
          </h1>
          <p className="mt-8 max-w-md text-[17px] leading-relaxed text-cream/70" style={{ animation: "fade-in 1.2s both 1.1s" }}>
            Small-group Pilates where every rep is intentional. Ten reformers, expert hands-on teaching and a room built for breathing out.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3" style={{ animation: "fade-in 1.2s both 1.3s" }}>
            <Link href="/join" className="group inline-flex h-14 items-center gap-3 rounded-full bg-cream pl-7 pr-2 text-[15px] font-medium text-forest transition hover:bg-white">
              Book your first class
              <span className="grid size-10 place-items-center rounded-full bg-forest text-cream transition-transform duration-500 group-hover:rotate-45"><ArrowUpRight className="size-4" /></span>
            </Link>
            <a href="#timetable" className="inline-flex h-14 items-center gap-2 rounded-full border border-cream/20 px-6 text-[15px] font-medium text-cream/85 transition hover:border-cream/50 hover:text-cream">
              This week&apos;s classes
            </a>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[520px]" style={{ animation: "fade-in 2s both .4s" }}>
          <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full animate-spin-slow text-cream/40" aria-hidden>
            <defs><path id="ring" d="M200,200 m-182,0 a182,182 0 1,1 364,0 a182,182 0 1,1 -364,0" /></defs>
            <text fontSize="13" letterSpacing="6" fill="currentColor" style={{ textTransform: "uppercase" }}>
              <textPath href="#ring">breathe · centre · control · flow · precision · breathe · centre · control · flow · precision ·</textPath>
            </text>
          </svg>
          <BreathingOrb className="m-[11%]" />
        </div>
      </div>
      <div className="relative z-10 border-t border-cream/10 py-6">
        <Marquee duration={50}>
          {(names.length ? names : ["Reformer", "Mat", "Tower", "Barre"]).map((n) => (
            <span key={n} className="flex items-center gap-10 px-5 font-display text-4xl italic text-cream/35 md:text-5xl">
              {n}<span className="not-italic text-clay">✳</span>
            </span>
          ))}
        </Marquee>
      </div>
      <a href="#philosophy" className="absolute bottom-28 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-cream/50 md:flex">
        Scroll
        <span className="relative h-10 w-px overflow-hidden bg-cream/20"><span className="absolute inset-x-0 h-1/2 bg-cream" style={{ animation: "scroll-cue 2s ease-in-out infinite" }} /></span>
      </a>
      <span className="sr-only">{settings.studioName}</span>
    </section>
  );
}

/* ───────────────────────── Manifesto ───────────────────────── */
function Manifesto() {
  return (
    <section id="philosophy" className="relative mx-auto max-w-[1320px] px-5 py-32 md:px-10 md:py-48">
      <Reveal className="mb-10 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted"><span className="h-px w-10 bg-line-strong" /> Our philosophy</Reveal>
      <WordReveal
        className="max-w-5xl font-display text-[clamp(2rem,4.6vw,4.2rem)] font-light leading-[1.12] tracking-[-0.02em] text-ink"
        highlight={["less,", "breath", "calmer"]}
        text="Pilates isn't about doing more. It's about doing less, better — with control, breath and intention. Our classes are small, our teachers are obsessive about form, and every session leaves you longer, stronger and calmer than you arrived."
      />
    </section>
  );
}

/* ───────────────────────── Methods (sticky stack) ───────────────────────── */
function Methods() {
  const lk = useLookups();
  const types = sortTypes(lk.classTypes.filter((c) => c.active));
  const palettes = [
    { bg: "bg-forest", text: "text-cream", sub: "text-cream/65", chip: "border-cream/20 text-cream/80", art: "text-moss" },
    { bg: "bg-sand", text: "text-ink", sub: "text-ink-2", chip: "border-ink/15 text-ink-2", art: "text-forest" },
    { bg: "bg-surface", text: "text-ink", sub: "text-muted", chip: "border-line-strong text-ink-2", art: "text-clay" },
    { bg: "bg-[#c0663f]", text: "text-cream", sub: "text-cream/75", chip: "border-cream/25 text-cream/85", art: "text-cream" },
  ];
  return (
    <section id="methods" className="relative mx-auto max-w-[1320px] scroll-mt-20 px-5 pb-32 md:px-10">
      <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <Reveal>
          <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted"><span className="h-px w-10 bg-line-strong" /> The methods</div>
          <h2 className="font-display text-5xl font-light tracking-tight text-ink md:text-7xl">Find your <em className="text-clay">apparatus.</em></h2>
        </Reveal>
        <Reveal delay={150} className="max-w-sm text-muted">From your very first footwork series to advanced jumpboard — every format is taught in groups small enough for real corrections.</Reveal>
      </div>
      <div className="space-y-6">
        {types.map((c, i) => {
          const p = palettes[i % palettes.length];
          return <MethodCard key={c.id} i={i} c={c} p={p} total={types.length} />;
        })}
      </div>
    </section>
  );
}

function MethodCard({ i, c, p, total }: { i: number; total: number; c: ReturnType<typeof useLookups>["classTypes"][number]; p: { bg: string; text: string; sub: string; chip: string; art: string } }) {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.3 });
  return (
    <div ref={ref} className="sticky" style={{ top: `${96 + i * 22}px` }}>
      <article className={cn("relative grid min-h-[420px] overflow-hidden rounded-[2rem] p-8 shadow-[0_-12px_40px_-20px_rgb(27_34_30/.35)] md:grid-cols-[1fr_1.1fr] md:p-12", p.bg, p.text, inView && "in")}>
        <div className="relative z-10 flex flex-col">
          <div className={cn("font-display text-sm tnum", p.sub)}>{String(i + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</div>
          <h3 className="mt-6 font-display text-4xl font-light tracking-tight md:text-6xl">{c.name}</h3>
          <p className={cn("mt-5 max-w-md text-[16px] leading-relaxed", p.sub)}>{c.description}</p>
          <div className="mt-auto flex flex-wrap gap-2 pt-8">
            {[CATEGORY_LABEL[c.category], LEVEL_LABEL[c.level], `${c.duration} min`, `Max ${c.defaultCapacity}`].map((t) => (
              <span key={t} className={cn("rounded-full border px-3.5 py-1.5 text-[13px]", p.chip)}>{t}</span>
            ))}
          </div>
        </div>
        <div className={cn("relative mt-8 flex items-center justify-center md:mt-0", p.art)}>
          <MethodArt kind={c.category} className="w-full max-w-[520px]" />
        </div>
      </article>
    </div>
  );
}

/* ───────────────────────── Numbers ───────────────────────── */
function Numbers() {
  const lk = useLookups();
  const now = useNow();
  const weekSessions = useLiveQuery(() => db.sessions.where("start").between(startOfDay(now).toISOString(), addDays(startOfDay(now), 7).toISOString()).count(), [startOfDay(now).toISOString()]) ?? 0;
  const reformers = useLiveQuery(() => db.equipment.filter((e) => e.type === "reformer").count(), []) ?? 0;
  const maxSize = Math.max(0, ...lk.classTypes.filter((c) => c.category === "reformer").map((c) => c.defaultCapacity));
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.25 });
  const stats = [
    { v: weekSessions, l: "classes this week" },
    { v: reformers, l: "reformers in the studio" },
    { v: lk.instructors.filter((i) => i.active).length, l: "certified instructors" },
    { v: maxSize, l: "people max per reformer class" },
  ];
  return (
    <section className="relative overflow-hidden bg-forest py-28 text-cream grain md:py-36">
      <div ref={ref} className={cn("relative z-10 mx-auto max-w-[1320px] px-5 md:px-10", inView && "in")}>
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-cream/50"><span className="h-px w-10 bg-cream/25" /> The studio</div>
            <h2 className="font-display text-5xl font-light leading-[1.02] tracking-tight md:text-6xl">Built for <em className="text-moss">attention,</em><br />not volume.</h2>
            <div className="mt-14 grid grid-cols-2 gap-x-8 gap-y-10">
              {stats.map((s) => (
                <div key={s.l} className="border-t border-cream/15 pt-5">
                  <Counter to={s.v} className="font-display text-6xl font-light md:text-7xl" />
                  <div className="mt-2 text-sm text-cream/60">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-moss">
            <MethodArt kind="reformer" className="w-full" />
            <p className="mt-6 text-center text-xs uppercase tracking-[0.2em] text-cream/40">Balanced Body Allegro · spring-loaded resistance</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Team ───────────────────────── */
function Team() {
  const lk = useLookups();
  return (
    <section id="team" className="scroll-mt-20 py-28 md:py-40">
      <div className="mx-auto mb-12 flex max-w-[1320px] flex-col justify-between gap-6 px-5 md:flex-row md:items-end md:px-10">
        <Reveal>
          <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted"><span className="h-px w-10 bg-line-strong" /> The teachers</div>
          <h2 className="font-display text-5xl font-light tracking-tight text-ink md:text-7xl">Hands that <em className="text-clay">know.</em></h2>
        </Reveal>
        <Reveal delay={120} className="max-w-sm text-muted">Comprehensively certified, endlessly curious. Swipe to meet the people who&apos;ll be correcting your pelvis.</Reveal>
      </div>
      <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-6 [scrollbar-width:none]"
        style={{ paddingInline: "max(1.25rem, calc((100vw - 1320px) / 2 + 2.5rem))", scrollPaddingInline: "max(1.25rem, calc((100vw - 1320px) / 2 + 2.5rem))" }}>
        {lk.instructors.filter((i) => i.active).map((ins, idx) => (
          <Reveal key={ins.id} delay={idx * 90} variant="scale" className="snap-start">
            <article className="group relative flex h-[460px] w-[300px] shrink-0 flex-col overflow-hidden rounded-[2rem] p-7 text-cream md:w-[340px]"
              style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${ins.color} 92%, #fff) 0%, color-mix(in srgb, ${ins.color} 80%, #000) 100%)` }}>
              <div className="pointer-events-none absolute -right-8 -top-10 select-none font-display text-[220px] italic leading-none text-cream/12 transition-transform duration-700 group-hover:-translate-x-4 group-hover:scale-105">
                {ins.name.split(" ").map((s) => s[0]).join("")}
              </div>
              <div className="relative mt-auto">
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {ins.specialties.map((s) => <span key={s} className="rounded-full bg-cream/15 px-2.5 py-1 text-[11.5px] backdrop-blur">{CATEGORY_LABEL[s]}</span>)}
                </div>
                <h3 className="font-display text-3xl">{ins.name}</h3>
                <p className="mt-2 max-h-0 overflow-hidden text-sm leading-relaxed text-cream/80 opacity-0 transition-all duration-500 group-hover:max-h-40 group-hover:opacity-100 max-md:max-h-40 max-md:opacity-100">{ins.bio}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── Timetable ───────────────────────── */
function Timetable() {
  const lk = useLookups();
  const now = useNow(60_000);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(startOfDay(now), i)), [now]);
  const [day, setDay] = useState(0);
  const [reserve, setReserve] = useState<Session | null>(null);
  const from = days[0].toISOString(), to = addDays(days[6], 1).toISOString();
  const sessions = useLiveQuery(() => db.sessions.where("start").between(from, to).toArray(), [from]) ?? EMPTY;
  const counts = useLiveQuery(async () => {
    if (!sessions.length) return new Map<string, number>();
    const bs = await db.bookings.where("sessionId").anyOf(sessions.map((s) => s.id)).toArray();
    const m = new Map<string, number>();
    bs.forEach((b) => (b.status === "booked" || b.status === "checked_in") && m.set(b.sessionId, (m.get(b.sessionId) ?? 0) + 1));
    return m;
  }, [sessions]) ?? EMPTY_MAP;
  const list = sessions.filter((s) => !s.cancelled && isSameDay(new Date(s.start), days[day])).sort((a, b) => a.start.localeCompare(b.start));

  return (
    <section id="timetable" className="scroll-mt-20 bg-surface-2 py-28 md:py-36">
      <div className="mx-auto max-w-[1100px] px-5 md:px-10">
        <Reveal className="text-center">
          <div className="mb-4 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] text-muted"><span className="h-px w-10 bg-line-strong" /> Timetable <span className="h-px w-10 bg-line-strong" /></div>
          <h2 className="font-display text-5xl font-light tracking-tight text-ink md:text-7xl">This week on the <em className="text-clay">mat.</em></h2>
        </Reveal>
        <Reveal delay={100} className="mt-12 flex snap-x gap-2 overflow-x-auto pb-2 [scrollbar-width:none] md:justify-center">
          {days.map((d, i) => (
            <button key={d.toISOString()} onClick={() => setDay(i)}
              className={cn("flex min-w-[76px] snap-start flex-col items-center rounded-2xl border px-4 py-3 transition-all", i === day ? "border-forest bg-forest text-cream shadow-lg" : "border-line bg-surface text-ink-2 hover:border-line-strong")}>
              <span className={cn("text-[11px] uppercase tracking-wider", i === day ? "text-cream/60" : "text-muted")}>{i === 0 ? "Today" : format(d, "EEE")}</span>
              <span className="font-display text-2xl tnum">{format(d, "d")}</span>
            </button>
          ))}
        </Reveal>
        <div className="mt-10 overflow-hidden rounded-[1.75rem] border border-line bg-surface">
          {list.length === 0 && <div className="px-6 py-16 text-center text-muted">No classes scheduled — the studio is resting.</div>}
          <ul className="divide-y divide-line">
            {list.map((s) => {
              const ct = lk.classType.get(s.classTypeId);
              const ins = lk.instructor.get(s.instructorId);
              const n = counts.get(s.id) ?? 0;
              const left = s.capacity - n;
              const past = new Date(s.start) < now;
              return (
                <li key={s.id} className={cn("group grid grid-cols-[70px_1fr_auto] items-center gap-4 px-5 py-5 transition-colors hover:bg-surface-2 md:grid-cols-[110px_1fr_200px_160px_auto] md:px-8", past && "[&>*]:opacity-45")}>
                  <div>
                    <div className="font-display text-2xl text-ink tnum">{format(new Date(s.start), "h:mm")}</div>
                    <div className="text-xs uppercase text-muted">{format(new Date(s.start), "a")} · {s.duration}m</div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><span className="size-2 shrink-0 rounded-full" style={{ background: ct?.color }} /><span className="truncate text-[17px] font-medium text-ink">{ct?.name}</span></div>
                    <div className="mt-0.5 text-sm text-muted">{ct && LEVEL_LABEL[ct.level]} · {lk.room.get(s.roomId)?.name}<span className="md:hidden"> · {ins?.name}</span></div>
                  </div>
                  <div className="hidden text-sm text-ink-2 md:block">{ins?.name}</div>
                  <div className="hidden md:block">
                    <div className="mb-1.5 text-xs text-muted">{left <= 0 ? "Full — join waitlist" : left <= 2 ? <span className="text-clay">Only {left} left</span> : `${left} spots left`}</div>
                    <div className="h-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-forest" style={{ width: `${Math.min(100, (n / s.capacity) * 100)}%` }} /></div>
                  </div>
                  <button disabled={past} onClick={() => setReserve(s)}
                    className={cn("inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition", past ? "border border-line text-muted" : left <= 0 ? "border border-line-strong text-ink-2 hover:border-ink" : "bg-forest text-cream hover:bg-forest-2", "disabled:pointer-events-none")}>
                    {past ? "Done" : left <= 0 ? "Waitlist" : "Reserve"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <ReserveModal session={reserve} ct={reserve ? lk.classType.get(reserve.classTypeId) : undefined} ins={reserve ? lk.instructor.get(reserve.instructorId) : undefined} onClose={() => setReserve(null)} />
    </section>
  );
}

/* ───────────────────────── Pricing teaser ───────────────────────── */
function Pricing() {
  const plans = useLiveQuery(() => db.plans.filter((p) => p.active).toArray(), []) ?? EMPTY;
  const { add, setOpen } = useCart();
  const toast = useToast();
  const pick = [plans.find((p) => p.type === "intro"), plans.find((p) => p.popular), plans.find((p) => p.type === "unlimited")].filter(Boolean) as typeof plans;
  return (
    <section className="mx-auto max-w-[1320px] px-5 py-28 md:px-10 md:py-40">
      <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <Reveal>
          <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted"><span className="h-px w-10 bg-line-strong" /> Passes</div>
          <h2 className="font-display text-5xl font-light tracking-tight text-ink md:text-7xl">Simple, honest <em className="text-clay">pricing.</em></h2>
        </Reveal>
        <Reveal delay={100}><Link href="/shop" className="inline-flex items-center gap-2 text-[15px] font-medium text-ink underline-offset-4 hover:underline">Compare every pass <ArrowRight className="size-4" /></Link></Reveal>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {pick.map((p, i) => {
          const hero = !!p.popular;
          return (
            <Reveal key={p.id} delay={i * 110}>
              <article className={cn("group relative flex h-full flex-col rounded-[2rem] border p-8 transition-transform duration-500 hover:-translate-y-1.5", hero ? "border-forest bg-forest text-cream shadow-[0_30px_60px_-30px_rgb(29_47_39/.6)]" : "border-line bg-surface")}>
                {hero && <span className="absolute -top-3 left-8 inline-flex items-center gap-1 rounded-full bg-clay px-3 py-1 text-xs font-medium text-white"><Sparkles className="size-3" /> Most loved</span>}
                {p.type === "intro" && <span className="absolute -top-3 left-8 rounded-full bg-moss px-3 py-1 text-xs font-medium text-forest">New clients</span>}
                <h3 className="font-display text-2xl">{p.name}</h3>
                <p className={cn("mt-2 min-h-[48px] text-sm", hero ? "text-cream/70" : "text-muted")}>{p.description}</p>
                <div className="mt-8 font-display text-6xl font-light tnum">{money(p.price, { cents: false })}</div>
                <div className={cn("mt-1 text-sm", hero ? "text-cream/60" : "text-muted")}>
                  {p.credits == null ? `Unlimited classes · ${p.validityDays} days` : `${money(p.price / p.credits)} per class · valid ${p.validityDays} days`}
                </div>
                <button onClick={() => { add({ kind: "plan", id: p.id }); toast.success(`${p.name} added to your bag`); setOpen(true); }}
                  className={cn("mt-10 inline-flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-medium transition", hero ? "bg-cream text-forest hover:bg-white" : "bg-forest text-cream hover:bg-forest-2")}>
                  <Plus className="size-4" /> Add to bag
                </button>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* ───────────────────────── Voices ───────────────────────── */
function Voices() {
  const Card = ({ t }: { t: (typeof TESTIMONIALS)[number] }) => (
    <figure className="mx-2.5 w-[340px] shrink-0 rounded-[1.5rem] border border-line bg-surface p-6 md:w-[400px]">
      <blockquote className="font-display text-xl leading-snug text-ink">“{t.q}”</blockquote>
      <figcaption className="mt-4 text-sm text-muted">— {t.n}</figcaption>
    </figure>
  );
  return (
    <section className="space-y-5 overflow-hidden pb-28 md:pb-40">
      <Marquee duration={60}>{TESTIMONIALS.slice(0, 3).concat(TESTIMONIALS.slice(3)).map((t) => <Card key={t.n} t={t} />)}</Marquee>
      <Marquee duration={70} reverse>{[...TESTIMONIALS].reverse().map((t) => <Card key={t.n} t={t} />)}</Marquee>
    </section>
  );
}

/* ───────────────────────── First visit CTA ───────────────────────── */
function FirstVisit() {
  const steps = [
    { icon: <Users className="size-5" />, t: "Tell us about you", d: "A 3-minute intake form: goals, injuries and how you like to move." },
    { icon: <Sparkles className="size-5" />, t: "Pick the intro offer", d: "Three classes over two weeks — the gentlest way in." },
    { icon: <Clock className="size-5" />, t: "Arrive 10 minutes early", d: "We'll show you the reformer, set your springs and get you comfortable." },
  ];
  return (
    <section className="mx-auto max-w-[1320px] px-5 pb-28 md:px-10 md:pb-40">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[#c0663f] p-8 text-cream grain md:p-16">
        <div className="pointer-events-none absolute -right-24 -top-24 w-[520px] opacity-80 max-md:hidden"><BreathingOrb labels={false} /></div>
        <div className="relative z-10 max-w-2xl">
          <div className="mb-4 text-xs uppercase tracking-[0.2em] text-cream/70">Your first visit</div>
          <h2 className="font-display text-5xl font-light leading-[1.02] tracking-tight md:text-7xl">It all starts with <em>three minutes.</em></h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.t} delay={i * 120}>
                <div className="mb-3 grid size-11 place-items-center rounded-full bg-cream/15">{s.icon}</div>
                <div className="font-medium">{s.t}</div>
                <p className="mt-1 text-sm text-cream/75">{s.d}</p>
              </Reveal>
            ))}
          </div>
          <Link href="/join" className="group mt-12 inline-flex h-14 items-center gap-3 rounded-full bg-cream pl-7 pr-2 text-[15px] font-medium text-[#8c4527] transition hover:bg-white">
            Start your intake form
            <span className="grid size-10 place-items-center rounded-full bg-[#c0663f] text-cream transition-transform duration-500 group-hover:translate-x-1"><ArrowDown className="size-4 -rotate-90" /></span>
          </Link>
        </div>
      </div>
    </section>
  );
}
