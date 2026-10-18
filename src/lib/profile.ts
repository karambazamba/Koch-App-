// Datenmodell und Speicherung des Haushaltsprofils.
// Gespeichert wird vorerst nur lokal im Browser (localStorage). Alle Zugriffe
// laufen über loadProfile/saveProfile/clearProfile, damit später nur diese
// Datei auf Supabase umgestellt werden muss.

import { EMPTY_BASES, migrateBases, type BaseCounts } from "./bases";
import { createLocalStore } from "./localStore";

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

/** Stimme des Küchenhelfers für die Sprachausgabe */
export type HelperVoice = "weiblich" | "maennlich";

/** Der Küchenhelfer: Name und Stimme (Profil v7) */
export type HelperSettings = {
  name: string;
  voice: HelperVoice;
};

/** Vorgeschlagene Namen – die Stimme passt automatisch */
export const HELPER_NAMES: { name: string; voice: HelperVoice }[] = [
  { name: "Lotte", voice: "weiblich" },
  { name: "Ida", voice: "weiblich" },
  { name: "Theo", voice: "maennlich" },
  { name: "Bruno", voice: "maennlich" },
];

export const HELPER_NAME_MAX = 20;

export const DEFAULT_HELPER: HelperSettings = { name: "Lotte", voice: "weiblich" };

/** Name des Küchenhelfers (leer → Lotte) */
export function helperName(profile: Pick<HouseholdProfile, "helper"> | null | undefined): string {
  return profile?.helper.name.trim() || DEFAULT_HELPER.name;
}

/** "deine Küchenhelferin" bzw. "dein Küchenhelfer" – passend zur Stimme */
export function helperTitle(profile: Pick<HouseholdProfile, "helper"> | null | undefined): string {
  return (profile?.helper ?? DEFAULT_HELPER).voice === "maennlich" ? "dein Küchenhelfer" : "deine Küchenhelferin";
}

/** Mitteilung im Namen des Küchenhelfers, z. B. "Lotte: Heute gibt's Gulasch" (auch für Push) */
export function helperMessage(profile: Pick<HouseholdProfile, "helper"> | null | undefined, text: string): string {
  return `${helperName(profile)}: ${text}`;
}

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

/** Für wen gekocht wird (Profil v14) – Sprache, Portionen, Kinder-Funktionen */
export type HouseholdType = "single" | "paar" | "familie" | "wg";

export const HOUSEHOLD_TYPES: { value: HouseholdType; emoji: string; label: string }[] = [
  { value: "single", emoji: "🙋", label: "Nur für mich" },
  { value: "paar", emoji: "👫", label: "Zu zweit" },
  { value: "familie", emoji: "👨‍👩‍👧‍👦", label: "Familie mit Kindern" },
  { value: "wg", emoji: "🏠", label: "WG/Mehrpersonen" },
];

/** Aus den Personen ableiten (bestehende Profile, Formular) */
export function deriveHouseholdType(adults: number, kids: number): HouseholdType {
  if (kids > 0) return "familie";
  if (adults <= 1) return "single";
  if (adults === 2) return "paar";
  return "wg";
}

/**
 * Typ passend halten, wenn sich die Personen ändern: Kinder → Familie, mehr
 * Leute als "Nur für mich"/"Zu zweit" → Zu zweit bzw. WG. Sonst bleibt die Wahl
 * (Kinder-Funktionen hängen ohnehin an `hasKids`).
 */
export function fitHouseholdType(type: HouseholdType, persons: Pick<Person, "role">[]): HouseholdType {
  const kids = persons.filter((p) => p.role === "kind").length;
  const adults = persons.length - kids;
  if (kids > 0) return "familie";
  if (type === "single" && adults > 1) return deriveHouseholdType(adults, 0);
  if (type === "paar" && adults > 2) return "wg";
  return type;
}

/** Kinder im Haushalt? (Wunschtag, Kinder-Schritte, Kita/Schule …) */
export function hasKids(profile: Pick<HouseholdProfile, "persons">): boolean {
  return profile.persons.some((p) => p.role === "kind");
}

/** Stehen schon Gerichte im Wochenplan? (nur für die Migration auf v16, liest den Speicher direkt) */
function hasPlannedMeals(): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    const raw = JSON.parse(localStorage.getItem("wasgibts.wochenplan") ?? "null") as { weeks?: Record<string, Record<string, { kind?: string }>> } | null;
    return Object.values(raw?.weeks ?? {}).some((w) => Object.values(w ?? {}).some((e) => e && (e.kind === "recipe" || e.kind === "text" || e.kind === "wish")));
  } catch {
    return false;
  }
}

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

