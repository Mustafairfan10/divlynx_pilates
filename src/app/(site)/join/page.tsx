"use client";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, Footprints, HeartPulse, Leaf, Lock, Mountain, Pencil, ShoppingBag, Sprout, Trophy,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BreathingOrb } from "@/components/site/art";
import { BodyMap } from "@/components/site/body-map";
import { useCart } from "@/components/site/cart";
import { SignaturePad } from "@/components/site/signature-pad";
import { useToast } from "@/components/overlay";
import { Field, Input, Textarea } from "@/components/ui";
import { db } from "@/lib/db";
import { useSettings } from "@/lib/hooks";
import { submitIntake } from "@/lib/public";
import type { ClassCategory, Experience } from "@/lib/types";
import { cn } from "@/lib/utils";

type Draft = {
  firstName: string; lastName: string; email: string; phone: string; birthday: string; occupation: string;
  experience: Experience | ""; activityLevel: "" | "low" | "moderate" | "high";
  goals: string[]; interests: ClassCategory[]; preferredTimes: string[];
  injuries: string[]; conditions: string[]; noConditions: boolean; medications: string; bodyNotes: string;
  emergencyName: string; emergencyPhone: string; signatureName: string; signatureImage?: string; marketingOptIn: boolean; agree: boolean;
};
const BLANK: Draft = {
  firstName: "", lastName: "", email: "", phone: "", birthday: "", occupation: "",
  experience: "", activityLevel: "", goals: [], interests: [], preferredTimes: [],
  injuries: [], conditions: [], noConditions: false, medications: "", bodyNotes: "",
  emergencyName: "", emergencyPhone: "", signatureName: "", marketingOptIn: false, agree: false,
};
const DRAFT_KEY = "studio-intake-draft";

const STEPS = [
  { key: "you", label: "About you", title: "Hello.", sub: "Let's start with the basics, so we know who's walking in." },
  { key: "practice", label: "Your practice", title: "How do you move?", sub: "There are no wrong answers. Complete beginners are our favourite people." },
  { key: "body", label: "Your body", title: "Listen to your body.", sub: "Only your instructors see this. It helps us adapt every exercise and keep you safe." },
  { key: "consent", label: "Safety & consent", title: "Almost there.", sub: "An emergency contact and your signature on our studio waiver." },
  { key: "review", label: "Review", title: "One last look.", sub: "Check everything reads right, then send it to the studio." },
] as const;

const EXPERIENCE: { v: Experience; t: string; d: string; icon: ReactNode }[] = [
  { v: "new", t: "Brand new", d: "Never tried Pilates", icon: <Sprout className="size-5" /> },
  { v: "some", t: "A little", d: "A few classes or videos", icon: <Leaf className="size-5" /> },
  { v: "regular", t: "Regular", d: "I practise most weeks", icon: <Mountain className="size-5" /> },
  { v: "instructor", t: "Very experienced", d: "Advanced or certified", icon: <Trophy className="size-5" /> },
];
const GOALS = ["Core strength", "Posture", "Flexibility", "Rehab after injury", "Tone & sculpt", "Stress relief", "Athletic performance", "Pre/post-natal", "Balance"];
const INTERESTS: [ClassCategory, string][] = [["reformer", "Reformer"], ["mat", "Mat"], ["tower", "Tower"], ["barre", "Barre"], ["chair", "Chair"], ["private", "Private sessions"]];
const TIMES = ["Early (6–8am)", "Morning (8–11am)", "Midday (11am–2pm)", "Afternoon (2–5pm)", "Evening (5–8pm)", "Weekend"];
const CONDITIONS = [
  "Currently pregnant", "Given birth in the last 6 months", "Recent surgery (last 6 months)", "Heart condition",
  "High or low blood pressure", "Osteoporosis or osteopenia", "Diagnosed back or disc condition", "A doctor advised limiting exercise",
];

