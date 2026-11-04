"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { addDays, format } from "date-fns";
import { Banknote, Check, CreditCard, Landmark, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useSettings } from "@/lib/hooks";
import { sellPlan } from "@/lib/logic";
import type { Member, PaymentMethod } from "@/lib/types";
import { cn, fullName, money, EMPTY } from "@/lib/utils";
import { Modal, useToast } from "../overlay";
import { Avatar, Badge, Button, Field, Input, Switch } from "../ui";
import { MemberPicker } from "./member-picker";

const METHODS: { v: PaymentMethod; label: string; icon: typeof CreditCard }[] = [
  { v: "card", label: "Card", icon: CreditCard },
  { v: "cash", label: "Cash", icon: Banknote },
  { v: "transfer", label: "Transfer", icon: Landmark },
  { v: "other", label: "Other", icon: Wallet },
];

export function SellModal({ open, onClose, memberId, planId }: { open: boolean; onClose: () => void; memberId?: string; planId?: string }) {
  const plans = useLiveQuery(() => db.plans.toArray(), []) ?? EMPTY;
  const settings = useSettings();
  const toast = useToast();
  const [member, setMember] = useState<Member | null>(null);
  const [plan, setPlan] = useState<string>("");
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [start, setStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setMember(memberId ? (await db.members.get(memberId)) ?? null : null);
    })();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlan(planId ?? ""); setDiscount(0); setPaid(true); setMethod("card"); setStart(format(new Date(), "yyyy-MM-dd"));
  }, [open, memberId, planId]);

  const p = plans.find((x) => x.id === plan);
  const sub = p ? Math.max(0, p.price - discount) : 0;
  const tax = sub * (settings.taxRate / 100);

  const submit = async () => {
    if (!member || !p) return;
    setBusy(true);
    try {
      const r = await sellPlan({ memberId: member.id, planId: p.id, method, startDate: start, discount, paid });
      toast.success(`${p.name} sold to ${member.firstName}`, `Invoice ${r.payment.invoiceNo} · ${money(r.payment.amount)}`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sale failed");
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Sell a membership" description="Creates the membership, invoice and activates the member." size="lg"
      footer={member && p ? (
        <>
          <div className="mr-auto text-sm text-muted">Total <span className="ml-1 font-display text-xl text-ink tnum">{money(sub + tax)}</span></div>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={busy}><Check /> Complete sale</Button>
        </>
      ) : undefined}>
      {!member ? (
        <div>
          <div className="mb-3 text-sm font-medium text-ink-2">1. Choose a member</div>
          <MemberPicker onPick={setMember} />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3">
            <Avatar name={fullName(member)} id={member.id} size={38} />
            <div className="flex-1">
              <div className="text-sm font-medium text-ink">{fullName(member)}</div>
              <div className="text-xs text-muted">{member.email}</div>
            </div>
            {!memberId && <Button size="sm" variant="ghost" onClick={() => setMember(null)}>Change</Button>}
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-ink-2">Plan</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {plans.filter((x) => x.active).map((x) => (
                <button key={x.id} onClick={() => setPlan(x.id)}
                  className={cn("relative rounded-2xl border p-4 text-left transition", plan === x.id ? "border-accent bg-accent-soft/60 ring-4 ring-accent/10" : "border-line bg-surface hover:border-line-strong")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-semibold text-ink">{x.name}</div>
                    {x.popular && <Badge tone="clay">Popular</Badge>}
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {x.credits == null ? "Unlimited classes" : `${x.credits} credit${x.credits > 1 ? "s" : ""}`} · {x.validityDays} days{x.privateOnly ? " · Private" : ""}
                  </div>
                  <div className="mt-3 font-display text-xl text-ink tnum">{money(x.price, { cents: false })}</div>
                </button>
              ))}
            </div>
          </div>

          {p && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Start date" hint={`Expires ${format(addDays(new Date(start + "T00:00:00"), p.validityDays - 1), "MMM d, yyyy")}`}>
                <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </Field>
              <Field label="Discount">
                <Input type="number" min={0} max={p.price} value={discount} onChange={(e) => setDiscount(Math.max(0, +e.target.value))} />
              </Field>
              <div className="sm:col-span-2">
                <div className="mb-2 text-[13px] font-medium text-ink-2">Payment method</div>
                <div className="grid grid-cols-4 gap-2">
                  {METHODS.map((m) => (
                    <button key={m.v} onClick={() => setMethod(m.v)}
                      className={cn("flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition", method === m.v ? "border-accent bg-accent-soft/60 text-ink" : "border-line text-muted hover:border-line-strong")}>
                      <m.icon className="size-5" /> {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2"><Switch checked={paid} onChange={setPaid} label="Payment received" description="Turn off to record as pending / invoice later." /></div>
              <div className="sm:col-span-2 space-y-1.5 rounded-2xl bg-surface-2 p-4 text-sm">
                <div className="flex justify-between text-muted"><span>{p.name}</span><span className="tnum">{money(p.price)}</span></div>
                {discount > 0 && <div className="flex justify-between text-muted"><span>Discount</span><span className="tnum">−{money(discount)}</span></div>}
                {settings.taxRate > 0 && <div className="flex justify-between text-muted"><span>Tax ({settings.taxRate}%)</span><span className="tnum">{money(tax)}</span></div>}
                <div className="flex justify-between border-t border-line pt-2 font-semibold text-ink"><span>Total</span><span className="tnum">{money(sub + tax)}</span></div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
