"use client";
import { Menu, Scissors, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSettings } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { ViewSwitch } from "../view-switch";
import { useCart } from "./cart";
import { Hand, HiliteLink } from "./paper";

const LINKS = [
  { href: "/#programme", label: "Classes" },
  { href: "/#first-class", label: "First class" },
  { href: "/#appointments", label: "Timetable" },
  { href: "/shop", label: "Prices & shop" },
];

export function Wordmark({ name, className }: { name: string; className?: string }) {
  const [first, ...rest] = name.split(" ");
  return (
    <span className={cn("inline-flex items-baseline gap-1.5 leading-none text-print", className)}>
      <span className="f-wide text-[19px] font-black uppercase tracking-[-0.02em]">{first}</span>
      {rest.length > 0 && <span className="f-narrow text-[15px] font-semibold uppercase tracking-[0.14em] text-form">{rest.join(" ")}</span>}
    </span>
  );
}

export function SiteHeader() {
  const path = usePathname();
  const settings = useSettings();
  const { count, setOpen } = useCart();
  const [menu, setMenu] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMenu(false); }, [path]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b-2 border-print bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-6 px-4 md:px-8">
          <Link href="/" aria-label={`${settings.studioName} home`}><Wordmark name={settings.studioName} /></Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {LINKS.map((l) => {
              const active = l.href === "/shop" ? path === "/shop" : false;
              return (
                <Link key={l.label} href={l.href}
                  className={cn("f-narrow px-3 py-2 text-[14px] font-semibold uppercase tracking-[0.08em] transition-colors hover:text-ballpoint", active ? "text-print underline decoration-ballpoint decoration-2 underline-offset-[7px]" : "text-print-2")}>
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:block"><ViewSwitch current="client" tone="paper" compact /></div>
            <button onClick={() => setOpen(true)} className="f-narrow relative inline-flex h-10 items-center gap-2 px-2 text-[14px] font-semibold uppercase tracking-[0.08em] text-print hover:text-ballpoint" aria-label={`Order, ${count} item${count === 1 ? "" : "s"}`}>
              <ShoppingBag className="size-[18px]" />
              <span className="hidden sm:inline">Order</span>
              {count > 0 && <span className="f-hand -ml-0.5 text-[24px] leading-none text-ballpoint">({count})</span>}
            </button>
            {path !== "/join" && <div className="hidden md:block"><HiliteLink href="/join">Start my programme</HiliteLink></div>}
            <button onClick={() => setMenu(true)} className="grid size-10 place-items-center text-print lg:hidden" aria-label="Open menu"><Menu className="size-5" /></button>
          </div>
        </div>
      </header>

      {menu && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-paper lg:hidden" style={{ animation: "slip-in .25s ease-out both" }} role="dialog" aria-modal="true" aria-label="Menu">
          <div className="flex h-16 items-center justify-between border-b-2 border-print px-4">
            <Wordmark name={settings.studioName} />
            <button onClick={() => setMenu(false)} className="grid size-10 place-items-center" aria-label="Close menu"><X className="size-5" /></button>
          </div>
          <nav className="flex-1 overflow-y-auto px-5 py-6" aria-label="Main">
            <ol className="ruled [--rule-gap:4.25rem]">
              {[...LINKS, { href: "/join", label: "Intake form" }].map((l, i) => (
                <li key={l.label} className="flex h-[4.25rem] items-end pb-2">
                  <Link href={l.href} onClick={() => setMenu(false)} className="f-wide flex w-full items-baseline gap-4 text-[26px] font-extrabold uppercase text-print">
                    <span className="f-narrow w-6 text-[14px] font-semibold text-form">{i + 1}.</span>{l.label}
                  </Link>
                </li>
              ))}
            </ol>
            <div className="mt-8"><ViewSwitch current="client" tone="paper" /></div>
          </nav>
          <p className="border-t border-rule px-5 py-4 text-[14px] text-muted">{settings.address} · {settings.phone}</p>
        </div>
      )}
    </>
  );
}

export function SiteFooter() {
  const s = useSettings();
  return (
    <footer className="mx-auto max-w-[1240px] px-4 pb-10 md:px-8">
      <div className="relative bg-paper sheet-shadow">
        <div className="relative flex items-center gap-2 px-6 pt-4 text-form" aria-hidden>
          <Scissors className="size-4 -rotate-90" />
          <div className="perforation flex-1 border-t border-dashed border-rule-strong" />
        </div>
        <div className="grid gap-10 px-6 pt-8 pb-10 md:grid-cols-[1.3fr_1fr_1fr] md:px-10">
          <div>
            <p className="f-wide text-[clamp(1.4rem,2.4vw,1.9rem)] font-extrabold uppercase leading-[1.1] text-print">Bring this to your first class.</p>
            <Hand as="p" className="mt-2 text-[26px] leading-tight">arrive 10 min early — we&apos;ll set your springs</Hand>
            <div className="mt-6"><HiliteLink href="/join" size="lg">Start my programme</HiliteLink></div>
          </div>
          <dl className="space-y-4 text-[15px]">
            <div><dt className="f-narrow text-[12.5px] font-semibold uppercase tracking-[0.08em] text-form">Studio</dt><dd className="mt-1 text-print">{s.studioName}<br />{s.address}</dd></div>
            <div><dt className="f-narrow text-[12.5px] font-semibold uppercase tracking-[0.08em] text-form">Contact</dt><dd className="mt-1 text-print"><a href={`tel:${s.phone}`} className="hover:text-ballpoint">{s.phone}</a><br /><a href={`mailto:${s.email}`} className="hover:text-ballpoint">{s.email}</a></dd></div>
          </dl>
          <dl className="space-y-4 text-[15px]">
            <div><dt className="f-narrow text-[12.5px] font-semibold uppercase tracking-[0.08em] text-form">Hours</dt><dd className="mt-1 text-print">Classes from {s.openingHour}:00 to {s.closingHour}:00</dd></div>
            <div><dt className="f-narrow text-[12.5px] font-semibold uppercase tracking-[0.08em] text-form">Cancellations</dt><dd className="mt-1 text-print">Free up to {s.cancellationWindowHours} hours before class</dd></div>
          </dl>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-6 py-4 text-[13px] text-muted md:px-10">
          <span>© {new Date().getFullYear()} {s.studioName} · Demo studio — names, classes and prices are sample data.</span>
          <ViewSwitch current="client" tone="paper" compact />
        </div>
      </div>
    </footer>
  );
}
