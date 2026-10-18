// "Was gibt's heute?" – Ideen ganz ohne KI, über einfache Regeln:
// Wünsche ganz oben, dann Lieblinge und Gerichte, die ihr kennt, was im
// Vorrat/Tiefkühler ist, Reste zuerst, Jahreszeit, nicht dasselbe wie in den
// letzten Tagen und unter der Woche eher Schnelles. Rein, damit es testbar ist.

import type { Recipe, RecipeCategory } from "./cookbook";
import { guessDishCategory } from "./dishCategory";
import { recipeIsKnown } from "./dishStatus";
import { composeWeek, type StoredEntry } from "./mealPlan";
import { sameIngredient, type PantryItem } from "./pantry";
import type { HouseholdProfile, NeverAgainEntry } from "./profile";
import { isNeverAgain } from "./ratings";
import { AT_HOME } from "./spontan";
import { addDays, weekStartFor, type WeekPlan } from "./weekPlan";
import { wishLabel, type WishIdea } from "./wishes";

export type IdeaFilter = "schnell" | "veggie" | "vorrat";

export const IDEA_FILTERS: { value: IdeaFilter; label: string }[] = [
  { value: "schnell", label: "⚡ Schnell" },
  { value: "veggie", label: "🥦 Veggie" },
  { value: "vorrat", label: "🥫 Mit Vorrat" },
];

export type Idea = {
  id: string;
  title: string;
  recipeId?: string;
  category: RecipeCategory | null;
  minutes: number | null;
  /** Kurzer Grund: "Mathis' Wunsch", "kennt ihr", "mit Lachs aus dem Vorrat" … */
  reason: string;
  /** Was dafür noch gebraucht wird (ohne Vorrat und "hat man da") */
  needs: string[];
  /** Genutzte Sachen aus dem Vorrat */
  uses: string[];
  wishId?: string;
  known: boolean;
};

type Season = "fruehling" | "sommer" | "herbst" | "winter";

export function seasonOf(date: string): Season {
  const m = Number(date.slice(5, 7));
  return m >= 3 && m <= 5 ? "fruehling" : m >= 6 && m <= 8 ? "sommer" : m >= 9 && m <= 11 ? "herbst" : "winter";
}

const SEASON_WORDS: Record<Season, RegExp> = {
  fruehling: /spargel|bärlauch|radieschen|erbsen|rhabarber|frühling/i,
  sommer: /salat|grill|tomate|zucchini|gazpacho|wassermelone|beeren|sommer/i,
  herbst: /kürbis|pilz|eintopf|suppe|kartoffel|apfel|zwetschg|herbst/i,
  winter: /grünkohl|eintopf|braten|gulasch|suppe|raclette|rotkohl|linsen|winter/i,
};

