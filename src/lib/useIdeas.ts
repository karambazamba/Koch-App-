"use client";

// Ideen für heute (Startseite und /ideen): Zustand des Tages (weggewischt,
// welche gerade dran ist), Auswahl → "Heute", Einkauf "Für heute".

import { useRecipes } from "./cookbook";
import { ideasFor, recentDishes, type Idea, type IdeaFilter } from "./ideas";
import { LIKE_WEIGHTS, learnFromRecipe } from "./likes";
import { createLocalStore } from "./localStore";
import { loadMealPlans, replaceMealPlans, mealPlansWithWeek, useMealPlans, type StoredEntry } from "./mealPlan";
import { usePantry } from "./pantry";
import type { HouseholdProfile } from "./profile";
import { addManualItem, removeManualItems, sectionFor } from "./shoppingList";
import { useExternalStore } from "./useExternalStore";
import { useProfile } from "./useProfile";
import { toIsoDate, useToday, useWeekPlans, weekStartFor, weekdayName } from "./weekPlan";
import { loadWishes, restoreWishes, useWishes } from "./wishes";
import type { Recipe } from "./cookbook";

type IdeaDay = { version: 1; date: string; dismissed: string[]; index: number };

function migrate(raw: unknown): IdeaDay | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<IdeaDay>;
  if (d.version !== 1 || typeof d.date !== "string") return null;
  return { version: 1, date: d.date, dismissed: Array.isArray(d.dismissed) ? d.dismissed.filter((x) => typeof x === "string") : [], index: Number(d.index) || 0 };
}

const store = createLocalStore("wasgibts.ideen", migrate);

function dayState(date: string): IdeaDay {
  const s = store.load();
  return s && s.date === date ? s : { version: 1, date, dismissed: [], index: 0 };
}

/** "Nicht jetzt": für heute weg */
export function dismissIdea(date: string, id: string) {
  const s = dayState(date);
  store.save({ ...s, dismissed: [...s.dismissed, id] });
}

/**
 * "Nicht jetzt": normale Idee nur für heute weg, ein Wunsch ist damit
 * erledigt (mit Rückgängig).
 */
export function putAside(date: string, idea: { id: string; wishId?: string }): (() => void) | null {
  if (idea.wishId) {
    const before = loadWishes();
    restoreWishes(before.filter((w) => w.id !== idea.wishId));
    return () => restoreWishes(before);
  }
  dismissIdea(date, idea.id);
  return null;
}

/** Nächste Idee (nach rechts wischen); nach der letzten wieder von vorn */
export function nextIdea(date: string, count: number) {
  const s = dayState(date);
  store.save({ ...s, index: count ? (s.index + 1) % count : 0 });
}

export type TodayIdeas = { ideas: Idea[]; index: number; profile: HouseholdProfile; recipes: Record<string, Recipe>; today: Date; todayIso: string };

/** Ideen für heute (`undefined` = lädt, `null` = kein Profil) */
export function useTodayIdeas(filters: IdeaFilter[] = []): TodayIdeas | null | undefined {
  const today = useToday();
  const profile = useProfile();
  const recipes = useRecipes();
  const pantry = usePantry();
  const wishes = useWishes();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const state = useExternalStore(store.subscribe, store.load, () => undefined);
  if (!today || profile === undefined || !recipes || !pantry || !wishes || !weekPlans || !mealPlans || state === undefined) return undefined;
  if (!profile) return null;
  const todayIso = toIsoDate(today);
  const day = state && state.date === todayIso ? state : { dismissed: [], index: 0 };
  const ideas = ideasFor({
    date: todayIso,
    recipes,
    pantry,
    wishes,
    neverAgain: profile.neverAgain,
    recent: recentDishes(todayIso, profile, weekPlans, mealPlans, recipes),
    dismissed: day.dismissed,
    filters,
  });
  return { ideas, index: ideas.length ? day.index % ideas.length : 0, profile, recipes, today, todayIso };
}

/**
 * Idee wird "Heute": Eintrag im Plan (als spontan gewählt markiert), ein
 * Wunsch ist damit erfüllt. Gibt Rückgängig zurück.
 */
export function chooseIdea(idea: Idea, profile: HouseholdProfile, today: Date, recipes: Record<string, Recipe>): () => void {
  const weekStart = weekStartFor(today, profile.shoppingDay || "Montag");
  const before = loadMealPlans();
  const wishesBefore = loadWishes();
  const entry: StoredEntry = idea.recipeId
    ? { kind: "recipe", recipeId: idea.recipeId, title: idea.title, category: idea.category ?? "vegetarisch", spontan: true }
    : { kind: "text", title: idea.title, category: idea.category, spontan: true };
  replaceMealPlans(mealPlansWithWeek(before, weekStart, (e) => ({ ...e, [weekdayName(today)]: entry })));
  if (idea.wishId) restoreWishes(wishesBefore.filter((w) => w.id !== idea.wishId));
  if (idea.recipeId) learnFromRecipe(recipes[idea.recipeId], LIKE_WEIGHTS.chosen);
  return () => {
    replaceMealPlans(before);
    restoreWishes(wishesBefore);
  };
}

/** "Für heute" auf die Liste (in die laufende Woche, mit Tag) – gibt Rückgängig zurück */
export function addForToday(names: string[], profile: HouseholdProfile, today: Date): () => void {
  const weekStart = weekStartFor(today, profile.shoppingDay || "Montag");
  const ids = names.map((name) => addManualItem(weekStart, { name, amount: "", section: sectionFor(name), day: weekdayName(today) }));
  return () => removeManualItems(weekStart, ids);
}
