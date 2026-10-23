"use client";

// Kochidee auf der Bühne (Tafel 64 C/65): beim Öffnen sofort drei Vorschläge
// (keine Frage), Mia lädt ein, einfach zu erzählen. Erzähltes („Ich hab
// Hähnchen gekauft …“) → „Dann mach doch …!“, Stichworte, Karussell mit drei
// passenden Gerichten; Vorhandenes merkt sich Mia als „im Haus“. „Nehmen“:
// frei → Abendessen heute (nach dem Abendessen: morgen), geplant → ersetzt
// das Gericht von heute (das alte wandert zurück zu den Ideen), Fehlendes auf
// die Liste – kurze Meldung mit Rückgängig. Alles ohne KI.

import type { Dispatch, SetStateAction } from "react";
import type { PantryItem } from "@/lib/vorrat/pantry";
import type { AssistantData } from "@/lib/begleitung/ops";
import { soonToUse } from "@/lib/essen/dishIdeas";
import { cookCandidates, scaleAmount, type CookCard } from "@/lib/essen/kochtipp/pick";
import { EMPTY_TALK, ideaHello, ideaResult, ideaUnderstood, mergeTalk, parseIdeaTalk, rankIdeas, rememberedText, startIdeas, takeOutcome, talkKeywords, type IdeaTalk } from "@/lib/essen/kochtipp/idee";
import { formatAmount } from "@/lib/essen/cookbook";
import { BUILTIN_COOK } from "@/lib/essen/kochen";
import { recentDishTitles } from "@/lib/essen/kochtipp/recent";
import { loadKochtipp, noteKochtippShown, noteImHaus } from "@/lib/essen/kochtipp/store";
import { takeForDay } from "@/lib/essen/spontanTake";
import { loadMealPlans, replaceMealPlans } from "@/lib/essen/mealPlan";
import { addManualItem, removeManualItems, sectionFor } from "@/lib/einkauf/shoppingList";
import { addWish, removeWish } from "@/lib/essen/wishes";
import { addPantryItems } from "@/lib/vorrat/pantry";
import { featureOn } from "@/lib/core/features";
import { addDays } from "@/lib/core/now";
import { DEFAULT_SHOPPING_DAY, planningWeekStart, toIsoDate } from "@/lib/essen/weekPlan";
import { WEEKDAYS } from "@/lib/einstellungen/profile";
import { showToast } from "@/lib/core/toast";
import type { ChatState, ChatTurnView } from "@/components/begleitung/chatTypes";

export type KochideeSession = NonNullable<ChatState["kochtipp"]>;

type Options = {
  data: AssistantData | null | undefined;
  today: Date | undefined;
  pantry: PantryItem[] | undefined;
  /** Abendessen heute schon vorbei → „Nehmen“ trägt für morgen ein */
  mealOver: boolean;
  setChat: Dispatch<SetStateAction<ChatState>>;
  onClose: () => void;
};

