// Wochenplan: welche Gerichte an welchem Tag zu welcher Mahlzeit.
//
// Gespeichert (localStore, später Supabase) werden nur eigene Einträge und
// Änderungen. Feste Gerichte, Wunsch, Ausflugstage und Cheat Day kommen
// automatisch aus dem Wochen-Check; wer sie im Plan löscht oder verschiebt,
// überschreibt sie nur hier ("cleared" bzw. eigener Eintrag) – die Vorgaben
// im Wochen-Check bleiben unverändert.

import { useExternalStore } from "./useExternalStore";
import type { Recipe, RecipeCategory } from "./cookbook";
import { guessDishCategory } from "./dishCategory";
import { createLocalStore } from "./localStore";
import {
  personLabel,
  type HouseholdProfile,
  type WarmMeal,
  type WishMeal,
} from "./profile";
import {
  CATEGORY_COUNT_KEY,
  addDays,
  resolveWeekKey,
  weekDayNames,
  wishIsActive,
  type WeekPlan,
} from "./weekPlan";

export type SlotMeal = WishMeal;

/** Was im Plan gespeichert wird */
export type StoredEntry =
  | { kind: "recipe"; recipeId: string; title: string; category: RecipeCategory }
  | { kind: "text"; title: string; category: RecipeCategory | null }
  | { kind: "wish"; kidId: string; text: string }
  | { kind: "cleared" };

type MealPlanStore = {
  /** v2: Kategorie selbst eingetragener Gerichte kommt aus dem Gericht, nicht vom Platz-Hinweis */
  version: 2;
  /** Je Woche (Montag "YYYY-MM-DD") die Einträge je Platz "Montag|abends" */
  weeks: Record<string, Record<string, StoredEntry>>;
};

const STORAGE_KEY = "wasgibts.wochenplan";

export function slotKey(weekday: string, meal: SlotMeal): string {
  return `${weekday}|${meal}`;
}

export function parseSlotKey(key: string): { weekday: string; meal: SlotMeal } {
  const [weekday, meal] = key.split("|");
  return { weekday, meal: meal === "mittags" ? "mittags" : "abends" };
}

// --- Zusammengesetzte Woche ---------------------------------------------------

export type ResolvedEntry = {
  /** "eigen" = im Plan eingetragen, "fest"/"wunsch" = aus dem Wochen-Check */
  origin: "eigen" | "fest" | "wunsch";
  stored: Exclude<StoredEntry, { kind: "cleared" }>;
  title: string;
  category: RecipeCategory | null;
  recipeId?: string;
  /** Nur beim Wunsch */
  kidName?: string;
};

export type DaySlot = {
  key: string;
  meal: SlotMeal;
  entry: ResolvedEntry | null;
  /** Kategorie-Hinweis für freie Plätze, verteilt nach den Vorgaben */
  hint: RecipeCategory | null;
  /** Gibt es für den Platz etwas aus dem Wochen-Check? (dann löschen = überschreiben) */
  hasDerived: boolean;
};

export type PlanDay = {
  weekday: string;
  date: string;
  away: boolean;
  cheat: boolean;
  slots: DaySlot[];
};

export type PlanWeek = {
  weekStart: string;
  days: PlanDay[];
  /** Vorgaben aus dem Wochen-Check vorhanden? (sonst Standardwoche) */
  hasPlanRules: boolean;
  planned: number;
  total: number;
  counts: Record<"fleisch" | "vegetarisch" | "fisch", { planned: number; target: number }>;
};

/** Mahlzeiten-Plätze eines Tages laut Profil ("flexibel" = ein Platz) */
function baseMeals(slots: WarmMeal[] | undefined): SlotMeal[] {
  if (!slots || slots.includes("flexibel")) return ["abends"];
  return (["mittags", "abends"] as const).filter((m) => slots.includes(m));
}

