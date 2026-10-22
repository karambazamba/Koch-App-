// Kalender-Links (Abos) – nur lesen. Ein Abo hat Name, geheimen Link, Farbe,
// Familie/Arbeit und an/aus. Seine Termine sind eigene, schreibgeschützte
// Einträge (besitzer "abo:<id>", feste ids) neben den eigenen: im Kalender und
// auf Heute wie normale Termine, aber zum Ändern „In unseren Kalender
// kopieren“. Rein – Speicher und Abruf in `store.ts`.

import { createEntry, type Room } from "@/lib/core/entries";
import type { AvatarColor } from "@/lib/einstellungen/profileHelper";
import type { CalendarEntry } from "@/lib/kalender/model";

export type Abo = {
  id: string;
  name: string;
  /** Geheimer Link (https/webcal) – nur auf dem Gerät */
  url: string;
  color: AvatarColor;
  raum: Room;
  on: boolean;
  /** Zuletzt erfolgreich abgerufen (ISO) */
  fetchedAt: string | null;
  /** Letzter Fehler als Satz (null = alles gut) */
  error: string | null;
};

export const ABO_PREFIX = "abo:";
const PREFIX = ABO_PREFIX;
/** Höchstens alle 30 Minuten neu abrufen */
const REFRESH_MS = 30 * 60_000;

/** Farben für neue Abos (der Reihe nach) */
const COLORS: AvatarColor[] = ["himmelblau", "waldgruen", "lila", "beere", "senf", "koralle", "rosa", "nachtblau", "anthrazit", "orange"];

export const isAboEntry = (e: Pick<CalendarEntry, "besitzer">) => e.besitzer.startsWith(PREFIX);
export const aboIdOf = (e: Pick<CalendarEntry, "besitzer">) => (isAboEntry(e) ? e.besitzer.slice(PREFIX.length) : null);

/** Nächste freie Farbe */
export function nextColor(abos: Abo[]): AvatarColor {
  return COLORS.find((c) => !abos.some((a) => a.color === c)) ?? COLORS[abos.length % COLORS.length];
}

/** Ist ein Abruf fällig? */
export const isDue = (abo: Abo, nowMs: number) => abo.on && (!abo.fetchedAt || nowMs - Date.parse(abo.fetchedAt) >= REFRESH_MS);

/** „In unseren Kalender kopieren“: eigener, frei änderbarer Termin (ohne Herkunft) */
export function copyToOwn(entry: CalendarEntry): CalendarEntry {
  const data = entry.typ === "termin" ? { ...entry.data, source: undefined, doneDates: [] } : entry.data;
  return createEntry(entry.typ, data, { raum: entry.raum }) as CalendarEntry;
}
