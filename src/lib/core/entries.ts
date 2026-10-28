// Einheitliches Datenmodell für alles, was Lotte anlegt und wegräumt –
// vorbereitet für den Umzug nach Supabase (eine Tabelle "eintraege"):
// jeder Eintrag hat id, typ, raum, besitzer, erstellt, geändert und die
// eigentlichen Daten. Bis es Konten gibt, ist der Besitzer "lokal".

import { nowIso } from "@/lib/core/now";

export type EntryType = "termin" | "aufgabe" | "notiz" | "gericht" | "einkauf" | "pinnwand" | "memo" | "training";

/**
 * Drei Räume, benannt nach „wer sieht es“ (Tafel 114): Familie = alle im
 * Haushalt (geteilt), Ich = nur der Besitzer (abends sichtbar), Arbeit = nur
 * der Besitzer (nach Feierabend ausgeblendet).
 */
export type Room = "familie" | "ich" | "arbeit";

/** Unbekanntes → Raum (ohne Angabe Familie; „ich“ und „arbeit“ gehen nie verloren) */
export const roomOf = (v: unknown): Room => (v === "arbeit" || v === "ich" ? v : "familie");

/** Sieht nur der Besitzer (Ich und Arbeit) */
export const nurBesitzer = (r: unknown): boolean => r === "ich" || r === "arbeit";

/** Ohne Konto gehört alles diesem Gerät */
export const LOCAL_OWNER = "lokal";

export type Entry<T = Record<string, unknown>> = {
  id: string;
  typ: EntryType;
  raum: Room;
  /** Konto-ID (später Supabase), bis dahin "lokal" */
  besitzer: string;
  /** ISO-Zeitstempel */
  erstellt: string;
  geaendert: string;
  data: T;
};

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

/** Neuer Eintrag mit Zeitstempeln (Familie, lokal, wenn nichts anderes gesagt) */
export function createEntry<T>(typ: EntryType, data: T, opts: { raum?: Room; besitzer?: string; id?: string } = {}): Entry<T> {
  const stamp = nowIso();
  return { id: opts.id ?? newId(), typ, raum: opts.raum ?? "familie", besitzer: opts.besitzer ?? LOCAL_OWNER, erstellt: stamp, geaendert: stamp, data };
}

/** Geänderte Kopie mit neuem "geändert" */
export function updateEntry<T>(entry: Entry<T>, data: Partial<T>): Entry<T> {
  return { ...entry, data: { ...entry.data, ...data }, geaendert: nowIso() };
}
