// "Was gibt's heute?" – Ideen ganz ohne KI, über einfache Regeln:
// Wünsche ganz oben, dann 8 gemischte Ideen: ≈ 3 Lieblinge (Favoriten, 👍,
// schon gekocht), ≈ 3 beliebte Klassiker (`beliebt` ≥ 4), ≈ 2 Neue; höchstens
// 2 je Gruppe, unter den ersten drei höchstens eine je Grundlage (nicht 3×
// Nudeln). Was zum AKTUELLEN Bestand passt (Vorrat, Gekauftes; Reste zuerst),
// zählt am meisten, dazu Jahreszeit und unter der Woche eher Schnelles. Nie:
// Gegessenes der letzten 14 Tage, „nie wieder“, Allergien und „mag nicht“.
// Jeden Tag neu gemischt (fester Tages-Zufall, stabil am selben Tag), an
// früheren Tagen Gezeigtes (aber nicht Genommenes) rückt 7 Tage nach hinten.
// Rein, damit es testbar ist – gerechnet wird immer frisch aus dem
// übergebenen Bestand, nichts wird zwischengespeichert.

import type { Recipe, RecipeCategory } from "@/lib/essen/cookbook";
import { guessDishCategory } from "@/lib/essen/dishCategory";
import { recipeIsKnown } from "@/lib/essen/dishStatus";
import { composeWeek, type StoredEntry } from "@/lib/essen/mealPlan";
import type { PantryItem } from "@/lib/vorrat/pantry";
import { DISHES, matchStock, realStock, soonToUse, type Season } from "@/lib/essen/dishIdeas";
import type { HouseholdProfile, NeverAgainEntry, Person } from "@/lib/einstellungen/profile";
import { dietConflicts } from "@/lib/begleitung/diet";
import { cookRecipe, rezeptIdFuer } from "@/lib/essen/kochen";
import { isNeverAgain } from "@/lib/essen/neverAgain";
import { addDays, weekStartFor, type WeekPlan } from "@/lib/essen/weekPlan";
import { IDEAS, sortBy, via } from "@/lib/core/sort";
import { wishLabel, type WishIdea } from "@/lib/essen/wishes";
import { baseFromText } from "@/lib/essen/bases";

export type IdeaFilter = "schnell" | "veggie" | "vorrat";

export type Idea = {
  id: string;
  title: string;
  recipeId?: string;
  category: RecipeCategory | null;
  minutes: number | null;
  /** Kurzer Grund: "Mathis' Wunsch", "kennt ihr", "mit Lachs (im Haus)" … */
  reason: string;
  /** Was dafür noch gebraucht wird (ohne Vorrat und "hat man da") */
  needs: string[];
  /** Genutzte Sachen aus dem Vorrat */
  uses: string[];
  /** Davon nur noch vermutlich im Haus (zweite Hälfte ihrer Zeit) */
  unsure?: string[];
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
  /** Wann eine Idee (Titel, klein) zuletzt gezeigt wurde ("YYYY-MM-DD") */
  shown?: Record<string, string>;
  /** Familie: Allergien und „mag nicht“ gelten strikt, mit Kindern lieber Kindergerechtes */
  persons?: Person[];
};

/** So lange rückt eine gezeigte, nicht genommene Idee nach hinten */
const SHOWN_DAYS = 7;
/** So lange kommt ein gegessenes Gericht nicht wieder */
export const RECENT_DAYS = 14;
const SHOWN_PENALTY = 12;

/** Grundlage für die Mischung: Nudeln, Reis, Kartoffeln …, sonst die Kategorie */
const mixKey = (i: Pick<Idea, "title" | "needs" | "uses" | "category">) => baseFromText([i.title, ...i.uses, ...i.needs].join(" ")) ?? i.category ?? "sonst";

/** Unter den ersten `n` höchstens eine je Grundlage (stabil, der Rest folgt in alter Reihenfolge) @public */
export function mixFirst<T extends Pick<Idea, "title" | "needs" | "uses" | "category">>(items: T[], n = 3): T[] {
  const first: T[] = [];
  const seen = new Set<string>();
  for (const i of items) {
    if (first.length >= n) break;
    const k = mixKey(i);
    if (seen.has(k)) continue;
    seen.add(k);
    first.push(i);
  }
  return [...first, ...items.filter((i) => !first.includes(i))];
}

const isWeekday = (date: string) => {
  const d = new Date(`${date}T12:00:00Z`).getUTCDay();
  return d >= 1 && d <= 5;
};