/** Nur für mich → "du" statt "ihr" */
export function isSolo(profile: Pick<HouseholdProfile, "householdType"> | null | undefined): boolean {
  return profile?.householdType === "single";
}

/** Kleiner Haushalt (1–2 Personen): kleine Mengen, Reste bewusst einplanen */
export function isSmallHousehold(profile: Pick<HouseholdProfile, "householdType">): boolean {
  return profile.householdType === "single" || profile.householdType === "paar";
}

/** "eure Familie" / "dein Haushalt" / "euer Haushalt" */
export function householdNoun(profile: Pick<HouseholdProfile, "householdType"> | null | undefined): { noun: string; your: string } {
  const type = profile?.householdType ?? "familie";
  if (type === "familie") return { noun: "Familie", your: "eure Familie" };
  if (type === "single") return { noun: "Haushalt", your: "dein Haushalt" };
  return { noun: "Haushalt", your: "euer Haushalt" };
}

/** Küchenmaschine mit Kochfunktion (Profil v14) */
export type KitchenMachine = "keine" | "thermomix";

/** Wie oft Tipps auf Lottes Platz kommen (Profil v13) */
export type TipLevel = "aus" | "ab_und_zu" | "taeglich";

export const TIP_LEVELS: { value: TipLevel; label: string; hint: string }[] = [
  { value: "aus", label: "Aus", hint: "Keine Tipps auf der Startseite" },
  { value: "ab_und_zu", label: "Ab und zu", hint: "An höchstens 4 Tagen pro Woche" },
  { value: "taeglich", label: "Täglich", hint: "Jeden Tag, wenn nichts Wichtigeres ansteht" },
];

/** Uhrzeit "HH:MM" je Essenszeit (Profil v10) */
export type MealClock = Record<MealTime, string>;

export const DEFAULT_MEAL_CLOCK: MealClock = { mittags: "12:30", abends: "18:30" };

/** Wie die Familie am Wochenende ist (Profil v11) */
export type WeekendStyle = "frei" | "locker" | "normal";

export const WEEKEND_STYLES: { value: WeekendStyle; emoji: string; label: string; hint: string }[] = [
  { value: "frei", emoji: "🏖", label: "Frei", hint: "Sa/So nichts planen, keine Hinweise – nur auf Nachfrage" },
  { value: "locker", emoji: "🌿", label: "Locker", hint: "Höchstens eine Idee pro Tag, ohne Uhrzeit und ohne Erinnerungen" },
  { value: "normal", emoji: "📅", label: "Wie unter der Woche", hint: "Ganz normal planen" },
];

/** Wie die Familie kocht (Profil v12): nach Gefühl oder lieber nach Rezept */
export type CookingStyle = "gefuehl" | "rezept";

