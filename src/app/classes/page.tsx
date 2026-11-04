"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { Clock, Coins, DoorOpen, Pencil, Plus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Modal, useConfirm, useToast } from "@/components/overlay";
import { Badge, Button, Card, CardHeader, Field, Input, PageHeader, Select, Switch, Textarea } from "@/components/ui";
import { db } from "@/lib/db";
import { useLookups } from "@/lib/hooks";
import type { ClassCategory, ClassType, Level, Room } from "@/lib/types";
import { CATEGORY_LABEL, LEVEL_LABEL, SERIES, cn, uid, EMPTY, EMPTY_MAP } from "@/lib/utils";

export default function ClassesPage() {
  const lk = useLookups();
  const [ct, setCt] = useState<ClassType | null | "new">(null);
  const [room, setRoom] = useState<Room | null | "new">(null);
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? EMPTY;
  const usage = useMemo(() => {
    const m = new Map<string, number>();
    const now = new Date().toISOString();
    sessions.filter((s) => s.start >= now && !s.cancelled).forEach((s) => { m.set(s.classTypeId, (m.get(s.classTypeId) ?? 0) + 1); m.set(s.roomId, (m.get(s.roomId) ?? 0) + 1); });
    return m;
  }, [sessions]);
  const equipCount = useLiveQuery(async () => {
    const eq = await db.equipment.toArray();
    const m = new Map<string, number>();
    eq.forEach((e) => e.roomId && m.set(e.roomId, (m.get(e.roomId) ?? 0) + 1));
    return m;
  }, []) ?? EMPTY_MAP;

  return (
    <div>
      <PageHeader eyebrow="Operations" title="Classes & Rooms" subtitle="Define the formats you teach and the spaces you teach them in."
        actions={<>
          <Button onClick={() => setRoom("new")}><DoorOpen /> Add room</Button>
          <Button variant="primary" onClick={() => setCt("new")}><Plus /> New class type</Button>
        </>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {lk.classTypes.map((c, i) => (
          <Card key={c.id} className={cn("group relative overflow-hidden p-5 animate-rise", !c.active && "opacity-60")} style={{ animationDelay: `${i * 30}ms` }}>
            <div className="absolute inset-y-0 left-0 w-1" style={{ background: c.color }} />
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <Badge>{CATEGORY_LABEL[c.category]}</Badge>
                  <Badge tone="accent">{LEVEL_LABEL[c.level]}</Badge>
                  {!c.active && <Badge tone="warn">Hidden</Badge>}
                </div>
                <h3 className="font-display text-xl text-ink">{c.name}</h3>
              </div>
              <Button size="icon-sm" variant="ghost" onClick={() => setCt(c)} aria-label="Edit"><Pencil /></Button>
            </div>
            <p className="mt-2 line-clamp-2 min-h-[40px] text-sm text-muted">{c.description}</p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2">
              <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5 text-muted" />{c.duration} min</span>
              <span className="inline-flex items-center gap-1.5"><Users className="size-3.5 text-muted" />{c.defaultCapacity} spots</span>
              <span className="inline-flex items-center gap-1.5"><Coins className="size-3.5 text-muted" />{c.creditCost} credit{c.creditCost > 1 ? "s" : ""}</span>
            </div>
            <div className="mt-4 text-xs text-muted">{usage.get(c.id) ?? 0} upcoming sessions</div>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader title="Rooms" subtitle="Capacity caps class size" icon={<DoorOpen />} />
        <ul className="mt-3 divide-y divide-line">
          {lk.rooms.map((r) => (
            <li key={r.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="grid size-10 place-items-center rounded-xl bg-bg-elev font-display text-lg text-ink tnum">{r.capacity}</div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-ink">{r.name}</div>
                <div className="truncate text-xs text-muted">{r.description}</div>
              </div>
              <div className="hidden text-right text-xs text-muted sm:block">{equipCount.get(r.id) ?? 0} equipment · {usage.get(r.id) ?? 0} upcoming</div>
              <Button size="icon-sm" variant="ghost" onClick={() => setRoom(r)} aria-label="Edit room"><Pencil /></Button>
            </li>
          ))}
        </ul>
      </Card>

      <ClassTypeForm open={ct !== null} value={ct === "new" ? null : ct} onClose={() => setCt(null)} />
      <RoomForm open={room !== null} value={room === "new" ? null : room} onClose={() => setRoom(null)} />
    </div>
  );
}

function ClassTypeForm({ open, onClose, value }: { open: boolean; onClose: () => void; value: ClassType | null }) {
  const toast = useToast();
  const confirm = useConfirm();
  const blank: ClassType = { id: "", name: "", category: "reformer", level: "all", duration: 50, defaultCapacity: 10, creditCost: 1, color: SERIES[0], description: "", active: true };
  const [c, setC] = useState<ClassType>(blank);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setC(value ?? blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value]);
  const set = <K extends keyof ClassType>(k: K, v: ClassType[K]) => setC((x) => ({ ...x, [k]: v }));
  const save = async () => {
    if (!c.name.trim()) return toast.error("Name is required");
    await db.classTypes.put({ ...c, id: c.id || uid() });
    toast.success("Class type saved");
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={value ? "Edit class type" : "New class type"}
      footer={<>
        {value && <Button variant="ghost" className="mr-auto text-bad" onClick={async () => {
          const n = await db.sessions.where("classTypeId").equals(value.id).count();
          if (n) { await db.classTypes.update(value.id, { active: false }); toast.info("Hidden instead of deleted", `${n} sessions use this class type.`); onClose(); return; }
          if (await confirm({ title: "Delete class type?", confirmLabel: "Delete", danger: true })) { await db.classTypes.delete(value.id); onClose(); }
        }}>Delete</Button>}
        <Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button>
      </>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2" required><Input value={c.name} onChange={(e) => set("name", e.target.value)} autoFocus /></Field>
        <Field label="Category">
          <Select value={c.category} onChange={(e) => set("category", e.target.value as ClassCategory)}>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Level">
          <Select value={c.level} onChange={(e) => set("level", e.target.value as Level)}>
            {Object.entries(LEVEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Duration (min)"><Input type="number" min={15} value={c.duration} onChange={(e) => set("duration", +e.target.value)} /></Field>
        <Field label="Default capacity"><Input type="number" min={1} value={c.defaultCapacity} onChange={(e) => set("defaultCapacity", +e.target.value)} /></Field>
        <Field label="Credit cost" hint="Credits deducted per booking"><Input type="number" min={0} value={c.creditCost} onChange={(e) => set("creditCost", +e.target.value)} /></Field>
        <div>
          <div className="mb-1.5 text-[13px] font-medium text-ink-2">Calendar color</div>
          <div className="flex flex-wrap gap-2">
            {SERIES.map((s) => <button key={s} onClick={() => set("color", s)} className={cn("size-8 rounded-full ring-offset-2 ring-offset-surface", c.color === s && "ring-2 ring-ink")} style={{ background: s }} aria-label="color" />)}
          </div>
        </div>
        <Field label="Description" className="sm:col-span-2"><Textarea value={c.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <div className="sm:col-span-2"><Switch checked={c.active} onChange={(v) => set("active", v)} label="Active" description="Inactive class types are hidden when scheduling." /></div>
      </div>
    </Modal>
  );
}

function RoomForm({ open, onClose, value }: { open: boolean; onClose: () => void; value: Room | null }) {
  const toast = useToast();
  const [r, setR] = useState<Room>({ id: "", name: "", capacity: 10, description: "" });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setR(value ?? { id: "", name: "", capacity: 10, description: "" });
  }, [open, value]);
  const save = async () => {
    if (!r.name.trim()) return toast.error("Name is required");
    await db.rooms.put({ ...r, id: r.id || uid() });
    toast.success("Room saved");
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={value ? "Edit room" : "Add room"} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
      <div className="space-y-4">
        <Field label="Name" required><Input value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} autoFocus /></Field>
        <Field label="Capacity"><Input type="number" min={1} value={r.capacity} onChange={(e) => setR({ ...r, capacity: +e.target.value })} /></Field>
        <Field label="Description"><Textarea value={r.description} onChange={(e) => setR({ ...r, description: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
