"use client";
import { ArrowUpRight, Menu, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSettings } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Logo } from "../shell";
import { useCart } from "./cart";

const LINKS = [
  { href: "/#methods", label: "Classes" },
  { href: "/#timetable", label: "Timetable" },
  { href: "/#team", label: "Instructors" },
  { href: "/shop", label: "Pricing" },
  { href: "/shop#essentials", label: "Shop" },
];

export function SiteHeader() {
  const path = usePathname();
  const settings = useSettings();
  const { count, setOpen } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMenu(false); }, [path]);

  const overDark = !scrolled && (path === "/" || path === "/shop");
  return (
    <>
      <header className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "bg-cream/80 py-3 shadow-[0_1px_0_rgb(27_34_30/.08)] backdrop-blur-xl" : "py-5",
      )}>
        <div className="mx-auto flex max-w-[1320px] items-center gap-6 px-5 md:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={34} />
            <span className={cn("font-display text-xl tracking-tight transition-colors", overDark ? "text-cream" : "text-ink")}>{settings.studioName.split(" ")[0]}</span>
          </Link>
          <nav className="ml-6 hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <Link key={l.label} href={l.href} className={cn("rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors", overDark ? "text-cream/75 hover:bg-cream/10 hover:text-cream" : "text-ink-2 hover:bg-ink/5 hover:text-ink")}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setOpen(true)} className={cn("relative grid size-11 place-items-center rounded-full transition-colors", overDark ? "text-cream hover:bg-cream/10" : "text-ink hover:bg-ink/5")} aria-label={`Bag, ${count} items`}>
              <ShoppingBag className="size-[19px]" />
              {count > 0 && <span className="absolute right-1 top-1 grid min-w-[18px] place-items-center rounded-full bg-clay px-1 text-[10.5px] font-semibold text-white tnum" style={{ animation: "check-pop .4s both" }}>{count}</span>}
            </button>
            <Link href="/join" className={cn(
              "group hidden h-11 items-center gap-2 rounded-full pl-5 pr-2 text-[14px] font-medium transition-all sm:inline-flex",
              overDark ? "bg-cream text-forest hover:bg-white" : "bg-forest text-cream hover:bg-forest-2",
            )}>
              First visit? Start here
              <span className={cn("grid size-7 place-items-center rounded-full transition-transform group-hover:rotate-45", overDark ? "bg-forest text-cream" : "bg-cream text-forest")}><ArrowUpRight className="size-4" /></span>
            </Link>
            <button onClick={() => setMenu(true)} className={cn("grid size-11 place-items-center rounded-full lg:hidden", overDark ? "text-cream" : "text-ink")} aria-label="Menu"><Menu className="size-5" /></button>
          </div>
        </div>
      </header>

      {menu && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-forest text-cream grain animate-fade-in lg:hidden">
          <div className="relative z-10 flex items-center justify-between px-5 py-5">
            <Logo size={34} />
            <button onClick={() => setMenu(false)} className="grid size-11 place-items-center rounded-full bg-cream/10" aria-label="Close menu"><X className="size-5" /></button>
          </div>
          <nav className="relative z-10 flex flex-1 flex-col justify-center gap-1 px-8">
            {[...LINKS, { href: "/join", label: "First visit" }].map((l, i) => (
              <Link key={l.label} href={l.href} onClick={() => setMenu(false)} className="overflow-hidden py-1 font-display text-5xl tracking-tight">
                <span className="inline-block" style={{ animation: "letter-rise .7s cubic-bezier(.2,.7,.2,1) both", animationDelay: `${80 + i * 60}ms` }}>{l.label}</span>
              </Link>
            ))}
          </nav>
          <div className="relative z-10 px-8 pb-10 text-sm text-cream/60">{settings.address} · {settings.phone}</div>
        </div>
      )}
    </>
  );
}

export function SiteFooter() {
  const s = useSettings();
  return (
    <footer className="relative overflow-hidden bg-forest text-cream grain">
      <div className="relative z-10 mx-auto max-w-[1320px] px-5 pt-20 pb-10 md:px-10">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <p className="max-w-sm font-display text-3xl leading-tight">Come as you are. Leave a little <em className="text-moss">taller.</em></p>
            <Link href="/join" className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-cream px-6 text-sm font-medium text-forest hover:bg-white">Book your first class <ArrowUpRight className="size-4" /></Link>
          </div>
          <div>
            <div className="mb-3 text-xs uppercase tracking-[0.18em] text-cream/45">Visit</div>
            <p className="text-sm leading-relaxed text-cream/80">{s.address}<br />{s.phone}<br />{s.email}</p>
          </div>
          <div>
            <div className="mb-3 text-xs uppercase tracking-[0.18em] text-cream/45">Hours</div>
            <p className="text-sm leading-relaxed text-cream/80">Mon–Fri · {s.openingHour}:00 – {s.closingHour}:00<br />Sat–Sun · 8:00 – 14:00</p>
          </div>
          <div>
            <div className="mb-3 text-xs uppercase tracking-[0.18em] text-cream/45">Explore</div>
            <ul className="space-y-1.5 text-sm text-cream/80">
              {LINKS.map((l) => <li key={l.label}><Link href={l.href} className="hover:text-cream">{l.label}</Link></li>)}
              <li><Link href="/join" className="hover:text-cream">Intake form</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-20 select-none font-display text-[22vw] leading-[0.8] tracking-tighter text-outline-cream md:text-[17vw]" aria-hidden>{s.studioName.split(" ")[0]}</div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-cream/10 pt-6 text-xs text-cream/45">
          <span>© {new Date().getFullYear()} {s.studioName}. All rights reserved.</span>
          <Link href="/admin" className="hover:text-cream">Staff login →</Link>
        </div>
      </div>
    </footer>
  );
}
