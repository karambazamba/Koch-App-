// Bewerten nach dem Kochen: Am Abend des Kochtags (bzw. beim nächsten Öffnen)
// fragt der Küchenhelfer "Wie war …?". 👍 zählt fürs Kochbuch und die
// Basis-Statistik, 👎 setzt das Gericht auf die "Nie wieder"-Liste im Profil
// (die bekommt die KI immer mit) und nimmt es aus Kochbuch und Plan.

import { useExternalStore } from "./useExternalStore";
import { bumpBase, baseFromText, recipeBase } from "./bases";
import { deleteRecipe, rateRecipeUp, recipeBeforeDay, restoreRecipe, type Recipe } from "./cookbook";
import { learnFromRecipe, LIKE_WEIGHTS } from "./likes";
import { createLocalStore } from "./localStore";
import { dishStatus } from "./dishStatus";
import { composeWeek, entriesWithoutSlot, mealPlansWithWeek, replaceMealPlans, type PlanWeek, type ResolvedEntry, type StoredEntry } from "./mealPlan";
import { saveProfile, type HouseholdProfile, type NeverAgainEntry } from "./profile";
import { addDays, nextWeekStartFor, toIsoDate, weekStartFor, type WeekPlan } from "./weekPlan";

export type Rating = "up" | "down" | "skip";

/** Gründe für 👎 als Chips */
export const DOWN_REASONS = ["zu scharf", "zu aufwendig", "Kinder mögen's nicht", "schmeckt nicht"];

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

/** "HH:MM" + Minuten → Minuten seit Mitternacht */
const minutesOf = (clock: string) => {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
};

/** Wird so lange nach dem Essen gefragt */
export const ASK_AFTER_MINUTES = 60;

/**
 * Gibt es das Gericht zum ersten Mal? Rezepte: noch nie gekocht/bewertet und
 * nicht schon früher im Plan; Freitext/Wunsch: Titel nicht schon früher im Plan.
 */
export function isFirstTime(
  entry: ResolvedEntry,
  date: string,
  week: PlanWeek,
  mealPlans: Record<string, Record<string, StoredEntry>>,
  recipes: Record<string, Recipe>,
): boolean {
  const found = entry.recipeId ? recipes[entry.recipeId] : undefined;
  // Am Kochtag selbst mitgezählt (nach dem Essen automatisch) zählt nicht als "schon mal"
  const recipe = found ? recipeBeforeDay(found, date) : undefined;
  if (recipe && (recipe.cookedCount > 0 || recipe.thumbsUp > 0)) return false;
  const title = entry.title.trim().toLowerCase();
  const same = (s: StoredEntry) =>
    (entry.recipeId && s.kind === "recipe" && s.recipeId === entry.recipeId) ||
    ((s.kind === "recipe" || s.kind === "text") && s.title.trim().toLowerCase() === title) ||
    (s.kind === "wish" && s.text.trim().toLowerCase() === title);
  const earlierWeeks = Object.entries(mealPlans).filter(([start]) => start < week.weekStart);
  if (earlierWeeks.some(([, entries]) => Object.values(entries).some(same))) return false;
  return !week.days.some((d) => d.date < date && d.slot.entry && same(d.slot.entry.stored));
}

/** Bis zu dieser Uhrzeit am nächsten Morgen wird noch nach dem Vortag gefragt */
export const ASK_UNTIL_NEXT_MORNING = 10 * 60;

/**
 * Nach dem Kochen fragen – abends ab 1 Stunde nach der Essenszeit bis zum
 * nächsten Morgen (10 Uhr), und nur bei neuen Gerichten beim ersten Mal (keine
 * Wiederholungen oder Kochbuch-Klassiker). Danach ist die Frage weg.
 */
export function ratingCandidate(
  now: Date,
  profile: HouseholdProfile,
  weekPlans: Record<string, WeekPlan>,
  mealPlans: Record<string, Record<string, StoredEntry>>,
  recipes: Record<string, Recipe>,
  rated: Record<string, Rating>,
): RatingCandidate | null {
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  // Morgens: noch der Vortag; sonst heute
  const morning = minutesNow < ASK_UNTIL_NEXT_MORNING;
  const day0 = morning ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12) : now;
  const iso = toIsoDate(day0);
  if (rated[iso]) return null;
  const week = composeWeek(weekStartFor(day0, profile.shoppingDay || "Montag"), profile, weekPlans, mealPlans, recipes);
  const day = week.days.find((d) => d.date === iso);
  const entry = day?.slot.entry;
  // Am Wochenende (frei/locker) keine Bewertungsfragen
  if (!day || day.away || !entry || day.weekend) return null;
  if (!morning && minutesNow < minutesOf(profile.mealClock[day.mealTime]) + ASK_AFTER_MINUTES) return null;
  // Nur bei Neuem: bekannte Gerichte (Kochbuch-Klassiker, Freitext, Wunsch) nie.
  // Status wie vor dem Kochtag – nach dem Essen wird automatisch mitgezählt.
  const own = entry.recipeId ? recipes[entry.recipeId] : undefined;
  const before = own ? { ...recipes, [own.id]: recipeBeforeDay(own, iso) } : recipes;
  if (dishStatus(entry, before) !== "neu" || !isFirstTime(entry, iso, week, mealPlans, recipes)) return null;
  return { date: iso, weekday: day.weekday, title: entry.title, recipeId: entry.recipeId };
}

/** 👍: Zähler hoch, KI-Rezept als Favorit behalten, Basis-Statistik */
export function rateUp(candidate: RatingCandidate, profile: HouseholdProfile, recipes: Record<string, Recipe>) {
  markRated(candidate.date, "up");
  const recipe = candidate.recipeId ? recipes[candidate.recipeId] : undefined;
  // Schon nach dem Essen mitgezählt → nur noch der Daumen
  if (recipe) rateRecipeUp(recipe.id, { count: !recipe.lastCookedAt?.startsWith(candidate.date) });
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
