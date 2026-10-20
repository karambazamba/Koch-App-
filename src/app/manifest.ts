import type { MetadataRoute } from "next";
import { APP_NAME, APP_SHORT_NAME, BRAND_COLOR, icon } from "@/lib/core/app";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description:
      "Deine Begleitung für den Familienalltag – Termine, Aufgaben, Essen und Einkauf.",
    lang: "de",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf7f2",
    theme_color: BRAND_COLOR,
    icons: [
      { src: icon("icon.svg"), sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: icon("favicon-48.png"), sizes: "48x48", type: "image/png", purpose: "any" },
      { src: icon("icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: icon("icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: icon("icon-maskable-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
