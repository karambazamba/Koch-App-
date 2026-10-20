import type { MetadataRoute } from "next";
import { cookies } from "next/headers";
import { APP_NAME, APP_SHORT_NAME, BRAND_COLOR, FARBE_COOKIE, iconFor } from "@/lib/core/app";

/**
 * Manifest in der Lieblingsfarbe der Begleitung (Cookie "farbe", beim Wählen
 * gesetzt). Feste id und gleiche URL – so übernimmt Android/Chrome ein neues
 * Icon selbst. Maskable nur für das Icon mit mehr Rand.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const farbe = (await cookies()).get(FARBE_COOKIE)?.value;
  return {
    id: "/",
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
      { src: iconFor(farbe, "icon.svg"), sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: iconFor(farbe, "favicon-32.png"), sizes: "32x32", type: "image/png", purpose: "any" },
      { src: iconFor(farbe, "icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: iconFor(farbe, "icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: iconFor(farbe, "icon-maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
