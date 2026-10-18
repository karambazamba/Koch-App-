"use client";

import { useRecipes } from "@/lib/cookbook";
import { storedForWeek, useMealPlans } from "@/lib/mealPlan";
import { effectivePlanStyle } from "@/lib/profile";
import { ratingCandidate, useRatings, type RatingCandidate } from "@/lib/ratings";
import { useExternalStore } from "@/lib/useExternalStore";
import { useProfile } from "@/lib/useProfile";
import { isPaused, useNudges } from "@/lib/nudges";
import { toIsoDate, useToday, useWeekPlans, weekStartFor } from "@/lib/weekPlan";

/** Jede halbe Minute neu nachsehen (z. B. damit das Gericht nach dem Essen von selbst verschwindet) */
const everyHalfMinute = (onChange: () => void) => {
  const timer = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(timer);
};

/** Minuten seit Mitternacht (im Browser, läuft mit) */
export function useMinutes(): number | undefined {
  return useExternalStore(everyHalfMinute, () => new Date().getHours() * 60 + new Date().getMinutes(), () => undefined);
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
  const candidate = ratingCandidate(now, profile, weekPlans, mealPlans, recipes, rated);
  // Spontan: der ausgeblendete Plan zählt nicht – nur, was aus den Ideen gewählt wurde
  if (candidate && effectivePlanStyle(profile, weekStartFor(today, profile.shoppingDay || "Montag")) === "spontan") {
    const stored = storedForWeek(mealPlans, weekStartFor(new Date(`${candidate.date}T12:00:00`), profile.shoppingDay || "Montag"))[candidate.weekday];
    if (!stored || !(stored.kind === "recipe" || stored.kind === "text") || !stored.spontan) return null;
  }
  return candidate;
}
