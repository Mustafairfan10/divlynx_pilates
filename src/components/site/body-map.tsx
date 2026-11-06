"use client";
import { cn } from "@/lib/utils";

export const BODY_AREAS = ["Neck", "Shoulders", "Upper back", "Lower back", "Wrists", "Hips", "Knees", "Ankles & feet"] as const;

const SPOTS: Record<(typeof BODY_AREAS)[number], [number, number][]> = {
  Neck: [[100, 70]],
  Shoulders: [[66, 90], [134, 90]],
  "Upper back": [[100, 112]],
  "Lower back": [[100, 168]],
  Wrists: [[45, 198], [155, 198]],
  Hips: [[80, 206], [120, 206]],
  Knees: [[86, 300], [114, 300]],
  "Ankles & feet": [[87, 390], [113, 390]],
};

/** Tap the body to flag sensitive areas. Chips mirror the map for keyboard and screen-reader users. */
export function BodyMap({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (a: string) => onChange(value.includes(a) ? value.filter((x) => x !== a) : [...value, a]);
  return (
    <div className="grid items-center gap-8 sm:grid-cols-[220px_1fr]">
      <svg viewBox="0 0 200 420" className="mx-auto w-[200px] select-none" role="img" aria-label="Body map">
        <defs>
          <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dfe8e0" />
            <stop offset="1" stopColor="#cfdccf" />
          </linearGradient>
        </defs>
        <g fill="url(#skin)" stroke="#8fae94" strokeWidth="1.5">
          <circle cx="100" cy="38" r="21" />
          <path d="M92 56 h16 v14 h-16z" />
          <path d="M68 80 Q100 70 132 80 L140 150 Q134 188 126 212 L74 212 Q66 188 60 150 Z" />
        </g>
        <g fill="none" stroke="#cfdccf" strokeLinecap="round">
          <path d="M66 86 Q50 140 45 198" strokeWidth="17" />
          <path d="M134 86 Q150 140 155 198" strokeWidth="17" />
          <path d="M87 210 L85 300 L87 392" strokeWidth="22" />
          <path d="M113 210 L115 300 L113 392" strokeWidth="22" />
        </g>
        <g fill="none" stroke="#8fae94" strokeWidth="1" opacity=".6">
          <path d="M66 86 Q50 140 45 198" /><path d="M134 86 Q150 140 155 198" />
          <path d="M87 210 L85 300 L87 392" /><path d="M113 210 L115 300 L113 392" />
        </g>
        {BODY_AREAS.map((a) => SPOTS[a].map(([x, y], i) => {
          const on = value.includes(a);
          return (
            <g key={a + i} onClick={() => toggle(a)} className="cursor-pointer" aria-hidden>
              {on && <circle cx={x} cy={y} r="9" fill="#c0663f" style={{ transformOrigin: `${x}px ${y}px`, animation: "ripple 1.8s ease-out infinite" }} />}
              <circle cx={x} cy={y} r="14" fill="transparent" />
              <circle cx={x} cy={y} r={on ? 8 : 6} fill={on ? "#c0663f" : "#fffcf7"} stroke={on ? "#fffcf7" : "#2e4a3e"} strokeWidth="2" className="transition-all" />
            </g>
          );
        }))}
      </svg>
      <div>
        <div className="mb-3 text-sm text-muted">Tap the body or the chips below. Leave blank if nothing bothers you.</div>
        <div className="flex flex-wrap gap-2">
          {BODY_AREAS.map((a) => {
            const on = value.includes(a);
            return (
              <button key={a} type="button" onClick={() => toggle(a)} aria-pressed={on}
                className={cn("h-10 rounded-full border px-4 text-sm font-medium transition", on ? "border-clay bg-clay text-white" : "border-line bg-surface text-ink-2 hover:border-line-strong")}>
                {a}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
