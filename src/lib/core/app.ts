/**
 * Name der App – EINZIGE Stelle (Markenprüfung läuft: hier ändern genügt).
 * Überall verwenden statt den Namen fest zu schreiben. „Was gibt’s?“ heißt
 * nur noch der Essen-Bereich.
 */
export const APP_NAME = "Mia";

/** Kurzname unter dem Icon auf dem Homescreen */
export const APP_SHORT_NAME = `${APP_NAME}`;

/** Langer Name im Manifest (Installieren, App-Übersicht) */
export const APP_FULL_NAME = `${APP_NAME} – Familienplaner`;

/** Beschreibung (Manifest, Suchmaschinen) */
export const APP_DESCRIPTION = "Erzähl einfach, was ansteht – Termine, Aufgaben, Essen und Einkauf für die ganze Familie.";

/** Feste Adresse der App (eigene Domain, keine Weiterleitung) – für Links, die man weitergibt */
export const APP_URL = "https://mia.karamba-eis.de";

/**
 * Adresse für weitergegebene Links (Einladungen): immer die feste Adresse –
 * außer auf dem eigenen Rechner bzw. im Testserver (dort bleibt die Herkunft).
 */
export function appOrigin(origin: string): string {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\/?$/.test(origin) ? origin.replace(/\/$/, "") : APP_URL;
}

/** Versionsnummer (wie in package.json) – in den Einstellungen unter "Daten & App" */
export const APP_VERSION = "0.159.0";

/** Tag der Auslieferung (beim Bauen gesetzt, next.config.ts) */
const APP_BUILD_DATE = process.env.BUILD_DATE ?? "";

/** "Version 0.25 · Stand 20.10.2026" */
export function versionLabel(): string {
  const [y, m, d] = APP_BUILD_DATE.split("-");
  const short = APP_VERSION.replace(/\.0$/, "");
  return y ? `Version ${short} · Stand ${d}.${m}.${y}` : `Version ${short}`;
}

/**
 * Version der Icon-Dateien – steht im Dateinamen (z. B. apple-touch-icon-v3.png),
 * damit iPhone/Android ein neues Icon nicht aus dem Cache holen. Bei jedem neuen
 * Icon erhöhen; `npm run icons` liest den Wert von hier.
 */
const ICON_VERSION = "v4";

/** Pfad einer Icon-Datei mit Version: icon("icon-192.png") → "/icons/icon-192-v3.png" */
export const icon = (file: string) => `/icons/${file.replace(/(\.\w+)$/, `-${ICON_VERSION}$1`)}`;

/** Lieblingsfarbe der Begleitung (Cookie "farbe") – App-Icon in derselben Farbe */
export const FARBE_COOKIE = "farbe";

/**
 * Icon-Datei in der Lieblingsfarbe: iconFor("lila", "icon-192.png") →
 * "/icons/lila/icon-192-v3.png". Unbekannte Farbe → Orange.
 */
export const iconFor = (farbe: string | undefined, file: string) => `/icons/${ICON_FARBEN.includes(farbe ?? "") ? farbe : "orange"}/${file.replace(/(\.\w+)$/, `-${ICON_VERSION}$1`)}`;
/** Farben mit eigenem Icon-Satz (wie AVATAR_COLORS) */
const ICON_FARBEN = ["orange", "nachtblau", "himmelblau", "lila", "beere", "rosa", "koralle", "senf", "waldgruen", "anthrazit"];

/** Lottes Gesicht für Push-Mitteilungen (orange Kreis, aus scripts/generate-icons.mjs) */
export const BEGLEITUNG_PUSH_ICON = icon("lotte-192.png");

/** Markenfarbe (Mia-Orange, src/lib/core/brand.ts) – Statusleiste der installierten App */
export { BRAND as BRAND_COLOR } from "@/lib/core/brand";
