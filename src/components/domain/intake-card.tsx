"use client";
import { ClipboardList, HeartPulse } from "lucide-react";
import type { Intake } from "@/lib/types";
import { CATEGORY_LABEL, ago, fmtDate } from "@/lib/utils";
import { Badge } from "../ui";

const EXP: Record<Intake["experience"], string> = { new: "Brand new", some: "Some experience", regular: "Practises regularly", instructor: "Very experienced" };

export function IntakeCard({ intake }: { intake: Intake }) {
  const rows: [string, string][] = [
    ["Experience", EXP[intake.experience]],
    ["Activity level", intake.activityLevel],
    ["Goals", intake.goals.join(", ") || "—"],
    ["Interested in", intake.interests.map((c) => CATEGORY_LABEL[c]).join(", ") || "—"],
    ["Preferred times", intake.preferredTimes.join(", ") || "—"],
    ["Sensitive areas", intake.injuries.join(", ") || "None reported"],
    ["Conditions", intake.conditions.join(", ") || "None reported"],
    ["Medications", intake.medications || "—"],
    ["Occupation", intake.occupation || "—"],
    ["Marketing", intake.marketingOptIn ? "Opted in" : "Opted out"],
  ];
  return (
    <div className="rounded-2xl border border-line">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink"><ClipboardList className="size-4 text-accent" /> Intake form</div>
        <div className="flex items-center gap-2">
          {intake.needsClearance && <Badge tone="warn"><HeartPulse className="size-3" /> Clearance needed</Badge>}
          <span className="text-xs text-muted" title={fmtDate(intake.submittedAt, "PPpp")}>Submitted {ago(intake.submittedAt)}</span>
        </div>
      </div>
      <dl className="grid gap-x-6 gap-y-3 p-4 text-sm sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="mt-0.5 text-ink first-letter:uppercase">{v}</dd></div>
        ))}
      </dl>
      {intake.bodyNotes && <p className="mx-4 mb-4 rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-2">{intake.bodyNotes}</p>}
      <div className="flex items-center gap-4 border-t border-line px-4 py-3">
        {intake.signatureImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={intake.signatureImage} alt="Signature" className="h-12 rounded-lg bg-white px-2 dark:invert" />
        ) : (
          <span className="font-display text-lg italic text-ink">{intake.signatureName}</span>
        )}
        <span className="text-xs text-muted">Waiver signed by {intake.signatureName} · {fmtDate(intake.submittedAt)}</span>
      </div>
    </div>
  );
}
