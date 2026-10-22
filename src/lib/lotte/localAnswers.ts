// Antworten des Chats ohne KI, die nur rechnen: Supermarkt ("Lachs ist im
// Angebot"), Backwunsch, schnelle Ideen, Uhrzeit für die KI und der
// Schleifenschutz (dieselbe Antwort wie eben?). Rein – Speichern und der
// Gesprächsverlauf bleiben im Chat.

import { hasKids, mealClockFor } from "@/lib/einstellungen/profile";
import { bakingIdeas, isBakingRequest } from "@/lib/essen/baking";
import type { Recipe } from "@/lib/essen/cookbook";
import { isMarketSituation, marketIdeas, marketProduct, marketTargetDay, type MarketAnswer } from "@/lib/essen/market";
import { composeWeek } from "@/lib/essen/mealPlan";
import type { PantryItem } from "@/lib/essen/pantry";
import { quickIdeas } from "@/lib/essen/spontan";
import { DEFAULT_SHOPPING_DAY, addDays, toIsoDate, weekStartFor } from "@/lib/essen/weekPlan";
import { now } from "@/lib/core/now";
import type { AssistantData } from "./ops";

/** Jetzt als "HH:MM" (Europe/Berlin über `now()`) */
export function clockNow(): string {
  const at = now();
  return `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
}

/** Schleifenschutz: antwortet die KI genauso wie zuletzt? */
export function isSameReply(before: string | undefined, reply: string | undefined): boolean {
  const loop = (a?: string) => (a ?? "").toLowerCase().replace(/[^a-zäöüß0-9]+/g, " ").trim();
  return Boolean(before) && loop(before) === loop(reply);
}

/** Drei schnelle Ideen unter 20 Minuten (ohne KI) */
export function quickAnswer(data: AssistantData | null | undefined): string | null {
  if (!data) return null;
  const ideas = quickIdeas(data.recipes, data.profile.neverAgain);
  return `Drei schnelle Ideen unter 20 Minuten: ${ideas.slice(0, -1).join(", ")} oder ${ideas[ideas.length - 1]}.`;
}

/** "Lachs ist im Angebot", "Ich steh grad im Rewe …" → Ideen mit Zeit, kurz */
export function marketAnswer(
  t: string,
  data: AssistantData | null | undefined,
  today: Date | undefined,
  pantry: PantryItem[],
  shoppingItems: readonly { name: string; checked?: boolean; hidden?: boolean }[],
  spontanStyle: boolean,
) {
  if (!data || !today || !isMarketSituation(t)) return null;
  const product = marketProduct(t);
  if (!product) return null;
  const listNames = shoppingItems.filter((i) => !i.checked && !i.hidden).map((i) => i.name);
  const ideas = marketIdeas(product, data.recipes, pantry, listNames, data.profile.neverAgain);
  if (!ideas.length) return null;
  // Passender Tag: heute (vor der Essenszeit) oder später in dieser bzw. nächster Woche
  const shoppingDay = data.profile.shoppingDay || DEFAULT_SHOPPING_DAY;
  const todayIso = toIsoDate(today);
  const weekStart = weekStartFor(today, shoppingDay);
  const week = composeWeek(weekStart, data.profile, data.weekPlans, data.mealPlans, data.recipes);
  const todayDay = week.days.find((d) => d.date === todayIso);
  const clock = clockNow();
  const beforeMeal = Boolean(todayDay) && clock < mealClockFor(data.profile, todayDay!.weekday);
  // Spontan: kein Plan – höchstens "Heute kochen"
  const target = spontanStyle
    ? beforeMeal && todayDay
      ? { date: todayIso, weekday: todayDay.weekday, replaces: null, label: "Heute kochen" }
      : null
    : marketTargetDay(week, todayIso, beforeMeal) ??
    marketTargetDay(composeWeek(addDays(weekStart, 7), data.profile, data.weekPlans, data.mealPlans, data.recipes), todayIso, false);
  const market: MarketAnswer & { target: typeof target } = { product, source: "text", ideas, target };
  return { text: `${product}? Damit geht z. B.:`, market };
}

/** Backwunsch → eigene Backrezepte und die eingebaute Backstube */
export function bakingAnswer(t: string, data: AssistantData | null | undefined): { text: string; baking: Recipe[] } | null {
  if (!data || !isBakingRequest(t)) return null;
  const withKids = hasKids(data.profile);
  const lower = t.toLowerCase();
  const own = Object.values(data.recipes).filter(
    (r) => r.kind === "backen" && r.title.toLowerCase().split(/[\s-]+/).some((w) => w.length >= 4 && lower.includes(w.replace(/(en|n|e|s)$/, ""))),
  );
  const builtin = bakingIdeas(t, withKids).filter((b) => !own.some((r) => r.title.toLowerCase() === b.title.toLowerCase()));
  const recipes = [...own, ...builtin].slice(0, 3);
  if (!recipes.length) return null;
  const kidsWanted = withKids && /kind|kinder|kleinen|zusammen|mit den/i.test(t);
  return {
    text: kidsWanted ? "Oh ja, backen wir zusammen! 🧁 Das klappt gut mit Kindern:" : "Gern! 🧁 Wie wär’s damit:",
    baking: recipes,
  };
}
