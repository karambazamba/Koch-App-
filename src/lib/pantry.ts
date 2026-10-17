// Vorrat ("Was ist noch da?"): Reste und Zutaten, die zu Hause sind – mit
// Datum, damit Wochenplan und später die KI sie nutzen können. Gespeichert
// lokal über localStore wie alles andere (später Supabase).

import { useSyncExternalStore } from "react";
import { formatAmount, type Recipe } from "./cookbook";
import { createLocalStore } from "./localStore";

export type PantryItem = {
  id: string;
  name: string;
  /** null = ohne Mengenangabe ("Bacon") */
  amount: number | null;
  /** z. B. "g", "Becher"; leer = Stück/Anzahl ("2 Karotten") */
  unit: string;
  /** Wann hinzugefügt, "YYYY-MM-DD" */
  addedAt: string;
};

export const PANTRY_UNITS = ["", "g", "kg", "ml", "l", "EL", "TL", "Stück", "Prise", "Dose", "Bund", "Packung", "Becher", "Glas", "Scheibe"];

// --- Gesagtes/Getipptes zerlegen ----------------------------------------------

const NUMBER_WORDS: Record<string, number> = {
  ein: 1, eine: 1, einen: 1, einem: 1, einer: 1, eins: 1,
  zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10,
  elf: 11, zwölf: 12, halb: 0.5, halbe: 0.5, halben: 0.5, halber: 0.5,
  anderthalb: 1.5, eineinhalb: 1.5,
};

/** Gesprochene/geschriebene Einheit → Einheit im Vorrat */
const UNIT_WORDS: Record<string, string> = {
  g: "g", gr: "g", gramm: "g",
  kg: "kg", kilo: "kg", kilogramm: "kg",
  ml: "ml", milliliter: "ml",
  l: "l", liter: "l",
  el: "EL", esslöffel: "EL", tl: "TL", teelöffel: "TL",
  stück: "Stück", stk: "Stück",
  prise: "Prise", prisen: "Prise",
  dose: "Dose", dosen: "Dose",
  bund: "Bund",
  packung: "Packung", packungen: "Packung", päckchen: "Packung", pck: "Packung",
  becher: "Becher", glas: "Glas", gläser: "Glas",
  scheibe: "Scheibe", scheiben: "Scheibe",
};

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const isAmountWord = (word: string) =>
  /^\d+([.,]\d+)?[a-zä]*$/i.test(word) || word.toLowerCase() in NUMBER_WORDS;
const isHalf = (word: string) => /^halbe?[nr]?$/i.test(word);

/**
 * Teile ohne Trenner (typisch bei Spracheingabe: "zwei Karotten eine
 * Aubergine") vor jedem Zahlwort mitten im Satz aufteilen.
 */
function splitAtAmounts(part: string): string[] {
  const chunks: string[][] = [[]];
  for (const word of part.split(/\s+/).filter(Boolean)) {
    const current = chunks[chunks.length - 1];
    const hasName = current.some((w) => !isAmountWord(w) && !isHalf(w) && !(w.toLowerCase() in UNIT_WORDS));
    if (hasName && isAmountWord(word) && !isHalf(word)) chunks.push([word]);
    else current.push(word);
  }
  return chunks.map((c) => c.join(" ")).filter(Boolean);
}

function parsePart(part: string): Omit<PantryItem, "id" | "addedAt"> {
  const words = part.split(/\s+/);
  let amount: number | null = null;
  const first = words[0].toLowerCase();
  if (/^\d+([.,]\d+)?$/.test(first)) {
    amount = Number(first.replace(",", "."));
    words.shift();
  } else if (/^\d+([.,]\d+)?[a-zä]+$/i.test(first)) {
    // "200g Hack"
    const [, num, unitWord] = first.match(/^(\d+(?:[.,]\d+)?)([a-zä]+)$/i)!;
    amount = Number(num.replace(",", "."));
    words[0] = unitWord;
  } else if (first in NUMBER_WORDS && words.length > 1) {
    amount = NUMBER_WORDS[first];
    words.shift();
  }
  // "eine halbe Zucchini" → 0,5
  if (amount !== null && words.length > 1 && isHalf(words[0])) {
    amount = amount * 0.5;
    words.shift();
  }
  let unit = "";
  const maybeUnit = words[0]?.toLowerCase().replace(/\.$/, "");
  if (words.length > 1 && maybeUnit && maybeUnit in UNIT_WORDS) {
    unit = UNIT_WORDS[maybeUnit];
    words.shift();
  }
  // Füllwörter wie "noch", "etwas" am Anfang weglassen
  while (words.length > 1 && /^(noch|etwas|bisschen|paar|ein|eine)$/i.test(words[0])) words.shift();
  return { name: capitalize(words.join(" ")), amount, unit };
}

/**
 * "zwei Karotten, eine Aubergine, 200 Gramm Bacon und Joghurt" →
 * [{2, "", Karotten}, {1, "", Aubergine}, {200, "g", Bacon}, {null, "", Joghurt}]
 */
export function parseIngredientText(text: string): Omit<PantryItem, "id" | "addedAt">[] {
  return text
    // Komma zwischen Ziffern ist ein Dezimalkomma ("1,5 Liter"), kein Trenner
    .split(/(?<!\d),|,(?!\d)|;|\n|\bund\b|\bsowie\b/i)
    .map((part) => part.trim().replace(/[.!?]+$/, ""))
    .filter(Boolean)
    .flatMap(splitAtAmounts)
    .map(parsePart)
    .filter((item) => item.name);
}

