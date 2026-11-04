"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { log } from "@/lib/logic";
import type { Member } from "@/lib/types";
import { uid } from "@/lib/utils";
import { Modal, useToast } from "../overlay";
import { Button, Field, Input, Select, Switch, Textarea } from "../ui";

const empty = (): Member => ({
  id: "", firstName: "", lastName: "", email: "", phone: "", status: "active", joinedAt: new Date().toISOString(),
  tags: [], waiverSigned: false, source: "Walk-in",
});

export function MemberForm({ open, onClose, member, onSaved }: { open: boolean; onClose: () => void; member?: Member | null; onSaved?: (m: Member) => void }) {
  const [m, setM] = useState<Member>(empty);
  const [tags, setTags] = useState("");
  const toast = useToast();
  useEffect(() => {
    if (!open) return;
    const base = member ?? empty();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setM(base);
    setTags(base.tags.join(", "));
  }, [open, member]);
  const set = <K extends keyof Member>(k: K, v: Member[K]) => setM((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!m.firstName.trim() || !m.lastName.trim()) return toast.error("First and last name are required");
    if (m.email && !/^\S+@\S+\.\S+$/.test(m.email)) return toast.error("Please enter a valid email");
    const rec: Member = { ...m, id: m.id || uid(), tags: tags.split(",").map((t) => t.trim()).filter(Boolean), firstName: m.firstName.trim(), lastName: m.lastName.trim() };
    await db.members.put(rec);
    if (!m.id) await log("member", `New member: ${rec.firstName} ${rec.lastName}`, rec.id);
    toast.success(m.id ? "Member updated" : "Member added");
    onSaved?.(rec);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={member ? "Edit member" : "New member"} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{member ? "Save changes" : "Add member"}</Button></>}>
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required><Input value={m.firstName} onChange={(e) => set("firstName", e.target.value)} autoFocus /></Field>
          <Field label="Last name" required><Input value={m.lastName} onChange={(e) => set("lastName", e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={m.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Phone"><Input type="tel" value={m.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Birthday"><Input type="date" value={m.birthday ? m.birthday.slice(0, 10) : ""} onChange={(e) => set("birthday", e.target.value ? new Date(e.target.value + "T12:00:00").toISOString() : undefined)} /></Field>
          <Field label="Status">
            <Select value={m.status} onChange={(e) => set("status", e.target.value as Member["status"])}>
              <option value="active">Active</option><option value="lead">Lead / prospect</option><option value="frozen">Frozen</option><option value="inactive">Inactive</option>
            </Select>
          </Field>
          <Field label="Lead source">
            <Select value={m.source ?? ""} onChange={(e) => set("source", e.target.value)}>
              {["Walk-in", "Instagram", "Referral", "Google", "ClassPass", "Corporate partner", "Other"].map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Tags" hint="Comma separated, e.g. Prenatal, VIP"><Input value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
        </section>

        <section className="rounded-2xl border border-line bg-surface-2 p-4">
          <h4 className="mb-3 text-sm font-semibold text-ink">Health & safety</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Injuries / health notes" className="sm:col-span-2" hint="Shown to instructors on the class roster.">
              <Textarea value={m.healthNotes ?? ""} onChange={(e) => set("healthNotes", e.target.value)} placeholder="e.g. Lower back sensitivity — avoid deep flexion" />
            </Field>
            <Field label="Emergency contact"><Input value={m.emergencyName ?? ""} onChange={(e) => set("emergencyName", e.target.value)} /></Field>
            <Field label="Emergency phone"><Input value={m.emergencyPhone ?? ""} onChange={(e) => set("emergencyPhone", e.target.value)} /></Field>
            <div className="sm:col-span-2"><Switch checked={m.waiverSigned} onChange={(v) => set("waiverSigned", v)} label="Liability waiver signed" description="Required before the first class." /></div>
          </div>
        </section>

        <section className="grid gap-4">
          <Field label="Goals"><Input value={m.goals ?? ""} onChange={(e) => set("goals", e.target.value)} placeholder="Posture, core strength, rehab…" /></Field>
          <Field label="Internal notes"><Textarea value={m.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></Field>
        </section>
      </div>
    </Modal>
  );
}