export function buildWeek(
  weekStart: string,
  profile: HouseholdProfile | null,
  weekPlan: WeekPlan | null,
  stored: Record<string, StoredEntry>,
  recipes: Record<string, Recipe>,
): PlanWeek {
  const rules = weekPlan ?? profile?.weekRules;
  const activeWish = weekPlan && weekPlan.wish && wishIsActive(weekPlan) ? weekPlan.wish : null;

  const derivedFor = (weekday: string, meal: SlotMeal): ResolvedEntry | null => {
    if (activeWish && activeWish.weekday === weekday && activeWish.meal === meal) {
      const kid = profile?.persons.find((p) => p.id === activeWish.kidId);
      return {
        origin: "wunsch",
        stored: { kind: "wish", kidId: activeWish.kidId, text: activeWish.text },
        title: activeWish.text.trim() || "Wunsch noch offen",
        category: null,
        kidName: kid && profile ? personLabel(kid, profile.persons) : "Kind",
      };
    }
    const fixed = weekPlan?.fixedMeals.find((m) => m.weekday === weekday && m.meal === meal);
    if (fixed) {
      return {
        origin: "fest",
        stored: { kind: "recipe", recipeId: fixed.recipeId, title: fixed.title, category: fixed.category },
        title: recipes[fixed.recipeId]?.title ?? fixed.title,
        category: fixed.category,
        recipeId: fixed.recipeId,
      };
    }
    return null;
  };

  const resolveStored = (entry: Exclude<StoredEntry, { kind: "cleared" }>): ResolvedEntry => {
    if (entry.kind === "recipe") {
      const recipe = recipes[entry.recipeId];
      return {
        origin: "eigen",
        stored: entry,
        title: recipe?.title ?? entry.title,
        category: recipe?.category ?? entry.category,
        recipeId: entry.recipeId,
      };
    }
    if (entry.kind === "wish") {
      const kid = profile?.persons.find((p) => p.id === entry.kidId);
      return {
        origin: "eigen",
        stored: entry,
        title: entry.text.trim() || "Wunsch noch offen",
        category: null,
        kidName: kid && profile ? personLabel(kid, profile.persons) : "Kind",
      };
    }
    return { origin: "eigen", stored: entry, title: entry.title, category: entry.category };
  };

  // Die Woche beginnt am Einkaufstag, nicht unbedingt am Montag.
  const days: PlanDay[] = weekDayNames(weekStart).map((weekday, i) => {
    const weekend = weekday === "Samstag" || weekday === "Sonntag";
    const meals = new Set<SlotMeal>(
      baseMeals(weekend ? profile?.warmMeal.weekend : profile?.warmMeal.weekday),
    );
    // Plätze mit festen Einträgen gibt es immer, auch außerhalb der üblichen Zeiten.
    for (const meal of ["mittags", "abends"] as const) {
      const s = stored[slotKey(weekday, meal)];
      if ((s && s.kind !== "cleared") || derivedFor(weekday, meal)) meals.add(meal);
    }
    const slots: DaySlot[] = (["mittags", "abends"] as const)
      .filter((m) => meals.has(m))
      .map((meal) => {
        const key = slotKey(weekday, meal);
        const s = stored[key];
        const derived = derivedFor(weekday, meal);
        const entry = s ? (s.kind === "cleared" ? null : resolveStored(s)) : derived;
        return { key, meal, entry, hint: null, hasDerived: Boolean(derived) };
      });
    return {
      weekday,
      date: addDays(weekStart, i),
      away: Boolean(weekPlan?.awayDays.includes(weekday)),
      cheat: Boolean(rules?.cheatDay && rules.cheatDayWeekday === weekday),
      slots,
    };
  });

  // Zählen, was schon geplant ist
  const counts = {
    fleisch: { planned: 0, target: rules?.meatDays ?? 0 },
    vegetarisch: { planned: 0, target: rules?.vegetarianDays ?? 0 },
    fisch: { planned: 0, target: rules?.fishDays ?? 0 },
  };
  let planned = 0;
  let total = 0;
  for (const day of days) {
    if (day.away) continue;
    for (const slot of day.slots) {
      total++;
      if (!slot.entry) continue;
      planned++;
      const cat = slot.entry.category;
      if (cat && CATEGORY_COUNT_KEY[cat]) counts[cat as keyof typeof counts].planned++;
    }
  }

  // Hinweise für freie Tage: pro Tag ein Hauptplatz (abends, sonst mittags),
  // nur an Tagen ohne Gericht mit Kategorie, ohne Wunsch, nicht unterwegs.
  const remaining = {
    fleisch: Math.max(0, counts.fleisch.target - counts.fleisch.planned),
    vegetarisch: Math.max(0, counts.vegetarisch.target - counts.vegetarisch.planned),
    fisch: Math.max(0, counts.fisch.target - counts.fisch.planned),
  };
  let previous: RecipeCategory | null = null;
  for (const day of days) {
    if (day.away || day.slots.length === 0) continue;
    const main = day.slots.find((s) => s.meal === "abends") ?? day.slots[0];
    if (main.entry) continue;
    if (day.cheat) {
      main.hint = "cheatday";
      continue;
    }
    const dayTaken = day.slots.some(
      (s) => s.entry && (s.entry.category || s.entry.stored.kind === "wish"),
    );
    if (dayTaken) continue;
    // Kategorie mit dem meisten Rest, möglichst nicht zweimal hintereinander
    const options = (Object.keys(remaining) as (keyof typeof remaining)[])
      .filter((c) => remaining[c] > 0)
      .sort((a, b) => remaining[b] - remaining[a]);
    const pick = options.find((c) => c !== previous) ?? options[0];
    if (!pick) continue;
    main.hint = pick;
    remaining[pick]--;
    previous = pick;
  }

  return { weekStart, days, hasPlanRules: Boolean(weekPlan), planned, total, counts };
}

