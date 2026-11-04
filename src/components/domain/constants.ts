import type { Booking } from "@/lib/types";

type Tone = "neutral" | "accent" | "good" | "warn" | "bad" | "info" | "clay";

export const BOOKING_BADGE: Record<Booking["status"], { label: string; tone: Tone }> = {
  booked: { label: "Booked", tone: "info" },
  checked_in: { label: "Checked in", tone: "good" },
  waitlist: { label: "Waitlist", tone: "warn" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  late_cancel: { label: "Late cancel", tone: "clay" },
  no_show: { label: "No-show", tone: "bad" },
};

export const MEMBER_STATUS: Record<string, { label: string; tone: "good" | "info" | "neutral" | "warn" }> = {
  active: { label: "Active", tone: "good" },
  lead: { label: "Lead", tone: "info" },
  inactive: { label: "Inactive", tone: "neutral" },
  frozen: { label: "Frozen", tone: "warn" },
};
