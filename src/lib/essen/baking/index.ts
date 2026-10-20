// Eingebaute Backrezepte ("Aus unserer Backstube"): einfache Familien-Klassiker,
// mit Backofen-Angaben, Kinder- und Maschinenschritten. Sie sind lesbar und
// backbar wie Kochbuch-Rezepte (ID "b:<id>"), landen aber erst mit
// "In unsere Rezepte" im Kochbuch der Familie. Später per KI erweiterbar.

import { createIngredient, createRecipe, saveRecipe, useRecipes, type Recipe } from "../cookbook";
import { BAKING_RECIPES } from "./data";
import type { BuiltinBakingRecipe } from "./types";

const BUILTIN_PREFIX = "b:";

const toRecipe = (b: BuiltinBakingRecipe): Recipe => ({
  ...createRecipe({
    title: b.title,
    category: "vegetarisch",
    servings: b.servings,
    prepMinutes: b.prepMinutes,
    ingredients: b.ingredients.map(([amount, unit, name]) => ({ ...createIngredient(), id: `${b.id}-${name}`, amount, unit, name })),
    steps: b.steps,
    kind: "backen",
    oven: b.oven,
    pan: b.pan,
    kidSteps: b.kidSteps,
    machineSteps: b.machineSteps,
    note: b.kidFriendly ? "Gut mit Kindern 🧒" : "",
  }),
  id: `${BUILTIN_PREFIX}${b.id}`,
  createdAt: "",
  updatedAt: "",
});

/** Alle eingebauten Backrezepte als Rezepte (stabil, einmal erzeugt) */
export const BUILTIN_BAKING: Recipe[] = BAKING_RECIPES.map(toRecipe);
const BY_ID: Record<string, Recipe> = Object.fromEntries(BUILTIN_BAKING.map((r) => [r.id, r]));
/** Besonders gut mit Kindern */
export const KID_FRIENDLY = new Set(BAKING_RECIPES.filter((b) => b.kidFriendly).map((b) => `${BUILTIN_PREFIX}${b.id}`));

export const isBuiltin = (id: string) => id.startsWith(BUILTIN_PREFIX);

/** Rezept aus dem Kochbuch oder der eingebauten Sammlung */
export function findRecipe(recipes: Record<string, Recipe>, id: string): Recipe | undefined {
  return recipes[id] ?? BY_ID[id];
}

/** Kochbuch inkl. eingebauter Backrezepte zum Nachschlagen (`undefined` = lädt) */
export function useRecipeLookup(): ((id: string) => Recipe | undefined) | undefined {
  const recipes = useRecipes();
  if (recipes === undefined) return undefined;
  return (id) => findRecipe(recipes, id);
}

/** Eingebautes Rezept ins Kochbuch der Familie übernehmen – gibt die neue ID zurück */
export function adoptBuiltin(recipe: Recipe): string {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = recipe;
  void _id;
  void _c;
  void _u;
  return saveRecipe(createRecipe({ ...rest, ingredients: rest.ingredients.map((i) => ({ ...createIngredient(), amount: i.amount, unit: i.unit, name: i.name })) })).id;
}

/**
 * Backwunsch → passende eingebaute Rezepte: nach Name ("Apfelkuchen"), mit
 * Kindern die kinderleichten zuerst, sonst die schnellsten. Höchstens 3.
 */
export function bakingIdeas(text: string, withKids: boolean): Recipe[] {
  const t = text.toLowerCase();
  const named = BUILTIN_BAKING.filter((r) => {
    const words = r.title.toLowerCase().split(/[\s-]+/).filter((w) => w.length >= 4);
    return t.includes(r.title.toLowerCase()) || words.some((w) => t.includes(w.replace(/(en|n|e|s)$/, "")));
  });
  if (named.length) return named.slice(0, 3);
  const kidsWanted = withKids || /kind|kinder|kleinen|mit den/i.test(t);
  return [...BUILTIN_BAKING]
    .sort((a, b) => Number(KID_FRIENDLY.has(b.id) && kidsWanted) - Number(KID_FRIENDLY.has(a.id) && kidsWanted) || (a.prepMinutes ?? 0) - (b.prepMinutes ?? 0))
    .slice(0, 3);
}

/** Ist das ein Backwunsch? ("Können wir zusammen einen Apfelkuchen backen?") */
export function isBakingRequest(text: string): boolean {
  return /\bback(en|t|e)?\b|\bkuchen\b|muffins?\b|plätzchen|kekse|cookies|waffeln|brownies/i.test(text) && !/rückwärts|backup/i.test(text);
}
