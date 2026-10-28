// Rezept-Link übernehmen: „X auf die Liste“ (umgerechnete Mengen, Gericht
// dazu) bzw. „In den Wochenplan“ – dann wird ein schlankes Rezept angelegt
// (nur Titel, Zutaten und der Link als Quelle, kein Rezepttext) und für den
// gewählten Tag eingeplant; die Zutaten kommen über den Plan auf die Liste.
// Beides mit Rückgängig (die Aufrufer melden es).

import { createRecipe, deleteRecipe, saveRecipe } from "@/lib/essen/cookbook";
import { newId } from "@/lib/einkauf/listModel";
import { guessDishCategory } from "@/lib/essen/dishCategory";
import { loadMealPlans, replaceMealPlans, setEntry, slotKey } from "@/lib/essen/mealPlan";
import { fromIsoDate } from "@/lib/core/now";
import { weekStartFor, weekdayName } from "@/lib/essen/weekPlan";
import { addManualItem, removeManualItems } from "@/lib/einkauf/listEdits";
import { sectionFor } from "@/lib/einkauf/sections";
import { alsEinkauf } from "@/lib/einkauf/zusammen/packung";
import { parseZutat, type LinkRezept, type LinkZutat } from "@/lib/essen/rezeptLink/lesen";

/** Zutaten auf die Einkaufsliste der Woche; liefert Rückgängig */
export function linkAufDieListe(rezept: LinkRezept, toList: LinkZutat[], weekStart: string): () => void {
  // Rezeptmengen als Einkaufsmengen (Packung), die Rezeptmenge nur als Hinweis
  const ids = toList.map((z) => addManualItem(weekStart, { name: z.name, ...alsEinkauf(z.name, z.amount, z.unit), section: sectionFor(z.name), dish: rezept.title }));
  return () => removeManualItems(weekStart, ids);
}

/** Als schlankes Rezept anlegen und an einem Tag einplanen; liefert Rückgängig */
export function linkInDenWochenplan(rezept: LinkRezept, date: string, shoppingDay: string, persons: number): () => void {
  const category = guessDishCategory(rezept.title) ?? "vegetarisch";
  const recipe = saveRecipe(
    createRecipe({
      title: rezept.title,
      category,
      servings: rezept.servings ?? persons,
      ingredients: rezept.ingredients.map(parseZutat).map((z) => ({ id: newId(), amount: z.amount, unit: z.unit, name: z.name })),
      note: `Quelle: ${rezept.url}`,
    }),
  );
  const day = fromIsoDate(date);
  const weekStart = weekStartFor(day, shoppingDay);
  const before = loadMealPlans();
  setEntry(weekStart, slotKey(weekdayName(day)), { kind: "recipe", recipeId: recipe.id, title: recipe.title, category });
  return () => {
    replaceMealPlans(before);
    deleteRecipe(recipe.id);
  };
}
