"use client";

import { useRecipes } from "@/lib/cookbook";
import { buildWeek, storedForWeek, useMealPlans } from "@/lib/mealPlan";
import { useProfile } from "@/lib/useProfile";
import {
  DEFAULT_SHOPPING_DAY,
  planForWeek,
  toIsoDate,
  useToday,
  useWeekPlans,
  weekStartFor,
} from "@/lib/weekPlan";

const FALLBACK = "Eure Woche auf einen Blick";

/**
 * Untertitel der Wochenplan-Kachel: "Heute: <Gericht>" bzw. "Heute: Ausflug",
 * sonst "Diese Woche: X von Y geplant", sonst "Eure Woche auf einen Blick".
 */
export function TodayLine() {
  const today = useToday();
  const profile = useProfile();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const recipes = useRecipes();

  if (!today || profile === undefined || !weekPlans || !mealPlans || !recipes) return <>{FALLBACK}</>;

  const weekStart = weekStartFor(today, profile?.shoppingDay ?? DEFAULT_SHOPPING_DAY);
  const week = buildWeek(
    weekStart,
    profile,
    planForWeek(weekPlans, weekStart),
    storedForWeek(mealPlans, weekStart),
    recipes,
  );
  const day = week.days.find((d) => d.date === toIsoDate(today));
  if (day?.away) return <>Heute: Ausflug</>;
  const titles = day?.slots.flatMap((s) => (s.entry ? [s.entry.title] : [])) ?? [];
  if (titles.length > 0) return <>Heute: {titles.join(" · ")}</>;
  if (week.planned > 0) {
    return (
      <>
        Diese Woche: {week.planned} von {week.total} geplant
      </>
    );
  }
  return <>{FALLBACK}</>;
}
