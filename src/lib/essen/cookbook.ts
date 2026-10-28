// "Unser Kochbuch": Rezepte der Familie. Gespeichert lokal über dieselbe
// Speicher-Schicht wie das Profil (localStore, später Supabase).
//
// Vorbereitet für KI-Rezepte: Ein von der KI vorgeschlagenes Rezept kann mit
// saveAiRecipe() direkt (als Favorit, Herkunft "ki") ins Kochbuch übernommen
// werden – dieselbe Struktur wie eigene Rezepte, plus optionale `ai`-Angaben.

import { useExternalStore } from "@/lib/core/useExternalStore";
import { createLocalStore } from "@/lib/core/localStore";
import type { MachineStep, OvenSettings } from "@/lib/essen/baking/types";
import { now } from "@/lib/core/now";
import type { StorageKey } from "@/lib/core/storage";

export type { MachineStep, OvenMode } from "@/lib/essen/baking/types";

export type RecipeCategory = "fleisch" | "vegetarisch" | "fisch" | "cheatday";
/** Kochen oder Backen (Kochbuch v3) – Backen: Mengen in g/ml, Backofen, Form */
export type RecipeKind = "kochen" | "backen";
export type RecipeSource = "eigenes" | "ki";

export type Ingredient = {
  id: string;
  /** Menge als Zahl (für späteres Umrechnen auf andere Personenzahl), null = "etwas" */
  amount: number | null;
  unit: string;
  name: string;
};

export type Recipe = {
  id: string;
  title: string;
  category: RecipeCategory;
  servings: number;
  /** Zubereitungszeit in Minuten, null = keine Angabe */
  prepMinutes: number | null;
  ingredients: Ingredient[];
  steps: string[];
  /** Schnellanleitung je Schritt (Mia liefert sie mit; optional, sonst essen/kurz) */
  shortSteps?: string[];
  note: string;
  source: RecipeSource;
  /** Nur bei KI-Rezepten: woher der Vorschlag stammt */
  ai: { generatedAt: string; prompt?: string } | null;
  favorite: boolean;
  /** Bewertungen nach dem Kochen */
  thumbsUp: number;
  thumbsDown: number;
  cookedCount: number;
  /**
   * Zuletzt gekocht als Zeitstempel (ISO), null = noch nie. Für die Sortierung
   * zählt die Uhrzeit mit, angezeigt wird nur das Datum.
   */
  lastCookedAt: string | null;
  /**
   * "Kennen wir": von Hand markiert (Rezeptseite, Wochenplan). Bekannt ist
   * ein Rezept auch ohne Markierung, wenn es oft genug gekocht wurde –
   * siehe `recipeIsKnown()` in dishStatus.ts.
   */
  known: boolean;
  /** Kochen oder Backen (Kochbuch v3) */
  kind: RecipeKind;
  /** Backofen: Heizart, Temperatur, Backzeit (vor allem beim Backen) */
  oven: OvenSettings | null;
  /** Formgröße, z. B. "Springform 26 cm" */
  pan: string;
  /** Schritte (Index), die Kinder übernehmen können */
  kidSteps: number[];
  /** Schritte für Thermomix bzw. Küchenmaschine mit Kochfunktion */
  machineSteps: MachineStep[];
  createdAt: string;
  updatedAt: string;
};

/** Was zum Anlegen nötig ist – Zähler & Zeitstempel kommen automatisch dazu */
type RecipeDraft = Pick<Recipe, "title" | "category"> &
  Partial<Omit<Recipe, "id" | "createdAt" | "updatedAt">>;

type CookbookStore = {
  /** v2: `known` ("kennen wir"); v3: Typ, Backofen, Form, Kinder- und Maschinenschritte (+ optional `shortSteps`, additiv ohne neue Version) */
  version: 3;
  recipes: Record<string, Recipe>;
};

const STORAGE_KEY: StorageKey = "wasgibts.kochbuch";

export const RECIPE_CATEGORIES: { value: RecipeCategory; label: string; emoji: string }[] = [
  { value: "fleisch", label: "Fleisch", emoji: "🥩" },
  { value: "vegetarisch", label: "Vegetarisch", emoji: "🥦" },
  { value: "fisch", label: "Fisch", emoji: "🐟" },
  { value: "cheatday", label: "Cheat Day", emoji: "🍕" },
];

export function categoryInfo(category: RecipeCategory) {
  return RECIPE_CATEGORIES.find((c) => c.value === category)!;
}

export const UNITS = ["", "g", "kg", "ml", "l", "EL", "TL", "Stück", "Prise", "Dose", "Bund", "Packung"];

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

export function createIngredient(): Ingredient {
  return { id: newId(), amount: null, unit: "", name: "" };
}

