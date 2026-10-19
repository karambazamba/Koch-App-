"use client";

import { useRecipes } from "@/lib/essen/cookbook";
import { storedForWeek, useMealPlans } from "@/lib/essen/mealPlan";
import { effectivePlanStyle } from "@/lib/einstellungen/profile";
import { ratingCandidate, useRatings, type RatingCandidate } from "@/lib/essen/ratings";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { isPaused, useNudges } from "@/lib/core/nudges";
import { toIsoDate, useToday, useWeekPlans, weekStartFor } from "@/lib/essen/weekPlan";

import { useMinutes } from "@/lib/core/now";
export { useMinutes };

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
  const candidate = ratingCandidate(now, profile, weekPlans, mealPlans, recipes, rated);
  // Spontan: der ausgeblendete Plan zählt nicht – nur, was aus den Ideen gewählt wurde
  if (candidate && effectivePlanStyle(profile, weekStartFor(today, profile.shoppingDay || "Montag")) === "spontan") {
    const stored = storedForWeek(mealPlans, weekStartFor(new Date(`${candidate.date}T12:00:00`), profile.shoppingDay || "Montag"))[candidate.weekday];
    if (!stored || !(stored.kind === "recipe" || stored.kind === "text") || !stored.spontan) return null;
  }
  return candidate;
}
