// Sanfte Gesundheits-Tipps: immer ein konkreter, freiwilliger Tausch für ein
// geplantes Rezept ("Halbe Sahne durch Joghurt ersetzen – …"), "Ausprobieren"
// ändert nur dieses Rezept. Grundlage: allgemein anerkannte Empfehlungen
// (DGE: mehr Gemüse, Hülsenfrüchte, Vollkorn; weniger Zucker, Salz und
// verarbeitetes Fleisch) – keine Trends, keine Aussagen über Körper,
// Gewicht oder Kalorien. Nie für Cheat Day oder Wunschessen.

import { useExternalStore } from "@/lib/core/useExternalStore";
import { dietConflicts } from "@/lib/begleitung/diet";
import { saveRecipe, type Ingredient, type Recipe } from "@/lib/essen/cookbook";
import { createLocalStore } from "@/lib/core/localStore";
import type { PlanWeek } from "@/lib/essen/mealPlan";
import type { HealthTipLevel, Person } from "@/lib/einstellungen/profile";

/** Höchstens so viele Tipps pro Woche */
const TIP_LIMIT: Record<HealthTipLevel, number> = { aus: 0, ab_und_zu: 1, oefter: 3 };

type Swap = {
  id: string;
  /** Passende Zutat */
  match: RegExp;
  /** …aber nicht, wenn das schon drinsteht */
  skip?: RegExp;
  /** Neue Zutaten (für Allergie-Prüfung) */
  adds: string[];
  text: (name: string) => string;
  apply: (ingredient: Ingredient) => Ingredient[];
};

const half = (a: number | null) => (a === null ? null : Math.round((a / 2) * 10) / 10);
const part = (a: number | null, f: number) => (a === null ? null : Math.round(a * f * 10) / 10);
const id = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const SWAPS: Swap[] = [
  {
    id: "sahne-joghurt",
    match: /(?<!saure )sahne|schlagsahne|rahm$/i,
    skip: /saure|sauerrahm/i,
    adds: ["Joghurt"],
    text: () => "Halbe Sahne durch Joghurt ersetzen – schmeckt fast gleich, ist leichter.",
    apply: (i) => [
      { ...i, amount: half(i.amount) },
      { id: id(), name: "Joghurt", amount: half(i.amount), unit: i.unit === "ml" ? "g" : i.unit },
    ],
  },
  {
    id: "creme-joghurt",
    match: /crème fraîche|creme fraiche|schmand/i,
    adds: ["Joghurt"],
    text: (n) => `Die Hälfte ${n} durch Joghurt ersetzen – bleibt cremig, ist leichter.`,
    apply: (i) => [
      { ...i, amount: half(i.amount) },
      { id: id(), name: "Joghurt", amount: half(i.amount), unit: i.unit },
    ],
  },
  {
    id: "vollkornnudeln",
    match: /spaghetti|nudeln|penne|fusilli|pasta|tagliatelle|makkaroni|farfalle|linguine/i,
    skip: /vollkorn|reisnudel|glasnudel/i,
    adds: ["Vollkornnudeln"],
    text: () => "Halb normale, halb Vollkornnudeln – fällt kaum auf und macht länger satt.",
    apply: (i) => [
      { ...i, amount: half(i.amount) },
      { id: id(), name: `Vollkorn-${i.name}`, amount: half(i.amount), unit: i.unit },
    ],
  },
  {
    id: "naturreis",
    match: /^(basmati|jasmin|langkorn)?reis$/i,
    skip: /natur|vollkorn|risotto|milch/i,
    adds: ["Naturreis"],
    text: () => "Naturreis statt weißem Reis – schmeckt nussiger und hat mehr Ballaststoffe.",
    apply: (i) => [{ ...i, name: "Naturreis" }],
  },
  {
    id: "hack-linsen",
    match: /hackfleisch|^hack$|rinderhack|gehacktes/i,
    adds: ["rote Linsen"],
    text: () => "Ein Drittel vom Hack durch rote Linsen ersetzen – merkt in der Soße keiner.",
    apply: (i) => [
      { ...i, amount: part(i.amount, 2 / 3) },
      { id: id(), name: "rote Linsen", amount: i.amount === null ? null : Math.round((i.amount / 6) / 10) * 10 || 50, unit: i.unit || "g" },
    ],
  },
  {
    id: "wurst-gemuese",
    match: /speck|bacon|salami|würstchen|bratwurst|wurst|schinken|chorizo|pancetta/i,
    adds: ["Paprika"],
    text: (n) => `Halbe Menge ${n}, dafür eine Paprika mehr – genauso herzhaft, weniger verarbeitetes Fleisch.`,
    apply: (i) => [
      { ...i, amount: half(i.amount) },
      { id: id(), name: "Paprika", amount: 1, unit: "Stück" },
    ],
  },
  {
    id: "weniger-zucker",
    match: /^zucker$|^brauner zucker$/i,
    adds: [],
    text: () => "Ein Drittel weniger Zucker – schmeckt man kaum.",
    apply: (i) => [{ ...i, amount: part(i.amount, 2 / 3) }],
  },
  {
    id: "vollkornbrot",
    match: /toast|weißbrot|baguette|brötchen|ciabatta/i,
    skip: /vollkorn/i,
    adds: ["Vollkornbrot"],
    text: (n) => `Vollkorn statt ${n} – sättigt länger.`,
    apply: (i) => [{ ...i, name: `Vollkorn${lower(i.name)}` }],
  },
];