export function createRecipe(draft: RecipeDraft): Recipe {
  const stamp = now().toISOString();
  return {
    servings: 4,
    prepMinutes: null,
    ingredients: [],
    steps: [],
    note: "",
    source: "eigenes",
    ai: null,
    favorite: false,
    thumbsUp: 0,
    thumbsDown: 0,
    cookedCount: 0,
    lastCookedAt: null,
    known: false,
    kind: "kochen",
    oven: null,
    pan: "",
    kidSteps: [],
    machineSteps: [],
    ...draft,
    id: newId(),
    createdAt: stamp,
    updatedAt: stamp,
  };
}

/** "1,5" → 1.5; leer oder ungültig → null */
export function parseAmount(text: string): number | null {
  const value = Number(text.trim().replace(",", "."));
  return text.trim() === "" || Number.isNaN(value) ? null : value;
}

/** 1.5 → "1,5" */
export function formatAmount(amount: number | null): string {
  return amount === null ? "" : String(amount).replace(".", ",");
}

/** Personen aus „?personen=…“ (1–20, sonst null) */
export function personsParam(raw: string | null): number | null {
  const n = Math.round(Number(raw));
  return raw && Number.isFinite(n) && n >= 1 && n <= 20 ? n : null;
}

/** Menge für eine andere Personenzahl (eine Nachkommastelle) – Rezept und Kochmodus gleich */
export function scaledAmount(amount: number | null, servings: number, persons: number | null): number | null {
  if (amount === null || !persons || servings <= 0 || persons === servings) return amount;
  return Math.round((amount * persons * 10) / servings) / 10;
}

// --- Speicherung ------------------------------------------------------------

const CATEGORY_VALUES = RECIPE_CATEGORIES.map((c) => c.value);

function migrateRecipe(id: string, raw: unknown): Recipe | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<Recipe>;
  if (typeof r.title !== "string") return null;
  const num = (v: unknown, fallback: number) => (typeof v === "number" ? v : fallback);
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    id,
    title: r.title,
    category: CATEGORY_VALUES.includes(r.category as RecipeCategory)
      ? (r.category as RecipeCategory)
      : "vegetarisch",
    servings: num(r.servings, 4),
    prepMinutes: typeof r.prepMinutes === "number" ? r.prepMinutes : null,
    ingredients: Array.isArray(r.ingredients)
      ? r.ingredients
          .filter((i): i is Ingredient => Boolean(i) && typeof i === "object")
          .map((i) => ({
            id: typeof i.id === "string" ? i.id : newId(),
            amount: typeof i.amount === "number" ? i.amount : null,
            unit: str(i.unit),
            name: str(i.name),
          }))
      : [],
    steps: Array.isArray(r.steps) ? r.steps.filter((s): s is string => typeof s === "string") : [],
    // Kurzfassung (Tafel 122, optional und additiv – ältere Stände haben keine)
    ...(Array.isArray(r.shortSteps) && r.shortSteps.every((s) => typeof s === "string") ? { shortSteps: r.shortSteps } : {}),
    note: str(r.note),
    source: r.source === "ki" ? "ki" : "eigenes",
    ai: r.ai && typeof r.ai === "object" ? r.ai : null,
    favorite: r.favorite === true,
    thumbsUp: num(r.thumbsUp, 0),
    thumbsDown: num(r.thumbsDown, 0),
    cookedCount: num(r.cookedCount, 0),
    lastCookedAt: typeof r.lastCookedAt === "string" ? r.lastCookedAt : null,
    // Bis v1 gab es keine Markierung: was schon im Kochbuch stand (eigene
    // Rezepte) bzw. mindestens 2× gekocht wurde, kennt die Familie.
    known: typeof r.known === "boolean" ? r.known : r.source !== "ki" || num(r.cookedCount, 0) >= 2,
    // Bis v2 ohne Typ: Kuchen, Muffins & Co. sind Backen
    kind: r.kind === "backen" || r.kind === "kochen" ? r.kind : guessRecipeKind(r.title),
    oven: migrateOven(r.oven),
    pan: str(r.pan),
    kidSteps: Array.isArray(r.kidSteps) ? r.kidSteps.filter((i): i is number => Number.isInteger(i) && i >= 0) : [],
    machineSteps: Array.isArray(r.machineSteps)
      ? r.machineSteps
          .filter((m): m is MachineStep => Boolean(m) && typeof m === "object" && typeof m.text === "string")
          .map((m) => ({
            text: m.text,
            ...(typeof m.time === "string" ? { time: m.time } : {}),
            ...(typeof m.temp === "string" ? { temp: m.temp } : {}),
            ...(typeof m.speed === "string" ? { speed: m.speed } : {}),
            ...(m.reverse === true ? { reverse: true } : {}),
          }))
      : [],
    createdAt: str(r.createdAt),
    updatedAt: str(r.updatedAt),
  };
}

