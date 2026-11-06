"use client";
import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ───────── Ink marks ───────── */

/** A ballpoint tick, drawn as if by hand when it appears. */
export function Tick({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("text-ballpoint", className)} aria-hidden>
      <path d="M3.5 13.5 C 6 15, 8 17.5, 9.5 20 C 12 13, 16 7.5, 21.5 3.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
        className="ink-path" style={{ "--len": 34, "--dur": "0.32s", "--delay": `${delay}ms` } as CSSProperties} />
    </svg>
  );
}

/** A ballpoint cross, for a capacity box that is already taken. */
function Cross({ delay = 0 }: { delay?: number }) {
  return (
    <svg viewBox="0 0 12 12" className="absolute inset-0 text-ballpoint" aria-hidden>
      <path d="M2.5 2.8 L9.6 9.4 M9.4 2.4 L2.4 9.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
        className="ink-path" style={{ "--len": 22, "--dur": "0.2s", "--delay": `${delay}ms` } as CSSProperties} />
    </svg>
  );
}

/** A hand-drawn arrow in the margin, pointing at what the note refers to. */
export function MarginArrow({ className, d = "M6 8 C 30 4, 58 14, 70 40 M70 40 l-9 -3 M70 40 l2 -9" }: { className?: string; d?: string }) {
  return (
    <svg viewBox="0 0 80 50" className={cn("text-ballpoint", className)} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ink-path" style={{ "--len": 140, "--dur": "0.7s", "--delay": "500ms" } as CSSProperties} />
    </svg>
  );
}

/** Handwritten ballpoint note. Never the only carrier of essential information. */
export function Hand({ children, className, as: Tag = "span" }: { children: ReactNode; className?: string; as?: "span" | "p" | "div" }) {
  return <Tag className={cn("f-hand text-ballpoint", className)}>{children}</Tag>;
}

/* ───────── Capacity, shown the way a sign-up sheet shows it ───────── */

export function CapacityBoxes({ taken, capacity, className, size = 12 }: { taken: number; capacity: number; className?: string; size?: number }) {
  const left = Math.max(0, capacity - taken);
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="inline-flex flex-wrap gap-[3px]" role="img" aria-label={`${taken} of ${capacity} places taken, ${left} free`}>
        {Array.from({ length: capacity }).map((_, i) => (
          <span key={i} className="relative inline-block border border-form/70 bg-paper" style={{ width: size, height: size }}>
            {i < taken && <Cross delay={i * 45} />}
          </span>
        ))}
      </span>
    </span>
  );
}

/* ───────── Stamp ───────── */

const stampNoise = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='s'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.75 1.32'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23s)'/%3E%3C/svg%3E\")";

/** A rubber clinic stamp. Uneven ink comes from a noise mask, not a texture image. */
export function Stamp({ children, className, rot = -8, animate = true }: { children: ReactNode; className?: string; rot?: number; animate?: boolean }) {
  return (
    <span
      className={cn("f-narrow inline-flex flex-col items-center rounded-[6px] border-[2.5px] border-stamp px-3 py-1.5 text-center font-extrabold uppercase leading-none tracking-[0.06em] text-stamp outline outline-1 outline-offset-2 outline-stamp", animate && "stamp-in", className)}
      style={{ "--rot": `${rot}deg`, transform: `rotate(${rot}deg)`, WebkitMaskImage: stampNoise, maskImage: stampNoise, maskSize: "120px 120px" } as CSSProperties}
    >
      {children}
    </span>
  );
}

/* ───────── Actions ───────── */

type ActionProps = { children: ReactNode; className?: string; size?: "md" | "lg" };
const actionBase = "f-print group inline-flex items-center gap-2 font-bold text-print transition-transform active:translate-y-px disabled:pointer-events-none disabled:opacity-50";
const actionSize = { md: "text-[16px] px-1 py-1.5", lg: "text-[19px] px-1.5 py-2" };

function Arrow() {
  return (
    <svg viewBox="0 0 30 14" className="h-3.5 w-7 shrink-0 text-ballpoint transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
      <path d="M1 7.5 C 9 6, 17 8, 27 6.8 M21 1.8 L27.5 6.8 L21.2 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Primary action: the label carries a highlighter swipe, as if marked "do this". */
export function HiliteLink({ href, children, className, size = "md", onClick }: ActionProps & { href: string; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} className={cn(actionBase, actionSize[size], className)}>
      <span className="hilite">{children}</span><Arrow />
    </Link>
  );
}

export const HiliteButton = forwardRef<HTMLButtonElement, ActionProps & ButtonHTMLAttributes<HTMLButtonElement>>(
  function HiliteButton({ children, className, size = "md", type = "button", ...p }, ref) {
    return (
      <button ref={ref} type={type} className={cn(actionBase, actionSize[size], className)} {...p}>
        <span className="hilite">{children}</span><Arrow />
      </button>
    );
  },
);

/** Secondary action: printed text with a ballpoint wavy underline. */
export function PenLink({ href, children, className, onClick }: { href: string; children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick}
      className={cn("f-print font-semibold text-print underline decoration-ballpoint decoration-wavy decoration-[1.5px] underline-offset-[6px] transition-colors hover:text-ballpoint", className)}>
      {children}
    </Link>
  );
}

export function PenButton({ children, className, ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...p}
      className={cn("f-print font-semibold text-print underline decoration-ballpoint decoration-wavy decoration-[1.5px] underline-offset-[6px] transition-colors hover:text-ballpoint disabled:pointer-events-none disabled:opacity-50", className)}>
      {children}
    </button>
  );
}

/* ───────── Form furniture ───────── */

/** A printed field label in condensed caps. */
export function Label({ children, className, htmlFor }: { children: ReactNode; className?: string; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className={cn("f-narrow block text-[12.5px] font-semibold uppercase tracking-[0.08em] text-form", className)}>{children}</label>;
}

/** An input that is just a printed baseline; what you type is set in ballpoint. */
export const LineInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { hand?: boolean; invalid?: boolean }>(
  function LineInput({ className, hand, invalid, ...p }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "w-full border-0 border-b-[1.5px] bg-transparent px-0.5 pb-1 pt-2 text-ballpoint outline-none transition-colors placeholder:text-muted focus:border-ballpoint",
          invalid ? "border-stamp" : "border-rule-strong",
          hand ? "f-hand text-[28px] leading-none" : "text-[17px]",
          className,
        )}
        {...p}
      />
    );
  },
);

/** A printed square checkbox that receives a drawn tick. */
export function CheckBox({ checked, onChange, children, className, invalid }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; className?: string; invalid?: boolean }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} onClick={() => onChange(!checked)}
      className={cn("group flex items-start gap-3 text-left text-[16px] text-print-2", className)}>
      <span className={cn("relative mt-0.5 inline-block size-[22px] shrink-0 border-[1.5px] bg-paper transition-colors group-hover:border-ballpoint", invalid ? "border-stamp" : "border-form")}>
        {checked && <Tick className="absolute -left-1 -top-2 size-8" />}
      </span>
      <span>{children}</span>
    </button>
  );
}

/** Section heading as printed on a form: heavy wide caps with a full rule under it. */
export function FormHeading({ children, id, className, aside }: { children: ReactNode; id?: string; className?: string; aside?: ReactNode }) {
  return (
    <div className={cn("flex items-end justify-between gap-4 border-b-2 border-print pb-2", className)}>
      <h2 id={id} className="f-wide text-[clamp(1.35rem,2.6vw,2rem)] font-extrabold uppercase leading-[1.05] tracking-[-0.01em] text-print">{children}</h2>
      {aside}
    </div>
  );
}
