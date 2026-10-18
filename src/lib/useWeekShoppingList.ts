"use client";

import { useRecipes } from "./cookbook";
import { composeWeek, useMealPlans } from "./mealPlan";
import { buildShoppingList, useShoppingBasics, useShoppingLists, type ShoppingList } from "./shoppingList";
import { useProfile } from "./useProfile";
import {
  DEFAULT_SHOPPING_DAY,
  nextWeekStartFor,
  planningWeekStart,
  useToday,
  useWeekPlans,
  weekStartFor,
} from "./weekPlan";

export type WeekChoice = "planning" | "current" | "next";

/**
 * Einkaufsliste einer Planungswoche, berechnet aus dem Wochenplan.
 * "planning" = die Woche, für die gerade eingekauft wird (ab 2 Tage vor dem
 * Einkaufstag die nächste). `undefined`, solange noch geladen wird.
 */
export function useWeekShoppingList(
  choice: WeekChoice,
): { weekStart: string; isNext: boolean; list: ShoppingList } | undefined {
  const today = useToday();
  const profile = useProfile();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const recipes = useRecipes();
  const lists = useShoppingLists();
  const basics = useShoppingBasics();

  if (!today || profile === undefined || !weekPlans || !mealPlans || !recipes || !lists || !basics) return undefined;

  const shoppingDay = profile?.shoppingDay ?? DEFAULT_SHOPPING_DAY;
  const current = weekStartFor(today, shoppingDay);
  const weekStart =
    choice === "current"
      ? current
      : choice === "next"
        ? nextWeekStartFor(today, shoppingDay)
        : planningWeekStart(today, shoppingDay).weekStart;
  const week = composeWeek(weekStart, profile, weekPlans, mealPlans, recipes);
  return {
    weekStart,
    isNext: weekStart !== current,
    list: buildShoppingList(week, recipes, lists[weekStart], basics),
  };
}
