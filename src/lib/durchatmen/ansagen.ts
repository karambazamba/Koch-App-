// Mias feste Ansagen fürs Durchatmen (A-051, A-061, Tafel 139/146): Texte aus
// `content/durchatmen/ansagen.json`. Gesprochen wird NUR mit Mias Stimme
// (ElevenLabs, Stimme „Lola“ = MIA_VOICE_ID) – nie mit der Stimme des Handys.
// Die App ruft `/audio/durchatmen/<id>.mp3?t=<Text-Hash>` ab: Die Route
// liefert die Datei aus dem öffentlichen Bucket „durchatmen-ansagen“ und
// erzeugt sie beim allerersten Abruf einmal auf dem Server (nur Sätze aus der
// Datei, nie freier Text). Der Service-Worker merkt sie sich → offline, keine
// Kosten pro Übung. Fehlt sie (noch), gibt es nur Klang.

import roh from "@/content/durchatmen/ansagen.json";
import type { Uebung } from "@/lib/durchatmen/uebungen";

export const ANSAGEN: Readonly<Record<string, string>> = (roh as { saetze: Record<string, string> }).saetze;

/** Adresse der Ansagen (eigene Route, liefert aus dem Bucket bzw. erzeugt einmal) */
const AUDIO_ORDNER = "/audio/durchatmen";

/** Manifest im Bucket (nur Übersicht für den nächtlichen Lauf): ID → Dateiname */
export type AudioListe = { version: 1; stimme: string | null; dateien: Record<string, string> };

export const ansageText = (id: string): string => ANSAGEN[id] ?? "";

/** Alle Sätze einer Übung (Start, Phasen bzw. Schritte, Ende) – höchstens 6 */
export const ansagenDer = (u: Uebung): string[] => u.ansagen.map(ansageText).filter(Boolean);

/** Kleiner Hash des Textes (FNV-1a) – ändert sich der Satz, ändert sich die Adresse (Speicher des Geräts) */
export function textHash(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

/** Adresse einer Ansage – oder null, wenn es den Satz nicht gibt */
export function ansageUrl(id: string): string | null {
  const text = ANSAGEN[id];
  return text ? `${AUDIO_ORDNER}/${id}.mp3?t=${textHash(text)}` : null;
}

/** Aus der Adresse die ID (nur Sätze aus der Datei, sonst null) */
export function ansageIdAus(datei: string): string | null {
  const id = /^([a-z0-9-]{1,40})\.mp3$/.exec(datei)?.[1];
  return id && Object.prototype.hasOwnProperty.call(ANSAGEN, id) ? id : null;
}

/** Gelesenes Manifest prüfen (kaputt oder leer = null) */
export function liesAudioListe(raw: unknown): AudioListe | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as { dateien?: unknown; stimme?: unknown };
  if (!d.dateien || typeof d.dateien !== "object") return null;
  const dateien = Object.fromEntries(Object.entries(d.dateien as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === "string" && e[0] in ANSAGEN && /^[a-z0-9-]+\.mp3$/.test(e[1])));
  return Object.keys(dateien).length ? { version: 1, stimme: typeof d.stimme === "string" ? d.stimme : null, dateien } : null;
}

/** Ansagen etwas leiser als Mias Antworten */
export const DATEI_LAUT = 0.75;
