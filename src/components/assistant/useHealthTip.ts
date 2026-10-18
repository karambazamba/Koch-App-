"use client";

import { useRecipes } from "@/lib/cookbook";
import { currentTip, tipsForWeeks, useTipStore, weekPraise, type HealthTip } from "@/lib/healthTips";
import { composeWeek, useMealPlans } from "@/lib/mealPlan";
import { useProfile } from "@/lib/useProfile";
import { addDays, nextWeekStartFor, toIsoDate, useToday, useWeekPlans, weekStartFor } from "@/lib/weekPlan";

/** Gesundheits-Tipp, der gerade dran ist (laut Einstellung und Wochenlimit) */
export function useHealthTip(): { tip: HealthTip; weekStart: string } | null {
  const today = useToday();
  const profile = useProfile();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const recipes = useRecipes();
  const store = useTipStore();
  if (!today || !profile || !weekPlans || !mealPlans || !recipes || !store || profile.healthTips === "aus") return null;
  const shoppingDay = profile.shoppingDay || "Montag";
  const weekStart = weekStartFor(today, shoppingDay);
  const weeks = [weekStart, nextWeekStartFor(today, shoppingDay)].map((w) => composeWeek(w, profile, weekPlans, mealPlans, recipes));
  const tips = tipsForWeeks(weeks, toIsoDate(today), recipes, profile.persons);
  const tip = currentTip(profile.healthTips, weekStart, tips, store);
  return tip ? { tip, weekStart } : null;
}

/** Lob zum Wochenrückblick – an den letzten beiden Tagen der Planungswoche */
export function useWeekPraise(): string | null {
  const today = useToday();
  const profile = useProfile();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const recipes = useRecipes();
  if (!today || !profile || !weekPlans || !mealPlans || !recipes || profile.healthTips === "aus") return null;
  const weekStart = weekStartFor(today, profile.shoppingDay || "Montag");
  if (toIsoDate(today) < addDays(weekStart, 5)) return null;
  return weekPraise(composeWeek(weekStart, profile, weekPlans, mealPlans, recipes));
}
