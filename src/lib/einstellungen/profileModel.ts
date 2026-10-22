// Profil – das Modell: Personen, das Haushaltsprofil (Version), feste Listen
// und Grenzen sowie die Startwerte (createEmptyProfile). Begleitung, Haushalt
// und Essen haben eigene Dateien; Speichern und Migration in profileStore.ts.

import { EMPTY_BASES, type BaseCounts } from "../essen/bases";
import { DEFAULT_HELPER, type HelperMode, type HelperSettings } from "./profileHelper";
import type { HouseholdType } from "./profileHousehold";
import type {
  CookingStyle,
  HealthTipLevel,
  KitchenMachine,
  LikedIngredient,
  MixSuggest,
  NeverAgainEntry,
  NewDishesPerWeek,
  PauseSettings,
  PlanStyle,
  TipLevel,
  WeatherSettings,
  WeekendStyle,
} from "./profileFood";

export type PersonRole = "erwachsen" | "kind";

export type KidAgeGroup = "kleinkind" | "kitakind" | "schulkind";

/** Wo isst eine Person unter der Woche mittags? */
export type WeekdayLunch = "auswaerts" | "zuhause" | "manchmal";

export type Person = {
  id: string;
  role: PersonRole;
  name: string;
  allergies: string[];
  dislikes: string[];
  /** Nur bei Kindern: Altersgruppe */
  ageGroup?: KidAgeGroup;
  /** Nur bei Kindern: Alter in Jahren, freiwillig */
  age?: number | null;
  /** Mittagessen unter der Woche (Erwachsene und Kinder) */
  weekdayLunch?: WeekdayLunch;
  /** Nur bei Erwachsenen: berufstätig? Nur als Info, null = keine Angabe */
  employed?: boolean | null;
};

/** Tageszeit einer Mahlzeit */
export type MealTime = "mittags" | "abends";

/**
 * Wann die Familie meistens zusammen warm isst. Es wird immer nur EIN
 * Hauptgericht pro Tag geplant – die Zeit bestimmt nur, wer dabei ist
 * (Personenzahl) und die Anzeige, nicht die Anzahl der Plätze.
 */
export type WarmMealSchedule = {
  /** Montag bis Freitag */
  weekday: MealTime;
  /** Samstag und Sonntag */
  weekend: MealTime;
};

export type WeekRules = {
  /** Tage pro Woche mit Fleisch */
  meatDays: number;
  /** Tage pro Woche vegetarisch */
  vegetarianDays: number;
  /** Tage pro Woche mit Fisch */
  fishDays: number;
  cheatDay: boolean;
  /** Wochentag für den Cheat Day, leer = egal */
  cheatDayWeekday: string;
};

/** Wunschtag: Kinder dürfen sich reihum einmal pro Woche ein Gericht wünschen. */
export type WishDaySettings = {
  enabled: boolean;
  weekday: string;
  /** Mindestalter in Jahren */
  minAge: number;
  /** Reihenfolge der Kinder (IDs); wer teilnehmen darf, entscheidet das Alter */
  order: string[];
};

/** Uhrzeit "HH:MM" je Essenszeit (Profil v10) */
export type MealClock = Record<MealTime, string>;

export const DEFAULT_MEAL_CLOCK: MealClock = { mittags: "12:30", abends: "18:30" };

export type HouseholdProfile = {
  version: 20;
  householdName: string;
  adults: number;
  kids: number;
  persons: Person[];
  favoriteDishes: string[];
  warmMeal: WarmMealSchedule;
  weekRules: WeekRules;
  wishDay: WishDaySettings;
  /** Einkaufstag: ab hier läuft die Planungswoche 7 Tage */
  shoppingDay: string;
  /** Küchenhelfer: Name und Stimme */
  helper: HelperSettings;
  /** Wie oft welche Basis gewählt bzw. gut bewertet wurde (Profil v8) */
  bases: BaseCounts;
  /** "Nie wieder"-Liste (Profil v8) */
  neverAgain: NeverAgainEntry[];
  /** "Das mögt ihr": Lieblingszutaten, gewichtet (Profil v9) */
  likes: LikedIngredient[];
  /** Selbst entfernte Zutaten – werden nicht wieder gelernt */
  likesBlocked: string[];
  /** Gesundheits-Tipps (Profil v9, Standard "ab und zu") */
  healthTips: HealthTipLevel;
  /** Uhrzeit des gemeinsamen Essens (Profil v10) – für "HEUTE · 18:30" und Bewertung */
  mealClock: MealClock;
  /** Wochenend-Stil (Profil v11, Standard "locker") */
  weekendStyle: WeekendStyle;
  /** Pause-Modus (Profil v11), null = aus */
  pause: PauseSettings | null;
  /** Wetter für die Grill-Idee (Profil v11) */
  weather: WeatherSettings;
  /** Nach Gefühl oder nach Rezept (Profil v12, Standard "gefuehl") */
  cookingStyle: CookingStyle;
  /** Neue Gerichte pro Woche bei der Planung (Profil v12, Standard 1) */
  newPerWeek: NewDishesPerWeek;
  /** Tipps auf Lottes Platz (Profil v13, Standard "ab und zu") */
  tips: TipLevel;
  /** Für wen gekocht wird (Profil v14) */
  householdType: HouseholdType;
  /** Thermomix bzw. Küchenmaschine mit Kochfunktion (Profil v14) */
  kitchenMachine: KitchenMachine;
  /** Ansicht (Profil v15, Standard "warm" = Hell) */
  theme: AppTheme;
  /** Ansicht selbst gewählt (Profil v20) – sonst bleibt es bei Hell */
  themeSet: boolean;
  /** Wie oft sich Lotte meldet (Profil v15, Standard "normal") */
  helperMode: HelperMode;
  /** Darstellung (Profil v15, Standard "einfach") */
  display: DisplayMode;
  /** Wochenend-Ideen auf Lottes Platz (Profil v15, Standard an) */
  weekendIdeas: boolean;
  /** Planen oder spontan (Profil v16, Standard "mix") */
  planStyle: PlanStyle;
  /** Spontan, aber "nur diese Woche planen": erster Tag dieser Woche, sonst null */
  planWeek: string | null;
  /** "Mal so, mal so": darf Lotte vorschlagen? (Profil v17, Standard 2 Tage) */
  mixSuggest: MixSuggest;
  updatedAt: string;
};

