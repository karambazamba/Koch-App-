// Eingebaute Kochrezepte („Aus unserer Küche“, ID "k:<id>"): lesbar und
// kochbar wie Kochbuch-Rezepte, landen erst mit „In unsere Rezepte“ im
// Kochbuch der Familie. Jedes hat Aufwand und Art – für „Mehr Ideen“.

import { createIngredient, createRecipe, type Recipe } from "@/lib/essen/cookbook";
import { KLASSISCH } from "@/lib/essen/kochen/dataKlassisch";
import { BESONDERS } from "@/lib/essen/kochen/dataBesonders";
import type { Art, Aufwand, BuiltinCookRecipe } from "@/lib/essen/kochen/types";

const PREFIX = "k:";

const toRecipe = (b: BuiltinCookRecipe): Recipe => ({
  ...createRecipe({
    title: b.title,
    category: b.category,
    servings: 4,
    prepMinutes: b.minutes,
    ingredients: b.ingredients.map(([amount, unit, name]) => ({ ...createIngredient(), id: `${b.id}-${name}`, amount, unit, name })),
    steps: b.steps,
  }),
  id: `${PREFIX}${b.id}`,
  createdAt: "",
  updatedAt: "",
});

const ALL = [...KLASSISCH, ...BESONDERS];

/** Alle eingebauten Kochrezepte (stabil, einmal erzeugt) */
export const BUILTIN_COOK: Recipe[] = ALL.map(toRecipe);
const BY_ID: Record<string, Recipe> = Object.fromEntries(BUILTIN_COOK.map((r) => [r.id, r]));
const META: Record<string, { aufwand: Aufwand; art: Art }> = Object.fromEntries(ALL.map((b) => [`${PREFIX}${b.id}`, { aufwand: b.aufwand, art: b.art }]));

export const isBuiltinCook = (id: string) => id.startsWith(PREFIX);
export const cookRecipe = (id: string): Recipe | undefined => BY_ID[id];

/** Aufwand und Art – eingebaut fest, eigene Rezepte aus Zeit, Zutaten und Ofen geschätzt */
export function recipeKind(r: Recipe): { aufwand: Aufwand; art: Art } {
  const meta = META[r.id];
  if (meta) return meta;
  const minutes = r.prepMinutes ?? 30;
  const aufwand: Aufwand = minutes >= 50 || r.oven ? "aufwendig" : minutes <= 25 && r.ingredients.length <= 6 ? "einfach" : "normal";
  return { aufwand, art: "klassisch" };
}

/** Eingebautes Rezept zu einem Gerichte-Titel (Groß/klein egal), sonst null */
export function rezeptIdFuer(title: string): string | null {
  const t = title.trim().toLowerCase();
  return BUILTIN_COOK.find((r) => r.title.toLowerCase() === t)?.id ?? null;
}
