"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { addDays, differenceInDays, format } from "date-fns";
import { CircleCheck, Pencil, Plus, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Modal, useConfirm, useToast } from "@/components/overlay";
import { Badge, Button, Card, EmptyState, Field, Input, Meter, PageHeader, Segmented, Select, Stat, Textarea } from "@/components/ui";
import { db } from "@/lib/db";
import { useLookups } from "@/lib/hooks";
import type { Equipment, EquipmentStatus, EquipmentType } from "@/lib/types";
import { cn, fmtDate, uid } from "@/lib/utils";

const TYPE_LABEL: Record<EquipmentType, string> = { reformer: "Reformer", cadillac: "Cadillac", chair: "Chair", barrel: "Barrel", tower: "Tower", mat: "Mats", accessory: "Accessory" };
const STATUS: Record<EquipmentStatus, { label: string; tone: "good" | "warn" | "bad" }> = {
  operational: { label: "Operational", tone: "good" }, maintenance: { label: "Maintenance", tone: "warn" }, out_of_service: { label: "Out of service", tone: "bad" },
};

function serviceInfo(e: Equipment, now = new Date()) {
  if (!e.lastServiceAt) return { due: null as Date | null, days: null as number | null, ratio: 0 };
  const due = addDays(new Date(e.lastServiceAt), e.serviceIntervalDays);
  const days = differenceInDays(due, now);
  const ratio = Math.min(1, differenceInDays(now, new Date(e.lastServiceAt)) / e.serviceIntervalDays);
  return { due, days, ratio };
}

