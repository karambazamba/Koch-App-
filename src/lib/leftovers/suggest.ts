// Reste-Ideen ohne KI: Kochbuch-Treffer für den Vorrat, gefiltert nach der
// gewünschten Basis, ohne "Nie wieder"-Gerichte, Beliebtes zuerst.

import { baseLabel, recipeBase, type BaseId } from "../bases";
import { popularity, type Recipe } from "../cookbook";
import { matchRecipes, type PantryItem, type RecipeMatch } from "../pantry";
import type { NeverAgainEntry } from "../profile";
import { isNeverAgain } from "../ratings";

export type LeftoverIdea = { id: string; title: string; category: Recipe["category"]; used: number; missing: string[] };

export type LeftoverIdeas = { text: string; ideas: LeftoverIdea[] };

const toIdea = (m: RecipeMatch): LeftoverIdea => ({
  id: m.recipe.id,
  title: m.recipe.title,
  category: m.recipe.category,
  used: m.used.length,
  missing: m.missing,
});

/** Bis zu 3 Vorschläge aus dem Kochbuch */
export function leftoverIdeas(
  recipes: Record<string, Recipe>,
  pantry: PantryItem[],
  base: BaseId | null,
  neverAgain: NeverAgainEntry[],
): LeftoverIdeas {
  const matches = matchRecipes(Object.values(recipes), pantry)
    .filter((m) => !isNeverAgain(m.recipe.title, neverAgain))
    .sort(
      (a, b) =>
        b.used.length - a.used.length ||
        popularity(b.recipe) - popularity(a.recipe) ||
        a.missing.length - b.missing.length,
    );
  const withBase = base ? matches.filter((m) => recipeBase(m.recipe) === base) : matches;
  if (withBase.length > 0) {
    return {
      text: "Das passt aus eurem Kochbuch:",
      ideas: withBase.slice(0, 3).map(toIdea),
    };
  }
  if (matches.length > 0) {
    return {
      text: `Mit ${baseLabel(base!)} finde ich nichts im Kochbuch – aber das passt zu euren Resten:`,
      ideas: matches.slice(0, 3).map(toIdea),
    };
  }
  return { text: "Dazu finde ich im Kochbuch leider nichts Passendes. Leg gern ein Rezept an – dann merke ich es mir.", ideas: [] };
}
