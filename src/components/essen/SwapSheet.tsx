"use client";

// Das eine „Was koche ich?“-Fenster: Gericht eines Tages tauschen bzw. für
// einen freien Tag aussuchen – 3 Ideen, Mia fragen oder Tag freimachen. Alle
// Wege (Essen-Seite, Wochenreihe, Heute-Kachel) öffnen dieses Fenster.

import { Sheet } from "@/components/ui/Sheet";
import { CARD, buttonClass } from "@/components/ui/styles";
import { DishPicture } from "@/components/essen/DishPicture";
import { weekdayLong } from "@/lib/kalender/model";
import { showDeleted, showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { helperName } from "@/lib/einstellungen/profile";
import { dishTone } from "@/lib/essen/dishLook";
import { entriesWithoutSlot, loadMealPlans, mealPlansWithWeek, replaceMealPlans, type PlanDay } from "@/lib/essen/mealPlan";
import { takeForDay } from "@/lib/essen/spontanTake";
import { useTodayIdeas } from "@/lib/essen/useIdeas";
import { weekStartFor } from "@/lib/essen/weekPlan";
import { openHelper } from "@/lib/begleitung/open";
import type { HomeData } from "@/components/heute/useHomeData";
import { dishOf } from "@/components/essen/useMeals";

/** Was das Fenster braucht – die Startseite gibt HomeData, der Wochenplan baut es selbst */
export type SwapContext = Pick<HomeData, "today" | "todayIso" | "profile" | "recipes" | "weekPlans" | "planStyle">;

export function SwapSheet({ data, day, onClose }: { data: SwapContext; day: PlanDay; onClose: () => void }) {
  const ideas = useTodayIdeas();
  const current = dishOf(day);
  const label = day.date === data.todayIso ? "heute" : `am ${weekdayLong(day.date)}`;
  const choose = (idea: { title: string; recipeId?: string; category: PlanDay["slot"]["hint"] }) => {
    const before = loadMealPlans();
    const result = takeForDay({ profile: data.profile, weekPlans: data.weekPlans, mealPlans: before, recipes: data.recipes }, data.today, idea, day.date, { spontan: data.planStyle === "spontan" });
    onClose();
    if (!result.ok) return showToast({ text: result.text });
    replaceMealPlans(result.weeks);
    pushUndo(result.text, () => replaceMealPlans(before));
  };
  const clear = () => {
    const before = loadMealPlans();
    const weekStart = weekStartFor(new Date(`${day.date}T12:00:00`), data.profile.shoppingDay || "Montag");
    replaceMealPlans(mealPlansWithWeek(before, weekStart, (e) => entriesWithoutSlot(e, day.slot)));
    onClose();
    showDeleted(pushUndo(`das Freimachen von ${label}`, () => replaceMealPlans(before)), "Freigemacht");
  };
  return (
    <Sheet title={current ? `Statt ${current}` : `Was gibt’s ${label}?`} onClose={onClose}>
      <div className="flex flex-col gap-2 pb-2">
        {(ideas?.ideas ?? [])
          .filter((i) => i.title !== current)
          .slice(0, 3)
          .map((idea) => (
            <button key={idea.id} type="button" onClick={() => choose(idea)} className={`${CARD} flex items-center gap-3 p-3 text-left active:scale-[0.99]`}>
              <DishPicture title={idea.title} category={idea.category} tone={dishTone(idea.title, idea.category)} alt="" small className="h-12 w-12 shrink-0 rounded-full" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold">{idea.title}</span>
                <span className="block truncate text-sm text-muted">{[idea.minutes ? `${idea.minutes} Min` : "", idea.reason].filter(Boolean).join(" · ")}</span>
              </span>
              <span className={buttonClass("soft", "sm")}>Nehmen</span>
            </button>
          ))}
        <button type="button" onClick={() => (onClose(), openHelper(undefined, `Was könnten wir ${label} essen?`))} className={buttonClass("secondary")}>
          {helperName(data.profile)} fragen
        </button>
        {current && (
          <button type="button" onClick={clear} className={buttonClass("ghost")}>
            Tag freimachen
          </button>
        )}
      </div>
    </Sheet>
  );
}
