"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/overlay";
import { useCart, useOrderRows } from "@/components/site/cart";
import { FormHeading, Hand, HiliteButton, Stamp } from "@/components/site/paper";
import { SupplySketch } from "@/components/site/sketch";
import { db } from "@/lib/db";
import { useSettings } from "@/lib/hooks";
import type { Plan, Product } from "@/lib/types";
import { cn, EMPTY, money } from "@/lib/utils";

type ProdFilter = "all" | Product["category"];
const CAT = ["apparel", "accessories", "equipment", "gift"] as const;
const CAT_LABEL: Record<ProdFilter, string> = { all: "Everything", apparel: "Apparel", accessories: "Accessories", equipment: "Equipment", gift: "Gifts" };

export default function ShopPage() {
  const plans = useLiveQuery(() => db.plans.filter((p) => p.active).toArray(), []) ?? EMPTY;
  const products = useLiveQuery(() => db.products.filter((p) => p.active).toArray(), []) ?? EMPTY;
  const [cf, setCf] = useState<ProdFilter>("all");
  const passList = [...plans].sort((a, b) => (a.type === "intro" ? -1 : b.type === "intro" ? 1 : a.privateOnly === b.privateOnly ? a.price - b.price : a.privateOnly ? 1 : -1));
  const prodList = products.filter((p) => cf === "all" || p.category === cf)
    .sort((a, b) => CAT.indexOf(a.category) - CAT.indexOf(b.category) || a.price - b.price);

  return (
    <div className="mx-auto max-w-[1240px] px-4 pt-6 pb-28 md:px-8 md:pt-10 lg:pb-14">
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-10">
          <section aria-labelledby="order-title" className="bg-paper px-5 pt-8 pb-10 sheet-shadow md:px-10 md:pt-10">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-print pb-3">
              <h1 id="order-title" className="f-wide text-[clamp(2.2rem,5vw,4rem)] font-black uppercase leading-[0.95] tracking-[-0.03em] text-print">Order form</h1>
              <span className="f-narrow pb-1 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-form">Passes · essentials · gifts</span>
            </div>
            <p className="mt-5 max-w-[60ch] text-[18px] text-print-2">Fill in what you need. Nothing is charged online — you pay at the front desk on your visit, and passes work straight away.</p>

            <div id="passes" className="mt-10 scroll-mt-24">
              <FormHeading aside={<Hand className="hidden text-[24px] sm:inline">new? take the first line</Hand>}>A. Passes &amp; packs</FormHeading>
              <div className="mt-3 hidden grid-cols-[minmax(0,1fr)_7rem_6rem_7.5rem] gap-4 border-b border-print pb-2 md:grid">
                {["Pass", "Per class", "Price", "Quantity"].map((h, i) => <span key={h} className={cn("f-narrow text-[12px] font-semibold uppercase tracking-[0.1em] text-form", i > 0 && "text-right")}>{h}</span>)}
              </div>
              <ul>{passList.map((p) => <PassRow key={p.id} p={p} />)}</ul>
            </div>
          </section>

          <section id="essentials" aria-labelledby="supplies-title" className="scroll-mt-24 bg-paper px-5 py-10 sheet-shadow md:px-10">
            <FormHeading id="supplies-title">B. Studio essentials</FormHeading>
            <div role="group" aria-label="Filter essentials" className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
              {(["all", ...CAT] as ProdFilter[]).map((k) => (
                <button key={k} onClick={() => setCf(k)} aria-pressed={cf === k}
                  className={cn("f-narrow text-[14px] font-semibold uppercase tracking-[0.08em] transition-colors", cf === k ? "text-print underline decoration-ballpoint decoration-wavy decoration-[1.5px] underline-offset-[6px]" : "text-form hover:text-print")}>
                  {CAT_LABEL[k]}
                </button>
              ))}
            </div>
            <div className="mt-6 hidden grid-cols-[96px_minmax(0,1fr)_6rem_7.5rem] gap-5 border-b border-print pb-2 md:grid">
              {["Sketch", "Item", "Price", "Quantity"].map((h, i) => <span key={h} className={cn("f-narrow text-[12px] font-semibold uppercase tracking-[0.1em] text-form", i > 1 && "text-right")}>{h}</span>)}
            </div>
            <ul>
              {prodList.map((p) => <SupplyRow key={p.id} p={p} />)}
            </ul>
          </section>
        </div>

        <OrderSummary />
      </div>
    </div>
  );
}

function Qty({ kind, id, name, max }: { kind: "plan" | "product"; id: string; name: string; max: number }) {
  const { lines, add, setQty } = useCart();
  const toast = useToast();
  const qty = lines.find((l) => l.kind === kind && l.id === id)?.qty ?? 0;
  if (max <= 0) return <span className="f-narrow text-[13px] font-semibold uppercase tracking-[0.08em] text-stamp">Sold out</span>;
  return (
    <div className="inline-flex items-center border-[1.5px] border-print">
      <button onClick={() => setQty({ kind, id }, qty - 1)} disabled={qty === 0} className="grid size-9 place-items-center text-print hover:bg-ballpoint-soft disabled:opacity-30" aria-label={`One less ${name}`}><Minus className="size-4" /></button>
      <span className={cn("grid h-9 w-10 place-items-center border-x border-print/30 tnum", qty ? "f-hand text-[26px] leading-none text-ballpoint" : "text-[15px] text-muted")} aria-label={`${name} quantity`}>{qty}</span>
      <button onClick={() => { add({ kind, id }); if (qty === 0) toast.success(`${name} added to your order`); }} disabled={qty >= max} className="grid size-9 place-items-center text-print hover:bg-ballpoint-soft disabled:opacity-30" aria-label={`One more ${name}`}><Plus className="size-4" /></button>
    </div>
  );
}

