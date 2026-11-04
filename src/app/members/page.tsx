"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { addDays } from "date-fns";
import { ArrowDownUp, Download, HeartPulse, ShieldAlert, UserPlus, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { MEMBER_STATUS } from "@/components/domain/constants";
import { MemberForm } from "@/components/domain/member-form";
import { creditSummary } from "@/components/domain/member-picker";
import { MemberSheet } from "@/components/domain/member-sheet";
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, SearchInput, Segmented, Skeleton } from "@/components/ui";
import { db } from "@/lib/db";
import { useDebounced } from "@/lib/hooks";
import type { Membership } from "@/lib/types";
import { ago, cn, downloadFile, fmtDate, fullName, toCSV, EMPTY } from "@/lib/utils";

type Filter = "all" | "active" | "expiring" | "nocredit" | "lead" | "inactive";
type Sort = "name" | "recent" | "visits" | "joined";

export default function MembersPage() {
  return <Suspense><Members /></Suspense>;
}

function Members() {
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("name");
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const id = params.get("id");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (id) setOpen(id);
    if (params.get("new")) setCreating(true);
    if (id || params.get("new")) router.replace("/members");
  }, [params, router]);

  const members = useLiveQuery(() => db.members.toArray(), []);
  const memberships = useLiveQuery(() => db.memberships.toArray(), []);
  const visits = useLiveQuery(async () => {
    const bs = await db.bookings.where("status").equals("checked_in").toArray();
    const map = new Map<string, { n: number; last: string }>();
    bs.forEach((b) => {
      const v = map.get(b.memberId) ?? { n: 0, last: "" };
      v.n++;
      if ((b.checkedInAt ?? "") > v.last) v.last = b.checkedInAt ?? "";
      map.set(b.memberId, v);
    });
    return map;
  }, []);

  const msBy = useMemo(() => {
    const map = new Map<string, Membership[]>();
    (memberships ?? []).forEach((m) => map.set(m.memberId, [...(map.get(m.memberId) ?? []), m]));
    return map;
  }, [memberships]);

  const rows = useMemo(() => {
    if (!members) return [];
    const soon = addDays(new Date(), 10).toISOString();
    return members.map((m) => {
      const ms = msBy.get(m.id) ?? EMPTY;
      const cs = creditSummary(ms);
      const expiring = cs.active.some((x) => x.endDate <= soon);
      return { m, cs, expiring, v: visits?.get(m.id) ?? { n: 0, last: "" }, plan: cs.active[0]?.planName };
    });
  }, [members, msBy, visits]);

  const counts = useMemo(() => ({
    all: rows.length,
    active: rows.filter((r) => r.m.status === "active").length,
    expiring: rows.filter((r) => r.expiring).length,
    nocredit: rows.filter((r) => r.m.status === "active" && r.cs.active.length === 0).length,
    lead: rows.filter((r) => r.m.status === "lead").length,
    inactive: rows.filter((r) => r.m.status === "inactive" || r.m.status === "frozen").length,
  }), [rows]);

  const list = useMemo(() => {
    const s = dq.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (filter === "active" && r.m.status !== "active") return false;
      if (filter === "expiring" && !r.expiring) return false;
      if (filter === "nocredit" && !(r.m.status === "active" && r.cs.active.length === 0)) return false;
      if (filter === "lead" && r.m.status !== "lead") return false;
      if (filter === "inactive" && !(r.m.status === "inactive" || r.m.status === "frozen")) return false;
      if (!s) return true;
      return fullName(r.m).toLowerCase().includes(s) || r.m.email.toLowerCase().includes(s) || r.m.phone.includes(s) || r.m.tags.some((t) => t.toLowerCase().includes(s));
    });
    out.sort((a, b) => {
      if (sort === "recent") return b.v.last.localeCompare(a.v.last);
      if (sort === "visits") return b.v.n - a.v.n;
      if (sort === "joined") return b.m.joinedAt.localeCompare(a.m.joinedAt);
      return fullName(a.m).localeCompare(fullName(b.m));
    });
    return out;
  }, [rows, dq, filter, sort]);

  const exportCsv = () => {
    downloadFile("members.csv", toCSV(list.map((r) => ({
      first_name: r.m.firstName, last_name: r.m.lastName, email: r.m.email, phone: r.m.phone, status: r.m.status,
      plan: r.plan ?? "", credits: r.cs.label, visits: r.v.n, last_visit: r.v.last ? fmtDate(r.v.last) : "", joined: fmtDate(r.m.joinedAt),
      tags: r.m.tags.join("; "), health_notes: r.m.healthNotes ?? "",
    }))), "text/csv");
  };

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Members"
        subtitle={`${counts.active} active · ${counts.lead} leads · ${counts.expiring} renewals due soon`}
        actions={<>
          <Button onClick={exportCsv}><Download /> Export</Button>
          <Button variant="primary" onClick={() => setCreating(true)}><UserPlus /> New member</Button>
        </>}
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Search name, email, phone or tag" className="lg:w-80" />
        <Segmented value={filter} onChange={setFilter} options={[
          { value: "all", label: "All", count: counts.all },
          { value: "active", label: "Active", count: counts.active },
          { value: "expiring", label: "Renewing", count: counts.expiring },
          { value: "nocredit", label: "No plan", count: counts.nocredit },
          { value: "lead", label: "Leads", count: counts.lead },
          { value: "inactive", label: "Inactive", count: counts.inactive },
        ]} />
        <div className="flex items-center gap-2 lg:ml-auto">
          <ArrowDownUp className="size-4 text-muted" />
          <Segmented size="sm" value={sort} onChange={setSort} options={[
            { value: "name", label: "Name" }, { value: "recent", label: "Last visit" }, { value: "visits", label: "Visits" }, { value: "joined", label: "Newest" },
          ]} />
        </div>
      </div>

      <Card className="overflow-hidden">
        {!members ? (
          <div className="space-y-2 p-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : list.length === 0 ? (
          <EmptyState icon={<Users />} title={q ? "No matches" : "No members here yet"} description={q ? "Try a different name, email or tag." : "Add your first member to start booking classes."}
            action={!q && <Button variant="primary" onClick={() => setCreating(true)}><UserPlus /> Add member</Button>} />
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,2.2fr)_110px_minmax(0,1.6fr)_120px_90px_120px] gap-4 border-b border-line bg-surface-2 px-5 py-2.5 text-[11.5px] font-medium uppercase tracking-wider text-muted md:grid">
              <span>Member</span><span>Status</span><span>Plan</span><span>Credits</span><span className="text-right">Visits</span><span className="text-right">Last visit</span>
            </div>
            <ul className="divide-y divide-line">
              {list.map(({ m, cs, v, plan, expiring }) => (
                <li key={m.id}>
                  <button onClick={() => setOpen(m.id)} className="grid w-full grid-cols-[1fr_auto] items-center gap-4 px-5 py-3 text-left transition hover:bg-surface-2 md:grid-cols-[minmax(0,2.2fr)_110px_minmax(0,1.6fr)_120px_90px_120px]">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={fullName(m)} id={m.id} size={38} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-ink">
                          <span className="truncate">{fullName(m)}</span>
                          {m.healthNotes && <HeartPulse className="size-3.5 shrink-0 text-clay" aria-label="Health notes" />}
                          {!m.waiverSigned && <ShieldAlert className="size-3.5 shrink-0 text-warn" aria-label="Waiver missing" />}
                        </div>
                        <div className="truncate text-xs text-muted">{m.email || m.phone}</div>
                      </div>
                    </div>
                    <div className="hidden md:block"><Badge tone={MEMBER_STATUS[m.status].tone} dot>{MEMBER_STATUS[m.status].label}</Badge></div>
                    <div className="hidden min-w-0 md:block">
                      <div className="truncate text-sm text-ink-2">{plan ?? <span className="text-faint">—</span>}</div>
                      {expiring && <div className="text-[11px] text-warn">Renews soon</div>}
                    </div>
                    <div><Badge tone={cs.tone}>{cs.label}</Badge></div>
                    <div className="hidden text-right text-sm text-ink tnum md:block">{v.n}</div>
                    <div className={cn("hidden text-right text-[13px] md:block", v.last ? "text-ink-2" : "text-faint")}>{v.last ? ago(v.last) : "Never"}</div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <MemberSheet memberId={open} onClose={() => setOpen(null)} />
      <MemberForm open={creating} onClose={() => setCreating(false)} onSaved={(m) => setOpen(m.id)} />
    </div>
  );
}
