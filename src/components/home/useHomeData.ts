"use client";

import { useRecipes, type Recipe } from "@/lib/cookbook";
import { composeWeek, useMealPlans, type PlanDay, type PlanWeek } from "@/lib/mealPlan";
import { isFirstTime } from "@/lib/ratings";
import type { HouseholdProfile } from "@/lib/profile";
import { useProfile } from "@/lib/useProfile";
import { addDays, toIsoDate, useToday, useWeekPlans, weekStartFor, type WeekPlan } from "@/lib/weekPlan";

export type HomeData = {
  today: Date;
  todayIso: string;
  profile: HouseholdProfile;
  recipes: Record<string, Recipe>;
  weekPlans: Record<string, WeekPlan>;
  week: PlanWeek;
  day: PlanDay | undefined;
  tomorrow: PlanDay | undefined;
  /** Gibt es das heutige Gericht zum ersten Mal? */
  firstTime: boolean;
};

/** Alles für die Startseite (`undefined` = lädt, `null` = kein Profil) */
export function useHomeData(): HomeData | null | undefined {
  const today = useToday();
  const profile = useProfile();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const recipes = useRecipes();
  if (!today || profile === undefined || !weekPlans || !mealPlans || !recipes) return undefined;
  if (!profile) return null;
  const shoppingDay = profile.shoppingDay || "Montag";
  const todayIso = toIsoDate(today);
  const week = composeWeek(weekStartFor(today, shoppingDay), profile, weekPlans, mealPlans, recipes);
  const day = week.days.find((d) => d.date === todayIso);
  const tomorrowIso = addDays(todayIso, 1);
  const tomorrowWeek = week.days.some((d) => d.date === tomorrowIso)
    ? week
    : composeWeek(weekStartFor(new Date(`${tomorrowIso}T12:00:00`), shoppingDay), profile, weekPlans, mealPlans, recipes);
  const tomorrow = tomorrowWeek.days.find((d) => d.date === tomorrowIso);
  const entry = day?.slot.entry;
  const firstTime = Boolean(entry && isFirstTime(entry, todayIso, week, mealPlans, recipes));
  return { today, todayIso, profile, recipes, weekPlans, week, day, tomorrow, firstTime };
}
