"use client";
import type { CSSProperties } from "react";
import type { ClassCategory, ProductArt as ArtKind } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ───────── Breathing orb — the hero centrepiece ───────── */
export function BreathingOrb({ className, labels = true }: { className?: string; labels?: boolean }) {
  return (
    <div className={cn("relative grid aspect-square place-items-center", className)} aria-hidden>
      {[1, 0.82, 0.64, 0.46].map((s, i) => (
        <div
          key={s}
          className="absolute rounded-full border border-cream/15 animate-breathe"
          style={{ inset: `${(1 - s) * 50}%`, animationDelay: `${i * 0.18}s`, background: i === 3 ? "radial-gradient(circle at 35% 30%, rgb(143 174 148 / .55), rgb(46 74 62 / .1) 70%)" : undefined }}
        />
      ))}
      <div className="absolute inset-[30%] rounded-full bg-[radial-gradient(circle_at_40%_35%,#f3ede3_0%,#cfdccf_30%,#8fae94_70%,#4c6d5c_100%)] opacity-90 shadow-[0_0_120px_30px_rgb(143_174_148/.35)] animate-breathe" />
      {labels && (
        <div className="relative font-display text-lg italic tracking-wide text-forest">
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ animation: "breathe-in-label 8s ease-in-out infinite" }}>inhale</span>
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0" style={{ animation: "breathe-out-label 8s ease-in-out infinite" }}>exhale</span>
        </div>
      )}
    </div>
  );
}

/* ───────── Flowing spring lines ───────── */
export function Springs({ className, color = "rgb(243 237 227 / .22)" }: { className?: string; color?: string }) {
  const coil = (y: number, amp: number, n: number) => {
    let d = `M -20 ${y}`;
    for (let i = 0; i <= n; i++) d += ` Q ${i * 60 + 10} ${y + (i % 2 ? amp : -amp)} ${i * 60 + 40} ${y}`;
    return d;
  };
  return (
    <svg className={className} viewBox="0 0 1400 600" preserveAspectRatio="none" fill="none" aria-hidden>
      {[120, 210, 300, 390, 480].map((y, i) => (
        <path key={y} d={coil(y, 18 + i * 6, 24)} stroke={color} strokeWidth={1.2} strokeDasharray="6 10"
          style={{ animation: `spring-flow ${18 + i * 4}s linear infinite`, animationDirection: i % 2 ? "reverse" : "normal" }} />
      ))}
    </svg>
  );
}

/* ───────── Apparatus line drawings ───────── */
const S = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function zigzag(x1: number, x2: number, y: number, n = 10, a = 6) {
  const step = (x2 - x1) / n;
  let d = `M ${x1} ${y}`;
  for (let i = 1; i <= n; i++) d += ` L ${x1 + i * step} ${y + (i % 2 ? -a : a)}`;
  return d;
}

export function MethodArt({ kind, className, animate = true }: { kind: ClassCategory; className?: string; animate?: boolean }) {
  const p = (d: string, len = 900, delay = 0, extra?: object) => (
    <path d={d} {...S} {...extra} className={animate ? "draw-path" : undefined} style={{ "--len": len, "--d": `${delay}ms` } as CSSProperties} />
  );
  return (
    <svg viewBox="0 0 400 240" className={className} aria-hidden>
      {kind === "reformer" && (
        <g>
          {p("M30 172 H372 M30 188 H372", 700)}
          {p("M44 188 V214 M358 188 V214", 80, 300)}
          {p("M150 150 h112 a6 6 0 0 1 6 6 v10 a6 6 0 0 1 -6 6 h-112 a6 6 0 0 1 -6 -6 v-10 a6 6 0 0 1 6 -6 z", 300, 400)}
          {p("M236 150 v-16 M250 150 v-16", 60, 700)}
          {p("M82 172 C 78 142, 68 120, 60 104 h-14", 160, 600)}
          {p(zigzag(46, 144, 178, 12, 5), 220, 900, { strokeWidth: 1.6 })}
          {p("M362 172 V92 M354 92 h16", 140, 800)}
          {p("M362 100 Q 320 122 268 154", 140, 1200, { strokeDasharray: "2 6", strokeWidth: 1.6 })}
          {/* figure: footwork */}
          {p("M245 140 a10 10 0 1 0 0.1 0", 70, 1300)}
          {p("M234 146 L190 146 L150 120 L 84 108", 240, 1400)}
        </g>
      )}
      {kind === "mat" && (
        <g>
          {p("M80 186 h240 a6 6 0 0 1 0 12 h-240 a6 6 0 0 1 0 -12 z", 520)}
          {p("M200 182 L160 118", 90, 300)}
          {p("M150 96 a12 12 0 1 0 0.1 0", 80, 500)}
          {p("M162 122 L222 104", 80, 700)}
          {p("M200 182 L268 108", 120, 800)}
          {p("M60 60 C 140 20, 260 20, 340 60", 330, 1100, { strokeDasharray: "2 8", strokeWidth: 1.4 })}
        </g>
      )}
      {kind === "tower" && (
        <g>
          {p("M310 30 V196 M330 30 V196 M310 30 H330", 380)}
          {p("M70 196 h270", 270, 200)}
          {p("M310 84 L214 104", 110, 500)}
          {p(zigzag(320, 320.1, 50, 1, 0) + " M330 40 C 300 60 280 70 250 74", 120, 650, { strokeDasharray: "3 5" })}
          {p("M118 172 a10 10 0 1 0 0.1 0", 70, 800)}
          {p("M128 182 L210 182 L214 104", 200, 900)}
        </g>
      )}
      {kind === "barre" && (
        <g>
          {p("M60 104 H340 M80 104 V200 M320 104 V200", 520)}
          {p("M200 40 a12 12 0 1 0 0.1 0", 80, 300)}
          {p("M200 64 V128 L190 196 M200 128 L214 196", 220, 450)}
          {p("M200 78 L250 104 M200 78 C 170 60 170 36 186 24", 180, 700)}
          {p("M184 198 h12 M208 198 h12", 40, 900)}
        </g>
      )}
      {kind === "chair" && (
        <g>
          {p("M150 110 h100 v84 h-100 z", 380)}
          {p("M150 168 L104 176 h-16", 80, 300)}
          {p(zigzag(152, 248, 150, 10, 4), 140, 500, { strokeWidth: 1.4 })}
          {p("M200 86 a10 10 0 1 0 0.1 0", 70, 700)}
          {p("M200 96 V110 M200 102 L232 96", 70, 800)}
        </g>
      )}
      {(kind === "private" || kind === "other") && (
        <g>
          {p("M150 120 a50 50 0 1 0 0.1 0", 320)}
          {p("M240 120 a50 50 0 1 0 0.1 0", 320, 300)}
          {p("M60 200 C 140 170, 260 170, 340 200", 300, 600, { strokeDasharray: "2 8" })}
        </g>
      )}
    </svg>
  );
}

