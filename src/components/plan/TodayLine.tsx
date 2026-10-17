"use client";

import { useRecipes } from "@/lib/cookbook";
import { buildWeek, storedForWeek, useMealPlans } from "@/lib/mealPlan";
import { useProfile } from "@/lib/useProfile";
import { currentMonday, useToday, useWeekPlans, weekdayName } from "@/lib/weekPlan";

/** In der Wochenplan-Kachel: "Heute: Gulasch" – sonst der normale Text. */
export function TodayLine({ fallback }: { fallback: string }) {
  const today = useToday();
  const profile = useProfile();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const recipes = useRecipes();

  if (!today || profile === undefined || !weekPlans || !mealPlans || !recipes) return <>{fallback}</>;

  const weekStart = currentMonday(today);
  const week = buildWeek(weekStart, profile, weekPlans[weekStart] ?? null, storedForWeek(mealPlans, weekStart), recipes);
  const day = week.days.find((d) => d.weekday === weekdayName(today));
  if (!day) return <>{fallback}</>;
  if (day.away) return <>Heute: Ausflug 🚗</>;
  const titles = day.slots.flatMap((s) => (s.entry ? [s.entry.title] : []));
  return <>{titles.length > 0 ? `Heute: ${titles.join(" · ")}` : fallback}</>;
}
