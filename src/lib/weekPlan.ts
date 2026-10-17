// Vorgaben für eine konkrete Woche (Wochen-Check). Vorausgefüllt aus der
// Standardwoche des Profils, pro Woche anpassbar. Gespeichert lokal wie das
// Profil – versioniert, mit Migration, später auf Supabase umstellbar.

import { useSyncExternalStore } from "react";
import { createLocalStore } from "./localStore";
import type { RecipeCategory } from "./cookbook";
import {
  WEEKDAYS,
  wishDayKids,
  wishDayOrder,
  type HouseholdProfile,
  type WeekRules,
  type WishMeal,
} from "./profile";

/** Wunsch eines Kindes – feste Vorgabe für einen Tag, zählt nicht bei Fleisch/Veggie/Fisch */
export type WeekWish = {
  kidId: string;
  /** Was sich das Kind wünscht; darf leer bleiben (wird später nachgetragen) */
  text: string;
  weekday: string;
  meal: WishMeal;
};

/** Festes Gericht aus dem Kochbuch für einen Tag dieser Woche */
export type FixedMeal = {
  id: string;
  weekday: string;
  meal: WishMeal;
  recipeId: string;
  /** Titel und Kategorie zum Zeitpunkt der Planung – bleibt lesbar, falls das Rezept gelöscht wird */
  title: string;
  category: RecipeCategory;
};

export type WeekPlan = WeekRules & {
  /** Montag der Woche als "YYYY-MM-DD" */
  weekStart: string;
  /** Wochentage mit Ausflug / auswärts essen – dann kein Gericht planen */
  awayDays: string[];
  /** Budget in Euro, null = keine Angabe */
  budgetEuro: number | null;
  /** Freitext "Besondere Wünsche" */
  wishes: string;
  /** Wunschtag dieser Woche, null = kein Wunschtag */
  wish: WeekWish | null;
  /** Feste Gerichte aus dem Kochbuch; zählen in ihre Kategorie */
  fixedMeals: FixedMeal[];
  updatedAt: string;
};

type WeekPlanStore = {
  version: 3;
  /** Vorgaben je Woche, Schlüssel = weekStart */
  weeks: Record<string, WeekPlan>;
};

const STORAGE_KEY = "wasgibts.wochenvorgaben";

// --- Datum ------------------------------------------------------------------

/** Lokales Datum als "YYYY-MM-DD" */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Die Planungswoche beginnt am Einkaufstag (Profil, Standard Montag) und
// dauert 7 Tage. Gespeichert wird je Woche unter dem Datum ihres ersten Tags.

export const DEFAULT_SHOPPING_DAY = "Montag";

/** Datum `days` Tage nach `iso` */
export function addDays(iso: string, days: number): string {
  const date = fromIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** Wochentag-Name ("Montag" …) eines Datums */
export function weekdayName(date: Date): string {
  return WEEKDAYS[(date.getDay() + 6) % 7];
}

/** Beginn der Planungswoche, in der `today` liegt (letzter Einkaufstag ≤ heute) */
export function weekStartFor(today: Date, shoppingDay: string): string {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = Math.max(0, WEEKDAYS.indexOf(shoppingDay));
  const current = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - ((current - target + 7) % 7));
  return toIsoDate(date);
}

/** Beginn der nächsten Planungswoche (nächster Einkaufstag) */
export function nextWeekStartFor(today: Date, shoppingDay: string): string {
  return addDays(weekStartFor(today, shoppingDay), 7);
}

/**
 * Welche Woche gerade zu planen ist: ab 2 Tage vor dem nächsten Einkaufstag
 * die nächste Woche, vorher die laufende.
 */
export function planningWeekStart(today: Date, shoppingDay: string): { weekStart: string; isNext: boolean } {
  const next = nextWeekStartFor(today, shoppingDay);
  const isNext = toIsoDate(today) >= addDays(next, -2);
  return { weekStart: isNext ? next : weekStartFor(today, shoppingDay), isNext };
}

/** Ist `iso` ein gültiges Datum, das auf den Einkaufstag fällt? */
export function isWeekStartIso(iso: string | null, shoppingDay: string): iso is string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const date = fromIsoDate(iso);
  return toIsoDate(date) === iso && weekdayName(date) === shoppingDay;
}

/** Die 7 Wochentag-Namen der Woche in Reihenfolge ab `weekStart` */
export function weekDayNames(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => weekdayName(fromIsoDate(addDays(weekStart, i))));
}

