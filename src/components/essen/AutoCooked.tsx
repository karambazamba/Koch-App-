"use client";

import { useEffect } from "react";
import { useMinutes } from "@/lib/core/now";
import { useRecipes } from "@/lib/essen/cookbook";
import { cookableEntry, markCooked, mealIsOver, useCookedDays } from "@/lib/essen/mealDone";
import { composeWeek, useMealPlans } from "@/lib/essen/mealPlan";
import { effectivePlanStyle } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { addDays, toIsoDate, useToday, useWeekPlans, weekStartFor } from "@/lib/essen/weekPlan";

/**
 * Nach dem Essen zählt das Gericht von selbst als gekocht – ohne Nachfrage
 * (siehe lib/essen/mealDone.ts). Auch für gestern, falls die App abends zu war.
 * Nicht bei Pause/Ausflug, nicht beim lockeren Wochenende (da ist das Essen
 * nur eine Idee) und bei "spontan" nur, was aus den Ideen gewählt wurde.
 */
export function AutoCooked() {
  const today = useToday();
  const minutes = useMinutes();
  const profile = useProfile();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const recipes = useRecipes();
  const cooked = useCookedDays();

  useEffect(() => {
    if (!today || minutes === undefined || !profile || !weekPlans || !mealPlans || !recipes || !cooked) return;
    const shoppingDay = profile.shoppingDay || "Montag";
    const todayIso = toIsoDate(today);
    for (const date of [addDays(todayIso, -1), todayIso]) {
      if (cooked[date]) continue;
      const weekStart = weekStartFor(new Date(`${date}T12:00:00`), shoppingDay);
      const day = composeWeek(weekStart, profile, weekPlans, mealPlans, recipes).days.find((d) => d.date === date);
      const entry = cookableEntry(day);
      if (!day || !entry || day.weekend) continue;
      if (date === todayIso && !mealIsOver(day, profile, minutes, cooked)) continue;
      const stored = entry.stored;
      const spontanChoice = (stored.kind === "recipe" || stored.kind === "text") && stored.spontan;
      if (effectivePlanStyle(profile, weekStart) === "spontan" && !spontanChoice) continue;
      markCooked(date, entry, recipes);
    }
  }, [today, minutes, profile, weekPlans, mealPlans, recipes, cooked]);

  return null;
}
