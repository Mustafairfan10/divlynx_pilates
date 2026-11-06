"use client";
import { useEffect } from "react";

/**
 * Staff screens moved under /admin. Old bookmarks and installed-app shortcuts
 * (e.g. /members?id=…) land here and are forwarded, keeping the query string.
 */
export function LegacyRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to + window.location.search + window.location.hash);
  }, [to]);
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100dvh", fontFamily: "system-ui, sans-serif", color: "#6e7069" }}>
      <p>
        Moved to <a href={to} style={{ color: "#2e4a3e" }}>{to}</a>…
      </p>
    </main>
  );
}
