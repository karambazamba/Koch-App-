// Zutaten eines Gerichts für die Einkaufsliste (A-057): EINE Stelle für den
// Wochenplan (`buildShoppingList` → Angebot „Für deinen Wochenplan“) und für
// „Nehmen“ in der Rezept-Vorschau. Erst das eigene Rezept (Kochbuch), sonst
// das eingebaute („k:…“, über die ID oder den Titel – auch Gerichte ohne
// Rezept-ID wie aus der Wochenkarte). Mengen bleiben nur Hinweis (A-040);
// Grundsachen, „im Haus“ und Zusammenführen regeln Liste und Angebot wie bisher.

import type { Ingredient, Recipe } from "@/lib/essen/cookbook";
import { cookRecipe, isBuiltinCook, rezeptIdFuer } from "@/lib/essen/kochen";
import { matchStock } from "@/lib/essen/dishIdeas";
import { formatTotal, unitFamily } from "@/lib/einkauf/amounts";
import type { PantryItem } from "@/lib/vorrat/pantry";

type Gericht = { title: string; recipeId?: string | null };

/** „Reis (am besten vom Vortag)“ → „Reis“ – Erklärungen in Klammern gehören nicht auf die Liste */
const ohneKlammer = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, "").trim() || name.trim();

/** Das Rezept zu einem Gericht: eigenes über die ID, sonst eingebaut über die ID bzw. den Titel */
function rezeptFuerGericht(g: Gericht, recipes: Record<string, Recipe>): Recipe | undefined {
  const eigen = g.recipeId ? recipes[g.recipeId] : undefined;
  if (eigen) return eigen;
  return (g.recipeId ? cookRecipe(g.recipeId) : undefined) ?? cookRecipe(rezeptIdFuer(g.title) ?? "");
}

/** Rezept und Zutaten (ohne leere Namen) eines Gerichts – ohne Rezept leer */
export function zutatenFuerGericht(g: Gericht, recipes: Record<string, Recipe>): { rezept?: Recipe; zutaten: Ingredient[] } {
  const rezept = rezeptFuerGericht(g, recipes);
  if (!rezept) return { zutaten: [] };
  const eingebaut = isBuiltinCook(rezept.id);
  const zutaten = rezept.ingredients.map((i) => (eingebaut ? { ...i, name: ohneKlammer(i.name) } : i)).filter((i) => i.name.trim());
  return { rezept, zutaten };
}

/**
 * Was nach „Nehmen“ auf die Liste käme: mit Rezept alle seine Zutaten ohne
 * das, was im Haus ist (und ohne Grundsachen); ohne bekannten Vorrat `null`
 * (= kein Abgleich). Ohne Rezept gilt, was die Vorschau nannte (`sonst`).
 */
export function bedarfFuerGericht(g: Gericht, recipes: Record<string, Recipe>, stock: readonly PantryItem[] | undefined, sonst: readonly string[] | null): readonly string[] | null {
  const { zutaten } = zutatenFuerGericht(g, recipes);
  if (!zutaten.length) return sonst;
  return stock ? matchStock(zutaten.map((i) => i.name), [...stock]).needs : null;
}

/** Rezeptmenge einer Zutat als Hinweis („250 g“), sonst leer */
export function mengeHinweis(i: Pick<Ingredient, "amount" | "unit">): string {
  if (i.amount === null) return "";
  const { family, factor } = unitFamily(i.unit);
  return formatTotal(i.amount * factor, family);
}
