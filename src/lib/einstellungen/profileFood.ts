// Profil – Essen: Kochstil, Planen oder spontan, Tipps, Essenszeiten,
// Wunschtag, Pause und Wochenende. Die Auswahl-Listen für die
// Einstellungen stehen jeweils neben ihrem Typ.

import { hasKids, weekdayLunchHeadcount } from "./profileHousehold";
import { WEEKDAYS, type HouseholdProfile, type MealTime, type Person } from "./profileModel";

/** Gericht, das nie wieder vorgeschlagen werden soll (👎 nach dem Kochen) */
export type NeverAgainEntry = {
  id: string;
  title: string;
  /** Hauptzutaten – damit auch sehr ähnliche Gerichte vermieden werden */
  ingredients: string[];
  /** Grund, z. B. "zu scharf"; leer = ohne Grund */
  reason: string;
  /** Wann eingetragen, "YYYY-MM-DD" */
  addedAt: string;
  /** Gelöschtes Rezept aus dem Kochbuch – beim Wiederherstellen zurück */
  recipe?: unknown;
};

/** Zutat, die die Familie mag – gelernt oder selbst eingetragen (Profil v9) */
export type LikedIngredient = {
  name: string;
  /** Gewicht: je öfter gemocht, desto höher */
  weight: number;
  /** Selbst eingetragen (nicht nur gelernt) */
  manual?: boolean;
};

/** Wie oft der Küchenhelfer sanfte Gesundheits-Tipps gibt */
export type HealthTipLevel = "aus" | "ab_und_zu" | "oefter";

export const HEALTH_TIP_LEVELS: { value: HealthTipLevel; label: string; hint: string }[] = [
  { value: "aus", label: "Aus", hint: "Keine Tipps" },
  { value: "ab_und_zu", label: "Ab und zu", hint: "Höchstens ein Tipp pro Woche" },
  { value: "oefter", label: "Gern öfter", hint: "Bis zu drei Tipps pro Woche" },
];

/** Küchenmaschine mit Kochfunktion (Profil v14) */
export type KitchenMachine = "keine" | "thermomix";

/** Wie oft Tipps auf Lottes Platz kommen (Profil v13) */
export type TipLevel = "aus" | "ab_und_zu" | "taeglich";

export const TIP_LEVELS: { value: TipLevel; label: string; hint: string }[] = [
  { value: "aus", label: "Aus", hint: "Keine Tipps auf der Startseite" },
  { value: "ab_und_zu", label: "Ab und zu", hint: "An höchstens 4 Tagen pro Woche" },
  { value: "taeglich", label: "Täglich", hint: "Jeden Tag, wenn nichts Wichtigeres ansteht" },
];

/** Wie die Familie am Wochenende ist (Profil v11) */
export type WeekendStyle = "frei" | "locker" | "normal";

/** Wie die Familie kocht (Profil v12): nach Gefühl oder lieber nach Rezept */
export type CookingStyle = "gefuehl" | "rezept";

export const COOKING_STYLES: { value: CookingStyle; label: string; hint: string }[] = [
  { value: "gefuehl", label: "Wir kochen meist nach Gefühl", hint: "Bei bekannten Gerichten reicht der Name – das Rezept gibt’s auf Antippen" },
  { value: "rezept", label: "Wir kochen gern nach Rezept", hint: "Das Rezept steht immer im Vordergrund" },
];

/** Wie viele neue Gerichte pro Woche (Abenteuerlust, Profil v12) */
export type NewDishesPerWeek = 1 | 2;

export const NEW_DISHES_OPTIONS: { value: NewDishesPerWeek; label: string; hint: string }[] = [
  { value: 1, label: "Lieber Bewährtes", hint: "Etwa ein neues Gericht pro Woche" },
  { value: 2, label: "Gern was Neues", hint: "Etwa zwei neue Gerichte pro Woche" },
];

/** Pause (Urlaub …): von – bis (bis = offen) */
export type PauseSettings = { from: string; until: string | null };

/** Grill-Idee bei gutem Wetter: nur mit Zustimmung, Ort grob per PLZ */
export type WeatherSettings = { consent: boolean; postcode: string };

/** Was Lotte bei "Mal so, mal so" von sich aus vorschlagen darf (Profil v17) */
export type MixSuggest = "nie" | "zwei" | "woche";

export const MIX_SUGGESTS: { value: MixSuggest; label: string; hint: string }[] = [
  { value: "nie", label: "Nie", hint: "Ich schlage nichts von mir aus vor – fragt einfach, wenn ihr was braucht." },
  { value: "zwei", label: "2 Tage", hint: "Ab und zu biete ich die nächsten 2 Tage an." },
  { value: "woche", label: "Ganze Woche", hint: "Ab und zu biete ich an, die nächste Woche vorzubereiten." },
];

/** Wie ihr kocht: mit Plan, spontan oder mal so, mal so (Profil v16) */
export type PlanStyle = "plan" | "spontan" | "mix";

export const PLAN_STYLES: { value: PlanStyle; label: string; hint: string }[] = [
  { value: "plan", label: "Ich plane gern", hint: "Wochenplan, Einkaufstag und Liste für die ganze Woche." },
  { value: "spontan", label: "Ich koche spontan", hint: "Kein Plan – jeden Tag frische Ideen, die Liste nur bei Bedarf." },
  { value: "mix", label: "Mal so, mal so", hint: "Plan, wenn ihr Lust habt – freie Tage sind ganz normal." },
];

