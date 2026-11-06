"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { Lock } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { BodyMap } from "@/components/site/body-map";
import { useCart } from "@/components/site/cart";
import { CheckBox, FormHeading, Hand, HiliteButton, Label, LineInput, PenButton, PenLink, Stamp, Tick } from "@/components/site/paper";
import { SignaturePad } from "@/components/site/signature-pad";
import { useToast } from "@/components/overlay";
import { Textarea } from "@/components/ui";
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
  { key: "you", label: "About you", note: "just the basics — so we know who's coming in" },
  { key: "practice", label: "Your practice", note: "total beginners are our favourite people" },
  { key: "body", label: "Your body", note: "only your instructors see this. it's how we keep you safe" },
  { key: "consent", label: "Safety & consent", note: "an emergency contact and your signature" },
  { key: "review", label: "Check & send", note: "read it through, then send it to the studio" },
] as const;
const LETTERS = ["A", "B", "C", "D", "E"];

const EXPERIENCE: { v: Experience; t: string; d: string }[] = [
  { v: "new", t: "Never tried it", d: "Brand new to Pilates" },
  { v: "some", t: "A little", d: "A few classes or videos" },
  { v: "regular", t: "Regularly", d: "Most weeks" },
  { v: "instructor", t: "A lot", d: "Advanced or certified" },
];
const ACTIVITY: { v: Draft["activityLevel"]; t: string; d: string }[] = [
  { v: "low", t: "Gently", d: "Mostly sitting" },
  { v: "moderate", t: "Moderately", d: "Walks, some exercise" },
  { v: "high", t: "Very", d: "Train 4+ times a week" },
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
  const [done, setDone] = useState<{ needsClearance: boolean; at: Date } | null>(null);
  const top = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

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
      if (!d.firstName.trim()) e.firstName = "Add your first name";
      if (!d.lastName.trim()) e.lastName = "Add your last name";
      if (!/^\S+@\S+\.\S+$/.test(d.email)) e.email = "Enter an email like name@example.com";
      if (d.phone.replace(/\D/g, "").length < 7) e.phone = "Add a number we can reach you on";
    }
    if (s === 1) {
      if (!d.experience) e.experience = "Tick one";
      if (!d.activityLevel) e.activityLevel = "Tick one";
    }
    if (s === 2 && !d.noConditions && d.conditions.length === 0) e.conditions = "Tick any that apply, or the last box if none do";
    if (s === 3) {
      if (!d.emergencyName.trim()) e.emergencyName = "Add a contact name";
      if (d.emergencyPhone.replace(/\D/g, "").length < 7) e.emergencyPhone = "Add their phone number";
      if (!d.signatureImage && !d.signatureName.trim()) e.signature = "Sign above, or type your full name";
      if (!d.agree) e.agree = "Please confirm you agree to the waiver";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const go = (to: number) => {
    if (to > step && !validate(step)) { toast.error("A few answers are missing", "They're marked on the form."); return; }
    setStep(to);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submit = async () => {
    for (let s = 0; s < 4; s++) if (!validate(s)) { setStep(s); toast.error("This section needs another look"); return; }
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
      setDone({ needsClearance: d.conditions.length > 0, at: new Date() });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error("We couldn't send your form", e instanceof Error ? e.message : "Your answers are still saved here. Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <div ref={top} className="mx-auto max-w-[1240px] scroll-mt-20 px-4 pt-6 pb-14 md:px-8 md:pt-10">
      <section aria-labelledby="intake-title" className="bg-paper sheet-shadow">
        {/* Printed header */}
        <div className="grid grid-cols-2 border-b-[1.5px] border-print text-[14px] md:grid-cols-[1.7fr_0.8fr_1fr_1fr]">
          <div className="col-span-2 flex items-end px-5 py-5 md:col-span-1 md:px-8">
            <h1 id="intake-title" className="f-wide text-[clamp(1.9rem,4.4vw,3.4rem)] font-black uppercase leading-[0.95] tracking-[-0.03em] text-print">Client intake form</h1>
          </div>
          <div className="border-t border-rule px-5 py-3 md:border-t-0 md:border-l md:px-6">
            <span className="f-narrow block text-[11.5px] font-semibold uppercase tracking-[0.1em] text-form">Form</span>
            <span className="f-print mt-1 block font-bold text-print">DP-2</span>
          </div>
          <div className="order-last col-span-2 border-t border-rule px-5 py-3 md:order-none md:col-span-1 md:border-t-0 md:border-l md:px-6">
            <span className="f-narrow block text-[11.5px] font-semibold uppercase tracking-[0.1em] text-form">Date</span>
            <Hand className="whitespace-nowrap text-[26px] leading-tight">{format(new Date(), "d MMMM yyyy")}</Hand>
          </div>
          <div className="border-t border-l border-rule px-5 py-3 md:border-t-0 md:px-6">
            <span className="f-narrow block text-[11.5px] font-semibold uppercase tracking-[0.1em] text-form">Office use</span>
            {done ? <Stamp rot={-6} className="mt-1 text-[13px]">Received {format(done.at, "d MMM")}</Stamp> : <span className="mt-1 block text-[14px] text-muted">Received by ______</span>}
          </div>
        </div>

        {/* Section tabs */}
        <ol className="grid grid-cols-5 border-b-[1.5px] border-print">
          {STEPS.map((s, i) => {
            const state = done || i < step ? "done" : i === step ? "now" : "next";
            return (
              <li key={s.key} className={cn(i > 0 && "border-l border-rule")}>
                <button disabled={!!done || i > step} onClick={() => go(i)} aria-current={state === "now" ? "step" : undefined}
                  className={cn("flex w-full items-center gap-2.5 px-3 py-3 text-left transition-colors md:px-5", state === "now" && "bg-ballpoint-soft", state === "next" && "text-muted", "enabled:hover:bg-ballpoint-soft")}>
                  <span className={cn("relative grid size-7 shrink-0 place-items-center border-[1.5px] text-[13px] font-bold", state === "next" ? "border-rule-strong" : "border-print")}>
                    {state === "done" ? <Tick className="absolute -left-1 -top-2 size-9" /> : LETTERS[i]}
                  </span>
                  <span className={cn("f-narrow hidden text-[13px] font-semibold uppercase tracking-[0.08em] md:inline", state === "next" ? "text-muted" : "text-print")}>{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="grid lg:grid-cols-[1fr_300px]">
          <div className="px-5 py-8 md:px-10 md:py-10" key={done ? "done" : step} style={{ animation: "slip-in .35s cubic-bezier(.2,.8,.2,1) both" }}>
            {done ? <Received name={d.firstName} needsClearance={done.needsClearance} /> : (
              <>
                <FormHeading>{LETTERS[step]}. {STEPS[step].label}</FormHeading>
                <div className="mt-8">
                  {step === 0 && (
                    <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
                      <F id="firstName" label="First name" err={errors.firstName}><LineInput id="firstName" autoFocus value={d.firstName} invalid={!!errors.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="given-name" /></F>
                      <F id="lastName" label="Last name" err={errors.lastName}><LineInput id="lastName" value={d.lastName} invalid={!!errors.lastName} onChange={(e) => set("lastName", e.target.value)} autoComplete="family-name" /></F>
                      <F id="email" label="Email" err={errors.email}><LineInput id="email" type="email" value={d.email} invalid={!!errors.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" /></F>
                      <F id="phone" label="Mobile" err={errors.phone}><LineInput id="phone" type="tel" value={d.phone} invalid={!!errors.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" /></F>
                      <F id="birthday" label="Date of birth" hint="Optional"><LineInput id="birthday" type="date" value={d.birthday} onChange={(e) => set("birthday", e.target.value)} /></F>
                      <F id="occupation" label="Occupation" hint="Optional — desk, on your feet, lifting? It tells us about your posture."><LineInput id="occupation" value={d.occupation} onChange={(e) => set("occupation", e.target.value)} /></F>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="space-y-10">
                      <Group title="How much Pilates have you done?" err={errors.experience}>
                        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                          {EXPERIENCE.map((x) => (
                            <CheckBox key={x.v} checked={d.experience === x.v} invalid={!!errors.experience} onChange={() => set("experience", x.v)}>
                              <span className="font-semibold text-print">{x.t}</span> <span className="text-muted">— {x.d}</span>
                            </CheckBox>
                          ))}
                        </div>
                      </Group>
                      <Group title="How active are you day to day?" err={errors.activityLevel}>
                        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
                          {ACTIVITY.map((x) => (
                            <CheckBox key={x.v} checked={d.activityLevel === x.v} invalid={!!errors.activityLevel} onChange={() => set("activityLevel", x.v)}>
                              <span className="font-semibold text-print">{x.t}</span> <span className="text-muted">— {x.d}</span>
                            </CheckBox>
                          ))}
                        </div>
                      </Group>
                      <Group title="What would you like from Pilates?" hint="Circle any">
                        <Circles options={GOALS} value={d.goals} onToggle={(v) => toggle("goals", v)} />
                      </Group>
                      <Group title="Which classes are you curious about?" hint="Circle any">
                        <Circles options={INTERESTS.map(([, l]) => l)} value={d.interests.map((v) => INTERESTS.find(([k]) => k === v)![1])}
                          onToggle={(l) => toggle("interests", INTERESTS.find(([, x]) => x === l)![0])} />
                      </Group>
                      <Group title="When do you prefer to come?" hint="Circle any">
                        <Circles options={TIMES} value={d.preferredTimes} onToggle={(v) => toggle("preferredTimes", v)} />
                      </Group>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-12">
                      <Group title="Shade anywhere that's sore, injured or sensitive" hint="Leave blank if nothing bothers you">
                        <BodyMap value={d.injuries} onChange={(v) => set("injuries", v)} />
                      </Group>
                      <Group title="Do any of these apply to you?" err={errors.conditions}>
                        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                          {CONDITIONS.map((c) => (
                            <CheckBox key={c} checked={d.conditions.includes(c)} invalid={!!errors.conditions} onChange={() => toggle("conditions", c)}>{c}</CheckBox>
                          ))}
                        </div>
                        <div className="mt-5 border-t border-rule pt-5">
                          <CheckBox checked={d.noConditions} invalid={!!errors.conditions} onChange={(v) => { set("noConditions", v); if (v) set("conditions", []); }}>
                            <span className="font-semibold text-print">None of these apply to me</span>
                          </CheckBox>
                        </div>
                        {d.conditions.length > 0 && (
                          <p className="mt-5 max-w-[60ch] border-l-0 bg-pink px-4 py-3 text-[15.5px] text-print-2">
                            Thank you for telling us. An instructor will contact you before your first class, and we may ask for a short note from your doctor.
                          </p>
                        )}
                      </Group>
                      <div className="grid gap-8 sm:grid-cols-2">
                        <F id="meds" label="Medication that affects exercise" hint="Optional — e.g. blood thinners, beta blockers">
                          <Textarea id="meds" value={d.medications} onChange={(e) => set("medications", e.target.value)} className="min-h-[96px] rounded-none border-0 border-b-[1.5px] border-rule-strong bg-transparent px-0.5 text-ballpoint shadow-none focus:border-ballpoint focus:ring-0" />
                        </F>
                        <F id="notes" label="Anything else we should know?" hint="Optional — old injuries, hypermobility, how mornings feel">
                          <Textarea id="notes" value={d.bodyNotes} onChange={(e) => set("bodyNotes", e.target.value)} className="min-h-[96px] rounded-none border-0 border-b-[1.5px] border-rule-strong bg-transparent px-0.5 text-ballpoint shadow-none focus:border-ballpoint focus:ring-0" />
                        </F>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-10">
                      <Group title="Emergency contact">
                        <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
                          <F id="ecName" label="Full name" err={errors.emergencyName}><LineInput id="ecName" value={d.emergencyName} invalid={!!errors.emergencyName} onChange={(e) => set("emergencyName", e.target.value)} /></F>
                          <F id="ecPhone" label="Phone" err={errors.emergencyPhone}><LineInput id="ecPhone" type="tel" value={d.emergencyPhone} invalid={!!errors.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} /></F>
                        </div>
                      </Group>
                      <Group title="Studio waiver">
                        <div className="ruled max-h-56 overflow-y-auto border-[1.5px] border-print bg-paper px-5 py-3 text-[15.5px] leading-[2rem] text-print-2 [--rule-gap:2rem]">
                          <p>I understand that Pilates involves physical exercise and that, as with any exercise, there is a risk of injury. The information I have given is accurate, and I will tell my instructor about any change to my health.</p>
                          <p>I will work within my own limits, stop and tell my instructor if I feel pain, dizziness or discomfort, and follow their guidance on using the equipment safely.</p>
                          <p>I accept the booking policy: cancelling less than {settings.cancellationWindowHours} hours before a class may use up the class credit. I release {settings.studioName}, its owners and instructors from liability for injury except where caused by negligence.</p>
                        </div>
                      </Group>
                      <Group title="Signature" err={errors.signature}>
                        <SignaturePad value={d.signatureImage} onChange={(v) => { set("signatureImage", v); setErrors((x) => ({ ...x, signature: "" })); }} />
                        <div className="mt-5 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
                          <F id="sigName" label="Or type your full name">
                            <LineInput id="sigName" hand value={d.signatureName} placeholder="type your full name"
                              onChange={(e) => { set("signatureName", e.target.value); setErrors((x) => ({ ...x, signature: "" })); }} />
                          </F>
                          <div className="pb-2 text-[14px] text-muted">Signed {format(new Date(), "d MMM yyyy")}</div>
                        </div>
                      </Group>
                      <div className="space-y-4 border-t border-rule pt-6">
                        <CheckBox checked={d.agree} invalid={!!errors.agree} onChange={(v) => set("agree", v)}>I have read and agree to the studio waiver and booking policy.</CheckBox>
                        {errors.agree && <p className="ml-9 text-[14px] text-stamp" role="alert">{errors.agree}</p>}
                        <CheckBox checked={d.marketingOptIn} onChange={(v) => set("marketingOptIn", v)}>Send me the occasional email about new classes and workshops.</CheckBox>
                      </div>
                    </div>
                  )}

                  {step === 4 && <Review d={d} onEdit={(s) => go(s)} />}
                </div>

                <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t-2 border-print pt-6">
                  {step > 0 ? <PenButton onClick={() => go(step - 1)}>Back to {LETTERS[step - 1]}</PenButton> : <span className="text-[14px] text-muted">Your answers are saved on this device as you go.</span>}
                  {step < STEPS.length - 1
                    ? <HiliteButton size="lg" onClick={() => go(step + 1)}>Continue to {LETTERS[step + 1]}. {STEPS[step + 1].label}</HiliteButton>
                    : <HiliteButton size="lg" onClick={submit} disabled={busy}>{busy ? "Sending…" : "Send to the studio"}</HiliteButton>}
                </div>
              </>
            )}
          </div>

          {/* Margin */}
          <aside className="border-t border-rule px-5 py-8 md:px-10 lg:border-t-0 lg:border-l-[1.5px] lg:border-l-[var(--stamp)]/40 lg:px-7 lg:py-10" aria-label="Notes">
            <Hand as="p" className="text-[30px] leading-[1.05]">{done ? "lovely to meet you!" : STEPS[step].note}</Hand>
            <div className="mt-8 flex items-start gap-2 text-[14px] text-print-2">
              <Lock className="mt-0.5 size-4 shrink-0 text-form" />
              <span>Kept privately by {settings.studioName} and shared only with your instructors.</span>
            </div>
            {!done && d.firstName && (
              <div className="mt-8 border-t border-rule pt-5">
                <span className="f-narrow block text-[12px] font-semibold uppercase tracking-[0.08em] text-form">Client</span>
                <Hand className="text-[32px] leading-tight">{d.firstName} {d.lastName}</Hand>
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}

/* ───────── Pieces ───────── */
function Group({ title, hint, err, children }: { title: string; hint?: string; err?: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-5 flex w-full flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="f-print text-[20px] font-bold text-print">{title}</span>
        {err ? <span className="text-[14.5px] font-semibold text-stamp" role="alert">{err}</span> : hint ? <span className="f-narrow text-[12.5px] font-semibold uppercase tracking-[0.08em] text-form">{hint}</span> : null}
      </legend>
      {children}
    </fieldset>
  );
}

function F({ id, label, err, hint, children }: { id: string; label: string; err?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {(err || hint) && <p className={cn("mt-1.5 text-[14px]", err ? "font-semibold text-stamp" : "text-muted")} role={err ? "alert" : undefined}>{err || hint}</p>}
    </div>
  );
}

/** "Circle any that apply": a ballpoint loop is drawn round each choice. */
function Circles({ options, value, onToggle }: { options: string[]; value: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-x-7 gap-y-4">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" aria-pressed={on} onClick={() => onToggle(o)}
            className={cn("relative px-1.5 py-1 text-[16.5px] transition-colors", on ? "font-semibold text-print" : "text-print-2 hover:text-print")}>
            {o}
            {on && (
              <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="pointer-events-none absolute -inset-x-2 -inset-y-1.5 h-[calc(100%+12px)] w-[calc(100%+16px)] overflow-visible text-ballpoint" aria-hidden>
                <path d="M10 24 C 6 8, 44 2, 70 5 C 94 8, 99 18, 94 27 C 88 37, 50 39, 26 36 C 8 33, 2 24, 14 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke"
                  pathLength={1} className="ink-path" style={{ "--len": 1, "--dur": "0.4s" } as CSSProperties} />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Review({ d, onEdit }: { d: Draft; onEdit: (step: number) => void }) {
  const rows: [string, number, [string, string][]][] = [
    ["A. About you", 0, [["Name", `${d.firstName} ${d.lastName}`], ["Email", d.email], ["Mobile", d.phone], ["Date of birth", d.birthday || "—"], ["Occupation", d.occupation || "—"]]],
    ["B. Your practice", 1, [["Experience", EXPERIENCE.find((x) => x.v === d.experience)?.t ?? "—"], ["Day to day", ACTIVITY.find((x) => x.v === d.activityLevel)?.t ?? "—"], ["Goals", d.goals.join(", ") || "—"],
      ["Curious about", d.interests.map((v) => INTERESTS.find(([k]) => k === v)?.[1]).join(", ") || "—"], ["Preferred times", d.preferredTimes.join(", ") || "—"]]],
    ["C. Your body", 2, [["Sensitive areas", d.injuries.join(", ") || "None"], ["Conditions", d.conditions.join(", ") || "None"], ["Medication", d.medications || "—"], ["Notes", d.bodyNotes || "—"]]],
    ["D. Safety & consent", 3, [["Emergency contact", `${d.emergencyName} · ${d.emergencyPhone}`], ["Signed", d.signatureImage ? "Signature drawn" : d.signatureName], ["Waiver", d.agree ? "Agreed" : "Not agreed"]]],
  ];
  return (
    <div className="space-y-8">
      {rows.map(([title, s, items]) => (
        <div key={title}>
          <div className="flex items-baseline justify-between border-b-[1.5px] border-print pb-1.5">
            <h3 className="f-narrow text-[14px] font-bold uppercase tracking-[0.1em] text-print">{title}</h3>
            <PenButton className="text-[14.5px]" onClick={() => onEdit(s)}>Change</PenButton>
          </div>
          <dl className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {items.map(([k, v]) => (
              <div key={k}><dt className="f-narrow text-[12px] font-semibold uppercase tracking-[0.08em] text-form">{k}</dt><dd className="mt-0.5 text-[16px] text-ballpoint">{v}</dd></div>
            ))}
          </dl>
          {s === 3 && d.signatureImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.signatureImage} alt="Your signature" className="mt-4 h-20 border-b-[1.5px] border-form object-contain" />
          )}
        </div>
      ))}
    </div>
  );
}

function Received({ name, needsClearance }: { name: string; needsClearance: boolean }) {
  const intro = useLiveQuery(() => db.plans.filter((p) => p.active && p.type === "intro").first(), []);
  const { add, setOpen } = useCart();
  return (
    <div>
      <FormHeading>Thank you, {name}.</FormHeading>
      <p className="mt-6 max-w-[60ch] text-[18px] leading-relaxed text-print-2">Your form is with the studio. Your instructor reads it before your first class and plans your springs, positions and options around it.</p>
      {needsClearance && (
        <p className="mt-6 max-w-[60ch] bg-pink px-4 py-3 text-[16px] text-print-2">Because of the health information you shared, an instructor will contact you before your first class. You may need a short note from your doctor.</p>
      )}
      <ol className="mt-10 border-t-2 border-print">
        {intro && (
          <li className="grid grid-cols-[2.4rem_1fr] gap-4 border-b border-rule py-5">
            <span className="f-wide text-[22px] font-black text-print">1.</span>
            <div>
              <div className="f-print text-[19px] font-bold text-print">Take the intro offer</div>
              <p className="mt-1 text-[16px] text-print-2">{intro.name} — paid at the desk on your first visit.</p>
              <div className="mt-3"><HiliteButton onClick={() => { add({ kind: "plan", id: intro.id }); setOpen(true); }}>Add it to my order</HiliteButton></div>
            </div>
          </li>
        )}
        <li className="grid grid-cols-[2.4rem_1fr] gap-4 border-b border-rule py-5">
          <span className="f-wide text-[22px] font-black text-print">{intro ? 2 : 1}.</span>
          <div>
            <div className="f-print text-[19px] font-bold text-print">Pick your first class</div>
            <p className="mt-1 text-[16px] text-print-2">Choose a beginner class from the appointment book.</p>
            <div className="mt-2"><PenLink href="/#appointments">Open the appointment book</PenLink></div>
          </div>
        </li>
        <li className="grid grid-cols-[2.4rem_1fr] gap-4 border-b border-rule py-5">
          <span className="f-wide text-[22px] font-black text-print">{intro ? 3 : 2}.</span>
          <div>
            <div className="f-print text-[19px] font-bold text-print">Arrive 10 minutes early</div>
            <p className="mt-1 text-[16px] text-print-2">Bring grip socks, water, and fitted clothes without zips.</p>
          </div>
        </li>
      </ol>
    </div>
  );
}
