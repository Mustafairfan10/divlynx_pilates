"use client";
import { Briefcase, Store } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * One-tap switch between the public client site and the staff app.
 * `tone="paper"` renders in the public site's printed-form vocabulary;
 * `tone="app"` matches the staff app's controls.
 */
export function ViewSwitch({ current, tone, compact = false, className }: {
  current: "client" | "staff";
  tone: "paper" | "app";
  compact?: boolean;
  className?: string;
}) {
  const items = [
    { key: "client" as const, href: "/", label: "Client site", short: "Client", Icon: Store },
    { key: "staff" as const, href: "/admin", label: "Staff app", short: "Staff", Icon: Briefcase },
  ];

  if (tone === "paper") {
    return (
      <nav aria-label="Switch view" className={cn("f-narrow inline-flex items-stretch border border-rule-strong bg-paper text-[13px] font-semibold uppercase tracking-[0.06em]", className)}>
        {items.map((it, i) => {
          const on = it.key === current;
          return (
            <Link key={it.key} href={it.href} aria-current={on ? "page" : undefined} aria-label={it.label}
              className={cn("relative flex items-center gap-1.5 px-3 py-1.5 transition-colors", i > 0 && "border-l border-rule-strong",
                on ? "text-print" : "text-form hover:bg-ballpoint-soft hover:text-ballpoint")}>
              {on && (
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="pointer-events-none absolute -inset-x-1 -inset-y-1 h-[calc(100%+8px)] w-[calc(100%+8px)] overflow-visible text-ballpoint" aria-hidden>
                  <path d="M8 22 C 6 8, 40 3, 62 5 C 88 7, 97 14, 94 24 C 91 35, 55 38, 30 36 C 10 34, 3 26, 12 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                </svg>
              )}
              <it.Icon className="size-3.5" aria-hidden />
              {compact ? it.short : it.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Switch view" className={cn("inline-flex w-full rounded-xl border border-line bg-bg-elev p-1", className)}>
      {items.map((it) => {
        const on = it.key === current;
        return (
          <Link key={it.key} href={it.href} aria-current={on ? "page" : undefined} title={it.label} aria-label={it.label}
            className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] font-medium transition",
              on ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")}>
            <it.Icon className="size-3.5 shrink-0" aria-hidden />
            {!compact && it.short}
          </Link>
        );
      })}
    </nav>
  );
}
