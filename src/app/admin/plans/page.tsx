"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, ExternalLink, Infinity as InfinityIcon, Package, Pencil, Plus, Sparkles, Ticket, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SellModal } from "@/components/domain/sell-modal";
import { Modal, useConfirm, useToast } from "@/components/overlay";
import { Badge, Button, Card, Field, Input, PageHeader, Segmented, Select, Switch, Textarea } from "@/components/ui";
import { db } from "@/lib/db";
import { membershipState } from "@/lib/logic";
import type { Plan, Product, ProductArt as ArtKind } from "@/lib/types";
import { ProductArt } from "@/components/site/art";
import { cn, money, uid, EMPTY } from "@/lib/utils";

const TYPE_LABEL: Record<Plan["type"], string> = { pack: "Class pack", unlimited: "Unlimited", intro: "Intro offer", private: "Private" };

export default function PlansPage() {
  const plans = useLiveQuery(() => db.plans.toArray(), []) ?? EMPTY;
  const memberships = useLiveQuery(() => db.memberships.toArray(), []) ?? EMPTY;
  const payments = useLiveQuery(() => db.payments.toArray(), []) ?? EMPTY;
  const [editing, setEditing] = useState<Plan | null | "new">(null);
  const [sell, setSell] = useState<string | null>(null);
  const [show, setShow] = useState<"active" | "archived">("active");

  const stats = useMemo(() => {
    const m = new Map<string, { active: number; sold: number; revenue: number }>();
    memberships.forEach((x) => {
      const s = m.get(x.planId) ?? { active: 0, sold: 0, revenue: 0 };
      s.sold++;
      if (membershipState(x) === "active") s.active++;
      m.set(x.planId, s);
    });
    const msPlan = new Map(memberships.map((x) => [x.id, x.planId]));
    payments.forEach((p) => {
      const pid = p.membershipId ? msPlan.get(p.membershipId) : undefined;
      if (!pid || p.status === "pending") return;
      const s = m.get(pid) ?? { active: 0, sold: 0, revenue: 0 };
      s.revenue += p.amount;
      m.set(pid, s);
    });
    return m;
  }, [memberships, payments]);

  const list = plans.filter((p) => (show === "active" ? p.active : !p.active)).sort((a, b) => a.price - b.price);

  return (
    <div>
      <PageHeader eyebrow="Business" title="Plans & Pricing" subtitle="Class packs, unlimited memberships, intro offers and private sessions."
        actions={<>
          <Segmented value={show} onChange={setShow} options={[{ value: "active", label: "Active", count: plans.filter((p) => p.active).length }, { value: "archived", label: "Archived", count: plans.filter((p) => !p.active).length }]} />
          <Button variant="primary" onClick={() => setEditing("new")}><Plus /> New plan</Button>
        </>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((p, i) => {
          const s = stats.get(p.id) ?? { active: 0, sold: 0, revenue: 0 };
          const per = p.credits ? p.price / p.credits : null;
          return (
            <Card key={p.id} className={cn("relative flex flex-col overflow-hidden p-6 animate-rise", p.popular && "border-accent/40 ring-4 ring-accent/10")} style={{ animationDelay: `${i * 40}ms` }}>
              {p.popular && <div className="absolute right-5 top-5"><Badge tone="clay"><Sparkles className="size-3" /> Most popular</Badge></div>}
              <Badge tone={p.type === "unlimited" ? "accent" : p.type === "intro" ? "info" : p.type === "private" ? "clay" : "neutral"} className="self-start">{TYPE_LABEL[p.type]}</Badge>
              <h3 className="mt-4 font-display text-[22px] leading-tight text-ink">{p.name}</h3>
              <p className="mt-1.5 min-h-[40px] text-sm text-muted">{p.description}</p>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-display text-[40px] leading-none text-ink tnum">{money(p.price, { cents: false })}</span>
                {per && p.credits! > 1 && <span className="text-sm text-muted">{money(per)} / class</span>}
              </div>
              <ul className="mt-5 space-y-2 text-sm text-ink-2">
                <li className="flex items-center gap-2">{p.credits == null ? <InfinityIcon className="size-4 text-accent" /> : <Check className="size-4 text-accent" />}{p.credits == null ? "Unlimited group classes" : `${p.credits} ${p.privateOnly ? "private session" : "class"}${p.credits > 1 ? "s" : ""}`}</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-accent" />Valid for {p.validityDays} days</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-accent" />{p.privateOnly ? "One-on-one, all apparatus" : "All group formats"}</li>
              </ul>
              <div className="mt-6 grid grid-cols-3 gap-2 rounded-xl bg-surface-2 p-3 text-center">
                <div><div className="text-[11px] text-muted">Active</div><div className="text-sm font-semibold text-ink tnum">{s.active}</div></div>
                <div><div className="text-[11px] text-muted">Sold</div><div className="text-sm font-semibold text-ink tnum">{s.sold}</div></div>
                <div><div className="text-[11px] text-muted">Revenue</div><div className="text-sm font-semibold text-ink tnum">{money(s.revenue, { compact: true })}</div></div>
              </div>
              <div className="mt-5 flex gap-2">
                <Button variant="primary" className="flex-1" onClick={() => setSell(p.id)} disabled={!p.active}><Users /> Sell</Button>
                <Button onClick={() => setEditing(p)}><Pencil /> Edit</Button>
              </div>
            </Card>
          );
        })}
        {list.length === 0 && (
          <Card className="col-span-full p-10 text-center text-sm text-muted"><Ticket className="mx-auto mb-3 size-6" />No {show} plans.</Card>
        )}
      </div>

      <ProductsSection />

      <PlanForm open={editing !== null} plan={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      <SellModal open={!!sell} onClose={() => setSell(null)} planId={sell ?? undefined} />
    </div>
  );
}

function PlanForm({ open, onClose, plan }: { open: boolean; onClose: () => void; plan: Plan | null }) {
  const toast = useToast();
  const confirm = useConfirm();
  const blank: Plan = { id: "", name: "", type: "pack", credits: 10, validityDays: 90, price: 250, description: "", active: true, privateOnly: false };
  const [p, setP] = useState<Plan>(blank);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setP(plan ?? blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plan]);
  const set = <K extends keyof Plan>(k: K, v: Plan[K]) => setP((x) => ({ ...x, [k]: v }));

  const save = async () => {
    if (!p.name.trim()) return toast.error("Give the plan a name");
    const rec = { ...p, id: p.id || uid(), credits: p.type === "unlimited" ? null : Math.max(1, p.credits ?? 1), privateOnly: p.type === "private" };
    if (rec.popular) {
      const others = await db.plans.filter((x) => !!x.popular && x.id !== rec.id).toArray();
      for (const o of others) await db.plans.update(o.id, { popular: false });
    }
    await db.plans.put(rec);
    toast.success(p.id ? "Plan updated" : "Plan created");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={plan ? "Edit plan" : "New plan"} description="Existing memberships keep the terms they were sold with."
      footer={<>
        {plan && <Button variant="ghost" className="mr-auto text-bad" onClick={async () => {
          const used = await db.memberships.where("planId").equals(plan.id).count();
          if (used) { await db.plans.update(plan.id, { active: false }); toast.info("Plan archived", "It has sales history, so it was archived instead of deleted."); onClose(); return; }
          if (await confirm({ title: "Delete plan?", confirmLabel: "Delete", danger: true })) { await db.plans.delete(plan.id); onClose(); }
        }}>Delete</Button>}
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save}>Save plan</Button>
      </>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2" required><Input value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. 10 Class Pack" autoFocus /></Field>
        <Field label="Type">
          <Select value={p.type} onChange={(e) => set("type", e.target.value as Plan["type"])}>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Price"><Input type="number" min={0} step="0.01" value={p.price} onChange={(e) => set("price", +e.target.value)} /></Field>
        {p.type !== "unlimited" && <Field label="Credits / sessions"><Input type="number" min={1} value={p.credits ?? 1} onChange={(e) => set("credits", +e.target.value)} /></Field>}
        <Field label="Valid for (days)"><Input type="number" min={1} value={p.validityDays} onChange={(e) => set("validityDays", +e.target.value)} /></Field>
        <Field label="Description" className="sm:col-span-2"><Textarea value={p.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <div className="space-y-4 sm:col-span-2">
          <Switch checked={p.active} onChange={(v) => set("active", v)} label="Available for sale" />
          <Switch checked={!!p.popular} onChange={(v) => set("popular", v)} label="Highlight as most popular" />
        </div>
      </div>
    </Modal>
  );
}

/* ───────── Retail products (sold in the public shop) ───────── */
const ARTS: ArtKind[] = ["socks", "bottle", "tote", "band", "towel", "mat", "ring", "giftcard"];
const TONES = ["#7e9c83", "#c8754e", "#2e4a3e", "#e4d6c1", "#c9a27a", "#b7c4b2", "#b98d5e", "#3d6b58", "#23382f", "#8a4f5f"];

function ProductsSection() {
  const products = useLiveQuery(() => db.products.toArray(), []) ?? EMPTY;
  const [editing, setEditing] = useState<Product | null | "new">(null);
  return (
    <section className="mt-12">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-ink">Retail products</h2>
          <p className="text-sm text-muted">
            Sold in the public <Link href="/shop" target="_blank" className="inline-flex items-center gap-1 text-accent hover:underline">studio shop <ExternalLink className="size-3" /></Link>. Online orders arrive in Payments as pending.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}><Package /> Add product</Button>
      </div>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-line">
          {products.map((p) => (
            <li key={p.id} className={cn("flex items-center gap-4 px-5 py-3", !p.active && "opacity-55")}>
              <div className="grid size-12 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${p.tone} 20%, var(--surface-2))` }}>
                <ProductArt art={p.art} tone={p.tone} className="size-10" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-medium text-ink">{p.name}{!p.active && <Badge>Hidden</Badge>}{p.badge && <Badge tone="clay">{p.badge}</Badge>}</div>
                <div className="truncate text-xs capitalize text-muted">{p.category} · {p.description}</div>
              </div>
              <div className="w-24 text-right">
                <div className={cn("text-sm font-medium tnum", p.stock <= 5 ? "text-bad" : p.stock <= 10 ? "text-warn" : "text-ink")}>{p.stock >= 999 ? "∞" : p.stock}</div>
                <div className="text-[11px] text-muted">in stock</div>
              </div>
              <div className="w-20 text-right font-semibold text-ink tnum">{money(p.price, { cents: false })}</div>
              <Button size="icon-sm" variant="ghost" onClick={() => setEditing(p)} aria-label="Edit product"><Pencil /></Button>
            </li>
          ))}
        </ul>
      </Card>
      <ProductForm open={editing !== null} value={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
    </section>
  );
}

function ProductForm({ open, onClose, value }: { open: boolean; onClose: () => void; value: Product | null }) {
  const toast = useToast();
  const confirm = useConfirm();
  const blank: Product = { id: "", name: "", category: "accessories", price: 20, description: "", stock: 10, art: "bottle", tone: TONES[0], active: true };
  const [p, setP] = useState<Product>(blank);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setP(value ?? blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value]);
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }));
  const save = async () => {
    if (!p.name.trim()) return toast.error("Name is required");
    await db.products.put({ ...p, id: p.id || uid(), badge: p.badge?.trim() || undefined });
    toast.success("Product saved");
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={value ? "Edit product" : "Add product"}
      footer={<>
        {value && <Button variant="ghost" className="mr-auto text-bad" onClick={async () => { if (await confirm({ title: `Delete ${value.name}?`, confirmLabel: "Delete", danger: true })) { await db.products.delete(value.id); onClose(); } }}>Delete</Button>}
        <Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button>
      </>}>
      <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
        <div className="grid aspect-square place-items-center rounded-2xl" style={{ background: `color-mix(in srgb, ${p.tone} 20%, var(--surface-2))` }}>
          <ProductArt art={p.art} tone={p.tone} className="size-24" />
        </div>
        <div className="grid gap-4">
          <Field label="Name" required><Input value={p.name} onChange={(e) => set("name", e.target.value)} autoFocus /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Price"><Input type="number" min={0} step="0.01" value={p.price} onChange={(e) => set("price", +e.target.value)} /></Field>
            <Field label="Stock"><Input type="number" min={0} value={p.stock} onChange={(e) => set("stock", +e.target.value)} /></Field>
            <Field label="Category">
              <Select value={p.category} onChange={(e) => set("category", e.target.value as Product["category"])}>
                <option value="apparel">Apparel</option><option value="equipment">Equipment</option><option value="accessories">Accessories</option><option value="gift">Gift</option>
              </Select>
            </Field>
          </div>
        </div>
        <Field label="Description" className="sm:col-span-2"><Textarea value={p.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <div className="sm:col-span-2">
          <div className="mb-1.5 text-[13px] font-medium text-ink-2">Illustration</div>
          <div className="flex flex-wrap gap-2">
            {ARTS.map((a) => (
              <button key={a} onClick={() => set("art", a)} className={cn("grid size-12 place-items-center rounded-xl border", p.art === a ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong")} aria-label={a}>
                <ProductArt art={a} tone={p.tone} className="size-9" />
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <div className="mb-1.5 text-[13px] font-medium text-ink-2">Colour</div>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => <button key={t} onClick={() => set("tone", t)} className={cn("size-8 rounded-full ring-offset-2 ring-offset-surface", p.tone === t && "ring-2 ring-ink")} style={{ background: t }} aria-label={t} />)}
          </div>
        </div>
        <Field label="Badge" hint="Optional, e.g. New, Instructor pick"><Input value={p.badge ?? ""} onChange={(e) => set("badge", e.target.value)} /></Field>
        <div className="flex items-end pb-2"><Switch checked={p.active} onChange={(v) => set("active", v)} label="Visible in shop" /></div>
      </div>
    </Modal>
  );
}