/** "2 Karotten", "200 g Bacon", "Joghurt" */
export function formatPantryItem(item: Pick<PantryItem, "name" | "amount" | "unit">): string {
  return [formatAmount(item.amount), item.unit, item.name].filter(Boolean).join(" ");
}

// --- Abgleich mit dem Kochbuch ------------------------------------------------

/** Gleiche Zutat unter anderem Namen */
const SYNONYMS: Record<string, string> = {
  karotte: "möhre", mohrrübe: "möhre", bacon: "speck", hackfleisch: "hack",
  hähnchen: "huhn", hühnchen: "huhn", champignon: "pilz", paradeiser: "tomate",
  erdapfel: "kartoffel", topfen: "quark", eier: "ei",
};

/** Hat man meistens im Haus – fehlt nicht wirklich */
const BASICS = ["salz", "pfeffer", "öl", "olivenöl", "wasser", "zucker", "mehl", "essig", "butter"];

/** Zutat vergleichbar machen: klein, ohne Pluralendung, Synonyme */
export function ingredientStem(name: string): string {
  let n = name.trim().toLowerCase().replace(/[^a-zäöüß ]/g, "");
  n = n.split(" ").filter(Boolean).pop() ?? n; // "rote Zwiebeln" → "zwiebeln"
  n = n.replace(/(en|n|e|s)$/, "");
  for (const [word, base] of Object.entries(SYNONYMS)) {
    if (n.startsWith(word.replace(/(en|n|e|s)$/, ""))) return base;
  }
  return n;
}

function sameIngredient(a: string, b: string): boolean {
  const x = ingredientStem(a);
  const y = ingredientStem(b);
  if (!x || !y) return false;
  // Gewürzpulver ist nicht das Gemüse ("Paprika" ≠ "Paprikapulver")
  if (x.endsWith("pulver") !== y.endsWith("pulver")) return false;
  return x === y || (x.length >= 4 && y.includes(x)) || (y.length >= 4 && x.includes(y));
}

export type RecipeMatch = {
  recipe: Recipe;
  /** Vorrats-Zutaten, die das Rezept nutzt */
  used: PantryItem[];
  /** Rezept-Zutaten, die fehlen (ohne Grundzutaten wie Salz) */
  missing: string[];
};

/**
 * Rezepte, die möglichst viele vorhandene Zutaten nutzen – sortiert nach
 * Anzahl genutzter Reste, dann nach wenigen fehlenden Zutaten.
 */
export function matchRecipes(recipes: Recipe[], pantry: PantryItem[]): RecipeMatch[] {
  if (pantry.length === 0) return [];
  return recipes
    .map((recipe) => {
      const names = recipe.ingredients.map((i) => i.name).filter((n) => n.trim());
      const used = pantry.filter((p) => names.some((n) => sameIngredient(n, p.name)));
      const missing = names.filter(
        (n) =>
          !pantry.some((p) => sameIngredient(n, p.name)) &&
          !BASICS.includes(n.trim().toLowerCase()),
      );
      return { recipe, used, missing };
    })
    .filter((m) => m.used.length > 0)
    .sort(
      (a, b) =>
        b.used.length - a.used.length ||
        a.missing.length - b.missing.length ||
        a.recipe.title.localeCompare(b.recipe.title, "de"),
    );
}

// --- Speicherung ----------------------------------------------------------------

type PantryStore = { version: 1; items: PantryItem[] };

function migrateStore(raw: unknown): PantryStore | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as { version?: number; items?: unknown };
  if (data.version !== 1 || !Array.isArray(data.items)) return null;
  return {
    version: 1,
    items: data.items
      .filter((i): i is Partial<PantryItem> => Boolean(i) && typeof i === "object")
      .filter((i) => typeof i.id === "string" && typeof i.name === "string")
      .map((i) => ({
        id: i.id!,
        name: i.name!,
        amount: typeof i.amount === "number" ? i.amount : null,
        unit: typeof i.unit === "string" ? i.unit : "",
        addedAt: typeof i.addedAt === "string" ? i.addedAt : "",
      })),
  };
}

const store = createLocalStore("wasgibts.vorrat", migrateStore);
const EMPTY: PantryItem[] = [];

function update(change: (items: PantryItem[]) => PantryItem[]) {
  const current = store.load() ?? { version: 1 as const, items: [] };
  store.save({ ...current, items: change(current.items) });
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

/** Neue Zutaten hinzufügen; gleiche Zutat (gleicher Name und Einheit) wird zusammengezählt. */
export function addPantryItems(items: Omit<PantryItem, "id" | "addedAt">[], addedAt: string) {
  update((current) => {
    const next = [...current];
    for (const item of items) {
      const same = next.find(
        (p) => p.name.toLowerCase() === item.name.toLowerCase() && p.unit === item.unit,
      );
      if (same) {
        same.amount =
          same.amount === null && item.amount === null ? null : (same.amount ?? 0) + (item.amount ?? 0);
        same.addedAt = addedAt;
      } else {
        next.push({ ...item, id: newId(), addedAt });
      }
    }
    return next.map((p) => ({ ...p }));
  });
}

export function updatePantryItem(id: string, changes: Partial<Omit<PantryItem, "id">>) {
  update((items) => items.map((p) => (p.id === id ? { ...p, ...changes } : p)));
}

export function removePantryItem(id: string) {
  update((items) => items.filter((p) => p.id !== id));
}

export function clearPantry() {
  update(() => []);
}

/** Vorrat (`undefined` = noch nicht geladen) */
export function usePantry(): PantryItem[] | undefined {
  const data = useSyncExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined) return undefined;
  return data?.items ?? EMPTY;
}