// --- Speicherung ------------------------------------------------------------

function migrateEntry(raw: unknown, version: number): StoredEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const cat = (v: unknown) =>
    ["fleisch", "vegetarisch", "fisch", "cheatday"].includes(v as string) ? (v as RecipeCategory) : null;
  switch (e.kind) {
    case "cleared":
      return { kind: "cleared" };
    case "recipe":
      return typeof e.recipeId === "string" && typeof e.title === "string"
        ? { kind: "recipe", recipeId: e.recipeId, title: e.title, category: cat(e.category) ?? "vegetarisch" }
        : null;
    case "text":
      if (typeof e.title !== "string") return null;
      // Bis v1 wurde der Platz-Hinweis als Kategorie übernommen ("Milchreis" → Fisch):
      // einmalig aus dem Gericht neu bestimmen, ohne Treffer keine Kategorie.
      return { kind: "text", title: e.title, category: version < 2 ? guessDishCategory(e.title) : cat(e.category) };
    case "wish":
      return typeof e.kidId === "string"
        ? { kind: "wish", kidId: e.kidId, text: typeof e.text === "string" ? e.text : "" }
        : null;
    default:
      return null;
  }
}

function migrateStore(raw: unknown): MealPlanStore | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as { version?: number; weeks?: Record<string, unknown> };
  if ((data.version !== 1 && data.version !== 2) || !data.weeks || typeof data.weeks !== "object") return null;
  const weeks: MealPlanStore["weeks"] = {};
  for (const [week, entries] of Object.entries(data.weeks)) {
    if (!entries || typeof entries !== "object") continue;
    weeks[week] = {};
    for (const [key, entry] of Object.entries(entries as Record<string, unknown>)) {
      const migrated = migrateEntry(entry, data.version);
      if (migrated) weeks[week][key] = migrated;
    }
  }
  return { version: 2, weeks };
}

