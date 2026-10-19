// Kategorie eines selbst eingetragenen Gerichts – nur aus dem Gericht selbst,
// nie aus dem Kategorie-Hinweis des Platzes. Lieber keine Kategorie als eine
// falsche ("Milchreis" ist kein Fisch).

import type { Recipe, RecipeCategory } from "./cookbook";

const FISH = /fisch|lachs|thunfisch|forelle|kabeljau|seelachs|hering|makrele|sardine|sardelle|garnele|shrimp|krabbe|muschel|tintenfisch|calamari|scholle|zander|dorade|pangasius|matjes|rotbarsch|scampi|meeresfrücht/i;
// Kurze Wörter nur am Wortanfang ("Flammkuchen" ≠ Lamm, "al dente" ≠ Ente)
const MEAT = /fleisch|hack|rind|schwein|(?<![a-zäöüß])(lamm|kalb|ente|enten|gans|gänse|pute|puten|mett)|hähnchen|hühnchen|huhn|hühner|gulasch|steak|schnitzel|kotelett|braten|roulade|wurst|würstchen|speck|bacon|schinken|salami|frikadelle|bulette|bolognese|carbonara|chili con carne|döner|burger|gyros|leberkäse|kassler|cordon bleu|geschnetzeltes|chicken|beef|pork|nugget/i;

/**
 * - Gleichnamiges Rezept im Kochbuch → dessen Kategorie
 * - eindeutige Stichwörter (Lachs → Fisch, Hack → Fleisch)
 * - sonst `null` (keine Kategorie)
 */
export function guessDishCategory(title: string, recipes: Recipe[] = []): RecipeCategory | null {
  const t = title.trim().toLowerCase();
  if (!t) return null;
  const recipe = recipes.find((r) => r.title.trim().toLowerCase() === t);
  if (recipe) return recipe.category;
  if (FISH.test(t)) return "fisch";
  if (MEAT.test(t)) return "fleisch";
  return null;
}