function PassRow({ p }: { p: Plan }) {
  const per = p.credits && p.credits > 1 ? money(p.price / p.credits) : p.credits == null ? "Unlimited" : "—";
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 border-b border-rule py-5 md:grid-cols-[minmax(0,1fr)_7rem_6rem_7.5rem]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className="f-print text-[19px] font-bold text-print">{p.name}</span>
          {p.type === "intro" && <Stamp rot={-5} animate={false} className="text-[12px]">First-timers</Stamp>}
          {p.popular && <Hand className="text-[24px] leading-none">most people pick this</Hand>}
        </div>
        <p className="mt-1 max-w-[52ch] text-[15px] text-print-2">{p.description} Valid {p.validityDays} days.</p>
      </div>
      <span className="hidden text-right text-[15px] text-print-2 tnum md:block">{per}</span>
      <span className="f-wide text-right text-[22px] font-black text-print tnum">{money(p.price, { cents: false })}</span>
      <div className="col-span-2 md:col-span-1 md:justify-self-end"><Qty kind="plan" id={p.id} name={p.name} max={3} /></div>
    </li>
  );
}

function SupplyRow({ p }: { p: Product }) {
  const stock = p.stock >= 999 ? "Always available" : p.stock <= 0 ? "Out of stock" : p.stock <= 8 ? `Only ${p.stock} left` : `${p.stock} in stock`;
  return (
    <li className="grid grid-cols-[72px_1fr] items-center gap-x-5 gap-y-3 border-b border-rule py-5 md:grid-cols-[96px_minmax(0,1fr)_6rem_7.5rem]">
      <SupplySketch art={p.art} tone={p.tone} className="size-[72px] md:size-24" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="f-print text-[18px] font-bold text-print">{p.name}</span>
          {p.badge && <Hand className="text-[22px] leading-none">{p.badge.toLowerCase()}</Hand>}
        </div>
        <p className="mt-1 max-w-[56ch] text-[15px] text-print-2">{p.description}</p>
        <span className={cn("f-narrow mt-1.5 block text-[12.5px] font-semibold uppercase tracking-[0.08em]", p.stock > 0 && p.stock <= 8 ? "text-stamp" : "text-form")}>{stock}</span>
      </div>
      <span className="f-wide col-start-2 text-[22px] font-black text-print tnum md:col-start-auto md:text-right">{money(p.price, { cents: false })}</span>
      <div className="col-start-2 md:col-start-auto md:justify-self-end"><Qty kind="product" id={p.id} name={p.name} max={p.stock} /></div>
    </li>
  );
}

function OrderSummary() {
  const rows = useOrderRows();
  const { setOpen } = useCart();
  const settings = useSettings();
  const subtotal = rows.reduce((a, r) => a + r.price * r.l.qty, 0);
  const total = subtotal * (1 + settings.taxRate / 100);
  return (
    <>
      <aside aria-label="Your order" className="hidden bg-canary px-6 py-6 sheet-shadow lg:sticky lg:top-24 lg:block">
        <div className="f-wide border-b-2 border-print pb-2 text-[18px] font-black uppercase text-print">Your order</div>
        {rows.length === 0 ? (
          <Hand as="p" className="py-8 text-[26px] leading-tight">nothing yet — fill in a quantity on the left</Hand>
        ) : (
          <ul className="py-2">
            {rows.map((r) => (
              <li key={r.l.kind + r.l.id} className="flex items-baseline gap-2 border-b border-print/15 py-2.5 text-[15px]">
                <span className="f-hand w-6 shrink-0 text-[24px] leading-none text-ballpoint">{r.l.qty}×</span>
                <span className="min-w-0 flex-1 text-print">{r.name}</span>
                <span className="text-print tnum">{money(r.price * r.l.qty)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-baseline justify-between border-t border-print pt-3">
          <span className="f-narrow text-[13px] font-bold uppercase tracking-[0.1em] text-print">Total{settings.taxRate > 0 ? " incl. tax" : ""}</span>
          <span className="f-wide text-[24px] font-black text-print tnum">{money(total)}</span>
        </div>
        <div className="mt-5"><HiliteButton size="lg" disabled={!rows.length} onClick={() => setOpen(true)}>Review &amp; reserve</HiliteButton></div>
        <p className="mt-4 text-[13.5px] text-print-2">Pay at the studio. Cancel any time before your visit.</p>
      </aside>

      {rows.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t-2 border-print bg-canary px-4 py-3 lg:hidden">
          <span className="text-[15px] text-print"><span className="f-hand text-[24px] text-ballpoint">{rows.reduce((a, r) => a + r.l.qty, 0)}</span> items · <strong className="tnum">{money(total)}</strong></span>
          <HiliteButton onClick={() => setOpen(true)}>Review order</HiliteButton>
        </div>
      )}
    </>
  );
}
