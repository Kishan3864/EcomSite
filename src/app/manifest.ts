import type { MetadataRoute } from "next";
import { BRAND } from "@/components/brand/logo";

/**
 * Web app manifest: "Add to Home Screen" installs WeekendCart with its own
 * icon, and it opens full-screen without the browser's address bar.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.name,
    description: BRAND.description,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f5f1",
    theme_color: "#f7f5f1",
    categories: ["shopping"],
    icons: [
      { src: "/brand/png/weekendcart-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/png/weekendcart-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/brand/png/weekendcart-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
