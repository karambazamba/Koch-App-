// "Im Supermarkt fragen": "Lachs ist im Angebot", "Ich steh grad im Rewe,
// hier gibt's Spargel" → 2–3 passende Ideen mit Zeit, was dafür noch
// gebraucht wird (nur was laut Vorrat und Liste nicht da ist) und an welchem
// Tag es passen würde. Antworten besonders kurz. Später auch per Foto vom
// Produkt/Angebotsschild (`source: "foto"`).

import type { Recipe, RecipeCategory } from "@/lib/essen/cookbook";
import { recipeIsKnown } from "@/lib/essen/dishStatus";
import { guessDishCategory } from "@/lib/essen/dishCategory";
import { findFood, recognizeFood } from "@/lib/essen/leftovers/foods";
import { ruleParseLeftovers } from "@/lib/essen/leftovers/ruleParser";
import type { PlanWeek } from "@/lib/essen/mealPlan";
import { sameIngredient, type PantryItem } from "@/lib/vorrat/pantry";
import type { NeverAgainEntry } from "@/lib/einstellungen/profile";
import { isNeverAgain } from "@/lib/essen/neverAgain";
import { AT_HOME } from "@/lib/essen/spontan";

export type MarketIdea = {
  title: string;
  minutes: number;
  recipeId?: string;
  category: RecipeCategory | null;
  /** Was dafür noch gebraucht wird (ohne Vorrat, Liste und "hat man da") */
  needs: string[];
};

export type MarketAnswer = {
  product: string;
  /** Woher das Produkt kommt – später auch "foto" (Produkt/Angebotsschild) */
  source: "text" | "foto";
  ideas: MarketIdea[];
};

