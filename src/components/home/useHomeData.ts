"use client";

import { useRecipes, type Recipe } from "@/lib/cookbook";
import { composeWeek, useMealPlans, type PlanDay, type PlanWeek } from "@/lib/mealPlan";
import { effectivePlanStyle, type HouseholdProfile, type PlanStyle } from "@/lib/profile";
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
  /** Planstil, der heute gilt ("spontan" = Planung ausgeblendet) */
  planStyle: PlanStyle;
};

/** Gilt ein Eintrag als "spontan gewählt" (aus den Ideen)? */
export const isSpontanEntry = (day: PlanDay | undefined) => {
  const stored = day?.slot.entry?.stored;
  return Boolean(stored && (stored.kind === "recipe" || stored.kind === "text") && stored.spontan);
};

/**
 * Spontan: der (ausgeblendete) Plan zählt nicht – nur, was heute aus den
 * Ideen gewählt wurde. Ausflug, Reste, Cheat Day und Wochenend-Stil gibt es
 * dann nicht.
 */
function withoutPlan(day: PlanDay | undefined): PlanDay | undefined {
  if (!day) return day;
  return {
    ...day,
    away: false,
    cheat: false,
    leftovers: null,
    weekend: null,
    slot: isSpontanEntry(day) ? day.slot : { ...day.slot, entry: null },
  };
}

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
  const planStyle = effectivePlanStyle(profile, week.weekStart);
  if (planStyle === "spontan") return { today, todayIso, profile, recipes, weekPlans, week, day: withoutPlan(day), tomorrow: withoutPlan(tomorrow), planStyle };
  return { today, todayIso, profile, recipes, weekPlans, week, day, tomorrow, planStyle };
}
