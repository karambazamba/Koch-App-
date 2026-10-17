import type { MetadataRoute } from "next";
import { APP_NAME, APP_SHORT_NAME } from "@/lib/app";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} – Kochen für die ganze Familie`,
    short_name: APP_SHORT_NAME,
    description:
      "Wochenplan, Schnellküche und Einkaufsliste – passend zu deinem Haushalt.",
    lang: "de",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff7ed",
    theme_color: "#f97316",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