/** Supermarkt-Situation? ("im Angebot", "ich steh grad im …", "hier gibt's …") */
export function isMarketSituation(text: string): boolean {
  return /im angebot|sonderangebot|reduziert|ich steh\w*\s+(grad|gerade|hier|im|beim|bei|vorm?)\b|\bhier gibt['’]?s\b|\bhier gibt es\b|im supermarkt|beim einkaufen|im laden|an der (fisch|fleisch|käse)theke/i.test(text);
}

/** Das Produkt aus dem Satz (erstes erkanntes Lebensmittel) */
export function marketProduct(text: string): string | null {
  const cleaned = text
    .replace(/ich steh\w*\s+(grad|gerade|hier)?\s*(im|beim|bei|vorm?)\s+[A-ZÄÖÜ]\w*/g, " ")
    .replace(/\b(im angebot|sonderangebot|reduziert|hier gibt['’]?s|hier gibt es|im supermarkt|beim einkaufen|im laden|ist|sind|heute|gerade|grad|super|günstig|billig|was|kann|ich|damit|machen|kochen|draus|daraus)\b/gi, " ");
  for (const part of cleaned.split(/,|\.|\?|!|\bund\b/)) {
    for (const p of ruleParseLeftovers(part)) {
      if (p.known) return findFood(p.name)?.food.singular ?? p.name;
      const r = recognizeFood(p.name);
      if (r.known) return r.match?.food.singular ?? p.name;
    }
  }
  return null;
}

/** Vorlagen je Produktart: {P} = Produkt */
const TEMPLATES: { match: RegExp; ideas: [string, number, string[]][] }[] = [
  {
    match: /spargel/i,
    ideas: [
      ["Spargel mit Kartoffeln und Butter", 35, ["Kartoffeln"]],
      ["Spargel-Nudeln mit Zitrone", 20, ["Nudeln", "Zitrone"]],
      ["Ofenspargel mit Ei", 25, ["Eier"]],
    ],
  },
  {
    match: /lachs|fisch|forelle|kabeljau|seelachs|garnele|scholle/i,
    ideas: [
      ["{P} aus dem Ofen mit Kartoffeln", 30, ["Kartoffeln", "Zitrone"]],
      ["Nudeln mit {P} und Sahne", 20, ["Nudeln", "Sahne"]],
      ["{P}-Bowl mit Reis", 20, ["Reis", "Gurke"]],
    ],
  },
  {
    match: /hähnchen|huhn|hühn|pute|chicken/i,
    ideas: [
      ["{P}-Pfanne mit Gemüse", 20, ["Paprika", "Reis"]],
      ["{P}-Curry mit Reis", 30, ["Kokosmilch", "Reis"]],
      ["{P} aus dem Ofen mit Kartoffeln", 40, ["Kartoffeln"]],
    ],
  },
  {
    match: /hack|rind|schwein|steak|schnitzel|gulasch|bratwurst|würstchen/i,
    ideas: [
      ["Nudeln mit {P}-Soße", 25, ["Nudeln", "Tomaten"]],
      ["{P}-Pfanne mit Reis", 25, ["Reis", "Paprika"]],
      ["Wraps mit {P}", 20, ["Wraps", "Salat"]],
    ],
  },
  {
    match: /.*/,
    ideas: [
      ["{P}-Pfanne mit Reis", 20, ["Reis"]],
      ["Nudeln mit {P}", 20, ["Nudeln", "Parmesan"]],
      ["Ofen-{P} mit Kartoffeln", 35, ["Kartoffeln"]],
    ],
  },
];

/**
 * 2–3 Ideen zum Produkt: zuerst passende Kochbuch-Rezepte (bekannte und
 * schnelle zuerst), dann einfache Vorlagen. `have` = Vorrat und Einkaufsliste.
 */
export function marketIdeas(
  product: string,
  recipes: Record<string, Recipe>,
  pantry: PantryItem[],
  listNames: string[],
  neverAgain: NeverAgainEntry[],
): MarketIdea[] {
  const there = (name: string) =>
    AT_HOME.test(name.trim()) ||
    sameIngredient(name, product) ||
    pantry.some((p) => sameIngredient(name, p.name)) ||
    listNames.some((n) => sameIngredient(name, n));
  const fromBook = Object.values(recipes)
    .filter((r) => r.kind !== "backen" && r.ingredients.some((i) => sameIngredient(i.name, product)) && !isNeverAgain(r.title, neverAgain))
    .sort((a, b) => Number(recipeIsKnown(b)) - Number(recipeIsKnown(a)) || (a.prepMinutes ?? 99) - (b.prepMinutes ?? 99))
    .slice(0, 2)
    .map<MarketIdea>((r) => ({
      title: r.title,
      minutes: r.prepMinutes ?? 30,
      recipeId: r.id,
      category: r.category,
      needs: r.ingredients.map((i) => i.name.trim()).filter((n) => n && !there(n)).slice(0, 5),
    }));
  const template = TEMPLATES.find((t) => t.match.test(product))!;
  const fromTemplate = template.ideas
    .map<MarketIdea>(([title, minutes, needs]) => {
      const t = title.replace(/\{P\}/g, product);
      return { title: t, minutes, category: guessDishCategory(t), needs: needs.filter((n) => !there(n)) };
    })
    .filter((i) => !isNeverAgain(i.title, neverAgain) && !fromBook.some((b) => b.title.toLowerCase() === i.title.toLowerCase()));
  return [...fromBook, ...fromTemplate].slice(0, 3);
}

/**
 * Welcher Tag passt? Das nächste geplante Gericht ab heute (heute nur vor
 * der Essenszeit) – das würde getauscht; sonst der nächste freie Tag.
 */
export function marketTargetDay(week: PlanWeek, todayIso: string, beforeMeal: boolean): { date: string; weekday: string; replaces: string | null } | null {
  const days = week.days.filter((d) => !d.away && d.weekend !== "frei" && (d.date > todayIso || (d.date === todayIso && beforeMeal)));
  const planned = days.find((d) => d.slot.entry);
  if (planned) return { date: planned.date, weekday: planned.weekday, replaces: planned.slot.entry!.title };
  const free = days[0];
  return free ? { date: free.date, weekday: free.weekday, replaces: null } : null;
}
