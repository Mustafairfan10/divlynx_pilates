import { LegacyRedirect } from "@/components/legacy-redirect";

// Moved to /admin/instructors — forwards old links and bookmarks.
export default function Page() {
  return <LegacyRedirect to="/admin/instructors" />;
}
