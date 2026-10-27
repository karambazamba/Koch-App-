// Ein gezeigtes Gericht nehmen (Essen-Kachel, Beispiel-Tag): für heute bzw.
// nach dem Essen für morgen in den echten Plan – das bisherige rutscht auf den
// nächsten freien Tag (`takeForDay`).

import { loadMealPlans, replaceMealPlans } from "@/lib/essen/mealPlan";
import { takeForDay } from "@/lib/essen/spontanTake";
import { showToast } from "@/lib/core/toast";
import type { RecipeCategory } from "@/lib/essen/cookbook";
import type { HomeData } from "@/components/heute/useHomeData";
import { buzz } from "@/components/heute/actions";

export function takeDish(data: HomeData, dish: { title: string; recipeId?: string; category: RecipeCategory | null }, date: string): boolean {
  const result = takeForDay({ profile: data.profile, weekPlans: data.weekPlans, mealPlans: loadMealPlans(), recipes: data.recipes }, data.today, dish, date, { spontan: data.planStyle === "spontan" });
  if (!result.ok) {
    showToast({ text: result.text });
    return false;
  }
  replaceMealPlans(result.weeks);
  buzz();
  return true;
}
