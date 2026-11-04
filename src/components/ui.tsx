"use client";
import { ChevronDown, Search, X } from "lucide-react";
import {
  forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn, initials, toneFor } from "@/lib/utils";

/* ───────── Button ───────── */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft" | "outline";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";
const VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-strong shadow-sm dark:hover:brightness-110 dark:hover:bg-accent",
  secondary: "bg-surface text-ink border border-line hover:border-line-strong hover:bg-surface-2 shadow-sm",
  outline: "border border-line-strong text-ink hover:bg-surface-2",
  ghost: "text-ink-2 hover:bg-bg-elev hover:text-ink",
  soft: "bg-accent-soft text-accent-strong hover:brightness-95 dark:text-accent",
  danger: "bg-bad text-white hover:brightness-110 shadow-sm dark:text-[#1a0f0e]",
};
const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-xl",
  icon: "h-10 w-10 rounded-xl",
  "icon-sm": "h-8 w-8 rounded-lg",
};
export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }>(
  function Button({ className, variant = "secondary", size = "md", type = "button", ...p }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex shrink-0 select-none items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
          VARIANT[variant], SIZE[size], className,
        )}
        {...p}
      />
    );
  },
);

/* ───────── Form fields ───────── */
const fieldBase =
  "w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-faint shadow-sm transition-colors outline-none hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(fieldBase, "h-10", className)} {...p} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn(fieldBase, "min-h-[88px] py-2.5 leading-relaxed", className)} {...p} />;
});

export function Select({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn("relative", className)}>
      <select className={cn(fieldBase, "h-10 appearance-none pr-9")} {...p}>{children}</select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

export function Field({ label, hint, children, className, required }: { label: string; hint?: ReactNode; children: ReactNode; className?: string; required?: boolean }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-[13px] font-medium text-ink-2">{label}{required && <span className="text-clay"> *</span>}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search…", className, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; autoFocus?: boolean }) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(fieldBase, "h-10 pl-9 pr-8")}
      />
      {value && (
        <button onClick={() => onChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:text-ink" aria-label="Clear">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label?: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      {(label || description) && (
        <span>
          {label && <span className="block text-sm font-medium text-ink">{label}</span>}
          {description && <span className="block text-xs text-muted mt-0.5">{description}</span>}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-accent" : "bg-line-strong")}
      >
        <span className={cn("absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform", checked && "translate-x-5")} />
      </button>
    </label>
  );
}

/* ───────── Surfaces ───────── */
export function Card({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-line bg-surface shadow-sm", className)} {...p}>{children}</div>;
}

export function CardHeader({ title, subtitle, action, className, icon }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-5", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent [&_svg]:size-4.5">{icon}</div>}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between animate-rise">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted">{eyebrow}</div>}
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink md:text-[38px] md:leading-[1.1]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[15px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ───────── Badges ───────── */
type Tone = "neutral" | "accent" | "good" | "warn" | "bad" | "info" | "clay";
const TONE: Record<Tone, string> = {
  neutral: "bg-bg-elev text-ink-2 border-line",
  accent: "bg-accent-soft text-accent-strong border-transparent dark:text-accent",
  good: "bg-good-soft text-good border-transparent",
  warn: "bg-warn-soft text-warn border-transparent",
  bad: "bg-bad-soft text-bad border-transparent",
  info: "bg-info-soft text-info border-transparent",
  clay: "bg-clay-soft text-clay border-transparent",
};
export function Badge({ tone = "neutral", children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11.5px] font-medium", TONE[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ───────── Avatar ───────── */
export function Avatar({ name, id, size = 36, color, className }: { name: string; id?: string; size?: number; color?: string; className?: string }) {
  const bg = color ?? toneFor(id ?? name);
  return (
    <div
      className={cn("grid shrink-0 place-items-center rounded-full font-semibold text-white ring-2 ring-surface", className)}
      style={{ width: size, height: size, background: bg, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

/* ───────── Tabs (segmented) ───────── */
export function Segmented<T extends string>({ value, onChange, options, className, size = "md" }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; count?: number }[]; className?: string; size?: "sm" | "md";
}) {
  return (
    <div className={cn("inline-flex max-w-full overflow-x-auto rounded-xl border border-line bg-bg-elev p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex items-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-all",
            size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[13px]",
            value === o.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
          {o.count != null && (
            <span className={cn("rounded-md px-1.5 text-[11px] tnum", value === o.value ? "bg-accent-soft text-accent" : "bg-line/60 text-muted")}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ───────── Empty / Skeleton ───────── */
export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon && (
        <div className="mb-4 grid size-14 place-items-center rounded-2xl border border-line bg-surface-2 text-muted [&_svg]:size-6">{icon}</div>
      )}
      <h3 className="font-display text-lg text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-line/60", className)} />;
}

/* ───────── Stat tile ───────── */
export function Stat({ label, value, sub, icon, trend, className }: {
  label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; trend?: { value: number; label?: string }; className?: string;
}) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        {icon && <span className="grid size-8 place-items-center rounded-lg bg-bg-elev text-ink-2 [&_svg]:size-4">{icon}</span>}
      </div>
      <div className="mt-3 font-display text-[32px] leading-none tracking-tight text-ink tnum">{value}</div>
      <div className="mt-2.5 flex items-center gap-2 text-xs text-muted">
        {trend && (
          <span className={cn("rounded-md px-1.5 py-0.5 font-medium tnum", trend.value >= 0 ? "bg-good-soft text-good" : "bg-bad-soft text-bad")}>
            {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value).toFixed(0)}%
          </span>
        )}
        {sub}
      </div>
    </Card>
  );
}

/* ───────── Progress ───────── */
export function Meter({ value, max, className, tone = "accent" }: { value: number; max: number; className?: string; tone?: "accent" | "warn" | "bad" | "good" }) {
  const p = max > 0 ? Math.min(1, value / max) : 0;
  const color = { accent: "bg-accent", warn: "bg-warn", bad: "bg-bad", good: "bg-good" }[tone];
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-line/70", className)} role="meter" aria-valuenow={value} aria-valuemax={max}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", color)} style={{ width: `${p * 100}%` }} />
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px] text-muted">{children}</kbd>;
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px bg-line", className)} />;
}