export const COOKING_STYLES: { value: CookingStyle; label: string; hint: string }[] = [
  { value: "gefuehl", label: "Wir kochen meist nach Gefühl", hint: "Bei bekannten Gerichten reicht der Name – das Rezept gibt's auf Antippen" },
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

export type HouseholdProfile = {
  version: 16;
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
  /** Ansicht (Profil v15, Standard "warm") */
  theme: AppTheme;
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
  updatedAt: string;
};

/** Wie ihr kocht: mit Plan, spontan oder mal so, mal so (Profil v16) */
export type PlanStyle = "plan" | "spontan" | "mix";

export const PLAN_STYLES: { value: PlanStyle; label: string; hint: string }[] = [
  { value: "plan", label: "Ich plane gern", hint: "Wochenplan, Einkaufstag und Liste für die ganze Woche." },
  { value: "spontan", label: "Ich koche spontan", hint: "Kein Plan – jeden Tag frische Ideen, die Liste nur bei Bedarf." },
  { value: "mix", label: "Mal so, mal so", hint: "Plan, wenn ihr Lust habt – freie Tage sind ganz normal." },
];

/** Ansicht der App (Profil v15) – "auto" folgt Hell/Dunkel des Handys */
export type AppTheme = "warm" | "nacht" | "frisch" | "auto";

export const APP_THEMES: { value: AppTheme; label: string; hint: string }[] = [
  { value: "warm", label: "Warm", hint: "Hell und gemütlich" },
  { value: "nacht", label: "Nacht", hint: "Dunkel, schont die Augen" },
  { value: "frisch", label: "Frisch", hint: "Hell mit Grün" },
  { value: "auto", label: "Automatisch", hint: "Wie das Handy: hell = Warm, dunkel = Nacht" },
];

/** Wie oft sich Lotte von selbst meldet (Profil v15) */
export type HelperMode = "locker" | "normal" | "dranbleiben";

export const HELPER_MODES: { value: HelperMode; label: string; hint: string }[] = [
  { value: "locker", label: "Ganz locker", hint: "Meldet sich selten – nur wenn's wirklich zeitkritisch ist." },
  { value: "normal", label: "Normal", hint: "Freundliche Erinnerungen, wenn sie helfen." },
  { value: "dranbleiben", label: "Dranbleiben", hint: "Schubst öfter und hilft beim Planen – immer freundlich." },
];

/** Einfach = nur das Wichtigste, Alles zeigen = auch Details (Profil v15) */
export type DisplayMode = "einfach" | "alles";

export const DISPLAY_MODES: { value: DisplayMode; label: string; hint: string }[] = [
  { value: "einfach", label: "Einfach", hint: "Nur das Wichtigste – seltene Einstellungen und Kosten-Schätzungen bleiben weg." },
  { value: "alles", label: "Alles zeigen", hint: "Alle Einstellungen und Details auf einen Blick." },
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

export const MEAL_TIME_LABELS: Record<MealTime, string> = {
  mittags: "mittags",
  abends: "abends",
};

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

export const KID_AGE_GROUP_LABELS: Record<KidAgeGroup, string> = {
  kleinkind: "Kleinkind",
  kitakind: "Kitakind",
  schulkind: "Schulkind",
};

/** "Montag" → Planungswoche als Kürzel, z. B. "Do–Mi" */
export function planningWeekLabel(shoppingDay: string): string {
  const start = Math.max(0, WEEKDAYS.indexOf(shoppingDay));
  const end = (start + 6) % 7;
  return `${WEEKDAYS[start].slice(0, 2)}–${WEEKDAYS[end].slice(0, 2)}`;
}

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
const STORAGE_KEY = "familienkueche.haushaltsprofil";

function newId(): string {
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
    version: 16,
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
    helperMode: "normal",
    display: "einfach",
    weekendIdeas: true,
    planStyle: "mix",
    planWeek: null,
    updatedAt: "",
  };
}

export function createWishDay(): WishDaySettings {
  return { enabled: false, weekday: "Freitag", minAge: 4, order: [] };
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

/**
 * Passt die Personenliste an die Anzahl Erwachsene/Kinder an.
 * Bereits erfasste Personen bleiben erhalten, überzählige fallen von hinten weg.
 */
export function syncPersons(
  persons: Person[],
  adults: number,
  kids: number,
): Person[] {
  const resize = (role: PersonRole, count: number) => {
    const existing = persons.filter((p) => p.role === role).slice(0, count);
    while (existing.length < count) existing.push(createPerson(role));
    return existing;
  };
  return [...resize("erwachsen", adults), ...resize("kind", kids)];
}

/** Rolle mit laufender Nummer, z. B. "Erwachsene:r 2" oder "Kind 1". */
export function personRoleLabel(person: Person, persons: Person[]): string {
  const sameRole = persons.filter((p) => p.role === person.role);
  const index = sameRole.findIndex((p) => p.id === person.id) + 1;
  return person.role === "erwachsen" ? `Erwachsene:r ${index}` : `Kind ${index}`;
}

/** Anzeigename: der eingetragene Name, sonst z. B. "Erwachsene:r 2". */
export function personLabel(person: Person, persons: Person[]): string {
  return person.name.trim() || personRoleLabel(person, persons);
}

/**
 * Mittagessen unter der Woche "wie üblich": Erwachsene zu Hause, Kita- und
 * Schulkinder in Kita/Schule, Kleinkinder zu Hause.
 */
export function usualLunch(person: Pick<Person, "role" | "ageGroup">): WeekdayLunch {
  if (person.role === "erwachsen") return "zuhause";
  return person.ageGroup === "kleinkind" ? "zuhause" : "auswaerts";
}

/** Wer isst unter der Woche mittags zu Hause – nach der Angabe jeder Person? */
export function weekdayLunchEaters(profile: HouseholdProfile): {
  atHome: Person[];
  sometimes: Person[];
  away: Person[];
} {
  const persons = syncPersons(profile.persons, profile.adults, profile.kids);
  const lunchOf = (p: Person): WeekdayLunch =>
    p.weekdayLunch ?? (p.role === "kind" ? "auswaerts" : "zuhause");
  return {
    atHome: persons.filter((p) => lunchOf(p) === "zuhause"),
    sometimes: persons.filter((p) => lunchOf(p) === "manchmal"),
    away: persons.filter((p) => lunchOf(p) === "auswaerts"),
  };
}

/**
 * Personenzahl fürs Mittagessen unter der Woche:
 * `min` = sicher zu Hause, `max` = inklusive "manchmal".
 */
export function weekdayLunchHeadcount(profile: HouseholdProfile): {
  min: number;
  max: number;
} {
  const { atHome, sometimes } = weekdayLunchEaters(profile);
  return { min: atHome.length, max: atHome.length + sometimes.length };
}

// --- Migration älterer Profile ----------------------------------------------

const KID_AGE_GROUPS: KidAgeGroup[] = ["kleinkind", "kitakind", "schulkind"];
const WEEKDAY_LUNCHES: WeekdayLunch[] = ["auswaerts", "zuhause", "manchmal"];

const pick = <T extends string>(value: unknown, allowed: T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

/** Version 1 kannte nur eine Antwort für alle Kinder. */
const V1_KIDS_LUNCH: Record<string, WeekdayLunch> = {
  ja: "auswaerts",
  teilweise: "manchmal",
  nein: "zuhause",
};

/**
 * Aus einer gespeicherten Angabe die Zeit, zu der meistens zusammen warm
 * gegessen wird. v1/v2: einzelner Wert, v3–v5: Liste ("mittags", "abends",
 * beides oder "flexibel"), ab v6: "mittags" | "abends".
 * Eindeutig mittags/abends bleibt; beides oder "mal so, mal so" → `fallback`
 * (unter der Woche abends, am Wochenende mittags).
 */
export function normalizeMealTime(value: unknown, fallback: MealTime): MealTime {
  const list = Array.isArray(value) ? value : [value];
  const lunch = list.includes("mittags");
  const dinner = list.includes("abends");
  if (lunch && !dinner) return "mittags";
  if (dinner && !lunch) return "abends";
  return fallback;
}

/**
 * Bringt gespeicherte Profile (auch ältere Versionen) auf den aktuellen Stand
 * und ergänzt fehlende Felder mit Standardwerten.
 */
export function migrateProfile(raw: unknown): HouseholdProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].includes(data.version as number)) return null;

  const defaults = createEmptyProfile();

  // v1: eine Einstellung für alle Tage → gilt für Woche und Wochenende.
  const oldWarmMeal = data.warmMeal;
  const oldSchedule =
    oldWarmMeal && typeof oldWarmMeal === "object" && !Array.isArray(oldWarmMeal)
      ? (oldWarmMeal as Record<string, unknown>)
      : { weekday: oldWarmMeal, weekend: oldWarmMeal };
  const warmMeal: WarmMealSchedule = {
    weekday: normalizeMealTime(oldSchedule.weekday, defaults.warmMeal.weekday),
    weekend: normalizeMealTime(oldSchedule.weekend, defaults.warmMeal.weekend),
  };

  const kidLunchFallback =
    V1_KIDS_LUNCH[data.kidsLunchAway as string] ?? "auswaerts";

  const persons = (Array.isArray(data.persons) ? data.persons : []).map(
    (p: Partial<Person>): Person => {
      const role: PersonRole = p.role === "kind" ? "kind" : "erwachsen";
      const person: Person = {
        id: typeof p.id === "string" ? p.id : newId(),
        role,
        name: typeof p.name === "string" ? p.name : "",
        allergies: Array.isArray(p.allergies) ? p.allergies : [],
        dislikes: Array.isArray(p.dislikes) ? p.dislikes : [],
      };
      if (role === "kind") {
        person.ageGroup = pick(p.ageGroup, KID_AGE_GROUPS, "kitakind");
        person.age = typeof p.age === "number" ? p.age : null;
        person.weekdayLunch = pick(p.weekdayLunch, WEEKDAY_LUNCHES, kidLunchFallback);
      } else {
        // Bis v2 wurden Erwachsene nicht gefragt und zählten als "zu Hause".
        person.weekdayLunch = pick(p.weekdayLunch, WEEKDAY_LUNCHES, "zuhause");
        person.employed = typeof p.employed === "boolean" ? p.employed : null;
      }
      return person;
    },
  );

  const adults = typeof data.adults === "number" ? data.adults : defaults.adults;
  const kids = typeof data.kids === "number" ? data.kids : defaults.kids;

  return {
    ...defaults,
    householdName:
      typeof data.householdName === "string" ? data.householdName : "",
    adults,
    kids,
    persons: syncPersons(persons, adults, kids),
    favoriteDishes: Array.isArray(data.favoriteDishes)
      ? (data.favoriteDishes as string[])
      : [],
    warmMeal,
    weekRules: {
      ...defaults.weekRules,
      ...(data.weekRules as Partial<WeekRules> | undefined),
    },
    // Bis v3 gab es keinen Wunschtag → standardmäßig aus.
    wishDay: migrateWishDay(data.wishDay, defaults.wishDay),
    // Bis v4 lief die Woche immer Mo–So → Einkaufstag Montag.
    shoppingDay: pick(data.shoppingDay, WEEKDAYS, defaults.shoppingDay),
    // Bis v6 hatte der Küchenhelfer keinen Namen → Lotte.
    helper: migrateHelper(data.helper),
    // Bis v7 keine Basis-Statistik und keine "Nie wieder"-Liste
    bases: migrateBases(data.bases),
    neverAgain: migrateNeverAgain(data.neverAgain),
    // Bis v8 keine Lieblingszutaten und keine Gesundheits-Tipps-Einstellung
    likes: migrateLikes(data.likes),
    likesBlocked: Array.isArray(data.likesBlocked)
      ? (data.likesBlocked as unknown[]).filter((n): n is string => typeof n === "string").slice(0, 200)
      : [],
    healthTips: data.healthTips === "aus" || data.healthTips === "oefter" ? data.healthTips : "ab_und_zu",
    // Bis v9 keine Uhrzeiten → Standard 12:30 / 18:30
    mealClock: migrateMealClock(data.mealClock),
    // Bis v10: Wochenende "locker", keine Pause, kein Wetter
    weekendStyle: data.weekendStyle === "frei" || data.weekendStyle === "normal" ? data.weekendStyle : "locker",
    pause: migratePause(data.pause),
    weather: migrateWeather(data.weather),
    // Bis v11: nach Gefühl, ein neues Gericht pro Woche
    cookingStyle: data.cookingStyle === "rezept" ? "rezept" : "gefuehl",
    newPerWeek: data.newPerWeek === 2 ? 2 : 1,
    // Bis v12: Tipps "ab und zu"
    tips: data.tips === "aus" || data.tips === "taeglich" ? data.tips : "ab_und_zu",
    // Bis v13: aus den Personen ableiten (Kinder → Familie), keine Küchenmaschine
    householdType: HOUSEHOLD_TYPES.some((t) => t.value === data.householdType)
      ? (data.householdType as HouseholdType)
      : deriveHouseholdType(
          persons.filter((p) => p.role === "erwachsen").length || adults,
          persons.filter((p) => p.role === "kind").length || (persons.length ? 0 : kids),
        ),
    kitchenMachine: data.kitchenMachine === "thermomix" ? "thermomix" : "keine",
    // Bis v14: Warm, Normal, Einfach, Wochenend-Ideen an
    theme: APP_THEMES.some((t) => t.value === data.theme) ? (data.theme as AppTheme) : "warm",
    helperMode: HELPER_MODES.some((m) => m.value === data.helperMode) ? (data.helperMode as HelperMode) : "normal",
    display: data.display === "alles" ? "alles" : "einfach",
    weekendIdeas: data.weekendIdeas !== false,
    // Bis v15: wer schon Gerichte im Plan hat, plant gern – sonst "mal so, mal so"
    planStyle: PLAN_STYLES.some((p) => p.value === data.planStyle) ? (data.planStyle as PlanStyle) : hasPlannedMeals() ? "plan" : "mix",
    planWeek: typeof data.planWeek === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.planWeek) ? data.planWeek : null,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
  };
}

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

