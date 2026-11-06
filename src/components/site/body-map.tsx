"use client";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { Tick } from "./paper";

export const BODY_AREAS = ["Neck", "Shoulders", "Upper back", "Lower back", "Wrists", "Hips", "Knees", "Ankles & feet"] as const;
type Area = (typeof BODY_AREAS)[number];

/* Where each area sits on the front (F) and back (B) outlines, in a 120 × 260 view. */
const SPOTS: Record<Area, { view: "F" | "B"; x: number; y: number; r: number }[]> = {
  Neck: [{ view: "F", x: 60, y: 44, r: 9 }, { view: "B", x: 60, y: 44, r: 9 }],
  Shoulders: [{ view: "F", x: 36, y: 58, r: 11 }, { view: "F", x: 84, y: 58, r: 11 }],
  "Upper back": [{ view: "B", x: 60, y: 76, r: 17 }],
  "Lower back": [{ view: "B", x: 60, y: 114, r: 15 }],
  Wrists: [{ view: "F", x: 20, y: 132, r: 8 }, { view: "F", x: 100, y: 132, r: 8 }],
  Hips: [{ view: "F", x: 46, y: 132, r: 11 }, { view: "F", x: 74, y: 132, r: 11 }],
  Knees: [{ view: "F", x: 47, y: 186, r: 10 }, { view: "F", x: 73, y: 186, r: 10 }],
  "Ankles & feet": [{ view: "F", x: 47, y: 240, r: 9 }, { view: "F", x: 73, y: 240, r: 9 }],
};

/** A clinic body-chart outline. */
const OUTLINE = "M60 10 c9 0 15 7 15 17 c0 9 -5 16 -10 18 v6 c11 2 22 5 27 11 c5 6 6 22 8 40 l4 32 c1 5 -6 6 -7 1 l-7 -30 l-4 -18 l-2 26 c-1 12 2 22 1 34 l-3 46 l2 30 c1 6 -9 6 -10 0 l-5 -60 l-3 -40 h-4 l-3 40 l-5 60 c-1 6 -11 6 -10 0 l2 -30 l-3 -46 c-1 -12 2 -22 1 -34 l-2 -26 l-4 18 l-7 30 c-1 5 -8 4 -7 -1 l4 -32 c2 -18 3 -34 8 -40 c5 -6 16 -9 27 -11 v-6 c-5 -2 -10 -9 -10 -18 c0 -10 6 -17 15 -17 z";

function Figure({ view, value, onToggle, hatch }: { view: "F" | "B"; value: string[]; onToggle: (a: Area) => void; hatch: string }) {
  return (
    <figure className="flex flex-col items-center">
      <svg viewBox="0 0 120 262" className="h-[300px] w-auto select-none" aria-hidden>
        <path d={OUTLINE} fill="var(--paper)" stroke="var(--form)" strokeWidth="1.4" />
        {view === "B" && <path d="M60 52 V150" stroke="var(--rule-strong)" strokeWidth="1" strokeDasharray="3 3" />}
        {BODY_AREAS.flatMap((a) => SPOTS[a].filter((s) => s.view === view).map((s, i) => {
          const on = value.includes(a);
          return (
            <g key={a + i} onClick={() => onToggle(a)} className="cursor-pointer">
              <circle cx={s.x} cy={s.y} r={s.r + 4} fill="transparent" />
              {on ? (
                <>
                  <circle cx={s.x} cy={s.y} r={s.r} fill={`url(#${hatch})`} />
                  <path d={`M${s.x - s.r - 2} ${s.y + 1} C ${s.x - s.r} ${s.y - s.r - 3}, ${s.x + s.r + 3} ${s.y - s.r - 2}, ${s.x + s.r + 1} ${s.y} C ${s.x + s.r} ${s.y + s.r + 3}, ${s.x - s.r - 2} ${s.y + s.r + 2}, ${s.x - s.r + 2} ${s.y - 3}`}
                    fill="none" stroke="var(--ballpoint)" strokeWidth="1.6" strokeLinecap="round" />
                </>
              ) : (
                <circle cx={s.x} cy={s.y} r={3} fill="var(--rule-strong)" />
              )}
            </g>
          );
        }))}
      </svg>
      <figcaption className="f-narrow mt-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-form">{view === "F" ? "Front" : "Back"}</figcaption>
    </figure>
  );
}

/**
 * Shade the areas that hurt, the way you would on a physio's body chart.
 * The chips below mirror the chart for keyboard and screen-reader use.
 */
export function BodyMap({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const hatch = `hatch-${useId().replace(/:/g, "")}`;
  const toggle = (a: string) => onChange(value.includes(a) ? value.filter((x) => x !== a) : [...value, a]);
  return (
    <div>
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <pattern id={hatch} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
            <path d="M0 0 V4" stroke="var(--ballpoint)" strokeWidth="1.3" />
          </pattern>
        </defs>
      </svg>
      <div className="flex justify-center gap-6 sm:justify-start sm:gap-10">
        <Figure view="F" value={value} onToggle={toggle} hatch={hatch} />
        <Figure view="B" value={value} onToggle={toggle} hatch={hatch} />
      </div>
      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3" role="group" aria-label="Sensitive areas">
        {BODY_AREAS.map((a) => {
          const on = value.includes(a);
          return (
            <button key={a} type="button" onClick={() => toggle(a)} aria-pressed={on}
              className={cn("inline-flex items-center gap-1 text-[16px] transition-colors", on ? "font-semibold text-ballpoint underline decoration-ballpoint decoration-2 underline-offset-[5px]" : "text-print-2 hover:text-print")}>
              {on && <Tick className="size-4" />}{a}
            </button>
          );
        })}
      </div>
    </div>
  );
}