/**
 * Gespeicherte Woche zu `weekStart` finden. Nach einem Wechsel des
 * Einkaufstags passen die Schlüssel nicht mehr genau – dann zählt die Woche,
 * in deren 7 Tage `weekStart` fällt (bisherige Daten bleiben nutzbar).
 */
export function resolveWeekKey(keys: string[], weekStart: string): string | undefined {
  if (keys.includes(weekStart)) return weekStart;
  return keys
    .filter((key) => key <= weekStart && weekStart < addDays(key, 7))
    .sort()
    .pop();
}

/** z. B. "20.10. – 26.10." */
export function formatWeekRange(weekStart: string): string {
  const start = fromIsoDate(weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) => `${d.getDate()}.${d.getMonth() + 1}.`;
  return `${fmt(start)} – ${fmt(end)}`;
}

const noop = () => () => {};

/**
 * Heutiges Datum, erst im Browser bekannt (beim statischen Vorrendern
 * `undefined`, damit kein falsches Datum ins HTML gebacken wird).
 */
export function useToday(): Date | undefined {
  const iso = useSyncExternalStore(
    noop,
    () => toIsoDate(new Date()),
    () => undefined,
  );
  return iso ? fromIsoDate(iso) : undefined;
}

// --- Vorgaben ---------------------------------------------------------------

export function createWeekPlan(weekStart: string, rules: WeekRules): WeekPlan {
  return {
    meatDays: rules.meatDays,
    vegetarianDays: rules.vegetarianDays,
    fishDays: rules.fishDays,
    cheatDay: rules.cheatDay,
    cheatDayWeekday: rules.cheatDayWeekday,
    weekStart,
    awayDays: [],
    budgetEuro: null,
    wishes: "",
    wish: null,
    fixedMeals: [],
    updatedAt: "",
  };
}

type CountKey = "meatDays" | "vegetarianDays" | "fishDays";

/** Kategorie eines Rezepts → Zähler im Wochen-Check (Cheat Day zählt nicht mit) */
export const CATEGORY_COUNT_KEY: Partial<Record<RecipeCategory, CountKey>> = {
  fleisch: "meatDays",
  vegetarisch: "vegetarianDays",
  fisch: "fishDays",
};

/** Wie viele feste Gerichte je Kategorie – Untergrenze für die Zähler */
export function fixedMealCounts(plan: Pick<WeekPlan, "fixedMeals">): Record<CountKey, number> {
  const counts = { meatDays: 0, vegetarianDays: 0, fishDays: 0 };
  for (const meal of plan.fixedMeals) {
    const key = CATEGORY_COUNT_KEY[meal.category];
    if (key) counts[key]++;
  }
  return counts;
}

/** Ist der Wunschtag in dieser Woche wirksam (nicht auf einem Ausflugstag)? */
export function wishIsActive(plan: Pick<WeekPlan, "awayDays" | "wish">): boolean {
  return Boolean(plan.wish && !plan.awayDays.includes(plan.wish.weekday));
}

/** Tage für Fleisch/Veggie/Fisch: 7 minus Ausflugstage minus Wunschtag */
export function availableDays(plan: Pick<WeekPlan, "awayDays" | "wish">): number {
  return 7 - plan.awayDays.length - (wishIsActive(plan) ? 1 : 0);
}

/**
 * Welches Kind ist in dieser Woche mit dem Wunsch dran? Reihum in der
 * gespeicherten Reihenfolge – nach dem Kind, das zuletzt (vor dieser Woche)
 * gewünscht hat. Wer zu jung ist, wird übersprungen.
 */
export function wishKidForWeek(
  profile: HouseholdProfile,
  weeks: Record<string, WeekPlan>,
  weekStart: string,
): string | null {
  const lastKidId = Object.keys(weeks)
    .filter((key) => key < weekStart && weeks[key].wish)
    .sort()
    .map((key) => weeks[key].wish!.kidId)
    .pop();
  return nextWishKid(profile, lastKidId ?? null);
}

/** Nächstes teilnehmende Kind nach `currentId` (ringsum); ohne `currentId` das erste. */
export function nextWishKid(profile: HouseholdProfile, currentId: string | null): string | null {
  const eligible = wishDayKids(profile);
  if (eligible.length === 0) return null;
  const order = wishDayOrder(profile);
  const start = currentId ? order.findIndex((k) => k.id === currentId) : -1;
  for (let step = 1; step <= order.length; step++) {
    const kid = order[(start + step + order.length) % order.length];
    if (eligible.includes(kid)) return kid.id;
  }
  return eligible[0].id;
}

