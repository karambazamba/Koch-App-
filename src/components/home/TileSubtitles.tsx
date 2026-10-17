"use client";

import { useRecipes } from "@/lib/cookbook";
import { useWeekShoppingList } from "@/lib/useWeekShoppingList";

/** Kochbuch-Kachel: "<n> Rezepte", sonst "Gerichte, die wir lieben" */
export function CookbookSubtitle() {
  const recipes = useRecipes();
  const count = recipes ? Object.keys(recipes).length : 0;
  return <>{count > 0 ? `${count} ${count === 1 ? "Rezept" : "Rezepte"}` : "Gerichte, die wir lieben"}</>;
}

/** Einkaufsliste-Kachel: "<n> Sachen offen", sonst "Alles für den Einkauf" */
export function ShoppingSubtitle() {
  // Woche, für die gerade eingekauft wird (ab 2 Tage vor dem Einkaufstag die nächste)
  const open = useWeekShoppingList("planning")?.list.openCount ?? 0;
  return <>{open > 0 ? `${open} ${open === 1 ? "Sache" : "Sachen"} offen` : "Alles für den Einkauf"}</>;
}
