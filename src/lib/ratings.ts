// Bewerten nach dem Kochen: Am Abend des Kochtags (bzw. beim nächsten Öffnen)
// fragt der Küchenhelfer "Wie war …?". 👍 zählt fürs Kochbuch und die
// Basis-Statistik, 👎 setzt das Gericht auf die "Nie wieder"-Liste im Profil
// (die bekommt die KI immer mit) und nimmt es aus Kochbuch und Plan.

import { useExternalStore } from "./useExternalStore";
import { bumpBase, baseFromText, recipeBase } from "./bases";
import { deleteRecipe, rateRecipeUp, restoreRecipe, type Recipe } from "./cookbook";
import { learnFromRecipe, LIKE_WEIGHTS } from "./likes";
import { createLocalStore } from "./localStore";
import { composeWeek, entriesWithoutSlot, mealPlansWithWeek, replaceMealPlans, type StoredEntry } from "./mealPlan";
import { saveProfile, type HouseholdProfile, type MealTime, type NeverAgainEntry } from "./profile";
import { addDays, nextWeekStartFor, toIsoDate, weekStartFor, type WeekPlan } from "./weekPlan";

export type Rating = "up" | "down" | "skip";

/** Gründe für 👎 als Chips */
export const DOWN_REASONS = ["zu scharf", "zu aufwendig", "Kinder mögen's nicht", "schmeckt nicht"];

/** Ab dieser Uhrzeit wird am Kochtag selbst gefragt */
const ASK_FROM_HOUR: Record<MealTime, number> = { mittags: 14, abends: 19 };

/** Wie viele Tage zurück noch gefragt wird (heute eingeschlossen) */
const LOOK_BACK_DAYS = 3;

export type RatingCandidate = {
  /** Kochtag, "YYYY-MM-DD" */
  date: string;
  weekday: string;
  title: string;
  recipeId?: string;
};

type RatingStore = { version: 1; rated: Record<string, Rating> };

function migrate(raw: unknown): RatingStore | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as { version?: number; rated?: unknown };
  if (data.version !== 1 || !data.rated || typeof data.rated !== "object") return null;
  const rated: Record<string, Rating> = {};
  for (const [date, value] of Object.entries(data.rated as Record<string, unknown>)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && (value === "up" || value === "down" || value === "skip")) rated[date] = value;
  }
  return { version: 1, rated };
}

const store = createLocalStore("wasgibts.bewertungen", migrate);
const EMPTY: Record<string, Rating> = {};

/** Bewertete Kochtage (`undefined` = noch nicht geladen) */
export function useRatings(): Record<string, Rating> | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined) return undefined;
  return data?.rated ?? EMPTY;
}

function markRated(date: string, rating: Rating) {
  const current = store.load()?.rated ?? {};
  // Nur die letzten 60 Tage behalten
  const from = addDays(date, -60);
  const rated = Object.fromEntries(Object.entries(current).filter(([d]) => d >= from));
  store.save({ version: 1, rated: { ...rated, [date]: rating } });
}

/**
 * Welches gekochte Gericht als Nächstes bewertet werden soll: heute ab dem
 * Abend (bzw. nach dem Mittagessen), sonst die letzten Tage – jüngstes zuerst.
 */
export function ratingCandidate(
  now: Date,
  profile: HouseholdProfile,
  weekPlans: Record<string, WeekPlan>,
  mealPlans: Record<string, Record<string, StoredEntry>>,
  recipes: Record<string, Recipe>,
  rated: Record<string, Rating>,
): RatingCandidate | null {
  const shoppingDay = profile.shoppingDay || "Montag";
  for (let back = 0; back < LOOK_BACK_DAYS; back++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back, 12);
    const iso = toIsoDate(date);
    if (rated[iso]) continue;
    const week = composeWeek(weekStartFor(date, shoppingDay), profile, weekPlans, mealPlans, recipes);
    const day = week.days.find((d) => d.date === iso);
    const entry = day?.slot.entry;
    if (!day || day.away || !entry) continue;
    if (back === 0 && now.getHours() < ASK_FROM_HOUR[day.mealTime]) continue;
    return { date: iso, weekday: day.weekday, title: entry.title, recipeId: entry.recipeId };
  }
  return null;
}

