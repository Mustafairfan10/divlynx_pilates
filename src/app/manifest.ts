import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Divlynx Pilates · Studio Manager",
    short_name: "Divlynx",
    description: "Pilates studio management — works fully offline.",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f5f2ec",
    theme_color: "#3d6b58",
    categories: ["business", "health", "fitness", "productivity"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Check-in desk", url: "/admin/check-in" },
      { name: "Schedule", url: "/admin/schedule" },
      { name: "Members", url: "/admin/members" },
    ],
  };
}