/** Familien-Klassiker, die fast immer gehen (mit Jahreszeit) */
const CLASSICS: { title: string; minutes: number; category: RecipeCategory; needs: string[]; season?: Season }[] = [
  { title: "Nudeln mit Tomatensoße", minutes: 20, category: "vegetarisch", needs: ["Nudeln", "Tomaten"] },
  { title: "Pfannkuchen", minutes: 20, category: "vegetarisch", needs: ["Eier", "Milch"] },
  { title: "Rührei mit Brot", minutes: 10, category: "vegetarisch", needs: ["Eier", "Brot"] },
  { title: "Ofengemüse mit Feta", minutes: 35, category: "vegetarisch", needs: ["Paprika", "Zucchini", "Feta"] },
  { title: "Gemüsepfanne mit Reis", minutes: 25, category: "vegetarisch", needs: ["Reis", "Möhren", "Paprika"] },
  { title: "Kartoffelsuppe", minutes: 30, category: "vegetarisch", needs: ["Kartoffeln", "Möhren"], season: "herbst" },
  { title: "Kürbissuppe", minutes: 35, category: "vegetarisch", needs: ["Kürbis", "Kartoffeln"], season: "herbst" },
  { title: "Linsensuppe", minutes: 35, category: "vegetarisch", needs: ["Linsen", "Möhren", "Kartoffeln"], season: "winter" },
  { title: "Chili sin Carne", minutes: 35, category: "vegetarisch", needs: ["Kidneybohnen", "Mais", "Tomaten"], season: "winter" },
  { title: "Spargel mit Kartoffeln", minutes: 35, category: "vegetarisch", needs: ["Spargel", "Kartoffeln"], season: "fruehling" },
  { title: "Nudelsalat", minutes: 20, category: "vegetarisch", needs: ["Nudeln", "Gurke", "Tomaten"], season: "sommer" },
  { title: "Tomaten-Mozzarella mit Brot", minutes: 10, category: "vegetarisch", needs: ["Tomaten", "Mozzarella", "Brot"], season: "sommer" },
  { title: "Wraps mit Gemüse", minutes: 15, category: "vegetarisch", needs: ["Wraps", "Paprika", "Gurke"] },
  { title: "Fischstäbchen mit Kartoffelpüree", minutes: 25, category: "fisch", needs: ["Fischstäbchen", "Kartoffeln", "Milch"] },
  { title: "Lachs mit Ofenkartoffeln", minutes: 35, category: "fisch", needs: ["Lachs", "Kartoffeln"] },
  { title: "Hähnchenpfanne mit Reis", minutes: 25, category: "fleisch", needs: ["Hähnchenbrust", "Reis", "Paprika"] },
  { title: "Spaghetti Bolognese", minutes: 30, category: "fleisch", needs: ["Spaghetti", "Hackfleisch", "Tomaten"] },
  { title: "Bratkartoffeln mit Spiegelei", minutes: 25, category: "vegetarisch", needs: ["Kartoffeln", "Eier"] },
  { title: "Flammkuchen", minutes: 25, category: "vegetarisch", needs: ["Flammkuchenteig", "Schmand", "Zwiebeln"] },
  { title: "Milchreis mit Apfelmus", minutes: 30, category: "vegetarisch", needs: ["Milchreis", "Milch", "Apfelmus"] },
];

export type IdeaContext = {
  date: string;
  recipes: Record<string, Recipe>;
  pantry: PantryItem[];
  wishes: WishIdea[];
  neverAgain: NeverAgainEntry[];
  /** Gerichte der letzten Tage (Titel, klein) – nicht schon wieder */
  recent: string[];
  /** Heute schon weggewischt ("nicht jetzt") */
  dismissed: string[];
  filters?: IdeaFilter[];
};

const isWeekday = (date: string) => {
  const d = new Date(`${date}T12:00:00Z`).getUTCDay();
  return d >= 1 && d <= 5;
};

