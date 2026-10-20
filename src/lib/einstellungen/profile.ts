// Datenmodell und Speicherung des Haushaltsprofils.
// Gespeichert wird vorerst nur lokal im Browser (localStorage). Alle Zugriffe
// laufen über loadProfile/saveProfile/clearProfile, damit später nur diese
// Datei auf Supabase umgestellt werden muss.

import { EMPTY_BASES, type BaseCounts } from "../essen/bases";

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

/** Stimme der Begleitung für die Sprachausgabe (folgt der Art) */
export type HelperVoice = "weiblich" | "maennlich";

/** Die Begleitung ist eine Assistentin oder ein Assistent (Anrede und Stimme) */
export type HelperArt = "assistentin" | "assistent";

/** Farbe des Begleitungs-Icons (die einzige frei wählbare Farbe der App) */
export type AvatarColor = "orange" | "nachtblau" | "himmelblau" | "lila" | "beere" | "rosa" | "koralle" | "senf" | "waldgruen" | "anthrazit";

export const AVATAR_COLORS: { id: AvatarColor; label: string; hex: string }[] = [
  { id: "orange", label: "Orange", hex: "#F26B21" },
  { id: "nachtblau", label: "Nachtblau", hex: "#2B4470" },
  { id: "himmelblau", label: "Himmelblau", hex: "#3B82C4" },
  { id: "lila", label: "Lila", hex: "#7357C4" },
  { id: "beere", label: "Beere", hex: "#A33B67" },
  { id: "rosa", label: "Rosa", hex: "#E06C9F" },
  { id: "koralle", label: "Koralle", hex: "#E8615A" },
  { id: "senf", label: "Senf", hex: "#C9962B" },
  { id: "waldgruen", label: "Waldgrün", hex: "#3F7A5A" },
  { id: "anthrazit", label: "Anthrazit", hex: "#3E3A37" },
];

export const avatarHex = (color: AvatarColor | undefined) => AVATAR_COLORS.find((c) => c.id === color)?.hex ?? AVATAR_COLORS[0].hex;

/**
 * Die Begleitung (Profil v19): Name, Art (Assistentin/Assistent → Anrede und
 * Stimme), Icon-Farbe. `voice` folgt immer der Art. Der Name ist eine
 * Nutzereinstellung – nie fest einbauen.
 */
export type HelperSettings = {
  name: string;
  art: HelperArt;
  voice: HelperVoice;
  farbe: AvatarColor;
};

/** Die beiden Standard-Begleitungen im Kennenlernen */
export const STANDARD_HELPERS: HelperSettings[] = [
  { name: "Mia", art: "assistentin", voice: "weiblich", farbe: "orange" },
  { name: "Theo", art: "assistent", voice: "maennlich", farbe: "nachtblau" },
];

export const HELPER_NAME_MAX = 20;

export const DEFAULT_HELPER: HelperSettings = STANDARD_HELPERS[0];

export const voiceForArt = (art: HelperArt): HelperVoice => (art === "assistent" ? "maennlich" : "weiblich");

/** Begleitung mit geänderter Art: Stimme wechselt mit */
export const helperWith = (h: HelperSettings, patch: Partial<Pick<HelperSettings, "name" | "art" | "farbe">>): HelperSettings => {
  const art = patch.art ?? h.art;
  return { ...h, ...patch, name: (patch.name ?? h.name).trim().slice(0, HELPER_NAME_MAX) || h.name, art, voice: voiceForArt(art) };
};

/** Name der Begleitung */
export function helperName(profile: Pick<HouseholdProfile, "helper"> | null | undefined): string {
  return profile?.helper.name.trim() || DEFAULT_HELPER.name;
}

export const helperArtOf = (profile: Pick<HouseholdProfile, "helper"> | null | undefined): HelperArt => profile?.helper.art ?? DEFAULT_HELPER.art;

/** "deine Assistentin" bzw. "dein Assistent" */
export function helperTitle(profile: Pick<HouseholdProfile, "helper"> | null | undefined): string {
  return helperArtOf(profile) === "assistent" ? "dein Assistent" : "deine Assistentin";
}

/** "deine persönliche Assistentin" bzw. "dein persönlicher Assistent" */

/** Mitteilung im Namen der Begleitung, z. B. "Mia: Heute gibt's Gulasch" (auch für Push) */
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

export type HouseholdProfile = {
  version: 19;
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
  /** "Mal so, mal so": darf Lotte vorschlagen? (Profil v17, Standard 2 Tage) */
  mixSuggest: MixSuggest;
  updatedAt: string;
};

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

/** Wie oft sich Lotte von selbst meldet (Profil v15) */
export type HelperMode = "locker" | "normal" | "dranbleiben";

export const HELPER_MODES: { value: HelperMode; label: string; hint: string }[] = [
  { value: "locker", label: "Ganz locker", hint: "Meldet sich selten – nur wenn’s wirklich zeitkritisch ist." },
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
    version: 19,
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
    theme: "auto",
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
function weekdayLunchEaters(profile: HouseholdProfile): {
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
