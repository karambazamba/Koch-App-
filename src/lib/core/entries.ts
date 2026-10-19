// Einheitliches Datenmodell für alles, was Lotte anlegt und wegräumt –
// vorbereitet für den Umzug nach Supabase (eine Tabelle "eintraege"):
// jeder Eintrag hat id, typ, raum, besitzer, erstellt, geändert und die
// eigentlichen Daten. Bis es Konten gibt, ist der Besitzer "lokal".

import { nowIso } from "./now";

export type EntryType = "termin" | "aufgabe" | "notiz" | "gericht" | "einkauf" | "pinnwand";

/** Familie = gemeinsam, Arbeit = persönlich */
export type Room = "familie" | "arbeit";

export const ROOMS: { value: Room; label: string }[] = [
  { value: "familie", label: "Familie" },
  { value: "arbeit", label: "Arbeit" },
];

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

/** Gespeicherten Eintrag prüfen (z. B. beim Laden oder später aus der Datenbank) */
export function isEntry(raw: unknown): raw is Entry {
  if (!raw || typeof raw !== "object") return false;
  const e = raw as Partial<Entry>;
  return (
    typeof e.id === "string" &&
    (e.typ === "termin" || e.typ === "aufgabe" || e.typ === "notiz" || e.typ === "gericht" || e.typ === "einkauf") &&
    (e.raum === "familie" || e.raum === "arbeit") &&
    typeof e.besitzer === "string" &&
    typeof e.erstellt === "string" &&
    typeof e.geaendert === "string" &&
    Boolean(e.data) &&
    typeof e.data === "object"
  );
}
