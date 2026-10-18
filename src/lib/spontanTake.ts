// "Für heute übernehmen" (Spontan kochen): Die Idee wird das heutige
// Gericht. Das bisherige wandert auf den nächsten freien Tag (diese oder
// nächste Woche) – nichts geht verloren, und "Rückgängig" stellt alles
// wieder her. Rein, damit es testbar ist.

import { guessDishCategory } from "./dishCategory";
import { composeWeek, mealPlansWithWeek, type StoredEntry } from "./mealPlan";
import type { HouseholdProfile } from "./profile";
import type { Recipe } from "./cookbook";
import type { SpontanIdea } from "./spontan";
import { DEFAULT_SHOPPING_DAY, addDays, toIsoDate, weekStartFor, type WeekPlan } from "./weekPlan";

type Data = {
  profile: HouseholdProfile;
  weekPlans: Record<string, WeekPlan>;
  mealPlans: Record<string, Record<string, StoredEntry>>;
  recipes: Record<string, Recipe>;
};

export type TakeResult =
  | { ok: true; weeks: Record<string, Record<string, StoredEntry>>; text: string }
  | { ok: false; text: string };

/** Idee mit Titel, evtl. Rezept und Kategorie (Spontan-Idee, Supermarkt-Idee) */
type Idea = Pick<SpontanIdea, "title" | "recipeId" | "category">;

export function takeForToday(data: Data, today: Date, idea: Idea, opts: { spontan?: boolean } = {}): TakeResult {
  return takeForDay(data, today, idea, toIsoDate(today), opts);
}

/**
 * Idee für einen Tag (diese Woche) einplanen: das bisherige Gericht rutscht
 * auf den nächsten freien Tag danach – nichts geht verloren.
 */
export function takeForDay(data: Data, today: Date, idea: Idea, date: string, opts: { spontan?: boolean } = {}): TakeResult {
  const shoppingDay = data.profile.shoppingDay || DEFAULT_SHOPPING_DAY;
  const todayIso = date;
  const isToday = date === toIsoDate(today);
  const weekStart = weekStartFor(new Date(`${date}T12:00:00`), shoppingDay);
  const week = composeWeek(weekStart, data.profile, data.weekPlans, data.mealPlans, data.recipes);
  const day = week.days.find((d) => d.date === todayIso);
  if (!day) return { ok: false, text: "Das hat gerade nicht geklappt." };
  if (day.away && !opts.spontan) return { ok: false, text: isToday ? "Heute ist eigentlich kein Kochtag eingetragen – guten Appetit trotzdem! 😊" : `${day.weekday} ist kein Kochtag eingetragen.` };
  const when = isToday ? "Heute" : `Am ${day.weekday}`;

  // Spontan: als "aus den Ideen gewählt" markieren, nichts verschieben (es gibt keinen Plan)
  const mark = opts.spontan ? { spontan: true } : {};
  const entry: StoredEntry = idea.recipeId
    ? { kind: "recipe", recipeId: idea.recipeId, title: idea.title, category: idea.category ?? "vegetarisch", ...mark }
    : { kind: "text", title: idea.title, category: idea.category ?? guessDishCategory(idea.title), ...mark };
  let weeks = mealPlansWithWeek(data.mealPlans, weekStart, (e) => ({ ...e, [day.slot.key]: entry }));
  const old = day.slot.entry;
  if (!old || opts.spontan || old.title.toLowerCase() === idea.title.toLowerCase()) {
    return { ok: true, weeks, text: `Übernommen ✓ ${when} gibt's ${idea.title}.` };
  }

  // Bisheriges Gericht auf den nächsten freien Tag (ohne Ausflug, kein freies Wochenende)
  const nextStart = addDays(weekStart, 7);
  const candidates = [
    ...week.days.filter((d) => d.date > todayIso).map((d) => ({ d, start: weekStart })),
    ...composeWeek(nextStart, data.profile, data.weekPlans, weeks, data.recipes).days.map((d) => ({ d, start: nextStart })),
  ];
  const target = candidates.find(({ d }) => !d.away && !d.slot.entry && d.weekend !== "frei");
  if (target) {
    // Doppelt-kochen gilt nur für den ursprünglichen Tag
    const { double: _double, ...moved } = old.stored;
    void _double;
    weeks = mealPlansWithWeek(weeks, target.start, (e) => ({ ...e, [target.d.slot.key]: moved }));
    return { ok: true, weeks, text: `Übernommen ✓ ${when} gibt's ${idea.title}. ${old.title} hab ich auf ${target.d.weekday} geschoben.` };
  }
  return { ok: true, weeks, text: `Übernommen ✓ ${when} gibt's ${idea.title}. ${old.title} ist erst mal raus – sag Bescheid, wenn's woanders hin soll.` };
}