/** 👍: Zähler hoch, KI-Rezept als Favorit behalten, Basis-Statistik */
export function rateUp(candidate: RatingCandidate, profile: HouseholdProfile, recipes: Record<string, Recipe>) {
  markRated(candidate.date, "up");
  const recipe = candidate.recipeId ? recipes[candidate.recipeId] : undefined;
  if (recipe) rateRecipeUp(recipe.id);
  const base = recipe ? recipeBase(recipe) : baseFromText(candidate.title);
  if (base) saveProfile({ ...profile, bases: bumpBase(profile.bases, base) });
  // Zutaten des Gerichts zählen als Vorliebe
  learnFromRecipe(recipe, LIKE_WEIGHTS.up);
}

/** "Haben wir nicht gekocht" – nicht mehr fragen */
export function skipRating(candidate: RatingCandidate) {
  markRated(candidate.date, "skip");
}

/** Grundzutaten zählen nicht als Hauptzutat */
const NOT_MAIN = /^(salz|pfeffer|öl|olivenöl|wasser|zucker|mehl|essig|butter|gewürze?)$/i;

function mainIngredients(recipe: Recipe | undefined): string[] {
  if (!recipe) return [];
  return recipe.ingredients
    .map((i) => i.name.trim())
    .filter((n) => n && !NOT_MAIN.test(n))
    .slice(0, 5);
}

/** Titel vergleichbar machen */
const norm = (s: string) => s.toLowerCase().replace(/[^a-zäöüß ]/g, "").replace(/\s+/g, " ").trim();

/** Steht ein Gericht (oder ein sehr ähnlich benanntes) auf der "Nie wieder"-Liste? */
export function isNeverAgain(title: string, list: NeverAgainEntry[]): boolean {
  const t = norm(title);
  if (!t) return false;
  return list.some((e) => {
    const n = norm(e.title);
    return n === t || (n.length >= 5 && t.includes(n)) || (t.length >= 5 && n.includes(t));
  });
}

/**
 * 👎: auf die "Nie wieder"-Liste (mit Grund), Rezept aus dem Kochbuch und
 * künftige Plätze mit diesem Gericht aus dem Plan nehmen.
 */
export function rateDown(
  candidate: RatingCandidate,
  reason: string,
  data: {
    profile: HouseholdProfile;
    recipes: Record<string, Recipe>;
    weekPlans: Record<string, WeekPlan>;
    mealPlans: Record<string, Record<string, StoredEntry>>;
  },
  now: Date,
) {
  markRated(candidate.date, "down");
  const recipe = candidate.recipeId ? data.recipes[candidate.recipeId] : undefined;
  const entry: NeverAgainEntry = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    title: candidate.title,
    ingredients: mainIngredients(recipe),
    reason: reason.trim().slice(0, 200),
    addedAt: toIsoDate(now),
    ...(recipe ? { recipe } : {}),
  };
  const neverAgain = [...data.profile.neverAgain.filter((e) => norm(e.title) !== norm(entry.title)), entry];

  // Künftige Plätze (ab morgen) mit diesem Gericht leeren
  const todayIso = toIsoDate(now);
  const shoppingDay = data.profile.shoppingDay || "Montag";
  let weeks = data.mealPlans;
  let changed = false;
  for (const weekStart of [weekStartFor(now, shoppingDay), nextWeekStartFor(now, shoppingDay)]) {
    const week = composeWeek(weekStart, data.profile, data.weekPlans, weeks, data.recipes);
    for (const day of week.days) {
      const e = day.slot.entry;
      if (day.date <= todayIso || !e) continue;
      const same = recipe ? e.recipeId === recipe.id : norm(e.title) === norm(candidate.title);
      if (!same) continue;
      weeks = mealPlansWithWeek(weeks, weekStart, (entries) => entriesWithoutSlot(entries, day.slot));
      changed = true;
    }
  }
  if (changed) replaceMealPlans(weeks);
  if (recipe) deleteRecipe(recipe.id);
  saveProfile({ ...data.profile, neverAgain });
}

/** Eintrag wiederherstellen: aus der Liste nehmen, Rezept zurück ins Kochbuch */
export function restoreNeverAgain(profile: HouseholdProfile, id: string) {
  const entry = profile.neverAgain.find((e) => e.id === id);
  if (!entry) return;
  if (entry.recipe) restoreRecipe(entry.recipe);
  saveProfile({ ...profile, neverAgain: profile.neverAgain.filter((e) => e.id !== id) });
}
