// Grobe Kostenschätzung für Gerichte ("~8 €") – ohne echte Preise, nur
// Richtwerte je Abteilung und Einheit. Bewusst mit "~" angezeigt.

import type { Ingredient, Recipe } from "./cookbook";
import { sectionFor, type Section } from "../einkauf/shoppingList";

/** Richtpreis in Euro je 100 g bzw. 100 ml */
const PER_100: Record<Section, number> = {
  "obst-gemuese": 0.35,
  "fleisch-fisch": 1.4,
  kuehlregal: 0.6,
  brot: 0.5,
  vorrat: 0.3,
  tiefkuehl: 0.5,
  getraenke: 0.15,
  sonstiges: 0.4,
};

/** Richtpreis je Stück/Packung … */
const PER_PIECE: Record<Section, number> = {
  "obst-gemuese": 0.6,
  "fleisch-fisch": 2.5,
  kuehlregal: 0.8,
  brot: 0.5,
  vorrat: 1.2,
  tiefkuehl: 2.5,
  getraenke: 1.0,
  sonstiges: 1.0,
};

function ingredientCost(i: Pick<Ingredient, "name" | "amount" | "unit">): number {
  const section = sectionFor(i.name);
  if (i.amount === null) return 0.3;
  switch (i.unit) {
    case "g":
      return (i.amount / 100) * PER_100[section];
    case "kg":
      return i.amount * 10 * PER_100[section];
    case "ml":
      return (i.amount / 100) * PER_100[section] * 0.5;
    case "l":
      return i.amount * 10 * PER_100[section] * 0.5;
    case "EL":
    case "TL":
    case "Prise":
      return 0.05 * i.amount;
    case "Bund":
      return 1.2 * i.amount;
    default:
      return PER_PIECE[section] * i.amount;
  }
}

/** Geschätzte Kosten eines Rezepts für `persons` Personen in Euro (oder null ohne Zutaten) */
export function estimateCost(recipe: Pick<Recipe, "ingredients" | "servings">, persons: number | null): number | null {
  const items = recipe.ingredients.filter((i) => i.name.trim());
  if (items.length === 0) return null;
  const total = items.reduce((sum, i) => sum + ingredientCost(i), 0);
  const factor = persons && recipe.servings > 0 ? persons / recipe.servings : 1;
  return Math.max(1, Math.round(total * factor));
}
