"use client";

import { useRecipes } from "@/lib/essen/cookbook";
import { currentTip, tipsForWeeks, useTipStore, type HealthTip } from "@/lib/essen/healthTips";
import { composeWeek, useMealPlans } from "@/lib/essen/mealPlan";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { nextWeekStartFor, toIsoDate, useToday, useWeekPlans, weekStartFor } from "@/lib/essen/weekPlan";

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
