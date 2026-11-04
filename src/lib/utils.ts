import clsx, { type ClassValue } from "clsx";
import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday } from "date-fns";

export const cn = (...v: ClassValue[]) => clsx(v);

export const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

let _currency = "USD";
let _locale = "en-US";
export function setMoneyFormat(currency: string, locale: string) {
  _currency = currency || "USD";
  _locale = locale || "en-US";
}
export function money(n: number, opts: { compact?: boolean; cents?: boolean } = {}) {
  try {
    return new Intl.NumberFormat(_locale, {
      style: "currency",
      currency: _currency,
      notation: opts.compact ? "compact" : "standard",
      maximumFractionDigits: opts.compact ? 1 : opts.cents === false ? 0 : 2,
      minimumFractionDigits: opts.compact || opts.cents === false ? 0 : 2,
    }).format(n);
  } catch {
    return `${_currency} ${n.toFixed(2)}`;
  }
}
export const num = (n: number) => new Intl.NumberFormat(_locale).format(n);
export const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;

export const fullName = (m?: { firstName: string; lastName: string } | null) =>
  m ? `${m.firstName} ${m.lastName}`.trim() : "Unknown";
export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join("");

export const fmtDate = (d: string | Date, f = "MMM d, yyyy") => format(new Date(d), f);
export const fmtTime = (d: string | Date) => format(new Date(d), "h:mm a");
export const fmtRelDay = (d: string | Date) => {
  const date = new Date(d);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEE, MMM d");
};
export const ago = (d: string | Date) => formatDistanceToNowStrict(new Date(d), { addSuffix: true });

/** yyyy-MM-dd in local time */
export const dayKey = (d: Date | string) => format(new Date(d), "yyyy-MM-dd");

const AVATAR_TONES = ["#3d6b58", "#c0704a", "#6a5d8f", "#2f6f8f", "#9a6b2f", "#8a4f5f", "#4f7a3a", "#5b6470"];
export function toneFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

export function downloadFile(name: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toCSV(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

export const CATEGORY_LABEL: Record<string, string> = {
  reformer: "Reformer", mat: "Mat", tower: "Tower", chair: "Chair", barre: "Barre", private: "Private", other: "Other",
};
export const LEVEL_LABEL: Record<string, string> = {
  all: "All levels", beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced",
};
export const SERIES = Array.from({ length: 8 }, (_, i) => `var(--series-${i + 1})`);

/** Stable empty fallbacks for live queries (avoid new identities every render). */
export const EMPTY: never[] = [];
export const EMPTY_MAP = new Map<never, never>();
