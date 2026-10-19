"use client";

// Was gerade da ist: Vorrat (Kühlschrank, Tiefkühler, Schrank) plus auf der
// Einkaufsliste Abgehaktes (= gekauft) und "Haben wir schon" – aus dieser und
// der Einkaufswoche – ohne das, was nach dem Essen schon verkocht ist. Immer
// live aus den Speichern, nie zwischengespeichert.

import { mergeStock, stockItem } from "./dishIdeas";
import { usedRecently, useCookedDays } from "./mealDone";
import { sameIngredient, usePantry, type PantryItem } from "./pantry";
import { useWeekShoppingList } from "../einkauf/useWeekShoppingList";
import { toIsoDate, useToday } from "./weekPlan";

/** Bestand für Ideen (`undefined` = lädt) */
export function useStock(): PantryItem[] | undefined {
  const pantry = usePantry();
  const today = useToday();
  const current = useWeekShoppingList("current");
  const planning = useWeekShoppingList("planning");
  const cooked = useCookedDays();
  if (!pantry || !today || !current || !planning || !cooked) return undefined;
  const todayIso = toIsoDate(today);
  // Schon verkocht (nach dem Essen automatisch vermerkt) → nicht mehr da
  const used = usedRecently(cooked, todayIso);
  const bought = [...current.list.items, ...(planning.weekStart === current.weekStart ? [] : planning.list.items)]
    .filter((i) => (i.checked || i.hidden) && !used.some((u) => sameIngredient(u, i.name)))
    .map((i) => stockItem(i.name, "b", todayIso));
  return mergeStock(pantry, bought);
}
