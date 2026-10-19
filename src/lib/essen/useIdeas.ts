"use client";

// Ideen für heute (Startseite und /ideen): Zustand des Tages (weggewischt,
// welche gerade dran ist), Auswahl → "Heute", Einkauf "Für heute".

import { useRecipes } from "./cookbook";
import { ideasFor, recentDishes, type Idea, type IdeaFilter } from "./ideas";
import { LIKE_WEIGHTS, learnFromRecipe } from "./likes";
import { createLocalStore } from "../core/localStore";
import { loadMealPlans, replaceMealPlans, mealPlansWithWeek, useMealPlans, type StoredEntry } from "./mealPlan";
import { stockKey, stockNearlyEmpty } from "./dishIdeas";
import { useStock } from "./useStock";
import type { HouseholdProfile } from "../einstellungen/profile";
import { addManualItem, removeManualItems, sectionFor } from "../einkauf/shoppingList";
import { useExternalStore } from "../core/useExternalStore";
import { useProfile } from "../einstellungen/useProfile";
import { toIsoDate, useToday, useWeekPlans, weekStartFor, weekdayName } from "./weekPlan";
import { loadWishes, restoreWishes, useWishes } from "./wishes";
import type { Recipe } from "./cookbook";

/** `key`: Bestand, zu dem `index` gehört – ändert sich der Bestand, beginnt es wieder vorn */
type IdeaDay = { version: 1; date: string; dismissed: string[]; index: number; key?: string };

function migrate(raw: unknown): IdeaDay | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<IdeaDay>;
  if (d.version !== 1 || typeof d.date !== "string") return null;
  return {
    version: 1,
    date: d.date,
    dismissed: Array.isArray(d.dismissed) ? d.dismissed.filter((x) => typeof x === "string") : [],
    index: Number(d.index) || 0,
    key: typeof d.key === "string" ? d.key : undefined,
  };
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

export type TodayIdeas = {
  ideas: Idea[];
  index: number;
  profile: HouseholdProfile;
  recipes: Record<string, Recipe>;
  today: Date;
  todayIso: string;
  /** Kennung des Bestands (für nextIdea) */
  stockKey: string;
  /** Vorrat leer oder fast leer → Hinweis "Sag mir, was da ist …" */
  nearlyEmpty: boolean;
};

/** Ideen für heute (`undefined` = lädt, `null` = kein Profil) */
export function useTodayIdeas(filters: IdeaFilter[] = [], opts: { tomorrow?: boolean } = {}): TodayIdeas | null | undefined {
  const now = useToday();
  // Nach dem Essen: Ideen für morgen ("Was gibt's morgen?")
  const today = now && opts.tomorrow ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12) : now;
  const profile = useProfile();
  const recipes = useRecipes();
  // Immer der aktuelle Bestand (Vorrat + Gekauftes) – Ideen rechnen sich bei jeder Änderung neu
  const pantry = useStock();
  const wishes = useWishes();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const state = useExternalStore(store.subscribe, store.load, () => undefined);
  if (!today || profile === undefined || !recipes || !pantry || !wishes || !weekPlans || !mealPlans || state === undefined) return undefined;
  if (!profile) return null;
  const todayIso = toIsoDate(today);
  const key = stockKey(pantry);
  // Bestand geändert → die gemerkte Position gilt nicht mehr, es beginnt bei der besten Idee
  const day = state && state.date === todayIso ? { ...state, index: state.key === key ? state.index : 0 } : { dismissed: [], index: 0 };
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
  return { ideas, index: ideas.length ? day.index % ideas.length : 0, profile, recipes, today, todayIso, stockKey: key, nearlyEmpty: stockNearlyEmpty(pantry) };
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
