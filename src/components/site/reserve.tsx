"use client";
import { format } from "date-fns";
import { ArrowRight, Check, Hourglass } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { reserveByEmail } from "@/lib/public";
import type { ClassType, Instructor, Session } from "@/lib/types";
import { Modal } from "../overlay";
import { Button, Field, Input } from "../ui";

type Result = Awaited<ReturnType<typeof reserveByEmail>>;

export function ReserveModal({ session, ct, ins, onClose }: { session: Session | null; ct?: ClassType; ins?: Instructor; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmail(localStorage.getItem("studio-email") ?? "");
    } catch {}
    setRes(null);
  }, [session]);

  const go = async () => {
    if (!session || !/^\S+@\S+\.\S+$/.test(email)) return;
    setBusy(true);
    const r = await reserveByEmail(session.id, email);
    try { localStorage.setItem("studio-email", email); } catch {}
    setRes(r);
    setBusy(false);
  };

  if (!session) return null;
  return (
    <Modal open={!!session} onClose={onClose} title={ct?.name ?? "Reserve"} description={`${format(new Date(session.start), "EEEE d MMMM · h:mm a")} with ${ins?.name ?? "our team"}`} size="sm">
      {!res && (
        <form onSubmit={(e) => { e.preventDefault(); go(); }} className="space-y-4">
          <Field label="Your email" hint="We'll find your membership and book you in.">
            <Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
          <Button type="submit" variant="primary" size="lg" className="w-full rounded-full" disabled={busy}>{busy ? "Checking…" : <>Reserve my spot <ArrowRight /></>}</Button>
          <p className="text-center text-sm text-muted">New here? <Link href="/join" className="font-medium text-accent underline-offset-4 hover:underline">Start with our first-visit form</Link></p>
        </form>
      )}
      {res?.status === "booked" && (
        <Done icon={<Check className="size-8" />} title={`You're in, ${res.name}.`} text="See you on the carriage. Arrive 10 minutes early and bring grip socks." onClose={onClose} />
      )}
      {res?.status === "waitlisted" && (
        <Done icon={<Hourglass className="size-7" />} title="You're on the waitlist" text="This class is full. If a spot opens, you'll be moved in automatically." onClose={onClose} />
      )}
      {res?.status === "unknown" && (
        <div className="space-y-4 text-center">
          <div className="font-display text-2xl text-ink">We haven&apos;t met yet</div>
          <p className="text-sm text-muted">There&apos;s no account under <b className="text-ink">{email}</b>. Tell us a little about yourself first — it takes about three minutes.</p>
          <Link href={`/join?email=${encodeURIComponent(email)}`}><Button variant="primary" size="lg" className="w-full rounded-full">Fill in the first-visit form <ArrowRight /></Button></Link>
          <button onClick={() => setRes(null)} className="text-sm text-muted hover:text-ink">Try a different email</button>
        </div>
      )}
      {res?.status === "nocredit" && (
        <div className="space-y-4 text-center">
          <div className="font-display text-2xl text-ink">Almost there, {res.name}</div>
          <p className="text-sm text-muted">You don&apos;t have an active pass that covers this class. Pick one up and come back to book.</p>
          <Link href="/shop"><Button variant="primary" size="lg" className="w-full rounded-full">See passes & packs <ArrowRight /></Button></Link>
        </div>
      )}
      {res?.status === "error" && (
        <div className="space-y-4 text-center">
          <p className="text-sm text-ink-2">{res.message}</p>
          <Button onClick={() => setRes(null)} className="rounded-full">Try again</Button>
        </div>
      )}
    </Modal>
  );
}

function Done({ icon, title, text, onClose }: { icon: React.ReactNode; title: string; text: string; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <div className="relative mb-5 grid size-16 place-items-center">
        <span className="absolute inset-0 rounded-full bg-accent/30" style={{ animation: "ripple 1.6s ease-out infinite" }} />
        <span className="grid size-16 place-items-center rounded-full bg-accent text-accent-ink" style={{ animation: "check-pop .6s both" }}>{icon}</span>
      </div>
      <div className="font-display text-2xl text-ink">{title}</div>
      <p className="mt-2 text-sm text-muted">{text}</p>
      <Button variant="primary" className="mt-6 rounded-full px-8" onClick={onClose}>Done</Button>
    </div>
  );
}
