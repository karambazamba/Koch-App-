// Einheitliches Datenmodell für alles, was Lotte anlegt und wegräumt –
// vorbereitet für den Umzug nach Supabase (eine Tabelle "eintraege"):
// jeder Eintrag hat id, typ, raum, besitzer, erstellt, geändert und die
// eigentlichen Daten. Bis es Konten gibt, ist der Besitzer "lokal".

import { nowIso } from "@/lib/core/now";

export type EntryType = "termin" | "aufgabe" | "notiz" | "gericht" | "einkauf" | "pinnwand" | "memo" | "training";

/**
 * Zwei Räume (A-021): Familie = alle im Haushalt (geteilt), Arbeit = nur der
 * Besitzer (sichtbar „Geschäftlich“, nach Feierabend ausgeblendet). Einen Raum
 * für „privat“ oder „nur ich“ gibt es nicht.
 */
export type Room = "familie" | "arbeit";

/**
 * Unbekanntes → Raum (ohne Angabe Familie). „ich“ (nur aus nie
 * ausgelieferten Testständen von A-020, hieß „nur ich“) wird Arbeit, damit es
 * nie ungefragt für den Haushalt sichtbar wird; umstellen geht per Antippen.
 */
export const roomOf = (v: unknown): Room => (v === "arbeit" || v === "ich" ? "arbeit" : "familie");

/** Sieht nur der Besitzer (Arbeit; altes „ich“ zählt mit) */
export const nurBesitzer = (r: unknown): boolean => roomOf(r) === "arbeit";

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
