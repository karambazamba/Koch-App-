"use client";

// Kochtipp im Mia-Chat (selbst geöffnet über die Kochmütze): freie Antworten
// („Ich hab noch Hähnchen, Reis und Paprika“, „was mit Fisch“, „lieber ohne
// Reis“) → EINE Karte; „Anderes“ = neue Karte; „Machen wir“ → heutiges Essen
// (nur heute, der Plan bleibt), vorher kurz „Paprika auf die Einkaufsliste?“.
// Alles andere beendet den Modus (wie Spontan kochen).

import type { Dispatch, SetStateAction } from "react";
import type { PantryItem } from "@/lib/vorrat/pantry";
import type { AssistantData } from "@/lib/begleitung/ops";
import { soonToUse } from "@/lib/essen/dishIdeas";
import { cookCandidates, parseCookWish, pickCookDish, scaleAmount, understood, type CookCard, type CookWish } from "@/lib/essen/kochtipp/pick";
import { formatAmount } from "@/lib/essen/cookbook";
import { recentDishTitles } from "@/lib/essen/kochtipp/recent";
import { loadKochtipp, noteKochtippShown, rememberKochtipp } from "@/lib/essen/kochtipp/store";
import { takeForToday } from "@/lib/essen/spontanTake";
import { loadMealPlans, replaceMealPlans } from "@/lib/essen/mealPlan";
import { addManualItem, sectionFor } from "@/lib/einkauf/shoppingList";
import { DEFAULT_SHOPPING_DAY, planningWeekStart, toIsoDate } from "@/lib/essen/weekPlan";
import { WEEKDAYS } from "@/lib/einstellungen/profile";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import type { ChatState, ChatTurnView } from "@/components/begleitung/chatTypes";

type Options = {
  data: AssistantData | null | undefined;
  today: Date | undefined;
  pantry: PantryItem[] | undefined;
  setChat: Dispatch<SetStateAction<ChatState>>;
  setInput: (text: string) => void;
  onClose: () => void;
};

const NOTHING = "Dafür habe ich gerade nichts. Sollen wir was einkaufen?";

/** Wünsche zusammenführen: Neues gilt, Altes bleibt („lieber ohne Reis“ ändert nur das) */
const merge = (a: CookWish, b: CookWish): CookWish => ({
  source: b.source ?? a.source,
  have: b.have.length ? b.have : a.have,
  without: [...new Set([...a.without, ...b.without])],
  category: b.category ?? a.category,
  quick: b.quick || a.quick,
  persons: b.persons ?? a.persons,
});

export function useKochtippChat({ data, today, pantry, setChat, setInput, onClose }: Options) {
  const household = data ? Math.max(1, data.profile.persons.length || data.profile.adults + data.profile.kids || 2) : 2;

  const card = (wish: CookWish, exclude: string[]): CookCard | null => {
    if (!data || !today) return null;
    const avoid = data.profile.persons.flatMap((p) => [...(p.allergies ?? []), ...(p.dislikes ?? [])]);
    return pickCookDish({
      candidates: cookCandidates(Object.values(data.recipes)),
      stock: pantry ?? [],
      wish,
      soon: soonToUse(pantry ?? [], toIsoDate(today)).map((p) => p.name),
      exclude: [...exclude, ...loadKochtipp().shown, ...recentDishTitles(data, today)],
      avoid,
    });
  };

  /** Neue Karte (oder „nichts gefunden“) an den Chat hängen */
  const answer = (wish: CookWish, exclude: string[], said?: string) => {
    const found = card(wish, exclude);
    if (found) noteKochtippShown(found.title);
    if (wish.source) rememberKochtipp({ source: wish.source, persons: wish.persons, category: wish.category });
    const reply: ChatTurnView = found
      ? { role: "assistant", local: true, text: "", cook: { card: found, persons: wish.persons ?? loadKochtipp().last?.persons ?? household } }
      : { role: "assistant", local: true, text: NOTHING, chips: ["Neu einkaufen"] };
    setChat((c) => ({
      ...c,
      kochtipp: { wish, exclude: found ? [...exclude, found.title] : exclude },
      turns: [...c.turns, ...(said ? [{ role: "user" as const, text: said, local: true }] : []), reply],
    }));
  };

  /** Gesagtes im Kochtipp; false = keine Kochtipp-Antwort (Modus endet) */
  const kochtippInput = (text: string, session: NonNullable<ChatState["kochtipp"]>): boolean => {
    const wish = parseCookWish(text);
    if (!understood(wish)) return false;
    setInput("");
    answer(merge(session.wish, wish), session.exclude, text);
    return true;
  };

  /** „Anderes“: neue Karte, keine Wiederholung */
  const another = (session: NonNullable<ChatState["kochtipp"]>) => answer(session.wish, session.exclude);

  const setPersons = (index: number, persons: number) =>
    setChat((c) => ({ ...c, turns: c.turns.map((t, i) => (i === index && t.cook ? { ...t, cook: { ...t.cook, persons } } : t)) }));

  /** Als heutiges Essen setzen (nur heute) – Chat zu, kurze Meldung */
  const commit = (found: CookCard, persons: number, toList: boolean) => {
    if (!data || !today) return;
    const before = loadMealPlans();
    const result = takeForToday({ profile: data.profile, weekPlans: data.weekPlans, mealPlans: before, recipes: data.recipes }, today, { title: found.title, recipeId: found.recipeId, category: found.category }, { spontan: true });
    if (!result.ok) return showToast({ text: result.text });
    replaceMealPlans(result.weeks);
    if (toList && found.needs.length) {
      const weekStart = planningWeekStart(today, data.profile.shoppingDay || DEFAULT_SHOPPING_DAY).weekStart;
      // Mengen aus dem Rezept auf die Personenzahl umgerechnet
      const recipe = found.recipeId ? data.recipes[found.recipeId] : undefined;
      found.needs.forEach((name) => {
        const ing = recipe?.ingredients.find((i) => i.name === name);
        const amount = ing ? scaleAmount(ing.amount, recipe!.servings, persons) : null;
        addManualItem(weekStart, { name, amount: amount !== null && ing ? `${formatAmount(amount)} ${ing.unit}`.trim() : "", section: sectionFor(name), day: WEEKDAYS[today.getDay()], dish: found.title });
      });
    }
    pushUndo(`„${found.title}“ für heute`, () => replaceMealPlans(before));
    setChat((c) => ({ ...c, kochtipp: null }));
    onClose();
    showToast({ text: `Heute gibt’s ${found.title}`, small: true, seconds: 3 });
  };

  /** „Machen wir“: fehlt etwas, vorher kurz fragen */
  const take = (found: CookCard, persons: number) => {
    const last = loadKochtipp().last;
    if (last) rememberKochtipp({ ...last, persons });
    if (!found.needs.length) return commit(found, persons, false);
    const names = found.needs.slice(0, 3).join(", ");
    setChat((c) => ({
      ...c,
      turns: [
        ...c.turns,
        {
          role: "assistant",
          local: true,
          text: `${names} auf die Einkaufsliste?`,
          choices: [
            { label: "Ja", onClick: () => commit(found, persons, true) },
            { label: "Hab ich", onClick: () => commit(found, persons, false) },
          ],
        },
      ],
    }));
  };

  return { kochtippInput, another, setPersons, take };
}

export type KochtippChat = ReturnType<typeof useKochtippChat>;