export default function EquipmentPage() {
  const lk = useLookups();
  const toast = useToast();
  const items = useLiveQuery(() => db.equipment.toArray(), []);
  const [filter, setFilter] = useState<"all" | "attention" | EquipmentStatus>("all");
  const [editing, setEditing] = useState<Equipment | null | "new">(null);

  const rows = useMemo(() => (items ?? []).map((e) => ({ e, s: serviceInfo(e) })).sort((a, b) => (a.s.days ?? 9999) - (b.s.days ?? 9999)), [items]);
  const attention = rows.filter((r) => r.e.status !== "operational" || (r.s.days != null && r.s.days < 14));
  const list = rows.filter((r) => filter === "all" ? true : filter === "attention" ? attention.includes(r) : r.e.status === filter);

  const markServiced = async (e: Equipment) => {
    await db.equipment.update(e.id, { lastServiceAt: new Date().toISOString(), status: "operational" });
    toast.success(`${e.name} serviced`, "Next service scheduled automatically.");
  };

  return (
    <div>
      <PageHeader eyebrow="Operations" title="Equipment" subtitle="Track apparatus condition and service intervals so every spring is safe."
        actions={<Button variant="primary" onClick={() => setEditing("new")}><Plus /> Add equipment</Button>} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 md:gap-4">
        <Stat label="Total items" value={rows.length} icon={<Wrench />} />
        <Stat label="Operational" value={rows.filter((r) => r.e.status === "operational").length} />
        <Stat label="In maintenance / out" value={rows.filter((r) => r.e.status !== "operational").length} />
        <Stat label="Service due ≤ 14 days" value={rows.filter((r) => r.s.days != null && r.s.days < 14).length} />
      </div>

      <Segmented className="mb-4" value={filter} onChange={setFilter} options={[
        { value: "all", label: "All", count: rows.length },
        { value: "attention", label: "Needs attention", count: attention.length },
        { value: "operational", label: "Operational" },
        { value: "maintenance", label: "Maintenance" },
        { value: "out_of_service", label: "Out of service" },
      ]} />

      <Card className="overflow-hidden">
        {list.length === 0 ? <EmptyState icon={<Wrench />} title="Nothing here" description="No equipment matches this filter." /> : (
          <ul className="divide-y divide-line">
            {list.map(({ e, s }) => (
              <li key={e.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5 sm:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink">{e.name}</span>
                    <Badge>{TYPE_LABEL[e.type]}</Badge>
                  </div>
                  <div className="truncate text-xs text-muted">{lk.room.get(e.roomId ?? "")?.name ?? "Unassigned"}{e.serial ? ` · ${e.serial}` : ""}{e.notes ? ` · ${e.notes}` : ""}</div>
                </div>
                <div className="w-44">
                  {s.due ? (
                    <>
                      <div className="mb-1 flex justify-between text-[11px]">
                        <span className="text-muted">Service</span>
                        <span className={cn("font-medium tnum", s.days! < 0 ? "text-bad" : s.days! < 14 ? "text-warn" : "text-ink-2")}>
                          {s.days! < 0 ? `${-s.days!}d overdue` : `in ${s.days}d`}
                        </span>
                      </div>
                      <Meter value={s.ratio} max={1} tone={s.days! < 0 ? "bad" : s.days! < 14 ? "warn" : "good"} />
                      <div className="mt-1 text-[11px] text-faint">Last {fmtDate(e.lastServiceAt!, "MMM d, yyyy")}</div>
                    </>
                  ) : <span className="text-xs text-faint">No service history</span>}
                </div>
                <Badge tone={STATUS[e.status].tone} dot className="w-28 justify-center">{STATUS[e.status].label}</Badge>
                <div className="flex gap-1">
                  <Button size="sm" variant="soft" onClick={() => markServiced(e)}><CircleCheck /> Serviced</Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => setEditing(e)} aria-label="Edit"><Pencil /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <EquipmentForm open={editing !== null} value={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function EquipmentForm({ open, onClose, value }: { open: boolean; onClose: () => void; value: Equipment | null }) {
  const lk = useLookups();
  const toast = useToast();
  const confirm = useConfirm();
  const blank: Equipment = { id: "", name: "", type: "reformer", roomId: lk.rooms[0]?.id, serviceIntervalDays: 180, status: "operational", lastServiceAt: new Date().toISOString() };
  const [e, setE] = useState<Equipment>(blank);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setE(value ?? blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value]);
  const set = <K extends keyof Equipment>(k: K, v: Equipment[K]) => setE((x) => ({ ...x, [k]: v }));
  const save = async () => {
    if (!e.name.trim()) return toast.error("Name is required");
    await db.equipment.put({ ...e, id: e.id || uid() });
    toast.success("Equipment saved");
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={value ? "Edit equipment" : "Add equipment"}
      footer={<>
        {value && <Button variant="ghost" className="mr-auto text-bad" onClick={async () => { if (await confirm({ title: `Remove ${value.name}?`, confirmLabel: "Remove", danger: true })) { await db.equipment.delete(value.id); onClose(); } }}>Remove</Button>}
        <Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button>
      </>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2" required><Input value={e.name} onChange={(x) => set("name", x.target.value)} autoFocus placeholder="Reformer #11" /></Field>
        <Field label="Type"><Select value={e.type} onChange={(x) => set("type", x.target.value as EquipmentType)}>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Room"><Select value={e.roomId ?? ""} onChange={(x) => set("roomId", x.target.value || undefined)}><option value="">Unassigned</option>{lk.rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Field>
        <Field label="Status"><Select value={e.status} onChange={(x) => set("status", x.target.value as EquipmentStatus)}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
        <Field label="Serial number"><Input value={e.serial ?? ""} onChange={(x) => set("serial", x.target.value)} /></Field>
        <Field label="Last serviced"><Input type="date" value={e.lastServiceAt ? format(new Date(e.lastServiceAt), "yyyy-MM-dd") : ""} onChange={(x) => set("lastServiceAt", x.target.value ? new Date(x.target.value + "T12:00:00").toISOString() : undefined)} /></Field>
        <Field label="Service every (days)"><Input type="number" min={1} value={e.serviceIntervalDays} onChange={(x) => set("serviceIntervalDays", +x.target.value)} /></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea value={e.notes ?? ""} onChange={(x) => set("notes", x.target.value)} placeholder="Springs replaced, straps worn…" /></Field>
      </div>
    </Modal>
  );
}
