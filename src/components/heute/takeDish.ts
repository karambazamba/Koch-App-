// Ein gezeigtes Gericht nehmen (Essen-Kachel, Beispiel-Tag): für heute bzw.
// nach dem Essen für morgen in den echten Plan – das bisherige rutscht auf den
// nächsten freien Tag (`takeForDay`). Aus der Rezept-Vorschau (`anbieten`)
// bietet „Nehmen“ danach die Zutaten an (Wochenplan-Angebot, A-040/A-046).

import { loadMealPlans, replaceMealPlans } from "@/lib/essen/mealPlan";
import { takeForDay } from "@/lib/essen/spontanTake";
import { showToast } from "@/lib/core/toast";
import type { RecipeCategory } from "@/lib/essen/cookbook";
import type { HomeData } from "@/components/heute/useHomeData";
import { buzz } from "@/components/heute/actions";
import { zutatenAnbieten } from "@/lib/einkauf/angebot/nachNehmen";

/** `anbieten`: nach dem Eintragen die Zutaten anbieten; `needs` = was die Vorschau „auf die Liste“ nannte */
export function takeDish(data: HomeData, dish: { title: string; recipeId?: string; category: RecipeCategory | null }, date: string, options: { anbieten?: boolean; needs?: readonly string[] | null } = {}): boolean {
  const result = takeForDay({ profile: data.profile, weekPlans: data.weekPlans, mealPlans: loadMealPlans(), recipes: data.recipes }, data.today, dish, date, { spontan: data.planStyle === "spontan" });
  if (!result.ok) {
    showToast({ text: result.text });
    return false;
  }
  replaceMealPlans(result.weeks);
  buzz();
  if (options.anbieten) zutatenAnbieten(data, dish.title, date, options.needs ?? null);
  return true;
}
