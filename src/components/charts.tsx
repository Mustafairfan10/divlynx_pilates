"use client";
import type { ReactNode } from "react";

/** Shared tooltip shell for recharts — text uses ink tokens, a swatch carries identity. */
export function ChartTip({ active, payload, label, format, labelFormat }: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; dataKey?: string; payload?: Record<string, unknown> }[];
  label?: string | number;
  format?: (v: number, key?: string) => ReactNode;
  labelFormat?: (l: string | number) => ReactNode;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[140px] rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-md">
      {label != null && <div className="mb-1 font-medium text-ink">{labelFormat ? labelFormat(label) : label}</div>}
      {payload.map((p) => (
        <div key={String(p.dataKey ?? p.name)} className="flex items-center gap-2 text-ink-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="flex-1">{p.name}</span>
          <span className="font-semibold text-ink tnum">{format ? format(Number(p.value), String(p.dataKey)) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-2">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} /> {i.label}
        </span>
      ))}
    </div>
  );
}

/** Horizontal bar list — accessible, labelled, no axis needed. */
export function BarList({ rows, format, max }: { rows: { label: string; value: number; color?: string; sub?: string }[]; format?: (v: number) => string; max?: number }) {
  const m = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2 truncate text-ink-2">
              {r.color && <span className="size-2 shrink-0 rounded-full" style={{ background: r.color }} />}
              <span className="truncate">{r.label}</span>
              {r.sub && <span className="text-xs text-faint">{r.sub}</span>}
            </span>
            <span className="font-medium text-ink tnum">{format ? format(r.value) : r.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bg-elev" title={`${r.label}: ${format ? format(r.value) : r.value}`}>
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(r.value / m) * 100}%`, background: r.color ?? "var(--accent)" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
