// Speicher der Pinnwand (`wasgibts.pinnwand` v4, lokal – geteilt über die
// Konten, Tabelle "eintraege" mit typ "pinnwand" bzw. "memo").
// v2: Sprachnachrichten (`memos`, nur die Einträge – der Ton liegt in
// IndexedDB); v1 bekommt eine leere Liste. v3: Reaktionen je Person
// (Person → Emoji statt Emoji → Personen) und Antworten mit Zitat.
// v4 (Kühlschranktür, Tafel 106): Farbe, Papier, Foto, Erledigt, Archiv –
// alle vorhandenen Zettel bleiben, ihre Farbe ist die der Person. Nichts
// wird mehr von selbst weggeräumt: Altes liegt im Archiv „Ältere“.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import type { PinMessage } from "@/lib/pinnwand/model";
import type { MemoMessage } from "@/lib/pinnwand/memo";
import { migratePinStore } from "@/lib/pinnwand/migration";

export { migratePinStore } from "@/lib/pinnwand/migration";

const store = createLocalStore("wasgibts.pinnwand", migratePinStore);

const EMPTY: PinMessage[] = [];
const NO_MEMOS: MemoMessage[] = [];

export function loadPins(): PinMessage[] {
  return store.load()?.messages ?? EMPTY;
}

export function loadMemos(): MemoMessage[] {
  return store.load()?.memos ?? NO_MEMOS;
}

function save(messages: PinMessage[], memos: MemoMessage[]) {
  store.save({ version: 4, messages, memos });
}

/** Änderung anwenden; liefert "Rückgängig" */
export function changePins(change: (list: PinMessage[]) => PinMessage[]): () => void {
  const before = loadPins();
  save(change(before), loadMemos());
  return () => store.save({ version: 4, messages: before, memos: loadMemos() });
}

/** Änderung der Sprachnachrichten; liefert "Rückgängig" */
export function changeMemos(change: (list: MemoMessage[]) => MemoMessage[]): () => void {
  const before = loadMemos();
  save(loadPins(), change(before));
  return () => store.save({ version: 4, messages: loadPins(), memos: before });
}

export function usePins(): PinMessage[] | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined) return undefined;
  return data?.messages ?? EMPTY;
}

export function useMemos(): MemoMessage[] | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined) return undefined;
  return data?.memos ?? NO_MEMOS;
}
