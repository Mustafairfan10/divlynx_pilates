"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { format, startOfMonth, subDays, subMonths } from "date-fns";
import { CircleCheck, CreditCard, Download, Plus, Printer, Receipt, Undo2, Wallet } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/shell";
import { MemberPicker } from "@/components/domain/member-picker";
import { SellModal } from "@/components/domain/sell-modal";
import { Modal, useConfirm, useToast } from "@/components/overlay";
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, PageHeader, SearchInput, Segmented, Select, Skeleton, Stat } from "@/components/ui";
import { db } from "@/lib/db";
import { useDebounced, useLookups, useSettings } from "@/lib/hooks";
import { recordPayment, refundPayment } from "@/lib/logic";
import type { Member, Payment, PaymentMethod, PaymentType } from "@/lib/types";
import { cn, downloadFile, fmtDate, fullName, money, toCSV } from "@/lib/utils";

const TYPE_LABEL: Record<PaymentType, string> = { membership: "Membership", drop_in: "Drop-in", retail: "Retail", fee: "Fee", refund: "Refund" };
type Range = "30" | "month" | "90" | "all";

export default function PaymentsPage() {
  return <Suspense><Payments /></Suspense>;
}

function Payments() {
  const lk = useLookups();
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [range, setRange] = useState<Range>("30");
  const [type, setType] = useState<"" | PaymentType>("");
  const [sell, setSell] = useState(false);
  const [record, setRecord] = useState(false);
  const [invoice, setInvoice] = useState<Payment | null>(null);

  useEffect(() => {
    if (params.get("sell")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSell(true);
      router.replace("/payments");
    }
  }, [params, router]);

  const payments = useLiveQuery(() => db.payments.orderBy("date").reverse().toArray(), []);
  const now = useMemo(() => new Date(), []);
  const fromIso = useMemo(() => (range === "30" ? subDays(now, 30) : range === "month" ? startOfMonth(now) : range === "90" ? subDays(now, 90) : new Date(0)).toISOString(), [range, now]);

  const list = useMemo(() => {
    const s = dq.trim().toLowerCase();
    return (payments ?? []).filter((p) => p.date >= fromIso && (!type || p.type === type) &&
      (!s || p.description.toLowerCase().includes(s) || p.invoiceNo.toLowerCase().includes(s) || fullName(lk.member.get(p.memberId ?? "")).toLowerCase().includes(s)));
  }, [payments, fromIso, type, dq, lk.member]);

  const kpi = useMemo(() => {
    const ps = payments ?? [];
    const sum = (f: (p: Payment) => boolean) => ps.filter(f).reduce((a, p) => a + p.amount, 0);
    const m0 = startOfMonth(now).toISOString(), m1 = startOfMonth(subMonths(now, 1)).toISOString();
    return {
      month: sum((p) => p.status !== "pending" && p.date >= m0),
      last: sum((p) => p.status !== "pending" && p.date >= m1 && p.date < m0),
      pending: sum((p) => p.status === "pending"),
      pendingN: ps.filter((p) => p.status === "pending").length,
      refunds: -sum((p) => p.type === "refund" && p.date >= subDays(now, 30).toISOString()),
      inRange: list.filter((p) => p.status !== "pending").reduce((a, p) => a + p.amount, 0),
    };
  }, [payments, list, now]);

  const exportCsv = () => downloadFile(`payments-${format(now, "yyyy-MM-dd")}.csv`, toCSV(list.map((p) => ({
    invoice: p.invoiceNo, date: fmtDate(p.date), member: fullName(lk.member.get(p.memberId ?? "")), description: p.description,
    type: p.type, method: p.method, status: p.status, tax: p.tax, amount: p.amount,
  }))), "text/csv");

  return (
    <div>
      <PageHeader eyebrow="Business" title="Payments" subtitle="Every sale, refund and invoice — recorded on this device."
        actions={<>
          <Button onClick={exportCsv}><Download /> Export</Button>
          <Button onClick={() => setRecord(true)}><Plus /> Record payment</Button>
          <Button variant="primary" onClick={() => setSell(true)}><CreditCard /> Sell membership</Button>
        </>} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 md:gap-4">
        <Stat label="This month" value={money(kpi.month, { cents: false })} trend={kpi.last ? { value: ((kpi.month - kpi.last) / kpi.last) * 100 } : undefined} sub="vs last full month" icon={<Wallet />} />
        <Stat label="Last month" value={money(kpi.last, { cents: false })} icon={<Receipt />} />
        <Stat label="Pending" value={money(kpi.pending, { cents: false })} sub={`${kpi.pendingN} unpaid invoice${kpi.pendingN === 1 ? "" : "s"}`} icon={<CreditCard />} />
        <Stat label="Refunds (30d)" value={money(kpi.refunds, { cents: false })} icon={<Undo2 />} />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Search invoice, member, item" className="lg:w-80" />
        <Segmented value={range} onChange={setRange} options={[{ value: "30", label: "30 days" }, { value: "month", label: "This month" }, { value: "90", label: "90 days" }, { value: "all", label: "All time" }]} />
        <Select value={type} onChange={(e) => setType(e.target.value as PaymentType | "")} className="w-[160px]">
          <option value="">All types</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <div className="text-sm text-muted lg:ml-auto">{list.length} transactions · <span className="font-semibold text-ink tnum">{money(kpi.inRange)}</span></div>
      </div>

      <Card className="overflow-hidden">
        {!payments ? <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div> :
          list.length === 0 ? <EmptyState icon={<Receipt />} title="No transactions" description="Nothing matches this range and filter." /> : (
            <>
              <div className="hidden grid-cols-[110px_minmax(0,1.4fr)_minmax(0,1.6fr)_100px_90px_110px_80px] gap-4 border-b border-line bg-surface-2 px-5 py-2.5 text-[11.5px] font-medium uppercase tracking-wider text-muted md:grid">
                <span>Invoice</span><span>Member</span><span>Item</span><span>Method</span><span>Status</span><span className="text-right">Amount</span><span />
              </div>
              <ul className="divide-y divide-line">
                {list.slice(0, 300).map((p) => {
                  const m = lk.member.get(p.memberId ?? "");
                  return (
                    <li key={p.id} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3 text-sm md:grid-cols-[110px_minmax(0,1.4fr)_minmax(0,1.6fr)_100px_90px_110px_80px]">
                      <div className="hidden md:block">
                        <div className="font-mono text-[12px] text-ink-2">{p.invoiceNo}</div>
                        <div className="text-[11px] text-muted">{fmtDate(p.date, "MMM d, yyyy")}</div>
                      </div>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar name={m ? fullName(m) : "Walk in"} id={p.memberId ?? "walkin"} size={30} />
                        <div className="min-w-0">
                          <div className="truncate font-medium text-ink">{m ? fullName(m) : "Walk-in"}</div>
                          <div className="truncate text-xs text-muted md:hidden">{p.description} · {fmtDate(p.date, "MMM d")}</div>
                        </div>
                      </div>
                      <div className="hidden min-w-0 md:block">
                        <div className="truncate text-ink-2">{p.description}</div>
                        <div className="text-[11px] text-muted">{TYPE_LABEL[p.type]}</div>
                      </div>
                      <div className="hidden capitalize text-ink-2 md:block">{p.method}</div>
                      <div className="hidden md:block">
                        <Badge tone={p.status === "paid" ? "good" : p.status === "pending" ? "warn" : "neutral"}>{p.status}</Badge>
                      </div>
                      <div className={cn("text-right font-semibold tnum", p.amount < 0 ? "text-bad" : "text-ink")}>{money(p.amount)}</div>
                      <div className="hidden justify-end gap-0.5 md:flex">
                        {p.status === "pending" && <Button size="icon-sm" variant="ghost" title="Mark paid" onClick={async () => { await db.payments.update(p.id, { status: "paid", date: new Date().toISOString() }); toast.success("Marked as paid"); }}><CircleCheck /></Button>}
                        <Button size="icon-sm" variant="ghost" title="Invoice" onClick={() => setInvoice(p)}><Printer /></Button>
                        {p.status === "paid" && p.type !== "refund" && (
                          <Button size="icon-sm" variant="ghost" title="Refund" onClick={async () => {
                            const ok = await confirm({ title: `Refund ${money(p.amount)}?`, message: p.membershipId ? "The linked membership will be cancelled." : "A refund transaction will be recorded.", confirmLabel: "Issue refund", danger: true });
                            if (ok) { await refundPayment(p.id, true); toast.success("Refund issued"); }
                          }}><Undo2 /></Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
      </Card>

      <SellModal open={sell} onClose={() => setSell(false)} />
      <RecordPayment open={record} onClose={() => setRecord(false)} />
      <InvoiceModal payment={invoice} onClose={() => setInvoice(null)} member={invoice?.memberId ? lk.member.get(invoice.memberId) : undefined} />
    </div>
  );
}

function RecordPayment({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const settings = useSettings();
  const [member, setMember] = useState<Member | null>(null);
  const [pick, setPick] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState(0);
  const [ptype, setPtype] = useState<PaymentType>("retail");
  const [method, setMethod] = useState<PaymentMethod>("card");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) { setMember(null); setDesc(""); setAmount(0); setPtype("retail"); setMethod("card"); }
  }, [open]);

  const save = async () => {
    if (!desc || amount <= 0) return toast.error("Add a description and amount");
    const tax = +(amount * settings.taxRate / (100 + settings.taxRate)).toFixed(2);
    const p = await recordPayment({ memberId: member?.id, amount, tax, method, type: ptype, description: desc, date: new Date().toISOString(), status: "paid" });
    toast.success("Payment recorded", `${p.invoiceNo} · ${money(amount)}`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Record a payment" description="Retail, drop-in or fee. For plans, use Sell membership."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Record {amount > 0 ? money(amount) : ""}</Button></>}>
      {pick ? <MemberPicker onPick={(m) => { setMember(m); setPick(false); }} /> : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <div className="mb-1.5 text-[13px] font-medium text-ink-2">Member (optional)</div>
            <button onClick={() => setPick(true)} className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-left text-sm hover:border-line-strong">
              {member ? <><Avatar name={fullName(member)} id={member.id} size={28} /><span className="flex-1 text-ink">{fullName(member)}</span><span className="text-xs text-accent">Change</span></> : <span className="text-muted">Walk-in customer — tap to choose a member</span>}
            </button>
          </div>
          <Field label="Type">
            <Select value={ptype} onChange={(e) => setPtype(e.target.value as PaymentType)}>
              <option value="retail">Retail</option><option value="drop_in">Drop-in</option><option value="fee">Fee (late cancel, no-show…)</option>
            </Select>
          </Field>
          <Field label="Method">
            <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              <option value="card">Card</option><option value="cash">Cash</option><option value="transfer">Transfer</option><option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Description" required><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Grip socks" /></Field>
          <Field label="Amount (incl. tax)" required><Input type="number" min={0} step="0.01" value={amount || ""} onChange={(e) => setAmount(+e.target.value)} /></Field>
        </div>
      )}
    </Modal>
  );
}

function InvoiceModal({ payment, onClose, member }: { payment: Payment | null; onClose: () => void; member?: Member }) {
  const s = useSettings();
  if (!payment) return null;
  const net = payment.amount - payment.tax;
  return (
    <Modal open={!!payment} onClose={onClose} title={`Invoice ${payment.invoiceNo}`} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button variant="primary" onClick={() => window.print()}><Printer /> Print / PDF</Button></>}>
      <div className="print-area rounded-2xl border border-line bg-white p-8 text-[#1d1b18]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Logo size={40} />
            <div>
              <div className="font-display text-xl">{s.studioName}</div>
              <div className="text-xs text-[#7a746a]">{s.address}</div>
              <div className="text-xs text-[#7a746a]">{s.email} · {s.phone}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest text-[#7a746a]">{payment.type === "refund" ? "Credit note" : "Invoice"}</div>
            <div className="font-mono text-sm">{payment.invoiceNo}</div>
            <div className="text-xs text-[#7a746a]">{fmtDate(payment.date)}</div>
          </div>
        </div>
        <div className="mt-8 text-sm">
          <div className="text-xs uppercase tracking-widest text-[#7a746a]">Billed to</div>
          <div className="mt-1 font-medium">{member ? fullName(member) : "Walk-in customer"}</div>
          {member?.email && <div className="text-[#4a463f]">{member.email}</div>}
        </div>
        <table className="mt-8 w-full text-sm">
          <thead><tr className="border-b border-[#e6e0d6] text-left text-xs uppercase tracking-wider text-[#7a746a]"><th className="py-2">Item</th><th className="py-2 text-right">Amount</th></tr></thead>
          <tbody>
            <tr className="border-b border-[#e6e0d6]"><td className="py-3">{payment.description}</td><td className="py-3 text-right tnum">{money(net)}</td></tr>
          </tbody>
        </table>
        <div className="ml-auto mt-4 w-60 space-y-1 text-sm">
          <div className="flex justify-between text-[#4a463f]"><span>Subtotal</span><span className="tnum">{money(net)}</span></div>
          <div className="flex justify-between text-[#4a463f]"><span>Tax</span><span className="tnum">{money(payment.tax)}</span></div>
          <div className="flex justify-between border-t border-[#e6e0d6] pt-2 text-base font-semibold"><span>Total</span><span className="tnum">{money(payment.amount)}</span></div>
        </div>
        <div className="mt-8 flex items-center justify-between text-xs text-[#7a746a]">
          <span>Paid by {payment.method} · Status: {payment.status}</span>
          <span>Thank you for moving with us.</span>
        </div>
      </div>
    </Modal>
  );
}
