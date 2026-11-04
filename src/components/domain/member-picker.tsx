"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { HeartPulse } from "lucide-react";
import { useMemo, useState } from "react";
import { db } from "@/lib/db";
import { creditsLeft, membershipState } from "@/lib/logic";
import type { Member, Membership } from "@/lib/types";
import { cn, fullName, EMPTY } from "@/lib/utils";
import { Avatar, Badge, SearchInput } from "../ui";

export function creditSummary(ms: Membership[]) {
  const active = ms.filter((m) => membershipState(m) === "active");
  if (!active.length) return { label: "No active plan", tone: "bad" as const, active };
  if (active.some((m) => m.creditsTotal == null)) return { label: "Unlimited", tone: "accent" as const, active };
  const left = active.reduce((a, m) => a + creditsLeft(m), 0);
  return { label: `${left} credit${left === 1 ? "" : "s"}`, tone: left <= 2 ? ("warn" as const) : ("good" as const), active };
}

export function MemberPicker({ onPick, exclude = [], autoFocus = true }: { onPick: (m: Member) => void; exclude?: string[]; autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const members = useLiveQuery(() => db.members.toArray(), []) ?? EMPTY;
  const memberships = useLiveQuery(() => db.memberships.toArray(), []) ?? EMPTY;
  const byMember = useMemo(() => {
    const map = new Map<string, Membership[]>();
    memberships.forEach((m) => map.set(m.memberId, [...(map.get(m.memberId) ?? []), m]));
    return map;
  }, [memberships]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return members
      .filter((m) => !exclude.includes(m.id))
      .filter((m) => !s || fullName(m).toLowerCase().includes(s) || m.email.toLowerCase().includes(s) || m.phone.replace(/\s/g, "").includes(s.replace(/\s/g, "")))
      .sort((a, b) => fullName(a).localeCompare(fullName(b)))
      .slice(0, 60);
  }, [members, q, exclude]);

  return (
    <div className="space-y-3">
      <SearchInput value={q} onChange={setQ} placeholder="Search by name, email or phone" autoFocus={autoFocus} />
      <div className="max-h-[48vh] space-y-1 overflow-y-auto pr-1">
        {list.map((m) => {
          const cs = creditSummary(byMember.get(m.id) ?? []);
          return (
            <button
              key={m.id}
              onClick={() => onPick(m)}
              className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-bg-elev")}
            >
              <Avatar name={fullName(m)} id={m.id} size={34} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  {fullName(m)}
                  {m.healthNotes && <HeartPulse className="size-3.5 text-clay" aria-label="Has health notes" />}
                </div>
                <div className="truncate text-xs text-muted">{m.email}</div>
              </div>
              <Badge tone={cs.tone}>{cs.label}</Badge>
            </button>
          );
        })}
        {!list.length && <div className="py-8 text-center text-sm text-muted">No members match.</div>}
      </div>
    </div>
  );
}
