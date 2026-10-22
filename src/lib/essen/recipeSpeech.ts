// "Lotte erzählen": ein gesprochenes Rezept in Titel, Zutaten und Schritte
// zerlegen – regelbasiert (später KI, nur hier umstellen). Beispiel:
// "Pfannkuchen. Zutaten: 200 Gramm Mehl, drei Eier und 300 ml Milch. Zuerst
// alles verrühren, dann 15 Minuten ruhen lassen. Danach in der Pfanne backen."

import { createIngredient, type Ingredient, type RecipeCategory } from "@/lib/essen/cookbook";
import { guessDishCategory } from "@/lib/essen/dishCategory";
import { ruleParseLeftovers } from "@/lib/essen/leftovers/ruleParser";

export type SpokenRecipe = {
  title: string;
  category: RecipeCategory;
  ingredients: Ingredient[];
  steps: string[];
  prepMinutes: number | null;
};

/** Hier beginnt die Zubereitung */
const STEP_START = /\b(zubereitung|zuerst|erst|als erstes|zunächst|dann|danach|anschließend|schritt|zum schluss|am ende)\b/i;
/** Trennt Schritte innerhalb eines Satzes */
const STEP_SPLIT = /\s*(?:[.!;]|,?\s+\b(?:dann|danach|anschließend|zum schluss|am ende)\b)\s*/i;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Rezept aus gesprochenem/getipptem Text – `null`, wenn nichts Brauchbares drin ist */
export function parseSpokenRecipe(raw: string): SpokenRecipe | null {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return null;

  // Titel: "Rezept für X:", "X:", "Für X braucht man …" oder der erste Satz
  let title = "";
  let rest = text;
  const forMatch = text.match(/^(?:(?:mein|unser)\s+)?(?:rezept\s+(?:für|von)\s+)?(.{2,60}?)\s*(?::|–|—| - |\.)\s+(.*)$/i);
  const needMatch = text.match(/^für\s+(.{2,60}?)\s+(?:braucht man|brauchst du|braucht ihr|nimmt man|nehme ich|nehmen wir)\s+(.*)$/i);
  if (needMatch) {
    title = needMatch[1];
    rest = `Zutaten: ${needMatch[2]}`;
  } else if (forMatch) {
    title = forMatch[1];
    rest = forMatch[2];
  } else {
    title = text.split(/\s+/).slice(0, 4).join(" ");
  }
  title = cap(title.replace(/^(rezept\s+(für|von)\s+)/i, "").trim());

  // Zutaten bis zum ersten Schritt-Wort, Rest = Zubereitung
  rest = rest.replace(/^zutaten\s*:?\s*/i, "");
  // Zubereitung beginnt beim ersten Schritt-Wort – oder spätestens nach dem
  // ersten Satz (der Zutatenliste)
  const sentenceEnd = rest.search(/[.!]\s/);
  const marker = rest.search(STEP_START);
  const stepAt = [marker, sentenceEnd >= 0 ? sentenceEnd + 1 : -1].filter((i) => i >= 0).reduce((a, b) => Math.min(a, b), Infinity);
  const ingredientText = (Number.isFinite(stepAt) ? rest.slice(0, stepAt) : rest).replace(/\b(man braucht|du brauchst|ihr braucht|wir brauchen|dazu kommen?)\b/gi, "");
  const stepText = Number.isFinite(stepAt) ? rest.slice(stepAt) : "";

  const ingredients: Ingredient[] = ingredientText
    .split(/,|;|\.|\bund\b|\bsowie\b/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => ruleParseLeftovers(part).slice(0, 1))
    .map((p) => ({ ...createIngredient(), amount: p.amount, unit: p.unit, name: cap(p.name) }))
    .filter((i) => i.name.length > 1);

  const steps = stepText
    .replace(/^zubereitung\s*:?\s*/i, "")
    .replace(/^[.!\s]+/, "")
    .split(STEP_SPLIT)
    .map((s) => s.replace(/^(zuerst|erst|als erstes|zunächst|dann|danach|anschließend|zum schluss|am ende)\s+/i, "").trim())
    .filter((s) => s.split(" ").length >= 2)
    .map((s) => `${cap(s)}${/[.!?]$/.test(s) ? "" : "."}`);

  if (!ingredients.length && !steps.length) return null;
  const minutes = [...text.matchAll(/(\d+)\s*(?:minuten|min\b)/gi)].reduce((sum, m) => sum + Number(m[1]), 0);
  return {
    title: title || "Neues Rezept",
    category: guessDishCategory(title) ?? "vegetarisch",
    ingredients,
    steps,
    prepMinutes: minutes > 0 ? minutes : null,
  };
}
