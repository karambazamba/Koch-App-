import type { MetadataRoute } from "next";
import { APP_DESCRIPTION, APP_FULL_NAME, APP_SHORT_NAME, BRAND_COLOR, iconFor } from "@/lib/core/app";

/**
 * Manifest mit dem App-Icon in Mia-Orange (seit v0.64 immer orange, die
 * Lieblingsfarbe färbt es nicht mehr um). Feste id und gleiche URL – so
 * übernimmt Android/Chrome ein früher andersfarbiges Icon selbst wieder in
 * Orange. Maskable nur für das Icon mit mehr Rand.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const farbe = "orange";
  return {
    id: "/",
    name: APP_FULL_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    lang: "de",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf7f2",
    theme_color: BRAND_COLOR,
    icons: [
      { src: iconFor(farbe, "icon.svg"), sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: iconFor(farbe, "favicon-32.png"), sizes: "32x32", type: "image/png", purpose: "any" },
      { src: iconFor(farbe, "icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: iconFor(farbe, "icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: iconFor(farbe, "icon-maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