/** Kleine, stabile Zahl je Tag und Idee – ändert die Reihenfolge täglich, nicht beim Neuladen */
function dayHash(date: string, id: string): number {
  // FNV-1a mit Nachmischen: benachbarte Tage geben ganz andere Zahlen
  let h = 2166136261;
  for (const c of `${date}|${id}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const list = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`);

/** Woher eine Idee für die Mischung kommt: Lieblinge, beliebte Klassiker, mal was Neues */
type Topf = "liebling" | "klassiker" | "neu";

/** So viele Ideen werden gemischt gezeigt */
export const SHOWN_IDEAS = 8;
/** Mischung der 8: ≈ 3 Lieblinge, ≈ 3 Klassiker, ≈ 2 Neue (leere Töpfe füllt die beste übrige Idee) */
const PATTERN: Topf[] = ["liebling", "klassiker", "neu", "liebling", "klassiker", "neu", "liebling", "klassiker"];
/** Höchstens so viele je Gruppe (Nudeln, Asiatisch, Suppen …) unter den 8 */
const MAX_PER_GROUP = 2;
/** So stark mischt der feste Tages-Zufall die Reihenfolge innerhalb eines Topfs */
const DAY_MIX = 6;

type Scored = Idea & { score: number; topf: Topf; group: string };

/**
 * Die ersten `slots` Ideen nach dem Muster mischen: je Platz die beste aus dem
 * passenden Topf, höchstens 2 je Gruppe, unter den ersten `distinct`
 * höchstens eine je Grundlage. `best` = erster Platz für die beste Idee
 * insgesamt (Bestand überwiegt). Der Rest folgt nach Punkten.
 */
function mixShown(ranked: Scored[], slots: number, distinct: number, best: boolean): Scored[] {
  const picked: Scored[] = [];
  const groups = new Map<string, number>();
  const bases = new Set<string>();
  const free = (s: Scored, strict: boolean) =>
    !picked.includes(s) && (!strict || ((groups.get(s.group) ?? 0) < MAX_PER_GROUP && (picked.length >= distinct || !bases.has(mixKey(s)))));
  for (let i = 0; i < Math.min(slots, ranked.length); i++) {
    const topf = best && i === 0 ? null : PATTERN[i % PATTERN.length];
    const next =
      ranked.find((s) => (topf === null || s.topf === topf) && free(s, true)) ?? ranked.find((s) => free(s, true)) ?? ranked.find((s) => free(s, false))!;
    picked.push(next);
    groups.set(next.group, (groups.get(next.group) ?? 0) + 1);
    bases.add(mixKey(next));
  }
  return [...picked, ...ranked.filter((s) => !picked.includes(s))];
}

/**
 * Alle Ideen für heute, beste zuerst: Wünsche ganz oben, dann 8 gemischte
 * (Lieblinge, beliebte Klassiker, Neues; jeden Tag neu gemischt), dann der Rest.
 */
export function ideasFor(ctx: IdeaContext): Idea[] {
  const { date, pantry, filters = [], persons = [] } = ctx;
  const weekday = isWeekday(date);
  const season = seasonOf(date);
  const recent = new Set(ctx.recent.map((t) => t.trim().toLowerCase()));
  const from = addDays(date, -SHOWN_DAYS);
  /** An einem früheren Tag gezeigt, aber nicht genommen → nach hinten */
  const shownBefore = (title: string) => {
    const at = ctx.shown?.[title.trim().toLowerCase()];
    return Boolean(at && at < date && at >= from);
  };
  /** Allergien und „mag nicht“ – strikt, mit Titel und allen Zutaten */
  const blocked = (title: string, ingredients: string[]) => persons.length > 0 && dietConflicts(title, ingredients, persons).length > 0;
  const kids = persons.some((p) => p.role === "kind");
  const stock = realStock(pantry);
  const hasStock = stock.length > 0;
  // Reste und bald Ablaufendes (Kühlschrank seit 2+ Tagen) zuerst
  const leftovers = soonToUse(stock, date);
  const check = (names: string[]) => matchStock(names, stock, date);
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
    const { uses, needs, unsure } = check(r ? r.ingredients.map((i) => i.name) : []);
    return {
      id: `w:${w.id}`,
      title: w.dish,
      recipeId: r?.id,
      category: r?.category ?? guessDishCategory(w.dish),
      minutes: r?.prepMinutes ?? null,
      reason: wishLabel(w.who),
      needs,
      uses,
      unsure,
      wishId: w.id,
      known: r ? recipeIsKnown(r) : true,
    };
  });

  const scored: Scored[] = [];
  for (const r of Object.values(ctx.recipes)) {
    if (r.kind === "backen" || isNeverAgain(r.title, ctx.neverAgain) || recent.has(r.title.trim().toLowerCase())) continue;
    if (blocked(r.title, r.ingredients.map((i) => i.name))) continue;
    const { uses, needs, unsure } = check(r.ingredients.map((i) => i.name));
    const known = recipeIsKnown(r);
    const rest = leftovers.filter((p) => uses.includes(p.name));
    let score = 1;
    if (r.favorite) score += 2;
    if (known) score += 1.5;
    score += Math.min(2, r.thumbsUp);
    score += stockScore(uses, needs, rest.length);
    if (SEASON_WORDS[season].test(r.title)) score += 1;
    if (weekday && r.prepMinutes !== null) score += r.prepMinutes <= 30 ? 2 : r.prepMinutes > 45 ? -2 : 0;
    if (shownBefore(r.title)) score -= SHOWN_PENALTY;
    const reason = rest.length
      ? `Reste zuerst: ${list(rest.slice(0, 2).map((p) => p.name))}`
      : uses.length
        ? `mit ${list(uses.slice(0, 2))} (im Haus)`
        : r.favorite
          ? "euer Liebling"
          : known
            ? "kennt ihr"
            : "mal was Neues";
    const topf: Topf = r.favorite || r.thumbsUp > 0 || known ? "liebling" : "neu";
    const group = DISHES.find((d) => d.title.toLowerCase() === r.title.trim().toLowerCase())?.gruppe ?? `eigen:${r.category}`;
    scored.push({ id: r.id, title: r.title, recipeId: r.id, category: r.category, minutes: r.prepMinutes, reason, needs, uses, unsure, known, score, topf, group });
  }
  const own = new Set(Object.values(ctx.recipes).map((r) => r.title.trim().toLowerCase()));
  for (const c of DISHES) {
    const key = c.title.toLowerCase();
    if (own.has(key) || recent.has(key) || isNeverAgain(c.title, ctx.neverAgain)) continue;
    if (c.season && c.season !== season) continue;
    const recipeId = rezeptIdFuer(c.title) ?? undefined;
    const recipe = recipeId ? cookRecipe(recipeId) : undefined;
    if (blocked(c.title, [...c.needs, ...(recipe?.ingredients.map((i) => i.name) ?? [])])) continue;
    const { uses, needs, unsure } = check(c.needs);
    let score = (c.beliebt - 3) * 0.8;
    if (c.season === season) score += 1.5;
    if (!hasStock && c.usual) score += 1.5;
    if (kids && !c.kind) score -= 1;
    score += stockScore(uses, needs, leftovers.filter((p) => uses.includes(p.name)).length);
    if (weekday) score += c.minutes <= 25 ? 1 : c.minutes > 30 ? -1 : 0;
    if (shownBefore(c.title)) score -= SHOWN_PENALTY;
    const rest = leftovers.filter((p) => uses.includes(p.name));
    const reason = rest.length
      ? `Reste zuerst: ${list(rest.slice(0, 2).map((p) => p.name))}`
      : uses.length
        ? `mit ${list(uses.slice(0, 2))} (im Haus)`
        : c.season === season
          ? "passt zur Jahreszeit"
          : "geht fast immer";
    const topf: Topf = c.beliebt >= 4 ? "klassiker" : "neu";
    scored.push({ id: `k:${c.title}`, title: c.title, recipeId, category: c.category, minutes: c.minutes, reason, needs, uses, unsure, known: true, score, topf, group: c.gruppe });
  }
  // Regel `IDEAS`: Punkte (mit festem Tages-Zufall) → bei Gleichstand die schnellere
  const ranked = sortBy(scored, ...via((s: Scored) => ({ score: s.score + dayHash(date, s.id) * DAY_MIX, minutes: s.minutes }), IDEAS));
  const mixed = mixShown(ranked, Math.max(0, SHOWN_IDEAS - wishes.length), Math.max(0, 3 - wishes.length), hasStock);
  const all: Idea[] = [...wishes, ...mixed.map(({ score: _s, topf: _t, group: _g, ...i }) => (void _s, void _t, void _g, i))];
  return all.filter(
    (i) =>
      !ctx.dismissed.includes(i.id) &&
      (!filters.includes("schnell") || (i.minutes !== null && i.minutes <= 25)) &&
      (!filters.includes("veggie") || i.category === "vegetarisch") &&
      (!filters.includes("vorrat") || i.uses.length > 0),
  );
}

/** Gerichte der letzten 14 Tage aus dem Plan (auch ausgeblendeter Plan zählt) */
export function recentDishes(
  date: string,
  profile: HouseholdProfile,
  weekPlans: Record<string, WeekPlan>,
  mealPlans: Record<string, Record<string, StoredEntry>>,
  recipes: Record<string, Recipe>,
): string[] {
  const shoppingDay = profile.shoppingDay || "Montag";
  const from = addDays(date, -RECENT_DAYS);
  const starts = new Set<string>();
  for (let d = from; d <= date; d = addDays(d, 7)) starts.add(weekStartFor(new Date(`${d}T12:00:00`), shoppingDay));
  starts.add(weekStartFor(new Date(`${date}T12:00:00`), shoppingDay));
  const titles: string[] = [];
  for (const start of starts) {
    for (const d of composeWeek(start, profile, weekPlans, mealPlans, recipes).days) {
      if (d.date >= from && d.date < date && d.slot.entry) titles.push(d.slot.entry.title);
    }
  }
  return titles;
}
