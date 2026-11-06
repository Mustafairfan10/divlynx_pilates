import { LegacyRedirect } from "@/components/legacy-redirect";

// Moved to /admin/check-in — forwards old links and bookmarks.
export default function Page() {
  return <LegacyRedirect to="/admin/check-in" />;
}
