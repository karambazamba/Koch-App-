// Beispielgericht für den Beispiel-Tag passend zum Wochentag: werktags Pasta
// mit Tomaten & Burrata (nach dem Essen Ofengemüse mit Feta für morgen),
// samstags Lasagne, sonntags und an Feiertagen Ofen-Hähnchen am Mittag – am
// Wochenende ist Zeit zum Kochen. Dazu zwei weitere Beispiel-Ideen. Lesbar und kochbar wie eingebaute Rezepte
// (ID "d:<id>", siehe `findRecipe`), liegen aber nie im Kochbuch, Wochenplan
// oder in der Sicherung – sie verschwinden mit dem Beispiel-Tag.

import { createIngredient, createRecipe, type Recipe } from "@/lib/essen/cookbook";
import { addDays } from "@/lib/core/now";
import { demoArt, type DemoArt } from "@/lib/core/demo";

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
    photo: "/gerichte/ofengemuese-mit-feta.webp",
    tone: "#E0A040",
    ingredients: [[600, "g", "Kartoffeln"], [2, "", "Paprika"], [1, "", "Zucchini"], [200, "g", "Feta"], [3, "EL", "Olivenöl"], [null, "", "Rosmarin, Salz"]],
    steps: ["Ofen auf 220 °C vorheizen.", "Gemüse in Stücke schneiden, mit Öl und Gewürzen mischen.", "30 Minuten backen, Feta drüberbröseln, 5 Minuten weiter."],
  },
  {
    id: "lasagne",
    title: "Lasagne",
    emoji: "🍝",
    minutes: 75,
    category: "fleisch",
    photo: "/gerichte/lasagne.webp",
    tone: "#D9603B",
    ingredients: [[12, "", "Lasagneplatten"], [500, "g", "Rinderhack"], [1, "", "Zwiebel"], [800, "g", "passierte Tomaten"], [500, "ml", "Milch"], [40, "g", "Butter"], [40, "g", "Mehl"], [150, "g", "geriebener Käse"], [null, "", "Salz, Pfeffer, Oregano"]],
    steps: ["Zwiebel würfeln, mit dem Hack anbraten, Tomaten dazu, 20 Minuten köcheln.", "Butter schmelzen, Mehl einrühren, Milch nach und nach dazu, aufkochen.", "Abwechselnd Soße, Platten und Béchamel schichten, oben Käse.", "Bei 180 °C etwa 40 Minuten backen."],
  },
  {
    id: "ofen-haehnchen",
    title: "Ofen-Hähnchen mit Kartoffeln",
    emoji: "🍗",
    minutes: 80,
    category: "fleisch",
    photo: "/gerichte/ofen-haehnchen-mit-kartoffeln.webp",
    tone: "#E0A040",
    ingredients: [[1, "", "Hähnchen (ca. 1,5 kg)"], [1, "kg", "Kartoffeln"], [2, "", "Möhren"], [1, "", "Zitrone"], [3, "EL", "Olivenöl"], [null, "", "Rosmarin, Thymian, Salz, Paprikapulver"]],
    steps: ["Ofen auf 200 °C vorheizen.", "Hähnchen mit Öl, Salz, Paprika einreiben, Zitrone und Kräuter hinein.", "Kartoffeln und Möhren in Stücken drumherum legen.", "Etwa 70 Minuten backen, zwischendurch mit dem Saft begießen."],
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

/** Beispielgericht je Art des Tages, mit Uhrzeit (sonntags der Braten am Mittag) */
const DISH_FOR: Record<DemoArt, { id: string; at: number }> = {
  werktag: { id: "pasta-burrata", at: 18 * 60 + 30 },
  samstag: { id: "lasagne", at: 18 * 60 + 30 },
  sonntag: { id: "ofen-haehnchen", at: 12 * 60 + 30 },
};
/** Wie AutoCooked: ab Essenszeit + 90 Minuten ist das Essen vorbei */
const OVER = 90;
const clockOf = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const pick = (id: string, at: number, tomorrow: boolean) => {
  const d = DEFS.find((x) => x.id === id)!;
  return { recipe: BY_ID[`${DEMO_PREFIX}${id}`], clock: clockOf(at), photo: d.photo!, tomorrow };
};

/**
 * Beispielgericht passend zu Tag und Uhrzeit: bis Essenszeit + 90 Min das
 * Gericht von heute, danach das von morgen – zwei Werktage hintereinander
 * zeigen morgen das Ofengemüse (Abwechslung). Nie eine Uhrzeit, die schon vorbei ist.
 */
export function demoDishAt(today: string, minutes: number): { recipe: Recipe; clock: string; photo: string; tomorrow: boolean } {
  const heute = DISH_FOR[demoArt(today)];
  if (minutes < heute.at + OVER) return pick(heute.id, heute.at, false);
  const art = demoArt(addDays(today, 1));
  const morgen = DISH_FOR[art];
  if (art === "werktag" && demoArt(today) === "werktag") return pick("ofengemuese", morgen.at, true);
  return pick(morgen.id, morgen.at, true);
}

/** Personen fürs Beispielgericht (Tafel 122): eingetragene Personen, sonst nach Haushalt – allein 1, zu zweit 2, Familie 4 */
export function beispielPersonen(haushalt: "allein" | "paar" | "familie", eingetragen: number): number {
  if (eingetragen > 0) return eingetragen;
  return haushalt === "allein" ? 1 : haushalt === "paar" ? 2 : 4;
}