function migratePause(raw: unknown): PauseSettings | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<PauseSettings>;
  if (typeof p.from !== "string" || !ISO.test(p.from)) return null;
  return { from: p.from, until: typeof p.until === "string" && ISO.test(p.until) ? p.until : null };
}

function migrateWeather(raw: unknown): WeatherSettings {
  const w = (raw && typeof raw === "object" ? raw : {}) as Partial<WeatherSettings>;
  return { consent: w.consent === true, postcode: typeof w.postcode === "string" ? w.postcode.replace(/\D/g, "").slice(0, 5) : "" };
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

function migrateMealClock(raw: unknown): MealClock {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<MealClock>;
  return {
    mittags: typeof r.mittags === "string" && CLOCK.test(r.mittags) ? r.mittags : DEFAULT_MEAL_CLOCK.mittags,
    abends: typeof r.abends === "string" && CLOCK.test(r.abends) ? r.abends : DEFAULT_MEAL_CLOCK.abends,
  };
}

/** Uhrzeit des Hauptgerichts an diesem Wochentag, z. B. "18:30" */
export function mealClockFor(profile: Pick<HouseholdProfile, "warmMeal" | "mealClock">, weekday: string): string {
  return profile.mealClock[mainMealTime(profile, weekday)];
}

function migrateLikes(raw: unknown): LikedIngredient[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l): l is Partial<LikedIngredient> => Boolean(l) && typeof l === "object")
    .filter((l) => typeof l.name === "string" && l.name.trim() !== "")
    .map((l) => ({
      name: l.name!.trim().slice(0, 40),
      weight: typeof l.weight === "number" && l.weight > 0 ? Math.min(999, l.weight) : 1,
      ...(l.manual ? { manual: true } : {}),
    }))
    .slice(0, 200);
}

