"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Adds `.in` once the element scrolls into view. */
export function useInView<T extends Element>(opts: { threshold?: number; once?: boolean; rootMargin?: string } = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const { threshold = 0.18, once = true, rootMargin = "0px 0px -8% 0px" } = opts;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); if (once) io.disconnect(); }
      else if (!once) setInView(false);
    }, { threshold, rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, once, rootMargin]);
  return [ref, inView] as const;
}

export function Reveal({ children, className, delay = 0, as: Tag = "div", variant = "up" }: {
  children: ReactNode; className?: string; delay?: number; as?: "div" | "section" | "li" | "span"; variant?: "up" | "scale";
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const C = Tag as "div";
  return (
    <C ref={ref} className={cn(variant === "up" ? "reveal" : "reveal-scale", inView && "in", className)} style={{ "--d": `${delay}ms` } as CSSProperties}>
      {children}
    </C>
  );
}

/** 0 → 1 progress of an element travelling through the viewport. */
export function useScrollProgress<T extends HTMLElement>(offset = 0.15) {
  const ref = useRef<T>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * (1 - offset);
      const end = vh * offset - r.height + vh * 0.35;
      const v = (start - r.top) / (start - end);
      setP(Math.max(0, Math.min(1, v)));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, [offset]);
  return [ref, p] as const;
}

/** Words light up one by one as the paragraph scrolls past. */
export function WordReveal({ text, className, highlight = [] }: { text: string; className?: string; highlight?: string[] }) {
  const [ref, p] = useScrollProgress<HTMLParagraphElement>(0.1);
  const words = text.split(" ");
  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => {
        const t = Math.max(0, Math.min(1, p * words.length * 1.15 - i));
        const hl = highlight.some((h) => w.toLowerCase().startsWith(h));
        return (
          <span key={i} className={cn("transition-[opacity,color] duration-300", hl && t > 0.6 && "italic text-clay")} style={{ opacity: 0.14 + t * 0.86 }}>
            {w}{" "}
          </span>
        );
      })}
    </p>
  );
}

export function Counter({ to, duration = 1600, suffix = "", className }: { to: number; duration?: number; suffix?: string; className?: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>({ threshold: 0.5 });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  return <span ref={ref} className={cn("tnum", className)}>{v}{suffix}</span>;
}

export function Marquee({ children, reverse, duration = 40, className }: { children: ReactNode; reverse?: boolean; duration?: number; className?: string }) {
  return (
    <div className={cn("pause-on-hover flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]", className)}>
      <div className={cn("flex w-max shrink-0", reverse ? "animate-marquee-rev" : "animate-marquee")} style={{ "--dur": `${duration}s` } as CSSProperties}>
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0" aria-hidden>{children}</div>
      </div>
    </div>
  );
}

/** Splits a line into letters that rise in on mount. */
export function RiseText({ text, className, delay = 0, stagger = 28 }: { text: string; className?: string; delay?: number; stagger?: number }) {
  return (
    <span className={cn("inline-block", className)} aria-label={text}>
      {text.split("").map((ch, i) => (
        <span key={i} className="-mx-[0.08em] -mb-[0.18em] inline-block overflow-hidden px-[0.08em] pb-[0.18em] align-bottom" aria-hidden>
          <span className="inline-block" style={{ animation: `letter-rise .9s cubic-bezier(.2,.7,.2,1) both`, animationDelay: `${delay + i * stagger}ms` }}>
            {ch === " " ? " " : ch}
          </span>
        </span>
      ))}
    </span>
  );
}

/** Pointer-following soft light for immersive sections. */
export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    el.addEventListener("pointermove", move);
    return () => el.removeEventListener("pointermove", move);
  }, []);
  return ref;
}
