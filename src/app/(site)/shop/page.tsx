"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, Gift, Infinity as InfinityIcon, Plus, ShieldCheck, Sparkles, Store, Zap } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { ProductArt } from "@/components/site/art";
import { useCart } from "@/components/site/cart";
import { Reveal, RiseText } from "@/components/site/motion";
import { useToast } from "@/components/overlay";
import { db } from "@/lib/db";
import type { Plan, Product } from "@/lib/types";
import { cn, EMPTY, money } from "@/lib/utils";

type PlanFilter = "all" | "pack" | "unlimited" | "private";
type ProdFilter = "all" | Product["category"];

export default function ShopPage() {
  const plans = useLiveQuery(() => db.plans.filter((p) => p.active).toArray(), []) ?? EMPTY;
  const products = useLiveQuery(() => db.products.filter((p) => p.active).toArray(), []) ?? EMPTY;
  const [pf, setPf] = useState<PlanFilter>("all");
  const [cf, setCf] = useState<ProdFilter>("all");

  const planList = plans
    .filter((p) => pf === "all" || (pf === "pack" ? p.type === "pack" || p.type === "intro" : p.type === pf))
    .sort((a, b) => (a.type === "intro" ? -1 : b.type === "intro" ? 1 : a.price - b.price));
  const CAT = ["apparel", "accessories", "equipment", "gift"];
  const prodList = products.filter((p) => cf === "all" || p.category === cf).sort((a, b) => CAT.indexOf(a.category) - CAT.indexOf(b.category) || a.price - b.price);

  return (
    <>
      <ShopHero products={products} />

      <section id="passes" className="mx-auto max-w-[1320px] scroll-mt-24 px-5 py-24 md:px-10 md:py-32">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <Reveal>
            <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted"><span className="h-px w-10 bg-line-strong" /> Passes & packs</div>
            <h2 className="font-display text-5xl font-light tracking-tight text-ink md:text-6xl">Choose your <em className="text-clay">rhythm.</em></h2>
          </Reveal>
          <Pills value={pf} onChange={setPf} options={[["all", "All"], ["pack", "Class packs"], ["unlimited", "Unlimited"], ["private", "Private"]]} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {planList.map((p, i) => <PlanCard key={p.id} p={p} i={i} />)}
        </div>
      </section>

      <GiftBand gift={products.find((p) => p.art === "giftcard")} />

      <section id="essentials" className="mx-auto max-w-[1320px] scroll-mt-24 px-5 py-24 md:px-10 md:py-32">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <Reveal>
            <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted"><span className="h-px w-10 bg-line-strong" /> Studio essentials</div>
            <h2 className="font-display text-5xl font-light tracking-tight text-ink md:text-6xl">Take the studio <em className="text-clay">home.</em></h2>
          </Reveal>
          <Pills value={cf} onChange={setCf} options={[["all", "Everything"], ["apparel", "Apparel"], ["equipment", "Equipment"], ["accessories", "Accessories"], ["gift", "Gifts"]]} />
        </div>
        <div className="grid grid-cols-2 gap-4 md:gap-5 lg:grid-cols-4">
          {prodList.map((p, i) => <ProductCard key={p.id} p={p} i={i} />)}
        </div>
      </section>

      <section className="border-y border-line bg-surface-2">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-5 py-12 md:grid-cols-3 md:px-10">
          {[
            [Store, "Pay at the studio", "Reserve online, settle at the front desk on your visit."],
            [Zap, "Passes start instantly", "Book classes the moment your order is placed."],
            [ShieldCheck, "Easy exchanges", "Unworn essentials can be swapped within 30 days."],
          ].map(([I, t, d]) => {
            const Icon = I as typeof Store;
            return (
              <div key={t as string} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-forest text-cream"><Icon className="size-5" /></span>
                <div><div className="font-medium text-ink">{t as string}</div><p className="text-sm text-muted">{d as string}</p></div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function ShopHero({ products }: { products: Product[] }) {
  const floaters = products.filter((p) => p.art !== "giftcard").slice(0, 6);
  const spots = [
    { top: "8%", left: "8%", s: 150, r: -12, d: 0 }, { top: "4%", left: "56%", s: 120, r: 10, d: 1.2 },
    { top: "40%", left: "30%", s: 190, r: -4, d: 0.6 }, { top: "52%", left: "72%", s: 140, r: 14, d: 2 },
    { top: "70%", left: "4%", s: 120, r: 8, d: 1.6 }, { top: "76%", left: "48%", s: 110, r: -16, d: 0.3 },
  ];
  return (
    <section className="relative overflow-hidden bg-forest pt-32 pb-20 text-cream grain md:pt-40 md:pb-28"
      style={{ backgroundImage: "radial-gradient(800px circle at 80% 30%, rgb(143 174 148 / .22), transparent 60%), radial-gradient(600px circle at 10% 100%, rgb(192 102 63 / .25), transparent 60%)" }}>
      <div className="relative z-10 mx-auto grid max-w-[1320px] items-center gap-12 px-5 md:px-10 lg:grid-cols-2">
        <div>
          <div className="mb-6 text-xs uppercase tracking-[0.2em] text-cream/55">The studio shop</div>
          <h1 className="font-display text-[clamp(3.2rem,8vw,7rem)] font-light leading-[0.92] tracking-[-0.03em]">
            <span className="block"><RiseText text="Everything" /></span>
            <span className="block"><RiseText text="you need," delay={300} /></span>
            <em className="block text-moss"><RiseText text="nothing more." delay={560} /></em>
          </h1>
          <p className="mt-8 max-w-md text-[17px] leading-relaxed text-cream/70" style={{ animation: "fade-in 1s both 1s" }}>Class passes, private sessions and the few essentials we actually use on the reformer.</p>
          <div className="mt-8 flex flex-wrap gap-3" style={{ animation: "fade-in 1s both 1.2s" }}>
            <a href="#passes" className="inline-flex h-12 items-center rounded-full bg-cream px-6 text-sm font-medium text-forest hover:bg-white">Shop passes</a>
            <a href="#essentials" className="inline-flex h-12 items-center rounded-full border border-cream/25 px-6 text-sm font-medium text-cream hover:border-cream/60">Shop essentials</a>
          </div>
        </div>
        <div className="relative hidden h-[460px] lg:block" aria-hidden>
          {floaters.map((p, i) => {
            const s = spots[i];
            return (
              <div key={p.id} className="absolute animate-float rounded-[2rem] p-4 backdrop-blur-sm"
                style={{ top: s.top, left: s.left, width: s.s, height: s.s, "--r": `${s.r}deg`, animationDelay: `${s.d}s`, animationDuration: `${6 + i}s`, background: `color-mix(in srgb, ${p.tone} 22%, rgb(243 237 227 / .06))`, border: "1px solid rgb(243 237 227 / .1)" } as CSSProperties}>
                <ProductArt art={p.art} tone={p.tone} className="h-full w-full" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PlanCard({ p, i }: { p: Plan; i: number }) {
  const { add, setOpen } = useCart();
  const toast = useToast();
  const hero = !!p.popular;
  const per = p.credits ? p.price / p.credits : null;
  const perks = [
    p.credits == null ? "Unlimited group classes" : `${p.credits} ${p.privateOnly ? "one-on-one sessions" : `class${p.credits > 1 ? "es" : ""}`}`,
    `Valid for ${p.validityDays} days`,
    p.privateOnly ? "All apparatus, tailored programme" : "Reformer, mat, tower & barre",
    p.type === "intro" ? "First-timers only" : "Freeze anytime for travel",
  ];
  return (
    <Reveal delay={i * 80}>
      <article className={cn("group relative flex h-full flex-col overflow-hidden rounded-[2rem] border p-8 transition-all duration-500 hover:-translate-y-1.5",
        hero ? "border-forest bg-forest text-cream shadow-[0_30px_60px_-30px_rgb(29_47_39/.6)]" : "border-line bg-surface hover:shadow-[0_24px_50px_-30px_rgb(27_34_30/.35)]")}>
        <div className="flex items-start justify-between gap-3">
          <span className={cn("rounded-full px-3 py-1 text-xs font-medium",
            p.type === "intro" ? "bg-moss text-forest" : p.type === "unlimited" ? (hero ? "bg-cream/15" : "bg-accent-soft text-accent") : p.type === "private" ? "bg-clay-soft text-clay" : hero ? "bg-cream/15" : "bg-bg-elev text-ink-2")}>
            {p.type === "intro" ? "Intro offer" : p.type === "unlimited" ? "Membership" : p.type === "private" ? "Private" : "Class pack"}
          </span>
          {hero && <span className="inline-flex items-center gap-1 rounded-full bg-clay px-3 py-1 text-xs font-medium text-white"><Sparkles className="size-3" /> Most loved</span>}
        </div>
        <h3 className="mt-6 font-display text-3xl">{p.name}</h3>
        <p className={cn("mt-2 text-sm", hero ? "text-cream/70" : "text-muted")}>{p.description}</p>
        <div className="mt-8 flex items-baseline gap-2">
          <span className="font-display text-6xl font-light tnum">{money(p.price, { cents: false })}</span>
          {per && p.credits! > 1 && <span className={cn("text-sm", hero ? "text-cream/60" : "text-muted")}>{money(per)}/class</span>}
          {p.credits == null && <span className={cn("inline-flex items-center gap-1 text-sm", hero ? "text-cream/60" : "text-muted")}><InfinityIcon className="size-4" /> / month</span>}
        </div>
        <ul className={cn("mt-8 space-y-2.5 text-sm", hero ? "text-cream/85" : "text-ink-2")}>
          {perks.map((x) => <li key={x} className="flex items-center gap-2.5"><Check className={cn("size-4 shrink-0", hero ? "text-moss" : "text-accent")} />{x}</li>)}
        </ul>
        <div className="min-h-10 flex-1" />
        <button onClick={() => { add({ kind: "plan", id: p.id }); toast.success(`${p.name} added`); setOpen(true); }}
          className={cn("inline-flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-medium transition",
            hero ? "bg-cream text-forest hover:bg-white" : "bg-forest text-cream hover:bg-forest-2")}>
          <Plus className="size-4" /> Add to bag
        </button>
      </article>
    </Reveal>
  );
}

function ProductCard({ p, i }: { p: Product; i: number }) {
  const { add } = useCart();
  const toast = useToast();
  const out = p.stock <= 0;
  return (
    <Reveal delay={(i % 4) * 80}>
      <article className="group flex h-full flex-col">
        <div className="relative grid aspect-[4/5] place-items-center overflow-hidden rounded-[1.75rem] transition-all duration-500 group-hover:rounded-[2.25rem]"
          style={{ background: `radial-gradient(circle at 50% 40%, color-mix(in srgb, ${p.tone} 14%, #fffcf7), color-mix(in srgb, ${p.tone} 30%, #efe7da))` }}>
          {p.badge && <span className="absolute left-4 top-4 z-10 rounded-full bg-surface/90 px-3 py-1 text-[11px] font-medium text-ink backdrop-blur">{p.badge}</span>}
          {p.stock > 0 && p.stock <= 8 && <span className="absolute right-4 top-4 z-10 rounded-full bg-clay px-2.5 py-1 text-[11px] font-medium text-white">{p.stock} left</span>}
          <ProductArt art={p.art} tone={p.tone} className="w-[72%] transition-transform duration-700 ease-out group-hover:-translate-y-2 group-hover:scale-105 group-hover:-rotate-3" />
          <button disabled={out}
            onClick={() => { add({ kind: "product", id: p.id }); toast.success(`${p.name} added to your bag`); }}
            className="absolute inset-x-4 bottom-4 inline-flex h-11 translate-y-3 items-center justify-center gap-2 rounded-full bg-forest text-sm font-medium text-cream opacity-0 transition-all duration-300 hover:bg-forest-2 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 disabled:bg-faint max-md:translate-y-0 max-md:opacity-100">
            {out ? "Sold out" : <><Plus className="size-4" /> Add to bag</>}
          </button>
        </div>
        <div className="mt-4 flex items-start justify-between gap-3 px-1">
          <div className="min-w-0">
            <h3 className="font-medium text-ink">{p.name}</h3>
            <p className="mt-0.5 line-clamp-2 text-sm text-muted">{p.description}</p>
          </div>
          <div className="font-display text-xl text-ink tnum">{money(p.price, { cents: false })}</div>
        </div>
      </article>
    </Reveal>
  );
}

function GiftBand({ gift }: { gift?: Product }) {
  const { add, setOpen } = useCart();
  if (!gift) return null;
  return (
    <section className="mx-auto max-w-[1320px] px-5 md:px-10">
      <Reveal variant="scale">
        <div className="relative grid items-center gap-8 overflow-hidden rounded-[2.5rem] bg-[#c0663f] p-8 text-cream grain md:grid-cols-[1.3fr_1fr] md:p-14">
          <div className="relative z-10">
            <div className="mb-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cream/75"><Gift className="size-4" /> Give the gift of movement</div>
            <h2 className="font-display text-4xl font-light leading-tight md:text-6xl">A stronger spine is a <em>thoughtful</em> present.</h2>
            <p className="mt-4 max-w-md text-cream/80">{gift.description}</p>
            <button onClick={() => { add({ kind: "product", id: gift.id }); setOpen(true); }} className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-cream px-6 text-sm font-medium text-[#8c4527] hover:bg-white">
              <Plus className="size-4" /> Add a {money(gift.price, { cents: false })} gift card
            </button>
          </div>
          <div className="relative z-10 mx-auto w-full max-w-[340px] animate-float" style={{ "--r": "-6deg" } as CSSProperties}>
            <ProductArt art="giftcard" tone="#1d2f27" className="w-full drop-shadow-2xl" />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Pills<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:px-0">
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)}
          className={cn("h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition", value === v ? "border-forest bg-forest text-cream" : "border-line bg-surface text-ink-2 hover:border-line-strong")}>
          {l}
        </button>
      ))}
    </div>
  );
}
