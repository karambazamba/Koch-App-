// "Kennt ihr" oder "Neu": Bekannte Gerichte kocht die Familie nach Gefühl –
// dann reicht der Name. Bei neuen steht das Rezept im Vordergrund
// ("Los geht's – Schritt für Schritt").

import type { Recipe } from "./cookbook";
import type { ResolvedEntry } from "./mealPlan";

export type DishStatus = "bekannt" | "neu";

/**
 * Bekannt: von Hand markiert, schon 2× gekocht, oder ein eigenes
 * Kochbuch-Rezept, das schon gekocht wurde. Neu: KI-Rezepte und neu
 * angelegte Rezepte, die noch nie gekocht wurden.
 */
export function recipeIsKnown(recipe: Recipe): boolean {
  return recipe.known || recipe.cookedCount >= 2 || (recipe.source === "eigenes" && recipe.cookedCount >= 1);
}

/** Status eines Gerichts im Plan: Wunsch und Freitext kennt die Familie immer */
export function dishStatus(entry: Pick<ResolvedEntry, "stored" | "recipeId">, recipes: Record<string, Recipe>): DishStatus {
  if (entry.stored.kind !== "recipe") return "bekannt";
  const recipe = entry.recipeId ? recipes[entry.recipeId] : undefined;
  // Rezept nicht (mehr) im Kochbuch → nur noch der Name, den kennt man
  if (!recipe) return "bekannt";
  return recipeIsKnown(recipe) ? "bekannt" : "neu";
}