const store = createLocalStore(STORAGE_KEY, migrateStore);

/** Wie `updateWeek`, aber rein: neue Wochen-Map zurückgeben */
export function mealPlansWithWeek(
  weeks: Record<string, Record<string, StoredEntry>>,
  weekStart: string,
  change: (entries: Record<string, StoredEntry>) => Record<string, StoredEntry>,
): Record<string, Record<string, StoredEntry>> {
  // Neue Woche (z. B. nach Wechsel des Einkaufstags) übernimmt die überlappenden Einträge.
  return { ...weeks, [weekStart]: change({ ...storedForWeek(weeks, weekStart) }) };
}

function updateWeek(
  weekStart: string,
  change: (entries: Record<string, StoredEntry>) => Record<string, StoredEntry>,
) {
  const current = store.load() ?? { version: 2 as const, weeks: {} };
  store.save({ ...current, weeks: mealPlansWithWeek(current.weeks, weekStart, change) });
}

// Reine Änderungen an den Einträgen einer Woche – genutzt vom Wochenplan und
// vom Küchenhelfer (Vorschau und Übernehmen), damit beide gleich rechnen.

/** Platz leeren; Einträge aus dem Wochen-Check werden dafür überschrieben. */
export function entriesWithoutSlot(entries: Record<string, StoredEntry>, slot: DaySlot): Record<string, StoredEntry> {
  const next = { ...entries };
  if (slot.hasDerived) next[slot.key] = { kind: "cleared" };
  else delete next[slot.key];
  return next;
}

/** Eintrag auf einen anderen Platz verschieben; ist der belegt, wird getauscht. */
export function entriesWithMove(
  entries: Record<string, StoredEntry>,
  from: DaySlot,
  to: DaySlot,
): Record<string, StoredEntry> {
  if (!from.entry || from.key === to.key) return entries;
  const next = { ...entries, [to.key]: from.entry.stored };
  if (to.entry) next[from.key] = to.entry.stored;
  else if (from.hasDerived) next[from.key] = { kind: "cleared" };
  else delete next[from.key];
  return next;
}

/** Eintrag auf einen Platz setzen (neu oder tauschen) */
export function setEntry(weekStart: string, key: string, entry: Exclude<StoredEntry, { kind: "cleared" }>) {
  updateWeek(weekStart, (entries) => ({ ...entries, [key]: entry }));
}

/** Platz leeren; Einträge aus dem Wochen-Check werden dafür überschrieben. */
export function clearSlot(weekStart: string, slot: DaySlot) {
  updateWeek(weekStart, (entries) => entriesWithoutSlot(entries, slot));
}

/** Eintrag auf einen anderen Platz verschieben; ist der belegt, wird getauscht. */
export function moveEntry(weekStart: string, from: DaySlot, to: DaySlot) {
  updateWeek(weekStart, (entries) => entriesWithMove(entries, from, to));
}

/** Alle Wochen auf einmal ersetzen (Küchenhelfer: Übernehmen/Rückgängig) */
export function replaceMealPlans(weeks: Record<string, Record<string, StoredEntry>>) {
  store.save({ version: 2, weeks });
}

const EMPTY: Record<string, StoredEntry> = {};

/** Gespeicherte Einträge aller Wochen (`undefined` = noch nicht geladen) */
export function useMealPlans(): Record<string, Record<string, StoredEntry>> | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined) return undefined;
  return data?.weeks ?? EMPTY_WEEKS;
}

const EMPTY_WEEKS: Record<string, Record<string, StoredEntry>> = {};

/** Einträge der Woche – nach Wechsel des Einkaufstags auch aus der überlappenden Woche */
export function storedForWeek(
  weeks: Record<string, Record<string, StoredEntry>>,
  weekStart: string,
): Record<string, StoredEntry> {
  const key = resolveWeekKey(Object.keys(weeks), weekStart);
  return key ? weeks[key] : EMPTY;
}