/** Kleine, stabile Zahl je Tag und Idee – ändert die Reihenfolge täglich, nicht beim Neuladen */
function dayHash(date: string, id: string): number {
  let h = 0;
  for (const c of `${date}|${id}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 1000) / 1000;
}

const list = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`);

/** Alle Ideen für heute, beste zuerst (Wünsche ganz oben) */
export function ideasFor(ctx: IdeaContext): Idea[] {
  const { date, pantry, filters = [] } = ctx;
  const weekday = isWeekday(date);
  const season = seasonOf(date);
  const recent = new Set(ctx.recent.map((t) => t.trim().toLowerCase()));
  const leftovers = pantry.filter((p) => p.place === "kuehlschrank" && p.addedAt && p.addedAt <= addDays(date, -2));
  const check = (names: string[]) => {
    const needed = names.map((n) => n.trim()).filter((n) => n && !AT_HOME.test(n));
    return {
      uses: pantry.filter((p) => needed.some((n) => sameIngredient(n, p.name))).map((p) => p.name),
      needs: needed.filter((n) => !pantry.some((p) => sameIngredient(n, p.name))),
    };
  };
  const findRecipe = (title: string) => Object.values(ctx.recipes).find((r) => r.title.trim().toLowerCase() === title.trim().toLowerCase());

  // Wünsche: immer ganz oben, in der Reihenfolge, in der sie kamen
  const wishes: Idea[] = ctx.wishes.map((w) => {
    const r = findRecipe(w.dish);
    const { uses, needs } = check(r ? r.ingredients.map((i) => i.name) : []);
    return {
      id: `w:${w.id}`,
      title: w.dish,
      recipeId: r?.id,
      category: r?.category ?? guessDishCategory(w.dish),
      minutes: r?.prepMinutes ?? null,
      reason: wishLabel(w.who),
      needs,
      uses,
      wishId: w.id,
      known: r ? recipeIsKnown(r) : true,
    };
  });

  type Scored = Idea & { score: number };
  const scored: Scored[] = [];
  for (const r of Object.values(ctx.recipes)) {
    if (r.kind === "backen" || isNeverAgain(r.title, ctx.neverAgain) || recent.has(r.title.trim().toLowerCase())) continue;
    const { uses, needs } = check(r.ingredients.map((i) => i.name));
    const known = recipeIsKnown(r);
    const rest = leftovers.filter((p) => uses.includes(p.name));
    let score = 1;
    if (r.favorite) score += 3;
    if (known) score += 2;
    score += Math.min(3, r.thumbsUp);
    score += Math.min(3, uses.length) * 1.5;
    if (rest.length) score += 3;
    if (SEASON_WORDS[season].test(r.title)) score += 1;
    if (weekday && r.prepMinutes !== null) score += r.prepMinutes <= 30 ? 2 : r.prepMinutes > 45 ? -2 : 0;
    const reason = rest.length
      ? `Reste zuerst: ${list(rest.slice(0, 2).map((p) => p.name))}`
      : uses.length
        ? `mit ${list(uses.slice(0, 2))} aus dem Vorrat`
        : r.favorite
          ? "euer Liebling"
          : known
            ? "kennt ihr"
            : "mal was Neues";
    scored.push({ id: r.id, title: r.title, recipeId: r.id, category: r.category, minutes: r.prepMinutes, reason, needs, uses, known, score });
  }
  const own = new Set(Object.values(ctx.recipes).map((r) => r.title.trim().toLowerCase()));
  for (const c of CLASSICS) {
    const key = c.title.toLowerCase();
    if (own.has(key) || recent.has(key) || isNeverAgain(c.title, ctx.neverAgain)) continue;
    if (c.season && c.season !== season) continue;
    const { uses, needs } = check(c.needs);
    let score = 0;
    if (c.season === season) score += 1.5;
    score += Math.min(3, uses.length) * 1.5;
    if (leftovers.some((p) => uses.includes(p.name))) score += 2;
    if (weekday) score += c.minutes <= 25 ? 1 : c.minutes > 30 ? -1 : 0;
    const reason = uses.length ? `mit ${list(uses.slice(0, 2))} aus dem Vorrat` : c.season === season ? "passt zur Jahreszeit" : "geht fast immer";
    scored.push({ id: `k:${c.title}`, title: c.title, category: c.category, minutes: c.minutes, reason, needs, uses, known: true, score });
  }
  scored.sort((a, b) => b.score + dayHash(date, b.id) - (a.score + dayHash(date, a.id)));
  const all: Idea[] = [...wishes, ...scored.map(({ score: _s, ...i }) => (void _s, i))];
  return all.filter(
    (i) =>
      !ctx.dismissed.includes(i.id) &&
      (!filters.includes("schnell") || (i.minutes !== null && i.minutes <= 25)) &&
      (!filters.includes("veggie") || i.category === "vegetarisch") &&
      (!filters.includes("vorrat") || i.uses.length > 0),
  );
}

/** Gerichte der letzten 5 Tage aus dem Plan (auch ausgeblendeter Plan zählt) */
export function recentDishes(
  date: string,
  profile: HouseholdProfile,
  weekPlans: Record<string, WeekPlan>,
  mealPlans: Record<string, Record<string, StoredEntry>>,
  recipes: Record<string, Recipe>,
): string[] {
  const shoppingDay = profile.shoppingDay || "Montag";
  const from = addDays(date, -5);
  const starts = new Set([weekStartFor(new Date(`${from}T12:00:00`), shoppingDay), weekStartFor(new Date(`${date}T12:00:00`), shoppingDay)]);
  const titles: string[] = [];
  for (const start of starts) {
    for (const d of composeWeek(start, profile, weekPlans, mealPlans, recipes).days) {
      if (d.date >= from && d.date < date && d.slot.entry) titles.push(d.slot.entry.title);
    }
  }
  return titles;
}
