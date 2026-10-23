// Speicher der Pinnwand (`wasgibts.pinnwand` v3, lokal – geteilt über die
// Konten, Tabelle "eintraege" mit typ "pinnwand" bzw. "memo").
// v2: Sprachnachrichten (`memos`, nur die Einträge – der Ton liegt in
// IndexedDB); v1 bekommt eine leere Liste. v3: Reaktionen je Person
// (Person → Emoji statt Emoji → Personen) und Antworten mit Zitat. Alles
// älter als 24 Std. (außer Angeheftetem) räumt das Speichern weg, beim Start
// `tidyPinboard`.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { now } from "@/lib/core/now";
import { prunePins, sanitizePin, type PinMessage } from "@/lib/pinnwand/model";
import { pruneMemos, sanitizeMemo, type MemoMessage } from "@/lib/pinnwand/memo";

type PinStore = { version: 3; messages: PinMessage[]; memos: MemoMessage[] };

/** v1 → v2: Memos kommen dazu; v2 → v3: Reaktionen umgedreht (beim Lesen jedes Eintrags) */
export function migratePinStore(raw: unknown): PinStore | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { version?: number; messages?: unknown; memos?: unknown };
  if (r.version !== 1 && r.version !== 2 && r.version !== 3) return null;
  const messages = (Array.isArray(r.messages) ? r.messages : []).map(sanitizePin).filter((m): m is PinMessage => m !== null);
  const memos = r.version !== 1 && Array.isArray(r.memos) ? r.memos.map(sanitizeMemo).filter((m): m is MemoMessage => m !== null) : [];
  return { version: 3, messages, memos };
}

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
  const nowMs = now().getTime();
  store.save({ version: 3, messages: prunePins(messages, nowMs), memos: pruneMemos(memos, nowMs) });
}

/** Änderung anwenden; liefert "Rückgängig" */
export function changePins(change: (list: PinMessage[]) => PinMessage[]): () => void {
  const before = loadPins();
  save(change(before), loadMemos());
  return () => store.save({ version: 3, messages: before, memos: loadMemos() });
}

/** Änderung der Sprachnachrichten; liefert "Rückgängig" */
export function changeMemos(change: (list: MemoMessage[]) => MemoMessage[]): () => void {
  const before = loadMemos();
  save(loadPins(), change(before));
  return () => store.save({ version: 3, messages: loadPins(), memos: before });
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