export const COMMON_ALLERGIES = [
  "Gluten",
  "Laktose",
  "Ei",
  "Nüsse",
  "Erdnüsse",
  "Fisch",
  "Meeresfrüchte",
  "Soja",
  "Sellerie",
  "Senf",
  "Sesam",
];

/**
 * Welcher Planstil gilt heute? Spontan mit "nur diese Woche planen" zählt
 * in dieser Woche wie "mal so, mal so".
 */
export function effectivePlanStyle(profile: Pick<HouseholdProfile, "planStyle" | "planWeek"> | null | undefined, currentWeekStart?: string): PlanStyle {
  if (!profile) return "mix";
  if (profile.planStyle === "spontan" && profile.planWeek && currentWeekStart && profile.planWeek === currentWeekStart) return "mix";
  return profile.planStyle;
}

/** Wochenplan, Wochen-Check, Einkaufstag … sichtbar? (nicht bei "spontan") */
export function planningVisible(profile: Pick<HouseholdProfile, "planStyle" | "planWeek"> | null | undefined, currentWeekStart?: string): boolean {
  return effectivePlanStyle(profile, currentWeekStart) !== "spontan";
}

const WEEKEND = ["Samstag", "Sonntag"];

/** Wann es an diesem Wochentag das Hauptgericht gibt */
export function mainMealTime(profile: Pick<HouseholdProfile, "warmMeal"> | null, weekday: string): MealTime {
  if (!profile) return "abends";
  return WEEKEND.includes(weekday) ? profile.warmMeal.weekend : profile.warmMeal.weekday;
}

/**
 * Wie viele essen beim Hauptgericht mit? Mittags unter der Woche nur, wer
 * dann zu Hause ist (inkl. "manchmal"), sonst alle.
 */
export function mainMealHeadcount(profile: HouseholdProfile, weekday: string): number {
  const lunchOnWeekday = !WEEKEND.includes(weekday) && profile.warmMeal.weekday === "mittags";
  return Math.max(1, lunchOnWeekday ? weekdayLunchHeadcount(profile).max : profile.persons.length);
}

/** "Montag" → Planungswoche als Kürzel, z. B. "Do–Mi" */
export function planningWeekLabel(shoppingDay: string): string {
  const start = Math.max(0, WEEKDAYS.indexOf(shoppingDay));
  const end = (start + 6) % 7;
  return `${WEEKDAYS[start].slice(0, 2)}–${WEEKDAYS[end].slice(0, 2)}`;
}

/**
 * Darf das Kind beim Wunschtag mitmachen? Mit Alter: ab Mindestalter.
 * Ohne Alter: Schul- und Kitakinder ja, Kleinkinder nein.
 */
export function isWishDayEligible(person: Person, minAge: number): boolean {
  if (person.role !== "kind") return false;
  if (typeof person.age === "number") return person.age >= minAge;
  return person.ageGroup === "schulkind" || person.ageGroup === "kitakind";
}

/**
 * Reihenfolge aller Kinder für den Wunschtag: gespeicherte Reihenfolge,
 * neue Kinder hinten angehängt, entfernte Kinder fallen weg.
 */
export function wishDayOrder(profile: Pick<HouseholdProfile, "persons" | "wishDay">): Person[] {
  const kids = profile.persons.filter((p) => p.role === "kind");
  const known = profile.wishDay.order
    .map((id) => kids.find((k) => k.id === id))
    .filter((k): k is Person => Boolean(k));
  return [...known, ...kids.filter((k) => !known.includes(k))];
}

/** Kinder, die beim Wunschtag dran sein können – in Reihenfolge */
export function wishDayKids(profile: Pick<HouseholdProfile, "persons" | "wishDay">): Person[] {
  return wishDayOrder(profile).filter((k) => isWishDayEligible(k, profile.wishDay.minAge));
}

/** Kochtage der Standardwoche für Fleisch/Veggie/Fisch (Wunschtag zählt nicht mit) */
export function standardWeekDays(profile: Pick<HouseholdProfile, "wishDay" | "persons">): number {
  return wishDayActive(profile) ? 6 : 7;
}

/** Wunschtag gilt nur mit Kindern im Haushalt */
export function wishDayActive(profile: Pick<HouseholdProfile, "wishDay" | "persons">): boolean {
  return profile.wishDay.enabled && hasKids(profile);
}

/** Ist an diesem Tag ("YYYY-MM-DD") Pause? */
export function pausedOn(profile: Pick<HouseholdProfile, "pause"> | null | undefined, iso: string): boolean {
  const p = profile?.pause;
  return Boolean(p && p.from <= iso && (!p.until || iso <= p.until));
}

/** Samstag oder Sonntag? */
export function isWeekendDay(weekday: string): boolean {
  return weekday === "Samstag" || weekday === "Sonntag";
}

/** Uhrzeit des Hauptgerichts an diesem Wochentag, z. B. "18:30" */
export function mealClockFor(profile: Pick<HouseholdProfile, "warmMeal" | "mealClock">, weekday: string): string {
  return profile.mealClock[mainMealTime(profile, weekday)];
}
