// Speicher für Termine und Aufgaben (`wasgibts.eintraege`, lokal – später
// Supabase-Tabelle "eintraege"). Alte Termine aus `wasgibts.termine` werden
// einmalig übernommen (die alten Daten bleiben unangetastet liegen).

import { useExternalStore } from "@/lib/core/useExternalStore";
import { createLocalStore, readRaw, writeRaw } from "@/lib/core/localStore";
import { createEntry } from "@/lib/core/entries";
import { nowIso, todayIso } from "@/lib/core/now";
import { ohneZeitraum, sanitizeEntry, type CalendarEntry, type TerminData } from "@/lib/kalender/model";
import { OLD_TERMINE_KEY } from "@/lib/core/storage";
import { isAboEntry } from "@/lib/kalender/abo/model";

type EntryStore = {
  version: 3;
  entries: CalendarEntry[];
  /** Alte Termine (`wasgibts.termine`) schon übernommen? */
  migratedTermine: boolean;
  /** Gesehene Erinnerungen ("<id>@<datum>") */
  seenReminders: string[];
};

/**
 * v1 → v2: Termin = feste Uhrzeit. Einmalige, offene "Aufgaben" mit Tag und
 * Uhrzeit (aber ohne Frist) waren eigentlich Termine und werden zu Terminen.
 */
function asTermin(e: CalendarEntry): CalendarEntry {
  if (e.typ !== "aufgabe") return e;
  const a = e.data;
  if (!a.time || !a.date || a.due || a.repeat || a.doneOn) return e;
  return { ...e, typ: "termin", data: { title: a.title, date: a.date, start: a.time, label: a.label, reminder: a.reminder, repeat: null, doneDates: [], skipDates: a.skipDates ?? [] } };
}

function migrate(raw: unknown): EntryStore | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<Omit<EntryStore, "version">> & { version?: number };
  if (d.version !== 1 && d.version !== 2 && d.version !== 3) return null;
  const entries = (Array.isArray(d.entries) ? d.entries : []).map(sanitizeEntry).filter((e): e is CalendarEntry => e !== null);
  const today = todayIso();
  return {
    version: 3,
    entries: (d.version === 1 ? entries.map(asTermin) : entries).map((e) => ohneZeitraum(e, today)),
    migratedTermine: d.migratedTermine === true,
    seenReminders: Array.isArray(d.seenReminders) ? d.seenReminders.filter((x): x is string => typeof x === "string").slice(-200) : [],
  };
}

const store = createLocalStore("wasgibts.eintraege", migrate);
const EMPTY: CalendarEntry[] = [];
const EMPTY_SEEN: string[] = [];

function current(): EntryStore {
  return store.load() ?? { version: 3, entries: [], migratedTermine: false, seenReminders: [] };
}

export function loadEntries(): CalendarEntry[] {
  return store.load()?.entries ?? EMPTY;
}

/** Alle Einträge ersetzen (Übernehmen/Rückgängig) – Termine der Kalender-Links (nur lesen) kommen nie hinein */
export function replaceEntries(entries: CalendarEntry[]) {
  store.save({ ...current(), entries: entries.some(isAboEntry) ? entries.filter((e) => !isAboEntry(e)) : entries });
}

/** Änderung anwenden; liefert "Rückgängig" */
export function changeEntries(change: (entries: CalendarEntry[], stamp: string) => CalendarEntry[]): () => void {
  const before = loadEntries();
  replaceEntries(change(before, nowIso()));
  return () => replaceEntries(before);
}

/** Termine und Aufgaben (`undefined` = lädt) */
export function useEntries(): CalendarEntry[] | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined) return undefined;
  return data?.entries ?? EMPTY;
}

export function useSeenReminders(): string[] {
  const data = useExternalStore(store.subscribe, store.load, () => null);
  return data?.seenReminders ?? EMPTY_SEEN;
}

export function markReminderSeen(key: string) {
  const s = current();
  if (s.seenReminders.includes(key)) return;
  store.save({ ...s, seenReminders: [...s.seenReminders, key].slice(-200) });
}

/**
 * Alte Termine (per Gespräch notiert, `wasgibts.termine`) einmalig ins neue
 * Modell übernehmen. Läuft beim Start (EntriesSetup im Layout).
 */
export function migrateOldTermine() {
  const s = current();
  if (s.migratedTermine) {
    removeOldTermine();
    return;
  }
  let old: { id?: string; date?: string; time?: string; until?: boolean; title?: string; personId?: string | null; who?: string }[] = [];
  try {
    const raw = JSON.parse(readRaw(OLD_TERMINE_KEY) ?? "null") as { items?: unknown } | null;
    if (raw && Array.isArray(raw.items)) old = raw.items as typeof old;
  } catch {
    old = [];
  }
  const converted = old
    .filter((a) => typeof a.title === "string" && typeof a.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.date))
    .map((a) => {
      const title = a.until && a.time ? `${a.title} (bis ${a.time})` : a.title!;
      const data: TerminData = {
        title: a.who ? `${title} – ${a.who}` : title,
        date: a.date!,
        start: a.time || "08:00",
        reminder: "aus",
        who: a.personId ? [a.personId] : undefined,
      };
      return createEntry("termin", data, { id: a.id }) as CalendarEntry;
    });
  store.save({ ...s, entries: [...s.entries, ...converted.filter((c) => !s.entries.some((e) => e.id === c.id))], migratedTermine: true });
  removeOldTermine();
}

/** Übernommen → alter Schlüssel kann weg */
function removeOldTermine() {
  try {
    writeRaw(OLD_TERMINE_KEY, null);
  } catch {
    // ohne Speicher nichts zu tun
  }
}
