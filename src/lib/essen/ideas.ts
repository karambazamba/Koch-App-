// "Was gibt's heute?" – Ideen ganz ohne KI, über einfache Regeln:
// Wünsche ganz oben, dann vor allem, was zum AKTUELLEN Bestand passt (Vorrat,
// Gekauftes; Reste und bald Ablaufendes zuerst), danach Lieblinge und
// Gerichte, die ihr kennt, Jahreszeit, nicht dasselbe wie in den letzten Tagen
// und unter der Woche eher Schnelles. Rein, damit es testbar ist – gerechnet
// wird immer frisch aus dem übergebenen Bestand, nichts wird zwischengespeichert.

import type { Recipe, RecipeCategory } from "./cookbook";
import { guessDishCategory } from "./dishCategory";
import { recipeIsKnown } from "./dishStatus";
import { composeWeek, type StoredEntry } from "./mealPlan";
import type { PantryItem } from "./pantry";
import { DISHES, matchStock, realStock, soonToUse, type Season } from "./dishIdeas";
import type { HouseholdProfile, NeverAgainEntry } from "../einstellungen/profile";
import { isNeverAgain } from "./neverAgain";
import { addDays, weekStartFor, type WeekPlan } from "./weekPlan";
import { wishLabel, type WishIdea } from "./wishes";

export type IdeaFilter = "schnell" | "veggie" | "vorrat";

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

function seasonOf(date: string): Season {
  const m = Number(date.slice(5, 7));
  return m >= 3 && m <= 5 ? "fruehling" : m >= 6 && m <= 8 ? "sommer" : m >= 9 && m <= 11 ? "herbst" : "winter";
}

const SEASON_WORDS: Record<Season, RegExp> = {
  fruehling: /spargel|bärlauch|radieschen|erbsen|rhabarber|frühling/i,
  sommer: /salat|grill|tomate|zucchini|gazpacho|wassermelone|beeren|sommer/i,
  herbst: /kürbis|pilz|eintopf|suppe|kartoffel|apfel|zwetschg|herbst/i,
  winter: /grünkohl|eintopf|braten|gulasch|suppe|raclette|rotkohl|linsen|winter/i,
};

type IdeaContext = {
  date: string;
  recipes: Record<string, Recipe>;
  /** Aktueller Bestand: Vorrat + Gekauftes (+ eben Gesagtes) */
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
  const stock = realStock(pantry);
  const hasStock = stock.length > 0;
  // Reste und bald Ablaufendes (Kühlschrank seit 2+ Tagen) zuerst
  const leftovers = soonToUse(stock, date);
  const check = (names: string[]) => matchStock(names, stock);
  /** Wie gut passt ein Gericht zum Bestand? Überwiegt alles andere, sobald etwas da ist */
  const stockScore = (uses: string[], needs: string[], rest: number) => {
    if (!hasStock) return 0;
    if (uses.length === 0) return -4;
    const coverage = uses.length / (uses.length + needs.length);
    return Math.min(4, uses.length) * 4 + coverage * 4 + Math.min(2, rest) * 3 - Math.max(0, needs.length - 2) * 1.5;
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
    if (r.favorite) score += 2;
    if (known) score += 1.5;
    score += Math.min(2, r.thumbsUp);
    score += stockScore(uses, needs, rest.length);
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
  for (const c of DISHES) {
    const key = c.title.toLowerCase();
    if (own.has(key) || recent.has(key) || isNeverAgain(c.title, ctx.neverAgain)) continue;
    if (c.season && c.season !== season) continue;
    const { uses, needs } = check(c.needs);
    let score = 0;
    if (c.season === season) score += 1.5;
    if (!hasStock && c.usual) score += 1.5;
    score += stockScore(uses, needs, leftovers.filter((p) => uses.includes(p.name)).length);
    if (weekday) score += c.minutes <= 25 ? 1 : c.minutes > 30 ? -1 : 0;
    const rest = leftovers.filter((p) => uses.includes(p.name));
    const reason = rest.length
      ? `Reste zuerst: ${list(rest.slice(0, 2).map((p) => p.name))}`
      : uses.length
        ? `mit ${list(uses.slice(0, 2))} aus dem Vorrat`
        : c.season === season
          ? "passt zur Jahreszeit"
          : "geht fast immer";
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
