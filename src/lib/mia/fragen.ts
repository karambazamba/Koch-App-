// Mias Fragen aus den Routinen (Überschneidung, Packliste): einmal
// beantwortet = nie wieder (`wasgibts.miafragen` v1, pro Gerät, die letzten 50).

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";

type FragenStore = { version: 1; answered: Record<string, string> };

const migrateFragen = (raw: unknown): FragenStore | null => {
  if (!raw || typeof raw !== "object" || (raw as FragenStore).version !== 1) return null;
  const a = (raw as FragenStore).answered;
  return { version: 1, answered: a && typeof a === "object" ? Object.fromEntries(Object.entries(a).filter(([, v]) => typeof v === "string")) : {} };
};

const store = createLocalStore("wasgibts.miafragen", migrateFragen);
const EMPTY: Record<string, string> = {};

/** Als beantwortet merken (mit Datum; die letzten 50 bleiben) */
export function answerFrage(key: string, today: string) {
  const kept = Object.entries(store.load()?.answered ?? {}).filter(([k]) => k !== key).slice(-49);
  store.save({ version: 1, answered: { ...Object.fromEntries(kept), [key]: today } });
}

export function useAnsweredFragen(): Record<string, string> {
  return useExternalStore(store.subscribe, () => store.load()?.answered ?? EMPTY, () => EMPTY);
}
