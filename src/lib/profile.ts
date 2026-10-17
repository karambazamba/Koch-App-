// Datenmodell und Speicherung des Haushaltsprofils.
// Gespeichert wird vorerst nur lokal im Browser (localStorage). Alle Zugriffe
// laufen über loadProfile/saveProfile/clearProfile, damit später nur diese
// Datei auf Supabase umgestellt werden muss.

export type PersonRole = "erwachsen" | "kind";

export type KidAgeGroup = "kleinkind" | "kitakind" | "schulkind";

/** Wo isst ein Kind unter der Woche mittags? */
export type KidLunch = "auswaerts" | "zuhause" | "manchmal";

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
  /** Nur bei Kindern: Mittagessen unter der Woche */
  weekdayLunch?: KidLunch;
};

export type WarmMeal = "mittags" | "abends" | "flexibel";

export type WarmMealSchedule = {
  /** Montag bis Freitag */
  weekday: WarmMeal;
  /** Samstag und Sonntag */
  weekend: WarmMeal;
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

export type HouseholdProfile = {
  version: 2;
  householdName: string;
  adults: number;
  kids: number;
  persons: Person[];
  favoriteDishes: string[];
  warmMeal: WarmMealSchedule;
  weekRules: WeekRules;
  updatedAt: string;
};

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

export const WARM_MEAL_LABELS: Record<WarmMeal, string> = {
  mittags: "mittags",
  abends: "abends",
  flexibel: "mal so, mal so",
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
};

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
  }
  return person;
}

export function createEmptyProfile(): HouseholdProfile {
  return {
    version: 2,
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
    updatedAt: "",
  };
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
 * Wer isst unter der Woche mittags zu Hause?
 * Kinder nach ihrer Angabe. Erwachsene zählen vorerst immer als "zu Hause",
 * weil das Profil für sie (noch) nicht danach fragt.
 */
export function weekdayLunchEaters(profile: HouseholdProfile): {
  atHome: Person[];
  sometimes: Person[];
  away: Person[];
} {
  const persons = syncPersons(profile.persons, profile.adults, profile.kids);
  const lunchOf = (p: Person): KidLunch =>
    p.role === "kind" ? (p.weekdayLunch ?? "auswaerts") : "zuhause";
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

const WARM_MEALS: WarmMeal[] = ["mittags", "abends", "flexibel"];
const KID_AGE_GROUPS: KidAgeGroup[] = ["kleinkind", "kitakind", "schulkind"];
const KID_LUNCHES: KidLunch[] = ["auswaerts", "zuhause", "manchmal"];

const pick = <T extends string>(value: unknown, allowed: T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

/** Version 1 kannte nur eine Antwort für alle Kinder. */
const V1_KIDS_LUNCH: Record<string, KidLunch> = {
  ja: "auswaerts",
  teilweise: "manchmal",
  nein: "zuhause",
};

/**
 * Bringt gespeicherte Profile (auch ältere Versionen) auf den aktuellen Stand
 * und ergänzt fehlende Felder mit Standardwerten.
 */
export function migrateProfile(raw: unknown): HouseholdProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (data.version !== 1 && data.version !== 2) return null;

  const defaults = createEmptyProfile();

  // v1: eine Einstellung für alle Tage → gilt für Woche und Wochenende.
  const oldWarmMeal = data.warmMeal;
  const warmMeal: WarmMealSchedule =
    typeof oldWarmMeal === "string"
      ? {
          weekday: pick(oldWarmMeal, WARM_MEALS, defaults.warmMeal.weekday),
          weekend: pick(oldWarmMeal, WARM_MEALS, defaults.warmMeal.weekend),
        }
      : {
          weekday: pick(
            (oldWarmMeal as Partial<WarmMealSchedule>)?.weekday,
            WARM_MEALS,
            defaults.warmMeal.weekday,
          ),
          weekend: pick(
            (oldWarmMeal as Partial<WarmMealSchedule>)?.weekend,
            WARM_MEALS,
            defaults.warmMeal.weekend,
          ),
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
        person.weekdayLunch = pick(p.weekdayLunch, KID_LUNCHES, kidLunchFallback);
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
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
  };
}

// --- Speicherung -----------------------------------------------------------

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedProfile: HouseholdProfile | null = null;

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function loadProfile(): HouseholdProfile | null {
  const raw = readStorage();
  // Gleiches Objekt zurückgeben, solange sich nichts geändert hat
  // (wichtig für useSyncExternalStore).
  if (raw === cachedRaw) return cachedProfile;
  cachedRaw = raw;
  cachedProfile = null;
  if (raw) {
    try {
      cachedProfile = migrateProfile(JSON.parse(raw));
    } catch {
      // Defekte Daten ignorieren – das Onboarding startet dann neu.
    }
  }
  return cachedProfile;
}

export function saveProfile(profile: HouseholdProfile): HouseholdProfile {
  const toSave: HouseholdProfile = {
    ...profile,
    persons: syncPersons(profile.persons, profile.adults, profile.kids),
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  listeners.forEach((listener) => listener());
  return toSave;
}

export function clearProfile(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  listeners.forEach((listener) => listener());
}

export function subscribeProfile(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
