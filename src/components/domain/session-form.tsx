"use client";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useLookups } from "@/lib/hooks";
import { createSessions, type SessionDraft } from "@/lib/logic";
import type { Session } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Modal, useToast } from "../overlay";
import { Button, Field, Input, Select, Textarea } from "../ui";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function SessionForm({ open, onClose, initial, editing }: {
  open: boolean; onClose: () => void; initial?: { date?: Date }; editing?: Session | null;
}) {
  const lk = useLookups();
  const toast = useToast();
  const blank = (): SessionDraft => {
    const d = initial?.date ?? new Date();
    return {
      classTypeId: lk.classTypes[0]?.id ?? "", instructorId: lk.instructors[0]?.id ?? "", roomId: lk.rooms[0]?.id ?? "",
      date: format(d, "yyyy-MM-dd"), time: initial?.date ? format(d, "HH:mm") : "09:00",
      duration: lk.classTypes[0]?.duration ?? 50, capacity: lk.classTypes[0]?.defaultCapacity ?? 10,
      notes: "", repeatWeeks: 1, weekdays: [],
    };
  };
  const [d, setD] = useState<SessionDraft>(blank);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const s = new Date(editing.start);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setD({
        classTypeId: editing.classTypeId, instructorId: editing.instructorId, roomId: editing.roomId,
        date: format(s, "yyyy-MM-dd"), time: format(s, "HH:mm"), duration: editing.duration, capacity: editing.capacity,
        notes: editing.notes ?? "", repeatWeeks: 1, weekdays: [],
      });
    } else setD(blank());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, lk.ready]);

  const set = <K extends keyof SessionDraft>(k: K, v: SessionDraft[K]) => setD((p) => ({ ...p, [k]: v }));
  const onClassType = (id: string) => {
    const ct = lk.classType.get(id);
    const room = lk.room.get(d.roomId);
    setD((p) => ({
      ...p, classTypeId: id, duration: ct?.duration ?? p.duration,
      capacity: Math.min(ct?.defaultCapacity ?? p.capacity, room?.capacity ?? 99),
    }));
  };
  const room = lk.room.get(d.roomId);
  const overCap = room && d.capacity > room.capacity;

  const save = async () => {
    if (!d.classTypeId || !d.instructorId || !d.roomId) return toast.error("Choose a class, instructor and room");
    if (editing) {
      const start = new Date(`${d.date}T${d.time}:00`);
      await db.sessions.update(editing.id, {
        classTypeId: d.classTypeId, instructorId: d.instructorId, roomId: d.roomId, start: start.toISOString(),
        duration: d.duration, capacity: d.capacity, notes: d.notes,
      });
      toast.success("Session updated");
    } else {
      const out = await createSessions(d);
      toast.success(out.length > 1 ? `${out.length} sessions scheduled` : "Session scheduled");
    }
    onClose();
  };

  const count = Math.max(1, d.repeatWeeks) * Math.max(1, d.weekdays.length || 1);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit session" : "Schedule a class"}
      description={editing ? "Changes apply to this session only." : "Create a one-off class or a recurring series."}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save}>{editing ? "Save changes" : count > 1 ? `Create ${count} sessions` : "Create session"}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Class" className="sm:col-span-2" required>
          <Select value={d.classTypeId} onChange={(e) => onClassType(e.target.value)}>
            {lk.classTypes.filter((c) => c.active || c.id === d.classTypeId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Instructor" required>
          <Select value={d.instructorId} onChange={(e) => set("instructorId", e.target.value)}>
            {lk.instructors.filter((i) => i.active || i.id === d.instructorId).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </Select>
        </Field>
        <Field label="Room" required>
          <Select value={d.roomId} onChange={(e) => set("roomId", e.target.value)}>
            {lk.rooms.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.capacity} spots</option>)}
          </Select>
        </Field>
        <Field label="Date" required><Input type="date" value={d.date} onChange={(e) => set("date", e.target.value)} /></Field>
        <Field label="Start time" required><Input type="time" value={d.time} step={300} onChange={(e) => set("time", e.target.value)} /></Field>
        <Field label="Duration (minutes)"><Input type="number" min={15} max={180} value={d.duration} onChange={(e) => set("duration", +e.target.value)} /></Field>
        <Field label="Capacity" hint={overCap ? <span className="text-warn">Exceeds room capacity ({room?.capacity})</span> : undefined}>
          <Input type="number" min={1} max={60} value={d.capacity} onChange={(e) => set("capacity", +e.target.value)} />
        </Field>
        {!editing && (
          <div className="sm:col-span-2 rounded-2xl border border-line bg-surface-2 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-ink">Repeat weekly</div>
                <div className="text-xs text-muted">Pick days, then how many weeks to generate.</div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Input type="number" min={1} max={52} value={d.repeatWeeks} onChange={(e) => set("repeatWeeks", Math.max(1, +e.target.value))} className="h-9 w-20" />
                <span className="text-muted">weeks</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {WD.map((w, i) => {
                const on = d.weekdays.includes(i);
                return (
                  <button
                    key={w}
                    onClick={() => set("weekdays", on ? d.weekdays.filter((x) => x !== i) : [...d.weekdays, i].sort())}
                    className={cn("h-9 w-12 rounded-lg border text-[13px] font-medium transition", on ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface text-ink-2 hover:border-line-strong")}
                  >
                    {w}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={d.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Theme, playlist, props needed…" />
        </Field>
      </div>
    </Modal>
  );
}
