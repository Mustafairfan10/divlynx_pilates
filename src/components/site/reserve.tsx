"use client";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { reserveByEmail } from "@/lib/public";
import type { ClassType, Instructor, Session } from "@/lib/types";
import { Modal } from "../overlay";
import { Hand, HiliteButton, HiliteLink, Label, LineInput, PenButton, PenLink, Stamp, Tick } from "./paper";

type Result = Awaited<ReturnType<typeof reserveByEmail>>;

/** Reserve a live class with the member's email — set as an appointment card. */
export function ReserveModal({ session, ct, ins, onClose }: { session: Session | null; ct?: ClassType; ins?: Instructor; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmail(localStorage.getItem("studio-email") ?? "");
    } catch {}
    setRes(null);
    setInvalid(false);
  }, [session]);

  const go = async () => {
    if (!session) return;
    if (!/^\S+@\S+\.\S+$/.test(email)) { setInvalid(true); return; }
    setBusy(true);
    const r = await reserveByEmail(session.id, email);
    try { localStorage.setItem("studio-email", email); } catch {}
    setRes(r);
    setBusy(false);
  };

  if (!session) return null;
  const when = format(new Date(session.start), "EEEE d MMMM · h:mm a");
  return (
    <Modal open={!!session} onClose={onClose} title={<span className="f-wide text-[22px] font-black uppercase">Appointment card</span>} size="sm">
      <dl className="mb-6 grid grid-cols-[6.5rem_1fr] gap-y-2 border-y-[1.5px] border-print py-3 text-[15px]">
        <dt className="f-narrow text-[12px] font-semibold uppercase tracking-[0.1em] text-form">Class</dt><dd className="f-print font-bold text-print">{ct?.name}</dd>
        <dt className="f-narrow text-[12px] font-semibold uppercase tracking-[0.1em] text-form">When</dt><dd className="text-print">{when}</dd>
        <dt className="f-narrow text-[12px] font-semibold uppercase tracking-[0.1em] text-form">With</dt><dd className="text-print">{ins?.name ?? "Our team"} · {session.duration} min</dd>
      </dl>

      {!res && (
        <form onSubmit={(e) => { e.preventDefault(); go(); }} className="space-y-5">
          <div>
            <Label htmlFor="reserve-email">Your email</Label>
            <LineInput id="reserve-email" type="email" autoFocus autoComplete="email" invalid={invalid} value={email}
              onChange={(e) => { setEmail(e.target.value); setInvalid(false); }} placeholder="you@example.com" />
            <p className={invalid ? "mt-1.5 text-[14px] text-stamp" : "mt-1.5 text-[14px] text-muted"}>
              {invalid ? "That email doesn't look complete — check for a typo." : "We find your membership and book you in with your credits."}
            </p>
          </div>
          <HiliteButton type="submit" size="lg" disabled={busy}>{busy ? "Checking…" : "Reserve my place"}</HiliteButton>
          <p className="text-[14px] text-muted">First time? <PenLink href="/join" className="text-[14px]">Start with the intake form</PenLink></p>
        </form>
      )}

      {(res?.status === "booked" || res?.status === "waitlisted") && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="relative inline-block size-9 border-[1.5px] border-form"><Tick className="absolute -left-1.5 -top-3 size-12" /></span>
            <span className="f-print text-[20px] font-bold text-print">
              {res.status === "booked" ? `You're booked, ${res.name}.` : `You're on the waitlist, ${res.name}.`}
            </span>
          </div>
          <p className="text-[16px] text-print-2">
            {res.status === "booked"
              ? "Arrive 10 minutes early and bring grip socks."
              : "This class is full. If a place opens up, you move in automatically and your credit is used then."}
          </p>
          <Hand as="p" className="text-[26px]">see you on {format(new Date(session.start), "EEEE")}!</Hand>
          <HiliteButton onClick={onClose}>Done</HiliteButton>
        </div>
      )}

      {res?.status === "unknown" && (
        <div className="space-y-4">
          <p className="f-print text-[19px] font-bold text-print">We haven&apos;t met yet.</p>
          <p className="text-[16px] text-print-2">There&apos;s no client record for <strong className="text-print">{email}</strong>. The intake form takes about three minutes and lets your instructor prepare.</p>
          <HiliteLink href={`/join?email=${encodeURIComponent(email)}`} size="lg">Fill in the intake form</HiliteLink>
          <div><PenButton onClick={() => setRes(null)} className="text-[15px]">Use a different email</PenButton></div>
        </div>
      )}

      {res?.status === "nocredit" && (
        <div className="space-y-4">
          <p className="f-print text-[19px] font-bold text-print">Almost there, {res.name}.</p>
          <p className="text-[16px] text-print-2">You don&apos;t have a pass that covers this class yet. Add one to your order, then reserve.</p>
          <Stamp animate={false} rot={-4} className="text-[14px]">Pass needed</Stamp>
          <div><HiliteLink href="/shop#passes" size="lg">See passes and packs</HiliteLink></div>
        </div>
      )}

      {res?.status === "error" && (
        <div className="space-y-4">
          <p className="text-[16px] text-print-2">{res.message}</p>
          <PenButton onClick={() => setRes(null)}>Try again</PenButton>
        </div>
      )}
    </Modal>
  );
}
