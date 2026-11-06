"use client";
import { useId } from "react";
import type { ClassCategory, ProductArt } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Graphite grain: a little displacement so lines read as pencil, not vector. */
function PencilDefs({ id }: { id: string }) {
  return (
    <defs>
      <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="1.7" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  );
}

const line = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/**
 * Exercise figures, drawn the way an instructor sketches them on a handout:
 * a head circle and single-stroke limbs, the apparatus in a lighter hand.
 */
export function ExerciseFigure({ kind, className, title }: { kind: ClassCategory; className?: string; title?: string }) {
  const f = useId().replace(/:/g, "");
  const body = { ...line, strokeWidth: 2.6 };
  const kit = { ...line, strokeWidth: 1.6, opacity: 0.75 };
  return (
    <svg viewBox="0 0 160 100" className={cn("text-pencil", className)} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <PencilDefs id={f} />
      <g filter={`url(#${f})`}>
        {kind === "reformer" && (
          <>
            <path d="M12 74 H150 M12 82 H150 M20 82 v10 M142 82 v10" {...kit} />
            <path d="M58 66 h64 v8 h-64 z" {...kit} />
            <path d="M30 74 C 28 56, 24 46, 20 38" {...kit} />
            <path d="M34 77 l6 -3 l6 3 l6 -3 l6 3" {...kit} strokeWidth={1.2} />
            <circle cx="114" cy="58" r="7" {...body} />
            <path d="M106 62 L76 63 L52 48 L24 42" {...body} />
            <path d="M100 62 L92 70 M84 63 L80 71" {...body} strokeWidth={2.2} />
          </>
        )}
        {kind === "mat" && (
          <>
            <path d="M20 84 H140" {...kit} />
            <path d="M20 88 H140" {...kit} strokeWidth={1} />
            <circle cx="44" cy="62" r="7" {...body} />
            <path d="M50 67 L80 78 L116 50" {...body} />
            <path d="M56 70 L82 70" {...body} strokeWidth={2.2} />
            <path d="M58 76 q 4 -3 8 0 q 4 3 8 0 q 4 -3 8 0" {...kit} strokeWidth={1.1} />
          </>
        )}
        {kind === "tower" && (
          <>
            <path d="M128 10 V86 M138 10 V86 M128 10 H138 M14 86 H146" {...kit} />
            <path d="M128 38 L76 30" {...kit} strokeWidth={2} />
            <path d="M133 16 C 118 22, 104 26, 92 30" {...kit} strokeDasharray="3 4" />
            <circle cx="30" cy="76" r="7" {...body} />
            <path d="M37 79 L96 80" {...body} />
            <path d="M44 78 L64 52 L78 32" {...body} strokeWidth={2.2} />
          </>
        )}
        {kind === "barre" && (
          <>
            <path d="M24 44 H148 M36 44 V92 M136 44 V92" {...kit} />
            <circle cx="82" cy="16" r="7" {...body} />
            <path d="M82 23 V60 L78 88 M82 60 L88 88" {...body} />
            <path d="M82 32 L106 44 M82 32 C 66 26, 64 12, 72 6" {...body} strokeWidth={2.2} />
            <path d="M74 90 h8 M86 90 h8" {...body} strokeWidth={2} />
          </>
        )}
        {kind === "chair" && (
          <>
            <path d="M56 46 h52 v42 h-52 z" {...kit} />
            <path d="M56 78 L34 82 h-8" {...kit} />
            <circle cx="82" cy="20" r="7" {...body} />
            <path d="M82 27 V46 M82 34 L104 30 M82 34 L60 32" {...body} />
            <path d="M74 46 L50 62 L36 80" {...body} strokeWidth={2.2} />
          </>
        )}
        {(kind === "private" || kind === "other") && (
          <>
            <path d="M14 84 H146" {...kit} />
            <circle cx="56" cy="70" r="7" {...body} />
            <path d="M63 74 L118 76 M92 75 L108 54" {...body} />
            <circle cx="118" cy="22" r="7" {...body} />
            <path d="M118 29 V58 L112 82 M118 58 L124 82 M118 38 L104 52" {...body} strokeWidth={2.2} />
          </>
        )}
      </g>
    </svg>
  );
}

