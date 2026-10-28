// Aufgaben-Seite: gewählter Filter „Alle · Familie · Ich · Arbeit“ – pro Gerät
// gemerkt (`wasgibts.aufgabenfilter`, nicht in der Sicherung). Die Chips
// stehen nur da, wenn es Ich- oder Arbeitsaufgaben gibt (kalender/aufgaben.ts).

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import type { AufgabenFilter } from "@/lib/kalender/aufgaben";

type FilterState = { version: 1; filter: AufgabenFilter };

/** @public für Tests */
export function migrateAufgabenFilter(raw: unknown): FilterState | null {
  if (!raw || typeof raw !== "object" || (raw as FilterState).version !== 1) return null;
  const f = (raw as FilterState).filter;
  return { version: 1, filter: f === "familie" || f === "ich" || f === "arbeit" ? f : "alle" };
}

const filterStore = createLocalStore("wasgibts.aufgabenfilter", migrateAufgabenFilter);
const loadFilter = (): AufgabenFilter => filterStore.load()?.filter ?? "alle";

export const setAufgabenFilter = (filter: AufgabenFilter) => filterStore.save({ version: 1, filter });

export function useAufgabenFilter(): AufgabenFilter {
  return useExternalStore(filterStore.subscribe, loadFilter, () => "alle" as const);
}
