/** Name der App – überall verwenden statt den Namen fest zu schreiben. */
export const APP_NAME = "Was gibt's?";

/** Kurzname für den Homescreen (ohne Fragezeichen, damit er nicht abgeschnitten wirkt) */
export const APP_SHORT_NAME = "Was gibt's";

/** Versionsnummer (wie in package.json) – in den Einstellungen unter "Daten & App" */
export const APP_VERSION = "0.13.0";

/**
 * Version der Icon-Dateien – steht im Dateinamen (z. B. apple-touch-icon-v2.png),
 * damit iPhone/Android ein neues Icon nicht aus dem Cache holen. Bei jedem neuen
 * Icon erhöhen; `npm run icons` liest den Wert von hier.
 */
export const ICON_VERSION = "v2";

/** Pfad einer Icon-Datei mit Version: icon("icon-192.png") → "/icons/icon-192-v2.png" */
export const icon = (file: string) => `/icons/${file.replace(/(\.\w+)$/, `-${ICON_VERSION}$1`)}`;

/** Lottes Gesicht für Push-Mitteilungen (orange Kreis, aus scripts/generate-icons.mjs) */
export const LOTTE_PUSH_ICON = icon("lotte-192.png");

/** Markenfarbe (Verlauf-Ende des App-Icons) – Statusleiste der installierten App */
export const BRAND_COLOR = "#EE5F14";
