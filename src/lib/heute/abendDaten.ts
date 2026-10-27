// Daten für die Jetzt-Karte abends (Tafel 98), rein: Weg der Kinder (Kita
// bzw. Schule – für „Jacken für die Kita raus.“) und ob das Gericht von morgen
// heute schon einen Handgriff braucht (`essen/vorlauf.ts`).

import type { Person } from "@/lib/einstellungen/profileModel";
import type { PlanDay } from "@/lib/essen/mealPlan";
import type { Recipe } from "@/lib/essen/cookbook";
import type { PantryItem } from "@/lib/vorrat/pantry";
import { cookableEntry } from "@/lib/essen/mealDone";
import { vorlaufHinweis } from "@/lib/essen/vorlauf";

/** Kinder im Haushalt: Kita (Klein- und Kitakinder zuerst), sonst Schule, ohne Kinder null */
export function kidsWay(persons: Pick<Person, "role" | "ageGroup">[]): "Kita" | "Schule" | null {
  const kids = persons.filter((p) => p.role === "kind");
  if (!kids.length) return null;
  return kids.some((k) => k.ageGroup !== "schulkind") ? "Kita" : "Schule";
}

/** Gericht von morgen mit Vorlauf („Fleisch heute aus dem Gefrierfach.“) – sonst null */
export function vorlaufVon(data: { tomorrow: PlanDay | undefined; recipes: Record<string, Recipe> }, stock: PantryItem[] | undefined): { name: string; prep: string } | null {
  const entry = cookableEntry(data.tomorrow);
  if (!entry) return null;
  const recipe = "recipeId" in entry && entry.recipeId ? data.recipes[entry.recipeId] : undefined;
  if (!recipe) return null;
  const frozen = (stock ?? []).filter((i) => i.place === "tiefkuehler").map((i) => i.name);
  const prep = vorlaufHinweis({ ingredients: recipe.ingredients.map((i) => i.name), steps: recipe.steps, frozen });
  return prep ? { name: entry.title, prep } : null;
}
