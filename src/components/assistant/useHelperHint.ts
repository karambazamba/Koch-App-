"use client";

// Kurzer aktueller Hinweis des Küchenhelfers für die Sprechblase auf der
// Startseite, z. B. "Lotte: Für morgen fehlt Sahne". Ohne Anlass: "Frag Lotte".

import { useRatingCandidate } from "@/components/home/useRatingCandidate";
import { useRecipes } from "@/lib/cookbook";
import { composeWeek, useMealPlans } from "@/lib/mealPlan";
import { helperMessage, helperName } from "@/lib/profile";
import { useProfile } from "@/lib/useProfile";
import { useWeekShoppingList } from "@/lib/useWeekShoppingList";
import { DEFAULT_SHOPPING_DAY, addDays, toIsoDate, useToday, useWeekPlans, weekStartFor } from "@/lib/weekPlan";

function listNames(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} und ${names[1]}`;
  return `${names[0]}, ${names[1]} und ${names.length - 2} weitere`;
}

export function useHelperHint(): string | null {
  const today = useToday();
  const profile = useProfile();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const recipes = useRecipes();
  const current = useWeekShoppingList("current");
  const next = useWeekShoppingList("next");
  const rating = useRatingCandidate();
  if (!today || profile === undefined || !weekPlans || !mealPlans || !recipes || !current || !next) return null;
  if (profile === null) return null;

  // Nach dem Kochen zuerst nach der Bewertung fragen
  if (rating) return helperMessage(profile, `Wie war ${rating.title}?`);

  const shoppingDay = profile.shoppingDay ?? DEFAULT_SHOPPING_DAY;
  const todayIso = toIsoDate(today);
  const tomorrowIso = addDays(todayIso, 1);
  const dayOf = (iso: string) => {
    const date = new Date(`${iso}T12:00:00`);
    const week = composeWeek(weekStartFor(date, shoppingDay), profile, weekPlans, mealPlans, recipes);
    return { week, day: week.days.find((d) => d.date === iso) };
  };

  // Für morgen fehlt etwas auf der Einkaufsliste?
  const tomorrow = dayOf(tomorrowIso);
  const entry = tomorrow.day && !tomorrow.day.away ? tomorrow.day.slot.entry : null;
  if (entry) {
    const short = tomorrow.day!.weekday.slice(0, 2);
    const label = `${entry.title} (${short})`;
    const list = tomorrow.week.weekStart === current.weekStart ? current.list : next.weekStart === tomorrow.week.weekStart ? next.list : null;
    const missing = (list?.items ?? [])
      .filter((i) => !i.checked && !i.hidden && i.dishes.some((d) => d.startsWith(label)))
      .map((i) => i.name);
    if (missing.length > 0) {
      return helperMessage(profile, `Für morgen ${missing.length === 1 ? "fehlt" : "fehlen"} ${listNames(missing)}`);
    }
  }

  // Heute noch nichts geplant?
  const todayDay = dayOf(todayIso).day;
  if (todayDay && !todayDay.away && !todayDay.slot.entry) {
    return helperMessage(profile, "Heute ist noch nichts geplant – soll ich was vorschlagen?");
  }

  return `Frag ${helperName(profile)}`;
}