/* ───────── Product illustrations ───────── */
export function ProductArt({ art, tone, className }: { art: ArtKind; tone: string; className?: string }) {
  const dark = `color-mix(in srgb, ${tone} 60%, #1b221e)`;
  const light = `color-mix(in srgb, ${tone} 55%, #fffcf7)`;
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <ellipse cx="100" cy="182" rx="56" ry="7" fill="#1b221e" opacity=".08" />
      {art === "socks" && (
        <g>
          <path d="M70 28h44v78c0 10 6 16 16 20l18 8c16 7 18 32-2 38h-50c-22 0-32-14-32-32z" fill={tone} stroke={dark} strokeWidth="2" />
          <rect x="70" y="28" width="44" height="16" rx="3" fill={light} />
          {Array.from({ length: 12 }).map((_, i) => <circle key={i} cx={92 + (i % 4) * 14} cy={150 + Math.floor(i / 4) * 8} r="2.2" fill={dark} />)}
        </g>
      )}
      {art === "bottle" && (
        <g>
          <rect x="68" y="52" width="64" height="122" rx="22" fill={tone} stroke={dark} strokeWidth="2" />
          <rect x="80" y="26" width="40" height="30" rx="8" fill={dark} />
          <rect x="68" y="102" width="64" height="20" fill={light} opacity=".35" />
          <path d="M82 66 v90" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".22" />
        </g>
      )}
      {art === "tote" && (
        <g>
          <path d="M78 74 C 78 36, 122 36, 122 74" fill="none" stroke={dark} strokeWidth="5" strokeLinecap="round" />
          <path d="M52 70h96l10 104H42z" fill={tone} stroke={dark} strokeWidth="2" />
          <circle cx="100" cy="122" r="17" fill="none" stroke={dark} strokeWidth="2.5" />
          <path d="M86 128c4-3 9-4 14-4s10 1 14 4" fill="none" stroke={dark} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}
      {art === "band" && (
        <g fill="none" strokeWidth="14" strokeLinecap="round">
          <ellipse cx="100" cy="130" rx="62" ry="26" stroke={dark} />
          <ellipse cx="100" cy="104" rx="56" ry="22" stroke={tone} />
          <ellipse cx="100" cy="80" rx="50" ry="18" stroke={light} />
        </g>
      )}
      {art === "towel" && (
        <g>
          <rect x="44" y="118" width="112" height="44" rx="8" fill={dark} />
          <rect x="50" y="92" width="104" height="40" rx="8" fill={tone} />
          <rect x="56" y="66" width="96" height="38" rx="8" fill={light} />
          <path d="M56 86 h96" stroke={tone} strokeWidth="3" />
        </g>
      )}
      {art === "mat" && (
        <g>
          <path d="M70 92 h96 a4 4 0 0 1 4 4 v54 a4 4 0 0 1 -4 4 h-96 z" fill={light} stroke={dark} strokeWidth="2" />
          <circle cx="70" cy="123" r="34" fill={tone} stroke={dark} strokeWidth="2" />
          <circle cx="70" cy="123" r="22" fill="none" stroke={dark} strokeWidth="2" opacity=".6" />
          <circle cx="70" cy="123" r="10" fill="none" stroke={dark} strokeWidth="2" opacity=".4" />
        </g>
      )}
      {art === "ring" && (
        <g>
          <circle cx="100" cy="108" r="60" fill="none" stroke={tone} strokeWidth="12" />
          <circle cx="100" cy="108" r="60" fill="none" stroke={dark} strokeWidth="1.5" />
          <rect x="84" y="36" width="32" height="20" rx="8" fill={dark} />
          <rect x="84" y="160" width="32" height="20" rx="8" fill={dark} />
        </g>
      )}
      {art === "giftcard" && (
        <g transform="rotate(-8 100 110)">
          <rect x="34" y="62" width="132" height="86" rx="12" fill={tone} />
          <circle cx="66" cy="96" r="14" fill="none" stroke="#f3ede3" strokeWidth="2.5" />
          <path d="M54 104c4-3 8-4 12-4s8 1 12 4" fill="none" stroke="#f3ede3" strokeWidth="2.5" strokeLinecap="round" />
          <text x="156" y="136" textAnchor="end" fill="#f3ede3" fontFamily="var(--font-fraunces), serif" fontStyle="italic" fontSize="20">Gift</text>
          <path d="M100 62 v86" stroke="#c0663f" strokeWidth="6" />
        </g>
      )}
    </svg>
  );
}
