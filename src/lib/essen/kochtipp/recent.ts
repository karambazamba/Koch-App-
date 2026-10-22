// Gerichte der letzten Tage (für „keine Gerichte der letzten 3 Tage“).

import type { Recipe } from "@/lib/essen/cookbook";
import type { HouseholdProfile } from "@/lib/einstellungen/profile";
import { composeWeek, type StoredEntry } from "@/lib/essen/mealPlan";
import { DEFAULT_SHOPPING_DAY, weekStartFor, type WeekPlan } from "@/lib/essen/weekPlan";

type Data = { profile: HouseholdProfile; weekPlans: Record<string, WeekPlan>; mealPlans: Record<string, Record<string, StoredEntry>>; recipes: Record<string, Recipe> };

export function recentDishTitles(data: Data, today: Date, days = 3): string[] {
  const shoppingDay = data.profile.shoppingDay || DEFAULT_SHOPPING_DAY;
  const titles: string[] = [];
  for (let i = 1; i <= days; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i, 12);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const day = composeWeek(weekStartFor(d, shoppingDay), data.profile, data.weekPlans, data.mealPlans, data.recipes).days.find((x) => x.date === iso);
    const title = day?.slot.entry?.title;
    if (title) titles.push(title);
  }
  return titles;
}
