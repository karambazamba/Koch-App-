// Speicher für Notizen (`wasgibts.notizen` v1, lokal – später Supabase,
// gleiche Tabelle "eintraege" mit typ "notiz").

import { createLocalStore } from "../core/localStore";
import { useExternalStore } from "../core/useExternalStore";
import { sanitizeNote, type Note } from "./model";

type NoteStore = { version: 1; notes: Note[] };

const store = createLocalStore("wasgibts.notizen", (raw: unknown): NoteStore | null => {
  if (!raw || typeof raw !== "object" || (raw as NoteStore).version !== 1) return null;
  const notes = Array.isArray((raw as NoteStore).notes) ? (raw as NoteStore).notes : [];
  return { version: 1, notes: notes.map(sanitizeNote).filter((n): n is Note => n !== null) };
});

const EMPTY: Note[] = [];

export function loadNotes(): Note[] {
  return store.load()?.notes ?? EMPTY;
}

export function replaceNotes(notes: Note[]) {
  store.save({ version: 1, notes });
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