/**
 * Supplies drawn in the same graphite line as the exercise figures. Colour comes
 * only from coloured-pencil hatching inside the outline, never a flat fill.
 */
export function SupplySketch({ art, tone, className }: { art: ProductArt; tone: string; className?: string }) {
  const f = useId().replace(/:/g, "");
  const h = `${f}-h`;
  const s = { ...line, strokeWidth: 2.2 };
  const wash = { fill: `url(#${h})` };
  return (
    <svg viewBox="0 0 120 120" className={cn("text-pencil", className)} aria-hidden>
      <PencilDefs id={f} />
      <defs>
        <pattern id={h} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <path d="M0 0 V5" stroke={tone} strokeWidth="1.5" opacity="0.9" />
        </pattern>
      </defs>
      <g filter={`url(#${f})`}>
        {art === "socks" && (<><path d="M38 14h26v50c0 6 4 10 10 12l12 5c10 4 11 20-1 23H54c-13 0-20-8-20-19z" {...wash} /><path d="M38 14h26v50c0 6 4 10 10 12l12 5c10 4 11 20-1 23H54c-13 0-20-8-20-19z" {...s} /><path d="M38 24h26" {...s} strokeWidth={1.6} />{[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={58 + (i % 3) * 10} cy={92 + Math.floor(i / 3) * 6} r="1.6" fill="currentColor" />)}</>)}
        {art === "bottle" && (<><rect x="40" y="32" width="40" height="76" rx="13" {...wash} /><rect x="40" y="32" width="40" height="76" rx="13" {...s} /><rect x="47" y="14" width="26" height="20" rx="5" {...s} /><path d="M48 46 v48" {...s} strokeWidth={1.4} opacity={0.6} /></>)}
        {art === "tote" && (<><path d="M30 44h60l7 64H23z" {...wash} /><path d="M30 44h60l7 64H23z" {...s} /><path d="M46 46 C 46 18, 74 18, 74 46" {...s} /><path d="M50 78c6-4 14-4 20 0" {...s} strokeWidth={1.6} /></>)}
        {art === "band" && (<><ellipse cx="60" cy="82" rx="40" ry="16" {...s} /><ellipse cx="60" cy="82" rx="36" ry="13" {...s} stroke={tone} strokeWidth={1.6} /><ellipse cx="60" cy="64" rx="34" ry="13" {...s} /><ellipse cx="60" cy="48" rx="28" ry="10" {...s} strokeDasharray="2 3" /></>)}
        {art === "towel" && (<><rect x="24" y="68" width="72" height="28" rx="5" {...wash} /><rect x="24" y="68" width="72" height="28" rx="5" {...s} /><rect x="28" y="48" width="66" height="24" rx="5" {...s} /><rect x="32" y="30" width="60" height="22" rx="5" {...s} /><path d="M32 42h60" {...s} strokeWidth={1.4} /></>)}
        {art === "mat" && (<><path d="M44 46h50a3 3 0 0 1 3 3v36a3 3 0 0 1-3 3H44z" {...wash} /><path d="M44 46h50a3 3 0 0 1 3 3v36a3 3 0 0 1-3 3H44" {...s} /><circle cx="44" cy="67" r="22" {...s} /><circle cx="44" cy="67" r="13" {...s} strokeWidth={1.6} /><circle cx="44" cy="67" r="5" {...s} strokeWidth={1.4} /></>)}
        {art === "ring" && (<><circle cx="60" cy="62" r="40" {...s} /><circle cx="60" cy="62" r="34" {...s} strokeWidth={1.6} /><circle cx="60" cy="62" r="37" {...s} stroke={tone} strokeWidth={1.6} strokeDasharray="2 3" /><rect x="50" y="16" width="20" height="13" rx="5" {...s} /><rect x="50" y="95" width="20" height="13" rx="5" {...s} /></>)}
        {art === "giftcard" && (<><g transform="rotate(-7 60 62)"><rect x="18" y="34" width="84" height="54" rx="6" {...wash} /><rect x="18" y="34" width="84" height="54" rx="6" {...s} /><path d="M60 34v54" {...s} strokeWidth={1.6} /><path d="M60 52c-6-10-18-8-14 0 3 5 14 0 14 0s11 5 14 0c4-8-8-10-14 0z" {...s} strokeWidth={1.6} /></g></>)}
      </g>
    </svg>
  );
}
