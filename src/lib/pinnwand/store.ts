// Speicher der Pinnwand (`wasgibts.pinnwand` v1, lokal – später geteilt über
// die Konten, gleiche Tabelle "eintraege" mit typ "pinnwand"). Alte
// Nachrichten (älter als 3 Tage, nicht angeheftet) räumt das Speichern weg.

import { createLocalStore } from "../core/localStore";
import { useExternalStore } from "../core/useExternalStore";
import { now } from "../core/now";
import { prunePins, sanitizePin, type PinMessage } from "./model";

type PinStore = { version: 1; messages: PinMessage[] };

const store = createLocalStore("wasgibts.pinnwand", (raw: unknown): PinStore | null => {
  if (!raw || typeof raw !== "object" || (raw as PinStore).version !== 1) return null;
  const list = Array.isArray((raw as PinStore).messages) ? (raw as PinStore).messages : [];
  return { version: 1, messages: list.map(sanitizePin).filter((m): m is PinMessage => m !== null) };
});

const EMPTY: PinMessage[] = [];

export function loadPins(): PinMessage[] {
  return store.load()?.messages ?? EMPTY;
}

export function replacePins(messages: PinMessage[]) {
  store.save({ version: 1, messages: prunePins(messages, now().getTime()) });
}

/** Änderung anwenden; liefert "Rückgängig" */
export function changePins(change: (list: PinMessage[]) => PinMessage[]): () => void {
  const before = loadPins();
  replacePins(change(before));
  return () => store.save({ version: 1, messages: before });
}

export function usePins(): PinMessage[] | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined) return undefined;
  return data?.messages ?? EMPTY;
}
