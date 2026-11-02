import type { MetadataRoute } from "next";

// The venue dashboard as an installable app. It opens on /dashboard/choose, which sends staff to
// Scan and owners to Home (or a picker for people on more than one venue).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bayline",
    short_name: "Bayline",
    description: "Scan cards, redeem rewards and see your regulars.",
    id: "/dashboard",
    start_url: "/dashboard/choose",
    scope: "/",
    display: "standalone",
    background_color: "#02070a",
    theme_color: "#02070a",
    icons: [
      { src: "/app-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/app-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/app-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
