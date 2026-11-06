"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Minus, Plus, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { db } from "@/lib/db";
import { useSettings } from "@/lib/hooks";
import { placeOrder, type CartLine, type Contact } from "@/lib/public";
import type { Product } from "@/lib/types";
import { EMPTY, money } from "@/lib/utils";
import { Sheet, useToast } from "../overlay";
import { Hand, HiliteButton, HiliteLink, Label, LineInput, PenLink, Stamp } from "./paper";
import { SupplySketch } from "./sketch";

type CartCtx = {
  lines: CartLine[];
  count: number;
  add: (l: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (l: Omit<CartLine, "qty">, qty: number) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};
const Ctx = createContext<CartCtx | null>(null);
export const useCart = () => useContext(Ctx)!;
const KEY = "studio-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setLines(JSON.parse(raw));
    } catch {}
  }, []);
  const persist = (next: CartLine[]) => {
    setLines(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  };
  const same = (a: Omit<CartLine, "qty">, b: Omit<CartLine, "qty">) => a.kind === b.kind && a.id === b.id;
  const add = useCallback((l: Omit<CartLine, "qty">, qty = 1) => {
    setLines((cur) => {
      const ex = cur.find((x) => same(x, l));
      const next = ex ? cur.map((x) => (same(x, l) ? { ...x, qty: x.qty + qty } : x)) : [...cur, { ...l, qty }];
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  const setQty = (l: Omit<CartLine, "qty">, qty: number) => persist(qty <= 0 ? lines.filter((x) => !same(x, l)) : lines.map((x) => (same(x, l) ? { ...x, qty } : x)));
  const clear = () => persist([]);
  const count = lines.reduce((a, l) => a + l.qty, 0);
  return <Ctx.Provider value={{ lines, count, add, setQty, clear, open, setOpen }}>{children}<OrderSlip /></Ctx.Provider>;
}

type Row = { l: CartLine; name: string; price: number; sub: string; product: Product | null; max: number };

/** Live rows for the current order, resolved against the studio's plans and products. */
export function useOrderRows() {
  const { lines } = useCart();
  const plans = useLiveQuery(() => db.plans.toArray(), []) ?? EMPTY;
  const products = useLiveQuery(() => db.products.toArray(), []) ?? EMPTY;
  return useMemo(() => lines.map((l): Row | null => {
    if (l.kind === "plan") {
      const p = plans.find((x) => x.id === l.id);
      return p ? { l, name: p.name, price: p.price, sub: p.credits == null ? `Unlimited · ${p.validityDays} days` : `${p.credits} ${p.privateOnly ? "private sessions" : "classes"} · ${p.validityDays} days`, product: null, max: 3 } : null;
    }
    const p = products.find((x) => x.id === l.id);
    return p ? { l, name: p.name, price: p.price, sub: p.stock <= 8 ? `Only ${p.stock} left` : "In stock", product: p, max: p.stock } : null;
  }).filter((r): r is Row => r !== null), [lines, plans, products]);
}

function OrderSlip() {
  const { lines, setQty, clear, open, setOpen } = useCart();
  const settings = useSettings();
  const toast = useToast();
  const rows = useOrderRows();
  const [step, setStep] = useState<"bag" | "details" | "done">("bag");
  const [c, setC] = useState<Contact>({ firstName: "", lastName: "", email: "", phone: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof Contact, string>>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof placeOrder>> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) setStep((s) => (s === "done" ? "bag" : s));
  }, [open]);

  const subtotal = rows.reduce((a, r) => a + r.price * r.l.qty, 0);
  const tax = subtotal * (settings.taxRate / 100);

  const submit = async () => {
    const e: typeof errors = {};
    if (!c.firstName.trim()) e.firstName = "Add your first name";
    if (!c.lastName.trim()) e.lastName = "Add your last name";
    if (!/^\S+@\S+\.\S+$/.test(c.email)) e.email = "Enter an email like name@example.com";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const r = await placeOrder(c, lines);
      setResult(r);
      clear();
      setStep("done");
    } catch (err) {
      toast.error("We couldn't place your order", err instanceof Error ? err.message : "Please try again.");
    } finally { setBusy(false); }
  };

  const field = (k: keyof Contact, label: string, type = "text", auto?: string) => (
    <div>
      <Label htmlFor={`order-${k}`}>{label}</Label>
      <LineInput id={`order-${k}`} type={type} autoComplete={auto} value={c[k]} invalid={!!errors[k]}
        onChange={(ev) => { setC({ ...c, [k]: ev.target.value }); setErrors((x) => ({ ...x, [k]: undefined })); }} />
      {errors[k] && <p className="mt-1 text-[14px] text-stamp">{errors[k]}</p>}
    </div>
  );

  return (
    <Sheet open={open} onClose={() => setOpen(false)} width="max-w-md" title="Your order">
      <div className="flex h-full flex-col bg-canary">
        <div className="flex items-center gap-3 border-b-2 border-print px-6 py-4">
          {step === "details" && <button onClick={() => setStep("bag")} className="grid size-9 place-items-center text-print hover:text-ballpoint" aria-label="Back to your order"><ArrowLeft className="size-5" /></button>}
          <h2 className="f-wide flex-1 text-[22px] font-black uppercase text-print">{step === "bag" ? "Order slip" : step === "details" ? "Your details" : "Order reserved"}</h2>
          <button onClick={() => setOpen(false)} className="grid size-9 place-items-center text-print hover:text-ballpoint" aria-label="Close"><X className="size-5" /></button>
        </div>

        {step === "bag" && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {rows.length === 0 ? (
                <div className="py-16">
                  <p className="f-print text-[19px] font-bold text-print">Nothing on the slip yet.</p>
                  <p className="mt-2 text-[16px] text-print-2">Most beginners start with the intro offer: three classes to find your feet.</p>
                  <div className="mt-6"><HiliteLink href="/shop#passes" onClick={() => setOpen(false)}>See passes</HiliteLink></div>
                </div>
              ) : (
                <ul>
                  {rows.map((r) => (
                    <li key={r.l.kind + r.l.id} className="grid grid-cols-[56px_1fr_auto] items-center gap-4 border-b border-print/15 py-4">
                      <div className="grid size-14 place-items-center bg-paper">
                        {r.product ? <SupplySketch art={r.product.art} tone={r.product.tone} className="size-12" /> : <span className="f-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-form">Pass</span>}
                      </div>
                      <div className="min-w-0">
                        <div className="f-print font-bold text-print">{r.name}</div>
                        <div className="text-[13.5px] text-print-2">{r.sub}</div>
                        <div className="mt-2 inline-flex items-center border border-print/30 bg-paper">
                          <button className="grid size-8 place-items-center text-print hover:text-ballpoint" onClick={() => setQty(r.l, r.l.qty - 1)} aria-label={`One less ${r.name}`}><Minus className="size-3.5" /></button>
                          <span className="w-7 text-center text-[15px] tnum" aria-label="Quantity">{r.l.qty}</span>
                          <button className="grid size-8 place-items-center text-print hover:text-ballpoint disabled:opacity-30" disabled={r.l.qty >= r.max} onClick={() => setQty(r.l, r.l.qty + 1)} aria-label={`One more ${r.name}`}><Plus className="size-3.5" /></button>
                        </div>
                      </div>
                      <div className="f-print self-start pt-0.5 font-bold text-print tnum">{money(r.price * r.l.qty)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {rows.length > 0 && (
              <div className="space-y-2 border-t-2 border-print px-6 py-5">
                <div className="flex justify-between text-[15px] text-print-2"><span>Subtotal</span><span className="tnum">{money(subtotal)}</span></div>
                {settings.taxRate > 0 && <div className="flex justify-between text-[15px] text-print-2"><span>Tax ({settings.taxRate}%)</span><span className="tnum">{money(tax)}</span></div>}
                <div className="flex justify-between border-t border-print pt-2"><span className="f-wide text-[18px] font-black uppercase text-print">Total</span><span className="f-wide text-[20px] font-black text-print tnum">{money(subtotal + tax)}</span></div>
                <div className="pt-3"><HiliteButton size="lg" onClick={() => setStep("details")}>Continue</HiliteButton></div>
              </div>
            )}
          </>
        )}

        {step === "details" && (
          <>
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
              <div className="grid grid-cols-2 gap-4">{field("firstName", "First name", "text", "given-name")}{field("lastName", "Last name", "text", "family-name")}</div>
              {field("email", "Email", "email", "email")}
              {field("phone", "Mobile (optional)", "tel", "tel")}
              <div className="border-t border-print/20 pt-5">
                <p className="f-print font-bold text-print">Pay at the studio</p>
                <p className="mt-1 text-[15px] text-print-2">Your order is reserved now and paid at the front desk on your visit. Passes can be used straight away.</p>
              </div>
            </div>
            <div className="border-t-2 border-print px-6 py-5">
              <HiliteButton size="lg" onClick={submit} disabled={busy}>{busy ? "Reserving…" : `Reserve order · ${money(subtotal + tax)}`}</HiliteButton>
            </div>
          </>
        )}

        {step === "done" && result && (
          <div className="flex-1 overflow-y-auto px-6 py-10">
            <Stamp rot={-6} className="text-[16px]"><span className="text-[11px] tracking-[0.18em]">Reserved</span><span className="text-[24px]">{result.ref}</span></Stamp>
            <p className="f-print mt-8 text-[22px] font-bold text-print">Thank you, {c.firstName}.</p>
            <p className="mt-2 text-[16px] text-print-2">{money(result.total)} to pay at the studio. Quote <strong className="text-print">{result.ref}</strong> at the desk.</p>
            {result.isNew && (
              <div className="mt-8 border-t-2 border-print pt-5">
                <p className="f-print font-bold text-print">First time with us?</p>
                <p className="mt-1 text-[15px] text-print-2">Fill in the intake form so your instructor can prepare your first class.</p>
                <div className="mt-4">
                  <HiliteLink onClick={() => setOpen(false)} href={`/join?email=${encodeURIComponent(c.email)}&first=${encodeURIComponent(c.firstName)}&last=${encodeURIComponent(c.lastName)}`}>Fill in the intake form</HiliteLink>
                </div>
              </div>
            )}
            <Hand as="p" className="mt-8 text-[26px]">next: pick a class →</Hand>
            <PenLink href="/#appointments" onClick={() => setOpen(false)}>Open the appointment book</PenLink>
          </div>
        )}
      </div>
    </Sheet>
  );
}
