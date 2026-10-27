// Mehr Abwechslung (Auftrag „Essen: Wochenkarte und mehr Abwechslung“):
// wann eine Idee (Titel) zuletzt gezeigt wurde – an einem früheren Tag
// gezeigt und nicht genommen, rückt sie 7 Tage nach hinten (`ideasFor`).
// Nur auf dem Gerät, Einträge älter als 30 Tage fallen weg.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { addDays } from "@/lib/core/now";

type State = { version: 1; shown: Record<string, string> };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** v1 @public für Tests */
export function migrateIdeenGezeigt(raw: unknown): State | null {
  if (!raw || typeof raw !== "object" || (raw as State).version !== 1) return null;
  const shown = (raw as Partial<State>).shown;
  return { version: 1, shown: shown && typeof shown === "object" ? Object.fromEntries(Object.entries(shown).filter(([, d]) => typeof d === "string" && DAY.test(d))) : {} };
}

const store = createLocalStore("wasgibts.ideengezeigt", migrateIdeenGezeigt);
const EMPTY: Record<string, string> = {};
const load = () => store.load()?.shown ?? EMPTY;

/** Zuletzt gezeigt: Titel (klein) → Tag */
export const useIdeenGezeigt = (): Record<string, string> => useExternalStore(store.subscribe, load, () => EMPTY);

/** Gezeigte Ideen merken (nur wenn sich etwas ändert) */
export function merkeGezeigt(titles: string[], today: string) {
  const before = load();
  const keys = titles.map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (keys.every((k) => before[k] === today)) return;
  const old = addDays(today, -30);
  const shown = Object.fromEntries(Object.entries(before).filter(([, d]) => d >= old));
  for (const k of keys) shown[k] = today;
  store.save({ version: 1, shown });
}
