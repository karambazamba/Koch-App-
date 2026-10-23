"use client";

// Im Supermarkt (Chat-Karte): "Auf die Liste" legt Produkt und Fehlendes
// unter "Jetzt mitnehmen", "Statt <Tag> einplanen" tauscht das Gericht –
// beides mit Rückgängig.

import type { Dispatch, SetStateAction } from "react";
import { noteUserAction } from "@/lib/core/activity";
import { addManualItem, removeManualItems, sectionFor } from "@/lib/einkauf/shoppingList";
import type { MarketIdea } from "@/lib/essen/market";
import { replaceMealPlans } from "@/lib/essen/mealPlan";
import { takeForDay } from "@/lib/essen/spontanTake";
import { learnFromRecipe, LIKE_WEIGHTS } from "@/lib/essen/likes";
import { DEFAULT_SHOPPING_DAY, planningWeekStart, toIsoDate } from "@/lib/essen/weekPlan";
import type { AssistantData } from "@/lib/begleitung/ops";
import type { ChatState } from "@/components/begleitung/chatTypes";
import type { MarketTarget } from "@/components/begleitung/MarketBoard";

type Options = {
  data: AssistantData | null | undefined;
  today: Date | undefined;
  spontanStyle: boolean;
  setChat: Dispatch<SetStateAction<ChatState>>;
};

/** Knöpfe der Supermarkt-Karte */
export function useMarketChat({ data, today, spontanStyle, setChat }: Options) {
  /** "Auf die Liste": Produkt und was fehlt → "Jetzt mitnehmen" (mit Rückgängig) */
  const addMarketItems = (product: string, idea: MarketIdea) => {
    if (!data || !today) return;
    const weekStart = planningWeekStart(today, data.profile.shoppingDay || DEFAULT_SHOPPING_DAY).weekStart;
    const names = [product, ...idea.needs];
    const ids = names.map((n) => addManualItem(weekStart, { name: n, amount: "", section: sectionFor(n), now: true }));
    noteUserAction(toIsoDate(today));
    setChat((c) => ({
      ...c,
      turns: [
        ...c.turns,
        {
          role: "assistant",
          local: true,
          text: `Steht oben unter „Jetzt mitnehmen“ ✓ ${names.join(", ")}`,
          undo: () => {
            removeManualItems(weekStart, ids);
            setChat((x) => ({ ...x, turns: [...x.turns, { role: "assistant", text: "Rückgängig. Wieder runter von der Liste.", local: true }] }));
          },
        },
      ],
    }));
  };

  /** "Statt <Tag> einplanen": Idee auf den Tag, das bisherige Gericht rutscht weiter */
  const planMarketIdea = (idea: MarketIdea, target: MarketTarget) => {
    if (!data || !today) return;
    const before = data.mealPlans;
    const result = takeForDay(data, today, idea, target.date, { spontan: spontanStyle });
    if (result.ok) {
      replaceMealPlans(result.weeks);
      if (idea.recipeId) learnFromRecipe(data.recipes[idea.recipeId], LIKE_WEIGHTS.chosen);
    }
    noteUserAction(toIsoDate(today));
    setChat((c) => ({
      ...c,
      turns: [
        ...c.turns,
        {
          role: "assistant",
          local: true,
          text: result.text,
          undo: result.ok
            ? () => {
                replaceMealPlans(before);
                setChat((x) => ({ ...x, turns: [...x.turns, { role: "assistant", text: "Rückgängig. Alles wie vorher.", local: true }] }));
              }
            : undefined,
        },
      ],
    }));
  };

  return { addMarketItems, planMarketIdea };
}
