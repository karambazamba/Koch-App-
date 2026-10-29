// Mias feste Ansagen fürs Durchatmen (A-051, Tafel 139): Texte aus
// `content/durchatmen/ansagen.json`. Einmal vorab mit Mias Stimme erzeugt
// (`scripts/ansagen-erzeugen.mjs`), liegen sie als kleine Dateien in
// `public/audio/durchatmen/` samt Liste `index.json` (der Service-Worker merkt
// sie sich → offline, keine Kosten pro Übung). Fehlt eine Datei (oder die
// ganze Liste), spricht die Stimme des Handys – langsamer und leiser.

import roh from "@/content/durchatmen/ansagen.json";
import type { Uebung } from "@/lib/durchatmen/uebungen";

export const ANSAGEN: Readonly<Record<string, string>> = (roh as { saetze: Record<string, string> }).saetze;

/** Ordner der erzeugten Dateien (öffentlich) */
const AUDIO_ORDNER = "/audio/durchatmen";
export const AUDIO_LISTE = `${AUDIO_ORDNER}/index.json`;

/** Liste der erzeugten Dateien: ID → Dateiname */
export type AudioListe = { version: 1; stimme: string | null; dateien: Record<string, string> };

export const ansageText = (id: string): string => ANSAGEN[id] ?? "";

/** Alle Sätze einer Übung (Start, Phasen bzw. Schritte, Ende) – höchstens 6 */
export const ansagenDer = (u: Uebung): string[] => u.ansagen.map(ansageText).filter(Boolean);

/** Wie wird gesprochen? Datei, wenn sie erzeugt wurde – sonst die Stimme des Handys */
export function stimmeWeg(liste: AudioListe | null, id: string): { art: "datei"; url: string } | { art: "handy"; text: string } {
  const datei = liste?.dateien?.[id];
  if (datei && /^[a-z0-9-]+\.(mp3|m4a|ogg|wav)$/.test(datei)) return { art: "datei", url: `${AUDIO_ORDNER}/${datei}` };
  return { art: "handy", text: ansageText(id) };
}

/** Gelesene Liste prüfen (kaputt oder leer = null, dann spricht das Handy) */
export function liesAudioListe(raw: unknown): AudioListe | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as { dateien?: unknown; stimme?: unknown };
  if (!d.dateien || typeof d.dateien !== "object") return null;
  const dateien = Object.fromEntries(Object.entries(d.dateien as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === "string" && e[0] in ANSAGEN));
  return Object.keys(dateien).length ? { version: 1, stimme: typeof d.stimme === "string" ? d.stimme : null, dateien } : null;
}

/** Handy-Stimme beim Durchatmen: langsamer und leiser als normale Antworten */
export const HANDY_TEMPO = 0.85;
export const HANDY_LAUT = 0.7;
/** Erzeugte Dateien: etwas leiser als Mias Antworten */
export const DATEI_LAUT = 0.75;
