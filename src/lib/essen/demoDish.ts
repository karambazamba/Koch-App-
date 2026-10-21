// Beispielgericht für den Beispiel-Tag: Pasta mit Tomaten & Burrata (mit Bild)
// und drei weitere Beispiel-Ideen. Lesbar und kochbar wie eingebaute Rezepte
// (ID "d:<id>", siehe `findRecipe`), liegen aber nie im Kochbuch, Wochenplan
// oder in der Sicherung – sie verschwinden mit dem Beispiel-Tag.

import { createIngredient, createRecipe, type Recipe } from "./cookbook";

const DEMO_PREFIX = "d:";

type DemoDef = { id: string; title: string; emoji: string; minutes: number; category: Recipe["category"]; ingredients: [number | null, string, string][]; steps: string[]; photo?: string; tone: string };

const DEFS: DemoDef[] = [
  {
    id: "pasta-burrata",
    title: "Pasta mit Tomaten & Burrata",
    emoji: "🍝",
    minutes: 25,
    category: "vegetarisch",
    photo: "/demo/gericht.webp",
    tone: "#D97B4E",
    ingredients: [
      [400, "g", "Spaghetti"],
      [500, "g", "Kirschtomaten"],
      [2, "", "Burrata"],
      [2, "", "Knoblauchzehen"],
      [4, "EL", "Olivenöl"],
      [1, "Bund", "Basilikum"],
      [null, "", "Salz und Pfeffer"],
    ],
    steps: [
      "Wasser für die Nudeln aufsetzen und kräftig salzen.",
      "Tomaten halbieren, Knoblauch fein schneiden.",
      "Spaghetti nach Packung kochen. Tomaten und Knoblauch im Olivenöl 5 Minuten schmoren.",
      "Nudeln mit etwas Nudelwasser zu den Tomaten geben, salzen, pfeffern.",
      "Auf Teller verteilen, Burrata obendrauf zupfen, Basilikum drüber – fertig.",
    ],
  },
  {
    id: "ofengemuese",
    title: "Ofengemüse mit Feta",
    emoji: "🥕",
    minutes: 35,
    category: "vegetarisch",
    tone: "#E0A040",
    ingredients: [[600, "g", "Kartoffeln"], [2, "", "Paprika"], [1, "", "Zucchini"], [200, "g", "Feta"], [3, "EL", "Olivenöl"], [null, "", "Rosmarin, Salz"]],
    steps: ["Ofen auf 220 °C vorheizen.", "Gemüse in Stücke schneiden, mit Öl und Gewürzen mischen.", "30 Minuten backen, Feta drüberbröseln, 5 Minuten weiter."],
  },
  {
    id: "lachs-reis",
    title: "Lachs mit Zitronenreis",
    emoji: "🐟",
    minutes: 25,
    category: "fisch",
    tone: "#E2786A",
    ingredients: [[4, "", "Lachsfilets"], [250, "g", "Reis"], [1, "", "Zitrone"], [200, "g", "Brokkoli"], [1, "EL", "Butter"], [null, "", "Salz, Dill"]],
    steps: ["Reis kochen.", "Brokkoli die letzten 5 Minuten mitgaren.", "Lachs in der Pfanne je Seite 3–4 Minuten braten.", "Reis mit Zitronenschale, Butter und Dill mischen."],
  },
  {
    id: "wraps",
    title: "Bunte Wraps",
    emoji: "🌯",
    minutes: 15,
    category: "vegetarisch",
    tone: "#7FA35A",
    ingredients: [[8, "", "Tortilla-Fladen"], [1, "", "Avocado"], [1, "Dose", "Mais"], [1, "", "Gurke"], [150, "g", "Frischkäse"], [null, "", "Salat"]],
    steps: ["Gemüse schneiden.", "Fladen mit Frischkäse bestreichen.", "Belegen, einrollen, halbieren."],
  },
];

const toRecipe = (d: DemoDef): Recipe => ({
  ...createRecipe({
    title: d.title,
    category: d.category,
    servings: 4,
    prepMinutes: d.minutes,
    ingredients: d.ingredients.map(([amount, unit, name]) => ({ ...createIngredient(), id: `${d.id}-${name}`, amount, unit, name })),
    steps: d.steps,
  }),
  id: `${DEMO_PREFIX}${d.id}`,
  createdAt: "",
  updatedAt: "",
});

export const DEMO_RECIPES: Recipe[] = DEFS.map(toRecipe);
const BY_ID: Record<string, Recipe> = Object.fromEntries(DEMO_RECIPES.map((r) => [r.id, r]));

export const isDemoRecipe = (id: string) => id.startsWith(DEMO_PREFIX);
export const demoRecipe = (id: string): Recipe | undefined => BY_ID[id];

/** Bild, Emoji und Farbe eines Beispiel-Rezepts */
export function demoLook(id: string): { photo?: string; emoji: string; tone: string } | null {
  const d = DEFS.find((x) => `${DEMO_PREFIX}${x.id}` === id);
  return d ? { photo: d.photo, emoji: d.emoji, tone: d.tone } : null;
}

/** Das Beispielgericht des Beispiel-Tags (18:30) */
export const DEMO_DISH = { recipe: DEMO_RECIPES[0], clock: "18:30", photo: DEFS[0].photo! };

/** Drei weitere Beispiel-Ideen ("Mehr Ideen") */
export const DEMO_MORE = DEMO_RECIPES.slice(1);
