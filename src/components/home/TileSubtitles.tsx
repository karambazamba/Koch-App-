"use client";

import { useRecipes } from "@/lib/cookbook";
import { useOpenShoppingCount } from "@/lib/shoppingList";

/** Kochbuch-Kachel: "<n> Rezepte", sonst "Gerichte, die wir lieben" */
export function CookbookSubtitle() {
  const recipes = useRecipes();
  const count = recipes ? Object.keys(recipes).length : 0;
  return <>{count > 0 ? `${count} ${count === 1 ? "Rezept" : "Rezepte"}` : "Gerichte, die wir lieben"}</>;
}

/** Einkaufsliste-Kachel: "<n> Sachen offen", sonst "Alles für den Einkauf" */
export function ShoppingSubtitle() {
  const open = useOpenShoppingCount() ?? 0;
  return <>{open > 0 ? `${open} ${open === 1 ? "Sache" : "Sachen"} offen` : "Alles für den Einkauf"}</>;
}
