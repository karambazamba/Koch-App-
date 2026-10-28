"use client";

// Kochidee auf der Bühne (Tafel 64 C/65): beim Öffnen sofort drei Vorschläge
// (keine Frage), darunter Vorschlags-Knöpfe („Oder worauf hast du Lust?“,
// `vorschlaege.ts`). Erzähltes („Ich hab Hähnchen gekauft …“) bzw. ein
// angetippter Vorschlag → kurzer Satz („Dann mach doch …!“, „Kürbis geht
// immer im Herbst:“), Stichworte, Karussell mit drei
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
import { ideaReply, ideaSuggestions } from "@/lib/essen/kochtipp/vorschlaege";
import { BUILTIN_COOK } from "@/lib/essen/kochen";
import { recentDishTitles } from "@/lib/essen/kochtipp/recent";
import { loadKochtipp, noteKochtippShown, noteImHaus } from "@/lib/essen/kochtipp/store";
import { takeForDay } from "@/lib/essen/spontanTake";
import { loadMealPlans, replaceMealPlans } from "@/lib/essen/mealPlan";
import { addManualItem, removeManualItems, sectionFor } from "@/lib/einkauf/shoppingList";
import { alsEinkauf } from "@/lib/einkauf/zusammen/packung";
import { addWish, removeWish } from "@/lib/essen/wishes";
import { addPantryItems } from "@/lib/vorrat/pantry";
import { featureOn } from "@/lib/core/features";
import { addDays, now } from "@/lib/core/now";
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
  /** Vorrat „Im Haus“ plus eben Erzähltes der letzten zwei Tage */
  const stockNow = (day: Date): PantryItem[] => {
    const recent = addDays(toIsoDate(day), -2);
    return [...(pantry ?? []), ...loadKochtipp().haus.filter((h) => h.day >= recent).map((h) => ({ id: `s:${h.name}`, name: h.name, addedAt: h.day, place: "kuehlschrank" as const }))];
  };
  const soonNow = (day: Date) => soonToUse(pantry ?? [], toIsoDate(day)).map((p) => p.name);

  const ranked = (talk: IdeaTalk, exclude: string[]): CookCard[] => {
    if (!data || !today) return [];
    return rankIdeas({
      candidates: cookCandidates([...Object.values(data.recipes), ...BUILTIN_COOK]),
      stock: stockNow(today),
      talk,
      soon: soonNow(today),
      exclude: [...exclude, ...recentDishTitles(data, today, 7)],
      avoid: data.profile.persons.flatMap((p) => [...(p.allergies ?? []), ...(p.dislikes ?? [])]),
      today: toIsoDate(today),
    });
  };

  /** „Oder worauf hast du Lust?“ – 3–4 Sätze, die zu Gerichten führen (Tageszeit, Jahreszeit, Vorrat) */
  const suggest = (talk: IdeaTalk, exclude: string[]): string[] => {
    if (!today) return [];
    const at = now();
    return ideaSuggestions({ hour: at.getHours(), month: at.getMonth(), stock: stockNow(today), soon: soonNow(today), talk, fits: (t) => ranked(t, exclude).length >= 3 });
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
    const next = [...exclude, ...cards.map((x) => x.title)];
    const tips = suggest(EMPTY_TALK, next);
    setChat((c) => ({
      ...c,
      kochtipp: { talk: EMPTY_TALK, exclude: next, planned },
      turns: [...c.turns, turn({ text: ideaHello(planned, cards[0]), idea: { kind: "start", cards, planned, suggest: tips } })],
    }));
  };

  /** Neue drei zu denselben Wünschen; `said` = eigene Blase davor */
  const answer = (session: KochideeSession, talk: IdeaTalk, said?: string) => {
    const cards = ranked(talk, session.exclude).slice(0, 3);
    cards.forEach((c) => noteKochtippShown(c.title));
    const fresh = talk.have.filter((h) => !session.talk.have.includes(h));
    if (fresh.length && today) {
      if (featureOn("vorrat")) addPantryItems(fresh.map((name) => ({ name })), toIsoDate(today));
      else noteImHaus(fresh, toIsoDate(today));
    }
    const exclude = [...session.exclude, ...cards.map((x) => x.title)];
    // Kurzer Satz zum eben Gesagten („Kürbis geht immer im Herbst:“), „Noch was anderes?“ bleibt bei „Dann mach doch …!“
    const tips = suggest(talk, exclude);
    const text = said ? ideaReply(parseIdeaTalk(said), cards[0], now().getMonth()) : ideaResult(cards[0]);
    setChat((c) => ({
      ...c,
      kochtipp: { ...session, talk, exclude },
      turns: [
        ...c.turns,
        ...(said ? [{ role: "user" as const, text: said, local: true }] : []),
        turn({ text, idea: { kind: "ergebnis", cards, planned: session.planned, keywords: talkKeywords(talk), remembered: rememberedText(fresh), persons: talk.persons ?? household, suggest: tips } }),
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
      // Rezeptmenge als Einkaufsmenge (Packung), die Rezeptmenge nur als Hinweis
      return addManualItem(weekStart, { name, ...alsEinkauf(name, ing ? amount : null, ing?.unit ?? ""), section: sectionFor(name), day: WEEKDAYS[new Date(`${date}T12:00:00`).getDay()], dish: card.title });
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
