// "Kennt ihr" oder "Neu": Bekannte Gerichte kocht die Familie nach Gefühl –
// dann reicht der Name. Bei neuen steht das Rezept im Vordergrund
// ("Los geht's – Schritt für Schritt").

import type { Recipe } from "./cookbook";

/**
 * Bekannt: von Hand markiert, schon 2× gekocht, oder ein eigenes
 * Kochbuch-Rezept, das schon gekocht wurde. Neu: KI-Rezepte und neu
 * angelegte Rezepte, die noch nie gekocht wurden.
 */
export function recipeIsKnown(recipe: Recipe): boolean {
  return recipe.known || recipe.cookedCount >= 2 || (recipe.source === "eigenes" && recipe.cookedCount >= 1);
}
