// Speicher Sport (`wasgibts.sport` v1, persönlich – später im Konto, nicht
// automatisch mit der Familie geteilt).

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { EMPTY_SPORT, sanitizeSport, type SportState } from "@/lib/sport/model";

type Stored = { version: 1 } & SportState;

const store = createLocalStore("wasgibts.sport", (raw: unknown): Stored | null => {
  if (!raw || typeof raw !== "object" || (raw as Stored).version !== 1) return null;
  return { version: 1, ...sanitizeSport(raw) };
});

export const loadSport = (): SportState => store.load() ?? EMPTY_SPORT;

export function saveSport(state: SportState) {
  store.save({ version: 1, ...sanitizeSport(state) });
}

/** Änderung anwenden; liefert das Zurücknehmen */
export function changeSport(change: (s: SportState) => SportState): () => void {
  const before = loadSport();
  saveSport(change(before));
  return () => store.save({ version: 1, ...before });
}

export function useSport(): SportState | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data ?? EMPTY_SPORT);
}