function migrateStore(raw: unknown): WeekPlanStore | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as { version?: number; weeks?: Record<string, unknown> };
  // v1 kannte noch keinen Wunschtag (wish = null), v1/v2 keine festen Gerichte.
  if (![1, 2, 3].includes(data.version as number) || !data.weeks || typeof data.weeks !== "object")
    return null;
  const weeks: Record<string, WeekPlan> = {};
  for (const [key, week] of Object.entries(data.weeks)) {
    if (!week || typeof week !== "object") continue;
    const w = week as Partial<WeekPlan>;
    const num = (v: unknown, fallback: number) => (typeof v === "number" ? v : fallback);
    weeks[key] = {
      weekStart: key,
      meatDays: num(w.meatDays, 0),
      vegetarianDays: num(w.vegetarianDays, 0),
      fishDays: num(w.fishDays, 0),
      cheatDay: w.cheatDay === true,
      cheatDayWeekday: typeof w.cheatDayWeekday === "string" ? w.cheatDayWeekday : "",
      awayDays: Array.isArray(w.awayDays)
        ? w.awayDays.filter((d) => WEEKDAYS.includes(d))
        : [],
      budgetEuro: typeof w.budgetEuro === "number" ? w.budgetEuro : null,
      wishes: typeof w.wishes === "string" ? w.wishes : "",
      wish: migrateWish(w.wish),
      fixedMeals: Array.isArray(w.fixedMeals) ? w.fixedMeals.filter(isFixedMeal) : [],
      updatedAt: typeof w.updatedAt === "string" ? w.updatedAt : "",
    };
  }
  return { version: 3, weeks };
}

function isFixedMeal(raw: unknown): raw is FixedMeal {
  if (!raw || typeof raw !== "object") return false;
  const m = raw as Partial<FixedMeal>;
  return (
    typeof m.id === "string" &&
    typeof m.recipeId === "string" &&
    typeof m.title === "string" &&
    typeof m.weekday === "string" &&
    WEEKDAYS.includes(m.weekday) &&
    (m.meal === "mittags" || m.meal === "abends") &&
    ["fleisch", "vegetarisch", "fisch", "cheatday"].includes(m.category as string)
  );
}

function migrateWish(raw: unknown): WeekWish | null {
  if (!raw || typeof raw !== "object") return null;
  const w = raw as Partial<WeekWish>;
  if (typeof w.kidId !== "string") return null;
  return {
    kidId: w.kidId,
    text: typeof w.text === "string" ? w.text : "",
    weekday: typeof w.weekday === "string" && WEEKDAYS.includes(w.weekday) ? w.weekday : "Freitag",
    meal: w.meal === "mittags" ? "mittags" : "abends",
  };
}

const store = createLocalStore(STORAGE_KEY, migrateStore);

export function saveWeekPlan(plan: WeekPlan): void {
  const current = store.load() ?? { version: 3 as const, weeks: {} };
  store.save({
    ...current,
    weeks: {
      ...current.weeks,
      [plan.weekStart]: { ...plan, updatedAt: new Date().toISOString() },
    },
  });
}

/** Vorgaben für `weekStart` (auch aus einer überlappenden älteren Woche), sonst null */
export function planForWeek(weeks: Record<string, WeekPlan>, weekStart: string): WeekPlan | null {
  const key = resolveWeekKey(Object.keys(weeks), weekStart);
  return key ? { ...weeks[key], weekStart } : null;
}

/** Alle gespeicherten Wochen (`undefined` = noch nicht geladen) */
export function useWeekPlans(): Record<string, WeekPlan> | undefined {
  const data = useSyncExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined) return undefined;
  return data?.weeks ?? EMPTY_WEEKS;
}

const EMPTY_WEEKS: Record<string, WeekPlan> = {};

/**
 * Gespeicherte Vorgaben für eine Woche:
 * `undefined` = noch nicht geladen, `null` = keine Vorgaben.
 */
export function useWeekPlan(weekStart: string | undefined): WeekPlan | null | undefined {
  const data = useSyncExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined || !weekStart) return undefined;
  return data ? planForWeek(data.weeks, weekStart) : null;
}
