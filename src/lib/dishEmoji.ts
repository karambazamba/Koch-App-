// Passendes Emoji für ein Gericht (Platzhalter für spätere Rezeptbilder).

import type { RecipeCategory } from "./cookbook";

const WORDS: [RegExp, string][] = [
  [/pizza/, "🍕"],
  [/burger/, "🍔"],
  [/pommes/, "🍟"],
  [/spaghetti|nudel|pasta|lasagne|penne|tagliatelle|makkaroni|bolognese|carbonara|spätzle/, "🍝"],
  [/suppe|eintopf|brühe/, "🍲"],
  [/curry|dal|dhal/, "🍛"],
  [/risotto|reis|paella|bowl/, "🍚"],
  [/sushi/, "🍣"],
  [/salat/, "🥗"],
  [/wrap|burrito|fajita/, "🌯"],
  [/taco|quesadilla|nacho/, "🌮"],
  [/omelett|rührei|spiegelei|shakshuka|ei(er)?\b/, "🍳"],
  [/pfannkuchen|pancake|crêpe|eierkuchen|waffel/, "🥞"],
  [/lachs|fisch|forelle|kabeljau|thunfisch|garnele/, "🐟"],
  [/hähnchen|huhn|hühn|chicken|pute/, "🍗"],
  [/steak|rind|gulasch|braten|schnitzel/, "🥩"],
  [/wurst|würstchen|hot ?dog/, "🌭"],
  [/kartoffel|gratin|rösti|ofengemüse/, "🥔"],
  [/brot|stulle|abendbrot|toast|brotzeit/, "🥪"],
  [/milchreis|grießbrei|pudding/, "🍮"],
  [/auflauf|gratin/, "🥘"],
  [/gemüse|pfanne/, "🥦"],
];

const BY_CATEGORY: Record<RecipeCategory, string> = { vegetarisch: "🥦", fleisch: "🍖", fisch: "🐟", cheatday: "🍕" };

export function dishEmoji(title: string, category: RecipeCategory | null): string {
  const t = title.toLowerCase();
  return WORDS.find(([re]) => re.test(t))?.[1] ?? (category ? BY_CATEGORY[category] : "🍽️");
}