/**
 * Darstellung (es gibt nur noch das warme Design): "auto" folgt Hell/Dunkel
 * des Handys, "warm" = Hell, "nacht" = Dunkel. Frühere Ansicht "Frisch" →
 * Automatisch.
 */
export type AppTheme = "auto" | "warm" | "nacht";

export const APP_THEMES: { value: AppTheme; label: string; hint: string }[] = [
  { value: "auto", label: "Automatisch", hint: "Wie das Handy – hell oder dunkel" },
  { value: "warm", label: "Hell", hint: "Warm und hell" },
  { value: "nacht", label: "Dunkel", hint: "Schont die Augen" },
];

/** Einfach = nur das Wichtigste, Alles zeigen = auch Details (Profil v15) */
type DisplayMode = "einfach" | "alles";

export const MEAL_TIME_LABELS: Record<MealTime, string> = {
  mittags: "mittags",
  abends: "abends",
};

export const KID_AGE_GROUP_LABELS: Record<KidAgeGroup, string> = {
  kleinkind: "Kleinkind",
  kitakind: "Kitakind",
  schulkind: "Schulkind",
};

export const WEEKDAYS = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

export const LIMITS = {
  adults: { min: 1, max: 8 },
  kids: { min: 0, max: 8 },
  daysPerWeek: { min: 0, max: 7 },
  kidAge: { min: 0, max: 17 },
  wishMinAge: { min: 0, max: 17 },
};

// Interner Schlüssel (alter Arbeitsname) – nicht ändern, sonst sind gespeicherte Profile weg.

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function createPerson(role: PersonRole): Person {
  const person: Person = { id: newId(), role, name: "", allergies: [], dislikes: [] };
  if (role === "kind") {
    person.ageGroup = "kitakind";
    person.age = null;
    person.weekdayLunch = "auswaerts";
  } else {
    person.weekdayLunch = "zuhause";
    person.employed = null;
  }
  return person;
}

export function createEmptyProfile(): HouseholdProfile {
  return {
    version: 20,
    householdName: "",
    adults: 2,
    kids: 1,
    persons: [
      createPerson("erwachsen"),
      createPerson("erwachsen"),
      createPerson("kind"),
    ],
    favoriteDishes: [],
    warmMeal: { weekday: "abends", weekend: "mittags" },
    weekRules: {
      meatDays: 2,
      vegetarianDays: 3,
      fishDays: 1,
      cheatDay: true,
      cheatDayWeekday: "Samstag",
    },
    wishDay: createWishDay(),
    shoppingDay: "Montag",
    helper: DEFAULT_HELPER,
    bases: EMPTY_BASES,
    neverAgain: [],
    likes: [],
    likesBlocked: [],
    healthTips: "ab_und_zu",
    mealClock: DEFAULT_MEAL_CLOCK,
    weekendStyle: "locker",
    pause: null,
    weather: { consent: false, postcode: "" },
    cookingStyle: "gefuehl",
    newPerWeek: 1,
    tips: "ab_und_zu",
    householdType: "familie",
    kitchenMachine: "keine",
    theme: "warm",
    themeSet: false,
    helperMode: "normal",
    display: "einfach",
    weekendIdeas: true,
    planStyle: "mix",
    planWeek: null,
    mixSuggest: "zwei",
    updatedAt: "",
  };
}

function createWishDay(): WishDaySettings {
  return { enabled: false, weekday: "Freitag", minAge: 4, order: [] };
}
