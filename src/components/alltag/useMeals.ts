"use client";

// Essen je Tag für Heute, Woche und Essen – aus dem bestehenden Wochenplan.
// Bei "Ich koche spontan" zählt nur, was aus den Ideen gewählt wurde.

import { useRecipes } from "@/lib/essen/cookbook";
import { composeWeek, useMealPlans, type PlanDay, type PlanWeek } from "@/lib/essen/mealPlan";
import { effectivePlanStyle } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { addDays, useWeekPlans, weekStartFor } from "@/lib/essen/weekPlan";
import { isSpontanEntry } from "@/components/home/useHomeData";

/** Gerichte ab `from` für `days` Tage (Datum → Tag des Wochenplans); `undefined` = lädt */
export function useMeals(from: string | undefined, days: number): Map<string, PlanDay> | undefined {
  const profile = useProfile();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const recipes = useRecipes();
  if (!from || profile === undefined || !weekPlans || !mealPlans || !recipes) return undefined;
  const result = new Map<string, PlanDay>();
  if (!profile) return result;
  const shoppingDay = profile.shoppingDay || "Montag";
  const weeks = new Map<string, PlanWeek>();
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const start = weekStartFor(new Date(`${date}T12:00:00`), shoppingDay);
    let week = weeks.get(start);
    if (!week) {
      week = composeWeek(start, profile, weekPlans, mealPlans, recipes);
      weeks.set(start, week);
    }
    const day = week.days.find((d) => d.date === date);
    if (!day) continue;
    const spontan = effectivePlanStyle(profile, start) === "spontan";
    result.set(date, spontan ? { ...day, away: false, leftovers: null, weekend: null, slot: isSpontanEntry(day) ? day.slot : { ...day.slot, entry: null } } : day);
  }
  return result;
}

/** Titel des Gerichts an einem Tag (oder null) */
export const dishOf = (day: PlanDay | undefined) => (day && !day.away ? (day.slot.entry?.title ?? null) : null);