/** Backen oder Kochen am Namen erkennen */
function guessRecipeKind(title: string): RecipeKind {
  return /kuchen|torte|muffin|cupcake|keks|plätzchen|cookie|brownie|waffel|hefezopf|zopf|schnecke|stollen|brötchen|bananenbrot|brot backen|tarte|crumble|scone|gebäck/i.test(title)
    ? "backen"
    : "kochen";
}

function migrateOven(raw: unknown): OvenSettings | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<OvenSettings>;
  if (typeof o.temp !== "number" || typeof o.minutes !== "number") return null;
  return { mode: o.mode === "umluft" ? "umluft" : "ober-unter", temp: o.temp, minutes: o.minutes };
}

function migrateStore(raw: unknown): CookbookStore | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as { version?: number; recipes?: Record<string, unknown> };
  if (![1, 2, 3].includes(data.version as number) || !data.recipes || typeof data.recipes !== "object") return null;
  const recipes: Record<string, Recipe> = {};
  for (const [id, r] of Object.entries(data.recipes)) {
    const recipe = migrateRecipe(id, r);
    if (recipe) recipes[id] = recipe;
  }
  return { version: 3, recipes };
}

const store = createLocalStore(STORAGE_KEY, migrateStore);

function update(change: (recipes: Record<string, Recipe>) => Record<string, Recipe>) {
  const current = store.load() ?? { version: 3 as const, recipes: {} };
  store.save({ ...current, recipes: change(current.recipes) });
}

export function saveRecipe(recipe: Recipe): Recipe {
  const saved = {
    ...recipe,
    title: recipe.title.trim(),
    ingredients: recipe.ingredients.filter((i) => i.name.trim()),
    steps: recipe.steps.map((s) => s.trim()).filter(Boolean),
    updatedAt: now().toISOString(),
  };
  update((recipes) => ({ ...recipes, [saved.id]: saved }));
  return saved;
}

/** Alle Rezepte auf einmal ersetzen (Küchenhelfer: Übernehmen/Rückgängig) */
export function replaceRecipes(recipes: Record<string, Recipe>) {
  store.save({ version: 3, recipes });
}

/** KI-Rezept ohne Speichern anlegen (wie `saveAiRecipe`), z. B. für eine Vorschau */
export function createAiRecipe(draft: RecipeDraft, prompt?: string): Recipe {
  return createRecipe({
    ...draft,
    source: "ki",
    favorite: true,
    ai: { generatedAt: now().toISOString(), prompt },
  });
}

export function deleteRecipe(id: string) {
  update((recipes) => {
    const next = { ...recipes };
    delete next[id];
    return next;
  });
}

function patch(id: string, change: (recipe: Recipe) => Partial<Recipe>) {
  update((recipes) => {
    const recipe = recipes[id];
    if (!recipe) return recipes;
    return { ...recipes, [id]: { ...recipe, ...change(recipe), updatedAt: now().toISOString() } };
  });
}

/** "Kennen wir" an/aus */
export function setRecipeKnown(id: string, known: boolean) {
  patch(id, () => ({ known }));
}

export function toggleFavorite(id: string) {
  patch(id, (r) => ({ favorite: !r.favorite }));
}

/**
 * Nach dem Essen automatisch mitzählen (Kochtag `date`). Gibt das vorherige
 * "zuletzt gekocht" zurück, damit "Doch nicht gekocht" es zurücksetzen kann.
 */
export function countCookedOn(id: string, date: string): string | null {
  const before = store.load()?.recipes?.[id]?.lastCookedAt ?? null;
  // Mittags UTC: das Datum stimmt in jeder Zeitzone hierzulande
  patch(id, (r) => ({ cookedCount: r.cookedCount + 1, lastCookedAt: `${date}T12:00:00.000Z` }));
  return before;
}

/** Automatisches Mitzählen zurücknehmen */
export function uncountCooked(id: string, lastCookedAt: string | null) {
  patch(id, (r) => ({ cookedCount: Math.max(0, r.cookedCount - 1), lastCookedAt }));
}

/** Gespeicherte Kopie eines Rezepts (z. B. aus der "Nie wieder"-Liste) zurück ins Kochbuch */
export function restoreRecipe(raw: unknown): Recipe | null {
  const id = raw && typeof raw === "object" && typeof (raw as Recipe).id === "string" ? (raw as Recipe).id : newId();
  const recipe = migrateRecipe(id, raw);
  if (!recipe) return null;
  update((recipes) => ({ ...recipes, [recipe.id]: recipe }));
  return recipe;
}

const EMPTY: Record<string, Recipe> = {};

/** Alle Rezepte (`undefined` = noch nicht geladen) */
export function useRecipes(): Record<string, Recipe> | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined) return undefined;
  return data?.recipes ?? EMPTY;
}