export type HealthTip = {
  /** Rezept + Regel, eindeutig */
  key: string;
  recipeId: string;
  title: string;
  weekday: string;
  swapId: string;
  ingredientId: string;
  text: string;
};

/** Passender Tausch für ein Rezept (oder null) */
function swapFor(recipe: Recipe, persons: Person[]): { swap: Swap; ingredient: Ingredient } | null {
  if (recipe.category === "cheatday") return null;
  for (const swap of SWAPS) {
    if (recipe.note.includes(`[${swap.id}]`)) continue;
    const ingredient = recipe.ingredients.find((i) => swap.match.test(i.name.trim()) && !swap.skip?.test(i.name));
    if (!ingredient) continue;
    if (swap.adds.length && dietConflicts("", swap.adds, persons).length > 0) continue;
    return { swap, ingredient };
  }
  return null;
}

/** Alle möglichen Tipps für die Tage ab heute – ohne Cheat Day und Wunschessen */
export function tipsForWeeks(weeks: PlanWeek[], todayIso: string, recipes: Record<string, Recipe>, persons: Person[]): HealthTip[] {
  const tips: HealthTip[] = [];
  for (const week of weeks) {
    for (const day of week.days) {
      const entry = day.slot.entry;
      if (day.date < todayIso || day.away || day.cheat || !entry || entry.origin === "wunsch" || entry.category === "cheatday") continue;
      const recipe = entry.recipeId ? recipes[entry.recipeId] : undefined;
      if (!recipe) continue;
      const found = swapFor(recipe, persons);
      if (!found || tips.some((t) => t.recipeId === recipe.id)) continue;
      tips.push({
        key: `${recipe.id}:${found.swap.id}`,
        recipeId: recipe.id,
        title: recipe.title,
        weekday: day.weekday,
        swapId: found.swap.id,
        ingredientId: found.ingredient.id,
        text: found.swap.text(found.ingredient.name),
      });
    }
  }
  return tips;
}

// --- Speicher: gezeigte und erledigte Tipps ----------------------------------

type TipStore = {
  version: 1;
  /** Je Woche (erster Tag) die gezeigten Tipps */
  shown: Record<string, string[]>;
  /** Erledigt: ausprobiert oder abgelehnt – kommt nicht wieder */
  handled: Record<string, "tried" | "declined">;
};

function migrate(raw: unknown): TipStore | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<TipStore>;
  if (d.version !== 1) return null;
  return {
    version: 1,
    shown: d.shown && typeof d.shown === "object" ? d.shown : {},
    handled: d.handled && typeof d.handled === "object" ? d.handled : {},
  };
}

const store = createLocalStore("wasgibts.tipps", migrate);
const EMPTY: TipStore = { version: 1, shown: {}, handled: {} };

export function useTipStore(): TipStore | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data ?? EMPTY);
}

/**
 * Der Tipp, der gerade dran ist: ein schon gezeigter, noch offener Tipp
 * dieser Woche – sonst ein neuer, solange das Wochenlimit nicht erreicht ist.
 */
export function currentTip(level: HealthTipLevel, weekStart: string, tips: HealthTip[], data: TipStore): HealthTip | null {
  const limit = TIP_LIMIT[level];
  if (limit === 0) return null;
  const open = tips.filter((t) => !data.handled[t.key]);
  const shownThisWeek = data.shown[weekStart] ?? [];
  const pending = open.find((t) => shownThisWeek.includes(t.key));
  if (pending) return pending;
  if (shownThisWeek.length >= limit) return null;
  const shownBefore = new Set(Object.values(data.shown).flat());
  return open.find((t) => !shownBefore.has(t.key)) ?? null;
}

/** Wie viele Tipps diese Woche schon gezeigt wurden */
export function tipsShown(weekStart: string, data: TipStore | null | undefined): number {
  return data?.shown[weekStart]?.length ?? 0;
}

export function markTipShown(weekStart: string, key: string) {
  const data = store.load() ?? EMPTY;
  const list = data.shown[weekStart] ?? [];
  if (list.includes(key)) return;
  store.save({ ...data, shown: { ...data.shown, [weekStart]: [...list, key] } });
}

function markHandled(key: string, how: "tried" | "declined") {
  const data = store.load() ?? EMPTY;
  store.save({ ...data, handled: { ...data.handled, [key]: how } });
}

/** "Ausprobieren": Tausch nur in diesem Rezept; liefert das alte Rezept zum Rückgängigmachen */
export function tryTip(tip: HealthTip, recipe: Recipe): Recipe | null {
  const swap = SWAPS.find((s) => s.id === tip.swapId);
  const index = recipe.ingredients.findIndex((i) => i.id === tip.ingredientId);
  if (!swap || index < 0) return null;
  const ingredients = [...recipe.ingredients.slice(0, index), ...swap.apply(recipe.ingredients[index]), ...recipe.ingredients.slice(index + 1)];
  const note = `${recipe.note ? `${recipe.note}\n` : ""}🌱 Ausprobiert: ${tip.text.split(" – ")[0]} [${swap.id}]`;
  saveRecipe({ ...recipe, ingredients, note });
  markHandled(tip.key, "tried");
  return recipe;
}

export function declineTip(tip: HealthTip) {
  markHandled(tip.key, "declined");
}

/** Rückgängig: altes Rezept zurück, Tipp gilt als abgelehnt */
export function undoTip(tip: HealthTip, previous: Recipe) {
  saveRecipe(previous);
  markHandled(tip.key, "declined");
}
