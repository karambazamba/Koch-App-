"use client";

import { useRecipes } from "../essen/cookbook";
import { composeWeek, useMealPlans } from "../essen/mealPlan";
import { buildShoppingList, useShoppingLists, useShoppingSettings, type ShoppingList, type ShoppingSettings, type WeekList } from "./shoppingList";
import { isSmallHousehold, planningVisible } from "../einstellungen/profile";
import { useProfile } from "../einstellungen/useProfile";
import {
  DEFAULT_SHOPPING_DAY,
  nextWeekStartFor,
  planningWeekStart,
  useToday,
  useWeekPlans,
  weekStartFor,
} from "../essen/weekPlan";

export type WeekChoice = "planning" | "current" | "next";

/**
 * Einkaufsliste einer Planungswoche, berechnet aus dem Wochenplan.
 * "planning" = die Woche, für die gerade eingekauft wird (ab 2 Tage vor dem
 * Einkaufstag die nächste). `undefined`, solange noch geladen wird.
 */
export function useWeekShoppingList(
  choice: WeekChoice,
): { weekStart: string; isNext: boolean; list: ShoppingList; weekList: WeekList | undefined; settings: ShoppingSettings; planning: boolean } | undefined {
  const today = useToday();
  const profile = useProfile();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const recipes = useRecipes();
  const lists = useShoppingLists();
  const settings = useShoppingSettings();

  if (!today || profile === undefined || !weekPlans || !mealPlans || !recipes || !lists || !settings) return undefined;

  const shoppingDay = profile?.shoppingDay ?? DEFAULT_SHOPPING_DAY;
  const current = weekStartFor(today, shoppingDay);
  // Spontan: immer die laufende Woche, ohne Artikel aus dem (ausgeblendeten) Plan
  const planning = planningVisible(profile, current);
  const weekStart = !planning
    ? current
    : choice === "current"
      ? current
      : choice === "next"
        ? nextWeekStartFor(today, shoppingDay)
        : planningWeekStart(today, shoppingDay).weekStart;
  const week = composeWeek(weekStart, profile, weekPlans, mealPlans, recipes);
  return {
    weekStart,
    isNext: weekStart !== current,
    list: buildShoppingList(week, recipes, lists[weekStart], settings, { small: profile ? isSmallHousehold(profile) : false, manualOnly: !planning }),
    planning,
    weekList: lists[weekStart],
    settings,
  };
}
