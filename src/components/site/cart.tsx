"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, ArrowRight, Check, ClipboardList, Minus, Plus, ShoppingBag, Store, X } from "lucide-react";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { db } from "@/lib/db";
import { useSettings } from "@/lib/hooks";
import { placeOrder, type CartLine, type Contact } from "@/lib/public";
import { cn, EMPTY, money } from "@/lib/utils";
import { Sheet, useToast } from "../overlay";
import { Button, Field, Input } from "../ui";
import { ProductArt } from "./art";

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
  return <Ctx.Provider value={{ lines, count, add, setQty, clear, open, setOpen }}>{children}<CartDrawer /></Ctx.Provider>;
}

function CartDrawer() {
  const { lines, setQty, clear, open, setOpen } = useCart();
  const settings = useSettings();
  const toast = useToast();
  const plans = useLiveQuery(() => db.plans.toArray(), []) ?? EMPTY;
  const products = useLiveQuery(() => db.products.toArray(), []) ?? EMPTY;
  const [step, setStep] = useState<"bag" | "details" | "done">("bag");
  const [c, setC] = useState<Contact>({ firstName: "", lastName: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof placeOrder>> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) setStep((s) => (s === "done" ? "bag" : s));
  }, [open]);

  const rows = useMemo(() => lines.map((l) => {
    if (l.kind === "plan") {
      const p = plans.find((x) => x.id === l.id);
      return p && { l, name: p.name, price: p.price, sub: p.credits == null ? `Unlimited · ${p.validityDays} days` : `${p.credits} ${p.privateOnly ? "private sessions" : "classes"} · ${p.validityDays} days`, art: null, max: 3 };
    }
    const p = products.find((x) => x.id === l.id);
    return p && { l, name: p.name, price: p.price, sub: p.stock <= 8 ? `Only ${p.stock} left` : "In stock", art: p, max: p.stock };
  }).filter(Boolean) as { l: CartLine; name: string; price: number; sub: string; art: (typeof products)[number] | null; max: number }[], [lines, plans, products]);

  const subtotal = rows.reduce((a, r) => a + r.price * r.l.qty, 0);
  const tax = subtotal * (settings.taxRate / 100);

  const submit = async () => {
    if (!c.firstName.trim() || !c.lastName.trim()) return toast.error("Please add your name");
    if (!/^\S+@\S+\.\S+$/.test(c.email)) return toast.error("Please enter a valid email");
    setBusy(true);
    try {
      const r = await placeOrder(c, lines);
      setResult(r);
      clear();
      setStep("done");
    } catch (e) {
      toast.error("Could not place order", e instanceof Error ? e.message : undefined);
    } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={() => setOpen(false)} width="max-w-md" title="Your bag">
      <div className="site flex h-full flex-col bg-surface">
        <div className="flex items-center gap-3 border-b border-line px-6 py-5">
          {step === "details" && <Button size="icon-sm" variant="ghost" onClick={() => setStep("bag")} aria-label="Back"><ArrowLeft /></Button>}
          <h2 className="flex-1 font-display text-2xl text-ink">{step === "bag" ? "Your bag" : step === "details" ? "Your details" : "Order placed"}</h2>
          <Button size="icon-sm" variant="ghost" onClick={() => setOpen(false)} aria-label="Close"><X /></Button>
        </div>

        {step === "bag" && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {rows.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-4 grid size-16 place-items-center rounded-full bg-bg-elev text-muted"><ShoppingBag className="size-6" /></div>
                  <div className="font-display text-xl text-ink">Your bag is empty</div>
                  <p className="mt-1 text-sm text-muted">Start with our intro offer — three classes to find your flow.</p>
                  <Link href="/shop" onClick={() => setOpen(false)} className="mt-5"><Button variant="primary">Browse the shop</Button></Link>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {rows.map((r) => (
                    <li key={r.l.kind + r.l.id} className="flex gap-4 py-4">
                      <div className="grid size-20 shrink-0 place-items-center rounded-2xl" style={{ background: r.art ? `color-mix(in srgb, ${r.art.tone} 18%, #f8f3eb)` : "var(--forest)" }}>
                        {r.art ? <ProductArt art={r.art.art} tone={r.art.tone} className="size-16" /> : <span className="font-display text-lg italic text-cream">Pass</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-2">
                          <div className="font-medium text-ink">{r.name}</div>
                          <div className="font-medium text-ink tnum">{money(r.price * r.l.qty)}</div>
                        </div>
                        <div className="text-xs text-muted">{r.sub}</div>
                        <div className="mt-3 inline-flex items-center rounded-full border border-line">
                          <button className="grid size-8 place-items-center text-muted hover:text-ink" onClick={() => setQty(r.l, r.l.qty - 1)} aria-label="Decrease"><Minus className="size-3.5" /></button>
                          <span className="w-6 text-center text-sm tnum">{r.l.qty}</span>
                          <button className="grid size-8 place-items-center text-muted hover:text-ink disabled:opacity-30" disabled={r.l.qty >= r.max} onClick={() => setQty(r.l, r.l.qty + 1)} aria-label="Increase"><Plus className="size-3.5" /></button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {rows.length > 0 && (
              <div className="space-y-3 border-t border-line bg-surface-2 px-6 py-5">
                <div className="flex justify-between text-sm text-muted"><span>Subtotal</span><span className="tnum">{money(subtotal)}</span></div>
                {settings.taxRate > 0 && <div className="flex justify-between text-sm text-muted"><span>Tax ({settings.taxRate}%)</span><span className="tnum">{money(tax)}</span></div>}
                <div className="flex justify-between font-display text-xl text-ink"><span>Total</span><span className="tnum">{money(subtotal + tax)}</span></div>
                <Button variant="primary" size="lg" className="w-full rounded-full" onClick={() => setStep("details")}>Checkout <ArrowRight /></Button>
              </div>
            )}
          </>
        )}

        {step === "details" && (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" required><Input value={c.firstName} onChange={(e) => setC({ ...c, firstName: e.target.value })} autoFocus /></Field>
                <Field label="Last name" required><Input value={c.lastName} onChange={(e) => setC({ ...c, lastName: e.target.value })} /></Field>
              </div>
              <Field label="Email" required hint="We use this to find your account at the studio."><Input type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} /></Field>
              <Field label="Phone"><Input type="tel" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} /></Field>
              <div className="flex gap-3 rounded-2xl border border-line bg-surface-2 p-4 text-sm">
                <Store className="mt-0.5 size-5 shrink-0 text-accent" />
                <div>
                  <div className="font-medium text-ink">Pay at the studio</div>
                  <p className="mt-0.5 text-muted">Your order is reserved now and paid at the front desk on your first visit. Passes activate immediately.</p>
                </div>
              </div>
            </div>
            <div className="border-t border-line bg-surface-2 px-6 py-5">
              <Button variant="primary" size="lg" className="w-full rounded-full" onClick={submit} disabled={busy}>
                {busy ? "Placing order…" : <>Reserve order · {money(subtotal + tax)}</>}
              </Button>
            </div>
          </>
        )}

        {step === "done" && result && (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <div className="relative mb-6 grid size-20 place-items-center">
              <span className="absolute inset-0 rounded-full bg-accent/30" style={{ animation: "ripple 1.6s ease-out infinite" }} />
              <span className="grid size-20 place-items-center rounded-full bg-accent text-accent-ink" style={{ animation: "check-pop .6s cubic-bezier(.2,.7,.2,1) both" }}><Check className="size-9" strokeWidth={2.5} /></span>
            </div>
            <div className="font-display text-3xl text-ink">Thank you, {c.firstName}.</div>
            <p className="mt-2 text-muted">Order <b className="font-mono text-ink">{result.ref}</b> is reserved — {money(result.total)} payable at the studio.</p>
            {result.isNew && (
              <div className="mt-6 w-full rounded-2xl border border-clay/30 bg-clay-soft p-4 text-left">
                <div className="flex items-center gap-2 font-medium text-ink"><ClipboardList className="size-4 text-clay" /> First time with us?</div>
                <p className="mt-1 text-sm text-ink-2">Fill in a short health & intake form so your instructor can tailor your first class.</p>
                <Link href={`/join?email=${encodeURIComponent(c.email)}&first=${encodeURIComponent(c.firstName)}&last=${encodeURIComponent(c.lastName)}`} onClick={() => setOpen(false)}>
                  <Button variant="primary" className="mt-3 w-full rounded-full">Complete intake form <ArrowRight /></Button>
                </Link>
              </div>
            )}
            <Link href="/#timetable" onClick={() => setOpen(false)} className={cn("mt-4 text-sm font-medium text-accent underline-offset-4 hover:underline")}>See this week&apos;s classes</Link>
          </div>
        )}
      </div>
    </Sheet>
  );
}