export default function JoinPage() {
  const settings = useSettings();
  const toast = useToast();
  const [d, setD] = useState<Draft>(BLANK);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ needsClearance: boolean } | null>(null);
  const [dir, setDir] = useState(1);
  const top = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  // Restore draft + prefill from link (e.g. after a shop order)
  useEffect(() => {
    let next = BLANK;
    try { const raw = localStorage.getItem(DRAFT_KEY); if (raw) next = { ...BLANK, ...JSON.parse(raw) }; } catch {}
    const q = new URLSearchParams(window.location.search);
    next = { ...next, email: q.get("email") ?? next.email, firstName: q.get("first") ?? next.firstName, lastName: q.get("last") ?? next.lastName };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setD(next);
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current || done) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, signatureImage: undefined })); } catch {}
  }, [d, done]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setD((x) => ({ ...x, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); };
  const toggle = <K extends "goals" | "interests" | "preferredTimes" | "conditions">(k: K, v: Draft[K][number]) => {
    const arr = d[k] as string[];
    set(k, (arr.includes(v as string) ? arr.filter((x) => x !== v) : [...arr, v]) as Draft[K]);
    if (k === "conditions") set("noConditions", false);
  };

  const validate = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!d.firstName.trim()) e.firstName = "Required";
      if (!d.lastName.trim()) e.lastName = "Required";
      if (!/^\S+@\S+\.\S+$/.test(d.email)) e.email = "Enter a valid email";
      if (d.phone.replace(/\D/g, "").length < 7) e.phone = "Enter a phone number";
    }
    if (s === 1) {
      if (!d.experience) e.experience = "Choose one";
      if (!d.activityLevel) e.activityLevel = "Choose one";
    }
    if (s === 2 && !d.noConditions && d.conditions.length === 0) e.conditions = "Select any that apply, or confirm none do";
    if (s === 3) {
      if (!d.emergencyName.trim()) e.emergencyName = "Required";
      if (d.emergencyPhone.replace(/\D/g, "").length < 7) e.emergencyPhone = "Enter a phone number";
      if (!d.signatureImage && !d.signatureName.trim()) e.signature = "Please sign or type your full name";
      if (!d.agree) e.agree = "Please accept the waiver to continue";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const go = (to: number) => {
    if (to > step && !validate(step)) { toast.error("A few details need your attention"); return; }
    setDir(to > step ? 1 : -1);
    setStep(to);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submit = async () => {
    for (let s = 0; s < 4; s++) if (!validate(s)) { setStep(s); toast.error("Please complete this step"); return; }
    setBusy(true);
    try {
      await submitIntake({
        firstName: d.firstName, lastName: d.lastName, email: d.email, phone: d.phone,
        birthday: d.birthday ? new Date(d.birthday + "T12:00:00").toISOString() : undefined,
        emergencyName: d.emergencyName, emergencyPhone: d.emergencyPhone,
        intake: {
          experience: d.experience as Experience, activityLevel: d.activityLevel as "low", goals: d.goals, interests: d.interests,
          preferredTimes: d.preferredTimes, injuries: d.injuries, conditions: d.conditions, medications: d.medications || undefined,
          bodyNotes: d.bodyNotes || undefined, occupation: d.occupation || undefined,
          signatureName: d.signatureName || `${d.firstName} ${d.lastName}`, signatureImage: d.signatureImage, marketingOptIn: d.marketingOptIn,
        },
      });
      try { localStorage.removeItem(DRAFT_KEY); localStorage.setItem("studio-email", d.email); } catch {}
      setDone({ needsClearance: d.conditions.length > 0 });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error("Could not send your form", e instanceof Error ? e.message : undefined);
    } finally { setBusy(false); }
  };

  const S = STEPS[step];
  return (
    <div ref={top} className="mx-auto max-w-[1320px] scroll-mt-24 px-4 pt-24 pb-24 md:px-10 md:pt-28">
      <div className="grid gap-6 lg:grid-cols-[minmax(340px,440px)_1fr] lg:gap-10">
        {/* Immersive side panel */}
        <aside className="relative overflow-hidden rounded-[2rem] bg-forest p-7 text-cream grain md:p-10 lg:sticky lg:top-24 lg:h-[calc(100dvh-8rem)]"
          style={{ backgroundImage: "radial-gradient(500px circle at 80% 10%, rgb(143 174 148 / .25), transparent 60%), radial-gradient(500px circle at 0% 100%, rgb(192 102 63 / .25), transparent 60%)" }}>
          <div className="relative z-10 flex h-full flex-col">
            <div className="text-xs uppercase tracking-[0.2em] text-cream/50">{done ? "Complete" : `First visit · Step ${step + 1} of ${STEPS.length}`}</div>
            <div key={done ? "done" : step} style={{ animation: "fade-in .6s both" }}>
              <h1 className="mt-4 font-display text-4xl font-light leading-[1] tracking-tight md:text-6xl lg:mt-5">{done ? <>Welcome <em className="text-moss">in.</em></> : S.title}</h1>
              <p className="mt-4 max-w-sm text-cream/70">{done ? "Your details are with the studio. We can't wait to meet you." : S.sub}</p>
            </div>
            <div className="relative mx-auto my-8 w-full max-w-[240px] max-lg:hidden [@media(max-height:820px)]:hidden"><BreathingOrb /></div>
            <ol className="mt-8 space-y-1 max-lg:hidden lg:mt-auto">
              {STEPS.map((s, i) => {
                const state = done || i < step ? "done" : i === step ? "now" : "next";
                return (
                  <li key={s.key}>
                    <button disabled={!!done || i > step} onClick={() => go(i)} className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm transition enabled:hover:bg-cream/5">
                      <span className={cn("grid size-6 place-items-center rounded-full border text-[11px] transition-all",
                        state === "done" ? "border-moss bg-moss text-forest" : state === "now" ? "border-cream bg-cream text-forest" : "border-cream/25 text-cream/40")}>
                        {state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                      </span>
                      <span className={cn(state === "next" ? "text-cream/40" : "text-cream")}>{s.label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="mt-6 flex items-center gap-2 text-xs text-cream/45 max-lg:mt-4"><Lock className="size-3.5" /> Stored privately with {settings.studioName}. Never shared.</div>
          </div>
        </aside>

        {/* Form */}
        <section className="min-w-0">
          {!done && (
            <div className="mb-6 h-1 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-clay transition-[width] duration-700 ease-out" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
            </div>
          )}
          <div key={done ? "done" : step} className="rounded-[2rem] border border-line bg-surface p-6 shadow-[0_30px_60px_-40px_rgb(27_34_30/.35)] md:p-10"
            style={{ animation: `${dir > 0 ? "rise" : "fade-in"} .55s cubic-bezier(.2,.7,.2,1) both` }}>
            {done ? <Welcome name={d.firstName} needsClearance={done.needsClearance} /> : (
              <>
                {step === 0 && (
                  <div className="space-y-8">
                    <Group title="Your details">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <F label="First name" err={errors.firstName}><Input autoFocus value={d.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="given-name" /></F>
                        <F label="Last name" err={errors.lastName}><Input value={d.lastName} onChange={(e) => set("lastName", e.target.value)} autoComplete="family-name" /></F>
                        <F label="Email" err={errors.email}><Input type="email" value={d.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" /></F>
                        <F label="Mobile" err={errors.phone}><Input type="tel" value={d.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" /></F>
                        <F label="Date of birth" optional><Input type="date" value={d.birthday} onChange={(e) => set("birthday", e.target.value)} /></F>
                        <F label="Occupation" optional hint="Helps us understand daily posture — desk, standing, lifting."><Input value={d.occupation} onChange={(e) => set("occupation", e.target.value)} /></F>
                      </div>
                    </Group>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-10">
                    <Group title="Pilates experience" err={errors.experience}>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {EXPERIENCE.map((x) => (
                          <Choice key={x.v} on={d.experience === x.v} onClick={() => set("experience", x.v)} icon={x.icon} title={x.t} desc={x.d} />
                        ))}
                      </div>
                    </Group>
                    <Group title="How active are you day to day?" err={errors.activityLevel}>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {([["low", "Gently", "Mostly seated"], ["moderate", "Moderately", "Walks, some exercise"], ["high", "Very", "Train 4+ times a week"]] as const).map(([v, t, s]) => (
                          <Choice key={v} on={d.activityLevel === v} onClick={() => set("activityLevel", v)} icon={<Footprints className="size-5" />} title={t} desc={s} />
                        ))}
                      </div>
                    </Group>
                    <Group title="What would you like from Pilates?" hint="Choose as many as you like">
                      <Chips options={GOALS} value={d.goals} onToggle={(v) => toggle("goals", v)} />
                    </Group>
                    <Group title="Classes you're curious about">
                      <Chips options={INTERESTS.map(([, l]) => l)} value={d.interests.map((v) => INTERESTS.find(([k]) => k === v)![1])}
                        onToggle={(l) => toggle("interests", INTERESTS.find(([, x]) => x === l)![0])} />
                    </Group>
                    <Group title="When do you prefer to train?">
                      <Chips options={TIMES} value={d.preferredTimes} onToggle={(v) => toggle("preferredTimes", v)} />
                    </Group>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-10">
                    <Group title="Any areas that are sore, injured or sensitive?">
                      <BodyMap value={d.injuries} onChange={(v) => set("injuries", v)} />
                    </Group>
                    <Group title="Do any of these apply to you?" err={errors.conditions}>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {CONDITIONS.map((c) => {
                          const on = d.conditions.includes(c);
                          return (
                            <button key={c} type="button" onClick={() => toggle("conditions", c)} aria-pressed={on}
                              className={cn("flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition", on ? "border-clay bg-clay-soft text-ink" : "border-line bg-surface text-ink-2 hover:border-line-strong")}>
                              <span className={cn("grid size-5 shrink-0 place-items-center rounded-md border transition", on ? "border-clay bg-clay text-white" : "border-line-strong")}>{on && <Check className="size-3.5" strokeWidth={3} />}</span>
                              {c}
                            </button>
                          );
                        })}
                      </div>
                      <button type="button" onClick={() => { set("noConditions", !d.noConditions); if (!d.noConditions) set("conditions", []); }} aria-pressed={d.noConditions}
                        className={cn("mt-3 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition", d.noConditions ? "border-accent bg-accent-soft text-ink" : "border-dashed border-line-strong text-ink-2 hover:border-ink/40")}>
                        <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border", d.noConditions ? "border-accent bg-accent text-accent-ink" : "border-line-strong")}>{d.noConditions && <Check className="size-3.5" strokeWidth={3} />}</span>
                        None of these apply to me
                      </button>
                      {d.conditions.length > 0 && (
                        <div className="mt-4 flex gap-3 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-ink-2" style={{ animation: "fade-in .4s both" }}>
                          <HeartPulse className="mt-0.5 size-4 shrink-0 text-clay" />
                          Thank you for telling us. We may ask for a note from your doctor before your first class — your instructor will be in touch.
                        </div>
                      )}
                    </Group>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <F label="Medications that affect exercise" optional><Textarea value={d.medications} onChange={(e) => set("medications", e.target.value)} placeholder="e.g. blood thinners, beta blockers" /></F>
                      <F label="Anything else we should know?" optional><Textarea value={d.bodyNotes} onChange={(e) => set("bodyNotes", e.target.value)} placeholder="Old injuries, hypermobility, how your body feels in the morning…" /></F>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-10">
                    <Group title="Emergency contact">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <F label="Full name" err={errors.emergencyName}><Input value={d.emergencyName} onChange={(e) => set("emergencyName", e.target.value)} /></F>
                        <F label="Phone" err={errors.emergencyPhone}><Input type="tel" value={d.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} /></F>
                      </div>
                    </Group>
                    <Group title="Studio waiver">
                      <div className="max-h-48 overflow-y-auto rounded-2xl border border-line bg-surface-2 p-5 text-sm leading-relaxed text-ink-2">
                        <p>I understand that Pilates involves physical exercise and that, as with any exercise, there is a risk of injury. I confirm that the information I have provided is accurate and that I will tell my instructor about any changes to my health.</p>
                        <p className="mt-3">I agree to work within my own limits, to stop and inform my instructor if I feel pain, dizziness or discomfort, and to follow the instructor&apos;s guidance on the safe use of equipment.</p>
                        <p className="mt-3">I accept the studio&apos;s booking policy: cancellations made less than {settings.cancellationWindowHours} hours before a class may forfeit the class credit. I release {settings.studioName}, its owners and instructors from liability for injury except where caused by negligence.</p>
                      </div>
                    </Group>
                    <Group title="Your signature" err={errors.signature}>
                      <SignaturePad value={d.signatureImage} onChange={(v) => set("signatureImage", v)} />
                      <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                        <F label="Type your full name" hint="Used as your signature if you prefer not to draw.">
                          <Input value={d.signatureName} onChange={(e) => { set("signatureName", e.target.value); setErrors((x) => ({ ...x, signature: "" })); }} placeholder={`${d.firstName} ${d.lastName}`.trim()} className="font-display text-lg italic" />
                        </F>
                        <div className="pb-2 text-sm text-muted">{new Date().toLocaleDateString(settings.locale, { day: "numeric", month: "long", year: "numeric" })}</div>
                      </div>
                    </Group>
                    <div className="space-y-3">
                      <Check2 on={d.agree} onClick={() => set("agree", !d.agree)} err={errors.agree}>I have read and agree to the studio waiver and booking policy.</Check2>
                      <Check2 on={d.marketingOptIn} onClick={() => set("marketingOptIn", !d.marketingOptIn)}>Send me occasional news about new classes and workshops.</Check2>
                    </div>
                  </div>
                )}

                {step === 4 && <Review d={d} onEdit={(s) => go(s)} />}

                <div className="mt-10 flex items-center justify-between gap-3 border-t border-line pt-6">
                  {step > 0 ? (
                    <button onClick={() => go(step - 1)} className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-medium text-ink-2 hover:bg-bg-elev"><ArrowLeft className="size-4" /> Back</button>
                  ) : <span className="text-xs text-muted">Your progress saves automatically on this device.</span>}
                  {step < STEPS.length - 1 ? (
                    <button onClick={() => go(step + 1)} className="group inline-flex h-12 items-center gap-2 rounded-full bg-forest pl-6 pr-2 text-sm font-medium text-cream transition hover:bg-forest-2">
                      Continue <span className="grid size-8 place-items-center rounded-full bg-cream/15 transition-transform group-hover:translate-x-0.5"><ArrowRight className="size-4" /></span>
                    </button>
                  ) : (
                    <button onClick={submit} disabled={busy} className="group inline-flex h-12 items-center gap-2 rounded-full bg-clay pl-6 pr-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60">
                      {busy ? "Sending…" : "Send to the studio"} <span className="grid size-8 place-items-center rounded-full bg-white/20"><Check className="size-4" /></span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ───────── Pieces ───────── */
function Group({ title, hint, err, children }: { title: string; hint?: string; err?: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-4 flex w-full items-baseline justify-between gap-3">
        <span className="font-display text-2xl text-ink">{title}</span>
        {err ? <span className="text-sm text-bad" role="alert">{err}</span> : hint ? <span className="text-sm text-muted">{hint}</span> : null}
      </legend>
      {children}
    </fieldset>
  );
}

function F({ label, err, optional, hint, children }: { label: string; err?: string; optional?: boolean; hint?: string; children: ReactNode }) {
  return (
    <Field label={label} hint={err ? <span className="text-bad">{err}</span> : hint ?? (optional ? "Optional" : undefined)}>
      <div className={cn(err && "[&_input]:border-bad [&_textarea]:border-bad")}>{children}</div>
    </Field>
  );
}

function Choice({ on, onClick, icon, title, desc }: { on: boolean; onClick: () => void; icon: ReactNode; title: string; desc: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={cn("group relative flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-300", on ? "border-forest bg-forest text-cream shadow-lg" : "border-line bg-surface hover:-translate-y-0.5 hover:border-line-strong")}>
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl transition", on ? "bg-cream/15 text-cream" : "bg-accent-soft text-accent")}>{icon}</span>
      <span>
        <span className="block font-medium">{title}</span>
        <span className={cn("block text-sm", on ? "text-cream/70" : "text-muted")}>{desc}</span>
      </span>
      {on && <span className="absolute right-4 top-4 grid size-5 place-items-center rounded-full bg-moss text-forest" style={{ animation: "check-pop .35s both" }}><Check className="size-3" strokeWidth={3} /></span>}
    </button>
  );
}

function Chips({ options, value, onToggle }: { options: string[]; value: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" onClick={() => onToggle(o)} aria-pressed={on}
            className={cn("inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-all", on ? "border-forest bg-forest text-cream" : "border-line bg-surface text-ink-2 hover:border-line-strong")}>
            {on && <Check className="size-3.5" strokeWidth={3} />}{o}
          </button>
        );
      })}
    </div>
  );
}

function Check2({ on, onClick, children, err }: { on: boolean; onClick: () => void; children: ReactNode; err?: string }) {
  return (
    <div>
      <button type="button" onClick={onClick} aria-pressed={on} className="flex items-start gap-3 text-left text-sm text-ink-2">
        <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition", on ? "border-forest bg-forest text-cream" : err ? "border-bad" : "border-line-strong")}>{on && <Check className="size-3.5" strokeWidth={3} />}</span>
        {children}
      </button>
      {err && <div className="ml-8 mt-1 text-sm text-bad" role="alert">{err}</div>}
    </div>
  );
}

function Review({ d, onEdit }: { d: Draft; onEdit: (step: number) => void }) {
  const rows: [string, number, [string, string][]][] = [
    ["About you", 0, [["Name", `${d.firstName} ${d.lastName}`], ["Email", d.email], ["Mobile", d.phone], ["Date of birth", d.birthday || "—"], ["Occupation", d.occupation || "—"]]],
    ["Your practice", 1, [["Experience", EXPERIENCE.find((x) => x.v === d.experience)?.t ?? "—"], ["Activity", d.activityLevel || "—"], ["Goals", d.goals.join(", ") || "—"],
      ["Interested in", d.interests.map((v) => INTERESTS.find(([k]) => k === v)?.[1]).join(", ") || "—"], ["Preferred times", d.preferredTimes.join(", ") || "—"]]],
    ["Your body", 2, [["Sensitive areas", d.injuries.join(", ") || "None"], ["Conditions", d.conditions.join(", ") || "None"], ["Medications", d.medications || "—"], ["Notes", d.bodyNotes || "—"]]],
    ["Safety & consent", 3, [["Emergency contact", `${d.emergencyName} · ${d.emergencyPhone}`], ["Signed", d.signatureImage ? "Drawn signature" : d.signatureName], ["Waiver", d.agree ? "Accepted" : "Not accepted"]]],
  ];
  return (
    <div className="space-y-5">
      {rows.map(([title, s, items]) => (
        <div key={title} className="rounded-2xl border border-line p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-xl text-ink">{title}</h3>
            <button onClick={() => onEdit(s)} className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"><Pencil className="size-3.5" /> Edit</button>
          </div>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {items.map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="mt-0.5 text-ink first-letter:uppercase">{v}</dd></div>)}
          </dl>
          {s === 3 && d.signatureImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.signatureImage} alt="Your signature" className="mt-4 h-20 rounded-xl border border-line bg-surface-2 object-contain" />
          )}
        </div>
      ))}
    </div>
  );
}

function Welcome({ name, needsClearance }: { name: string; needsClearance: boolean }) {
  const intro = useLiveQuery(() => db.plans.filter((p) => p.active && p.type === "intro").first(), []);
  const { add, setOpen } = useCart();
  return (
    <div className="py-4 text-center">
      <div className="relative mx-auto mb-8 grid size-24 place-items-center">
        <span className="absolute inset-0 rounded-full bg-moss/40" style={{ animation: "ripple 2s ease-out infinite" }} />
        <span className="absolute inset-0 rounded-full bg-moss/30" style={{ animation: "ripple 2s ease-out infinite .6s" }} />
        <svg viewBox="0 0 96 96" className="relative size-24">
          <circle cx="48" cy="48" r="46" fill="var(--forest)" style={{ animation: "check-pop .6s both" }} />
          <path d="M30 49 l12 12 l24 -26" fill="none" stroke="#f3ede3" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="draw-path in" style={{ "--len": 70, "--d": "300ms", animationDuration: ".9s" } as React.CSSProperties} />
        </svg>
      </div>
      <h2 className="font-display text-4xl font-light text-ink md:text-5xl">Lovely to meet you, <em className="text-clay">{name}.</em></h2>
      <p className="mx-auto mt-3 max-w-md text-muted">Your intake form is with our instructors. Here&apos;s how to take the next step.</p>
      {needsClearance && (
        <div className="mx-auto mt-6 flex max-w-lg gap-3 rounded-2xl bg-warn-soft p-4 text-left text-sm text-ink-2">
          <HeartPulse className="mt-0.5 size-5 shrink-0 text-clay" />
          Because of the health information you shared, an instructor will contact you before your first class. You may need a short note from your doctor.
        </div>
      )}
      <div className="mt-10 grid gap-3 text-left md:grid-cols-3">
        {intro && (
          <button onClick={() => { add({ kind: "plan", id: intro.id }); setOpen(true); }} className="group rounded-2xl bg-forest p-5 text-cream transition hover:-translate-y-1">
            <ShoppingBag className="size-5 text-moss" />
            <div className="mt-4 font-medium">Grab the intro offer</div>
            <p className="mt-1 text-sm text-cream/70">{intro.name}</p>
            <ArrowRight className="mt-4 size-4 transition-transform group-hover:translate-x-1" />
          </button>
        )}
        <Link href="/#timetable" className="group rounded-2xl border border-line bg-surface-2 p-5 transition hover:-translate-y-1">
          <CalendarDays className="size-5 text-accent" />
          <div className="mt-4 font-medium text-ink">Pick your first class</div>
          <p className="mt-1 text-sm text-muted">Browse this week&apos;s timetable.</p>
          <ArrowRight className="mt-4 size-4 text-ink transition-transform group-hover:translate-x-1" />
        </Link>
        <div className="rounded-2xl border border-line bg-surface-2 p-5">
          <Footprints className="size-5 text-clay" />
          <div className="mt-4 font-medium text-ink">What to bring</div>
          <p className="mt-1 text-sm text-muted">Grip socks, water and comfy fitted clothes. Arrive 10 minutes early.</p>
        </div>
      </div>
    </div>
  );
}
