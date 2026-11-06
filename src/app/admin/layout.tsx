import type { Metadata } from "next";
import { AppShell } from "@/components/shell";

export const metadata: Metadata = {
  title: { default: "Studio Manager", template: "%s · Studio Manager" },
  description: "Run your Pilates studio — schedule, members, memberships, check-in, payments and reports. Works offline.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
