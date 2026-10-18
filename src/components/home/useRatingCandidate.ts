"use client";

import { useRecipes } from "@/lib/cookbook";
import { useMealPlans } from "@/lib/mealPlan";
import { ratingCandidate, useRatings, type RatingCandidate } from "@/lib/ratings";
import { useExternalStore } from "@/lib/useExternalStore";
import { useProfile } from "@/lib/useProfile";
import { useToday, useWeekPlans } from "@/lib/weekPlan";

const noop = () => () => {};

/** Aktuelle Stunde (im Browser), ändert sich höchstens stündlich */
function useHour(): number | undefined {
  return useExternalStore(noop, () => new Date().getHours(), () => undefined);
}

/** Gekochtes Gericht, nach dem gefragt werden soll ("Wie war …?") */
export function useRatingCandidate(): RatingCandidate | null | undefined {
  const today = useToday();
  const hour = useHour();
  const profile = useProfile();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const recipes = useRecipes();
  const rated = useRatings();
  if (!today || hour === undefined || profile === undefined || !weekPlans || !mealPlans || !recipes || !rated) return undefined;
  if (!profile) return null;
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour);
  return ratingCandidate(now, profile, weekPlans, mealPlans, recipes, rated);
}