export function useKochidee({ data, today, pantry, mealOver, setChat, onClose }: Options) {
  const household = data ? Math.max(1, data.profile.persons.length || data.profile.adults + data.profile.kids || 2) : 2;

  /** Alle passenden Gerichte, das beste zuerst (eigene Rezepte, eingebaute, Gerichte-Liste) */
  const ranked = (talk: IdeaTalk, exclude: string[]): CookCard[] => {
    if (!data || !today) return [];
    const recent = addDays(toIsoDate(today), -2);
    const stock = [...(pantry ?? []), ...loadKochtipp().haus.filter((h) => h.day >= recent).map((h) => ({ id: h.name, name: h.name, amount: null, unit: "", addedAt: h.day, place: "kuehlschrank" as const }))];
    return rankIdeas({
      candidates: cookCandidates([...Object.values(data.recipes), ...BUILTIN_COOK]),
      stock,
      talk,
      soon: soonToUse(pantry ?? [], toIsoDate(today)).map((p) => p.name),
      exclude: [...exclude, ...recentDishTitles(data, today, 7)],
      avoid: data.profile.persons.flatMap((p) => [...(p.allergies ?? []), ...(p.dislikes ?? [])]),
    });
  };

  const turn = (t: Omit<ChatTurnView, "role">): ChatTurnView => ({ role: "assistant", local: true, ...t });

  /** Beim Öffnen: Mias Satz + drei Vorschläge, ohne Frage */
  const start = (planned: string | null) => {
    const exclude = [...(planned ? [planned] : []), ...loadKochtipp().shown];
    const all = ranked(EMPTY_TALK, exclude);
    // Mischung wie „Mehr Ideen“: täglich anders, ohne Vorrat trotzdem bunt
    const day = today ? today.getDate() : 0;
    const mix = all.filter((_, i) => (i + day) % 5 === 0);
    const cards = startIdeas(all, mix);
    cards.forEach((c) => noteKochtippShown(c.title));
    setChat((c) => ({
      ...c,
      kochtipp: { talk: EMPTY_TALK, exclude: [...exclude, ...cards.map((x) => x.title)], planned },
      turns: [...c.turns, turn({ text: ideaHello(planned, cards[0]), idea: { kind: "start", cards, planned } })],
    }));
  };

  /** Neue drei zu denselben Wünschen; `said` = eigene Blase davor */
  const answer = (session: KochideeSession, talk: IdeaTalk, said?: string) => {
    const cards = ranked(talk, session.exclude).slice(0, 3);
    cards.forEach((c) => noteKochtippShown(c.title));
    const fresh = talk.have.filter((h) => !session.talk.have.includes(h));
    if (fresh.length && today) {
      if (featureOn("vorrat")) addPantryItems(fresh.map((name) => ({ name, amount: null, unit: "" })), toIsoDate(today));
      else noteImHaus(fresh, toIsoDate(today));
    }
    setChat((c) => ({
      ...c,
      kochtipp: { ...session, talk, exclude: [...session.exclude, ...cards.map((x) => x.title)] },
      turns: [
        ...c.turns,
        ...(said ? [{ role: "user" as const, text: said, local: true }] : []),
        turn({ text: ideaResult(cards[0]), idea: { kind: "ergebnis", cards, planned: session.planned, keywords: talkKeywords(talk), remembered: rememberedText(fresh), persons: talk.persons ?? household } }),
      ],
    }));
  };

  /** Erzähltes in der Kochidee; false = gehört nicht hierher (normaler Weg) */
  const input = (text: string, session: KochideeSession): boolean => {
    const talk = parseIdeaTalk(text);
    if (!ideaUnderstood(talk)) return false;
    answer(session, mergeTalk(session.talk, talk), text);
    return true;
  };

  /** „Noch was anderes?“ – drei neue zu denselben Wünschen */
  const more = (session: KochideeSession) => answer(session, session.talk);

  /** „Nehmen“: eintragen bzw. ersetzen, Fehlendes auf die Liste, Meldung mit Rückgängig */
  const take = (card: CookCard, session: KochideeSession | null | undefined, persons = household) => {
    if (!data || !today) return;
    const { date, backToIdeas, toList } = takeOutcome(card, session?.planned ?? null, mealOver, toIsoDate(today), addDays(toIsoDate(today), 1));
    const before = loadMealPlans();
    const result = takeForDay({ profile: data.profile, weekPlans: data.weekPlans, mealPlans: before, recipes: data.recipes }, today, { title: card.title, recipeId: card.recipeId, category: card.category }, date, { spontan: true });
    if (!result.ok) return showToast({ text: result.text });
    replaceMealPlans(result.weeks);
    // Das ersetzte Gericht geht nicht verloren: zurück zu den Ideen
    const wish = backToIdeas ? addWish({ who: "", personId: null, dish: backToIdeas }, toIsoDate(today)) : null;
    const weekStart = planningWeekStart(today, data.profile.shoppingDay || DEFAULT_SHOPPING_DAY).weekStart;
    const recipe = card.recipeId ? (data.recipes[card.recipeId] ?? BUILTIN_COOK.find((r) => r.id === card.recipeId)) : undefined;
    const added = toList.map((name) => {
      const ing = recipe?.ingredients.find((i) => i.name === name);
      const amount = ing ? scaleAmount(ing.amount, recipe!.servings, persons) : null;
      return addManualItem(weekStart, { name, amount: amount !== null && ing ? `${formatAmount(amount)} ${ing.unit}`.trim() : "", section: sectionFor(name), day: WEEKDAYS[new Date(`${date}T12:00:00`).getDay()], dish: card.title });
    });
    setChat((c) => ({ ...c, kochtipp: null }));
    onClose();
    const list = card.needs.slice(0, 2).join(" und ");
    showToast({
      text: card.needs.length ? `Eingetragen. ${list}${card.needs.length > 2 ? " …" : ""} ${card.needs.length === 1 ? "steht" : "stehen"} auf der Liste.` : "Eingetragen.",
      small: true,
      seconds: 4,
      undo: () => {
        replaceMealPlans(before);
        if (added.length) removeManualItems(weekStart, added);
        if (wish) removeWish(wish.id);
      },
      undoneText: "Wieder wie vorher",
    });
  };

  return { start, input, more, take };
}

export type Kochidee = ReturnType<typeof useKochidee>;