function migrateNeverAgain(raw: unknown): NeverAgainEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is Partial<NeverAgainEntry> => Boolean(e) && typeof e === "object")
    .filter((e) => typeof e.title === "string" && e.title.trim() !== "")
    .map((e) => ({
      id: typeof e.id === "string" ? e.id : newId(),
      title: e.title!.trim(),
      ingredients: Array.isArray(e.ingredients) ? e.ingredients.filter((i): i is string => typeof i === "string").slice(0, 8) : [],
      reason: typeof e.reason === "string" ? e.reason.slice(0, 200) : "",
      addedAt: typeof e.addedAt === "string" ? e.addedAt : "",
      ...(e.recipe && typeof e.recipe === "object" ? { recipe: e.recipe } : {}),
    }));
}

function migrateHelper(raw: unknown): HelperSettings {
  if (!raw || typeof raw !== "object") return DEFAULT_HELPER;
  const h = raw as Partial<HelperSettings>;
  const name = typeof h.name === "string" ? h.name.trim().slice(0, HELPER_NAME_MAX) : "";
  return {
    name: name || DEFAULT_HELPER.name,
    voice: h.voice === "maennlich" ? "maennlich" : "weiblich",
  };
}

function migrateWishDay(raw: unknown, fallback: WishDaySettings): WishDaySettings {
  if (!raw || typeof raw !== "object") return fallback;
  const w = raw as Partial<WishDaySettings>;
  const { min, max } = LIMITS.wishMinAge;
  return {
    enabled: w.enabled === true,
    weekday: pick(w.weekday, WEEKDAYS, fallback.weekday),
    minAge:
      typeof w.minAge === "number" ? Math.min(max, Math.max(min, w.minAge)) : fallback.minAge,
    order: Array.isArray(w.order) ? w.order.filter((id) => typeof id === "string") : [],
  };
}

// --- Speicherung -----------------------------------------------------------

const store = createLocalStore(STORAGE_KEY, migrateProfile);

export const loadProfile = store.load;
export const clearProfile = store.clear;
export const subscribeProfile = store.subscribe;

export function saveProfile(profile: HouseholdProfile): HouseholdProfile {
  const persons = syncPersons(profile.persons, profile.adults, profile.kids);
  const toSave: HouseholdProfile = {
    ...profile,
    persons,
    // Reihenfolge fürs Wunschtag-Reihum mit den aktuellen Kindern abgleichen.
    wishDay: {
      ...profile.wishDay,
      order: wishDayOrder({ persons, wishDay: profile.wishDay }).map((k) => k.id),
    },
    updatedAt: new Date().toISOString(),
  };
  store.save(toSave);
  return toSave;
}
