// "Unser Kochbuch": Rezepte der Familie. Gespeichert lokal über dieselbe
// Speicher-Schicht wie das Profil (localStore, später Supabase).
//
// Vorbereitet für KI-Rezepte: Ein von der KI vorgeschlagenes Rezept kann mit
// saveAiRecipe() direkt (als Favorit, Herkunft "ki") ins Kochbuch übernommen
// werden – dieselbe Struktur wie eigene Rezepte, plus optionale `ai`-Angaben.

import { useExternalStore } from "./useExternalStore";
import { createLocalStore } from "./localStore";

export type RecipeCategory = "fleisch" | "vegetarisch" | "fisch" | "cheatday";
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
  createdAt: string;
  updatedAt: string;
};

/** Was zum Anlegen nötig ist – Zähler & Zeitstempel kommen automatisch dazu */
export type RecipeDraft = Pick<Recipe, "title" | "category"> &
  Partial<Omit<Recipe, "id" | "createdAt" | "updatedAt">>;

type CookbookStore = {
  version: 1;
  recipes: Record<string, Recipe>;
};

const STORAGE_KEY = "wasgibts.kochbuch";

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
  const now = new Date().toISOString();
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
    ...draft,
    id: newId(),
    createdAt: now,
    updatedAt: now,
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

/** Beliebtheit: Daumen hoch minus runter, bei Gleichstand öfter gekocht zuerst */
export function popularity(recipe: Recipe): number {
  return recipe.thumbsUp - recipe.thumbsDown;
}

export type RecipeSort = "zuletzt" | "beliebt";

export function sortRecipes(recipes: Recipe[], sort: RecipeSort): Recipe[] {
  return [...recipes].sort((a, b) => {
    if (sort === "beliebt") {
      return (
        popularity(b) - popularity(a) ||
        b.cookedCount - a.cookedCount ||
        a.title.localeCompare(b.title, "de")
      );
    }
    // Zuletzt gekocht zuerst; nie gekochte danach, neueste zuerst
    if (a.lastCookedAt !== b.lastCookedAt) {
      if (!a.lastCookedAt) return 1;
      if (!b.lastCookedAt) return -1;
      return b.lastCookedAt.localeCompare(a.lastCookedAt);
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
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
    note: str(r.note),
    source: r.source === "ki" ? "ki" : "eigenes",
    ai: r.ai && typeof r.ai === "object" ? r.ai : null,
    favorite: r.favorite === true,
    thumbsUp: num(r.thumbsUp, 0),
    thumbsDown: num(r.thumbsDown, 0),
    cookedCount: num(r.cookedCount, 0),
    lastCookedAt: typeof r.lastCookedAt === "string" ? r.lastCookedAt : null,
    createdAt: str(r.createdAt),
    updatedAt: str(r.updatedAt),
  };
}

function migrateStore(raw: unknown): CookbookStore | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as { version?: number; recipes?: Record<string, unknown> };
  if (data.version !== 1 || !data.recipes || typeof data.recipes !== "object") return null;
  const recipes: Record<string, Recipe> = {};
  for (const [id, r] of Object.entries(data.recipes)) {
    const recipe = migrateRecipe(id, r);
    if (recipe) recipes[id] = recipe;
  }
  return { version: 1, recipes };
}

const store = createLocalStore(STORAGE_KEY, migrateStore);

function update(change: (recipes: Record<string, Recipe>) => Record<string, Recipe>) {
  const current = store.load() ?? { version: 1 as const, recipes: {} };
  store.save({ ...current, recipes: change(current.recipes) });
}

export function saveRecipe(recipe: Recipe): Recipe {
  const saved = {
    ...recipe,
    title: recipe.title.trim(),
    ingredients: recipe.ingredients.filter((i) => i.name.trim()),
    steps: recipe.steps.map((s) => s.trim()).filter(Boolean),
    updatedAt: new Date().toISOString(),
  };
  update((recipes) => ({ ...recipes, [saved.id]: saved }));
  return saved;
}

/**
 * KI-Rezept mit einem Herz ins Kochbuch übernehmen: wird als Favorit mit
 * Herkunft "ki" gespeichert.
 */
export function saveAiRecipe(draft: RecipeDraft, prompt?: string): Recipe {
  return saveRecipe(createAiRecipe(draft, prompt));
}

/** Alle Rezepte auf einmal ersetzen (Küchenhelfer: Übernehmen/Rückgängig) */
export function replaceRecipes(recipes: Record<string, Recipe>) {
  store.save({ version: 1, recipes });
}

/** KI-Rezept ohne Speichern anlegen (wie `saveAiRecipe`), z. B. für eine Vorschau */
export function createAiRecipe(draft: RecipeDraft, prompt?: string): Recipe {
  return createRecipe({
    ...draft,
    source: "ki",
    favorite: true,
    ai: { generatedAt: new Date().toISOString(), prompt },
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
    return { ...recipes, [id]: { ...recipe, ...change(recipe), updatedAt: new Date().toISOString() } };
  });
}

export function toggleFavorite(id: string) {
  patch(id, (r) => ({ favorite: !r.favorite }));
}

/** Nach dem Kochen: mitzählen, Zeitpunkt merken und optional bewerten. */
export function recordCooked(id: string, rating: "up" | "down" | null) {
  patch(id, (r) => ({
    cookedCount: r.cookedCount + 1,
    lastCookedAt: new Date().toISOString(),
    thumbsUp: r.thumbsUp + (rating === "up" ? 1 : 0),
    thumbsDown: r.thumbsDown + (rating === "down" ? 1 : 0),
  }));
}

/**
 * Bewertung nach dem Kochen (👍): mitzählen und Daumen hoch. Ein KI-Rezept
 * wird dabei als Favorit fest ins Kochbuch übernommen.
 */
export function rateRecipeUp(id: string) {
  patch(id, (r) => ({
    cookedCount: r.cookedCount + 1,
    lastCookedAt: new Date().toISOString(),
    thumbsUp: r.thumbsUp + 1,
    favorite: r.source === "ki" ? true : r.favorite,
  }));
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
