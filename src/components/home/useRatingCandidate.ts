"use client";

import { useRecipes } from "@/lib/cookbook";
import { useMealPlans } from "@/lib/mealPlan";
import { ratingCandidate, useRatings, type RatingCandidate } from "@/lib/ratings";
import { useExternalStore } from "@/lib/useExternalStore";
import { useProfile } from "@/lib/useProfile";
import { isPaused, useNudges } from "@/lib/nudges";
import { toIsoDate, useToday, useWeekPlans } from "@/lib/weekPlan";

const noop = () => () => {};

/** Minuten seit Mitternacht (im Browser) */
export function useMinutes(): number | undefined {
  return useExternalStore(noop, () => new Date().getHours() * 60 + new Date().getMinutes(), () => undefined);
}

/** Gekochtes Gericht, nach dem gefragt werden soll ("Wie war …?") */
export function useRatingCandidate(): RatingCandidate | null | undefined {
  const today = useToday();
  const minutes = useMinutes();
  const nudges = useNudges();
  const profile = useProfile();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const recipes = useRecipes();
  const rated = useRatings();
  if (!today || minutes === undefined || profile === undefined || !weekPlans || !mealPlans || !recipes || !rated || !nudges) return undefined;
  if (!profile) return null;
  // Nach 3 ignorierten Fragen in Folge 2 Wochen Pause
  if (isPaused(nudges, "bewertung", toIsoDate(today))) return null;
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate(), Math.floor(minutes / 60), minutes % 60);
  return ratingCandidate(now, profile, weekPlans, mealPlans, recipes, rated);
}
