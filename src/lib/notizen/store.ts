// Speicher für Notizen (`wasgibts.notizen` v2, lokal bzw. mit Konto im
// Abgleich, Tabelle "eintraege" mit typ "notiz"). v1 → v2: die alte
// Sammel-Schnellnotiz wird zu einzelnen Notizen (`splitSchnellnotiz`); das
// passiert bei jedem Laden, damit auch Daten von älteren Geräten oder aus
// alten Sicherungen geteilt ankommen.

import { createLocalStore, readRaw } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { migrateNotes, type Note } from "@/lib/notizen/model";

const store = createLocalStore("wasgibts.notizen", migrateNotes);

const EMPTY: Note[] = [];

export function loadNotes(): Note[] {
  return store.load()?.notes ?? EMPTY;
}

export function replaceNotes(notes: Note[]) {
  store.save({ version: 2, notes });
}

/** Beim Start: geteilte Schnellnotiz auch speichern (damit der Abgleich sie sieht) */
export function persistNotes() {
  if (readRaw("wasgibts.notizen")?.includes('"schnell":true')) replaceNotes(loadNotes());
}

/** Änderung anwenden; liefert "Rückgängig" */
export function changeNotes(change: (notes: Note[]) => Note[]): () => void {
  const before = loadNotes();
  replaceNotes(change(before));
  return () => replaceNotes(before);
}

/** Notizen (`undefined` = lädt) */
export function useNotes(): Note[] | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined) return undefined;
  return data?.notes ?? EMPTY;
}
