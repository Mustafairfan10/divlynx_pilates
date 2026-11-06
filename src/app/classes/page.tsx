import { LegacyRedirect } from "@/components/legacy-redirect";

// Moved to /admin/classes — forwards old links and bookmarks.
export default function Page() {
  return <LegacyRedirect to="/admin/classes" />;
}
