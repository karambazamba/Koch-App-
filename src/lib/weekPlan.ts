// Vorgaben für eine konkrete Woche (Wochen-Check). Vorausgefüllt aus der
// Standardwoche des Profils, pro Woche anpassbar. Gespeichert lokal wie das
// Profil – versioniert, mit Migration, später auf Supabase umstellbar.

import { useSyncExternalStore } from "react";
import { createLocalStore } from "./localStore";
import { WEEKDAYS, type WeekRules } from "./profile";

export type WeekPlan = WeekRules & {
  /** Montag der Woche als "YYYY-MM-DD" */
  weekStart: string;
  /** Wochentage mit Ausflug / auswärts essen – dann kein Gericht planen */
  awayDays: string[];
  /** Budget in Euro, null = keine Angabe */
  budgetEuro: number | null;
  /** Freitext "Besondere Wünsche" */
  wishes: string;
  updatedAt: string;
};

type WeekPlanStore = {
  version: 1;
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

/** Der nächste Montag nach `today` (an einem Montag: der Montag in 7 Tagen). */
export function nextMonday(today: Date): string {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysUntil = ((8 - date.getDay()) % 7) || 7;
  date.setDate(date.getDate() + daysUntil);
  return toIsoDate(date);
}

/** Freitag bis Montag: Zeit, die nächste Woche zu planen. */
export function isPlanningTime(today: Date): boolean {
  return [5, 6, 0, 1].includes(today.getDay());
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
    updatedAt: "",
  };
}

/** Tage, an denen zu Hause gekocht wird */
export function availableDays(plan: Pick<WeekPlan, "awayDays">): number {
  return 7 - plan.awayDays.length;
}

function migrateStore(raw: unknown): WeekPlanStore | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<WeekPlanStore>;
  if (data.version !== 1 || !data.weeks || typeof data.weeks !== "object") return null;
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
      updatedAt: typeof w.updatedAt === "string" ? w.updatedAt : "",
    };
  }
  return { version: 1, weeks };
}

const store = createLocalStore(STORAGE_KEY, migrateStore);

export function saveWeekPlan(plan: WeekPlan): void {
  const current = store.load() ?? { version: 1 as const, weeks: {} };
  store.save({
    ...current,
    weeks: {
      ...current.weeks,
      [plan.weekStart]: { ...plan, updatedAt: new Date().toISOString() },
    },
  });
}

/**
 * Gespeicherte Vorgaben für eine Woche:
 * `undefined` = noch nicht geladen, `null` = keine Vorgaben.
 */
export function useWeekPlan(weekStart: string | undefined): WeekPlan | null | undefined {
  const data = useSyncExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined || !weekStart) return undefined;
  return data?.weeks[weekStart] ?? null;
}
