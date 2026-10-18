"use client";

// Was gerade da ist: Vorrat (Kühlschrank, Tiefkühler, Schrank) plus auf der
// Einkaufsliste Abgehaktes (= gekauft) und "Haben wir schon" – aus dieser und
// der Einkaufswoche. Immer live aus den Speichern, nie zwischengespeichert.

import { mergeStock, stockItem } from "./dishIdeas";
import { usePantry, type PantryItem } from "./pantry";
import { useWeekShoppingList } from "./useWeekShoppingList";
import { toIsoDate, useToday } from "./weekPlan";

/** Bestand für Ideen (`undefined` = lädt) */
export function useStock(): PantryItem[] | undefined {
  const pantry = usePantry();
  const today = useToday();
  const current = useWeekShoppingList("current");
  const planning = useWeekShoppingList("planning");
  if (!pantry || !today || !current || !planning) return undefined;
  const todayIso = toIsoDate(today);
  const bought = [...current.list.items, ...(planning.weekStart === current.weekStart ? [] : planning.list.items)]
    .filter((i) => i.checked || i.hidden)
    .map((i) => stockItem(i.name, "b", todayIso));
  return mergeStock(pantry, bought);
}
