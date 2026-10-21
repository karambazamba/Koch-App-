// Vom Einkauf einräumen: abgehakte Sachen der Einkaufsliste, die noch nicht im
// Vorrat stehen (und nicht schon einmal eingeräumt wurden), mit einem Tipp in
// den Vorrat – jeweils an den naheliegenden Ort. Reine Auswahl + kleiner
// Merker, damit Eingeräumtes nach dem Aufbrauchen nicht wieder angeboten wird.

import { createLocalStore } from "../core/localStore";
import { useExternalStore } from "../core/useExternalStore";
import { sameIngredient, type PantryItem } from "./pantry";

type Moved = { version: 1; weeks: Record<string, string[]> };

const store = createLocalStore("wasgibts.eingeraeumt", (raw: unknown): Moved | null => {
  if (!raw || typeof raw !== "object" || (raw as Moved).version !== 1) return null;
  const weeks = (raw as Moved).weeks;
  const clean: Record<string, string[]> = {};
  for (const [w, keys] of Object.entries(weeks && typeof weeks === "object" ? weeks : {})) if (/^\d{4}-\d{2}-\d{2}$/.test(w) && Array.isArray(keys)) clean[w] = keys.filter((k): k is string => typeof k === "string").slice(-200);
  return { version: 1, weeks: clean };
});

const EMPTY: Moved = { version: 1, weeks: {} };
const load = () => store.load() ?? EMPTY;

export function useMovedKeys(weekStart: string | undefined): string[] {
  const s = useExternalStore(store.subscribe, load, () => EMPTY);
  return weekStart ? (s.weeks[weekStart] ?? []) : [];
}

/** Abgehakte Einkäufe, die noch eingeräumt werden können @public */
export function toPutAway<T extends { key: string; name: string; checked: boolean; hidden?: boolean }>(items: T[], pantry: PantryItem[], moved: string[]): T[] {
  return items.filter((i) => i.checked && !i.hidden && !moved.includes(i.key) && !pantry.some((p) => sameIngredient(p.name, i.name)));
}

/** Merken, dass diese Einkäufe eingeräumt sind (nur die letzten 8 Wochen) */
export function markMoved(weekStart: string, keys: string[]) {
  const s = load();
  const weeks = { ...s.weeks, [weekStart]: [...new Set([...(s.weeks[weekStart] ?? []), ...keys])] };
  const keep = Object.keys(weeks).sort().slice(-8);
  store.save({ version: 1, weeks: Object.fromEntries(keep.map((k) => [k, weeks[k]])) });
}
