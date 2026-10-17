// Datenmodell und Speicherung des Haushaltsprofils.
// Gespeichert wird vorerst nur lokal im Browser (localStorage). Alle Zugriffe
// laufen über loadProfile/saveProfile/clearProfile, damit später nur diese
// Datei auf Supabase umgestellt werden muss.

export type PersonRole = "erwachsen" | "kind";

export type Person = {
  id: string;
  role: PersonRole;
  name: string;
  allergies: string[];
  dislikes: string[];
};

export type WarmMeal = "mittags" | "abends" | "flexibel";

export type KidsLunch = "ja" | "teilweise" | "nein";

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
  version: 1;
  householdName: string;
  adults: number;
  kids: number;
  persons: Person[];
  favoriteDishes: string[];
  warmMeal: WarmMeal;
  /** Nur relevant, wenn Kinder im Haushalt sind */
  kidsLunchAway: KidsLunch;
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
};

const STORAGE_KEY = "familienkueche.haushaltsprofil";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function createPerson(role: PersonRole): Person {
  return { id: newId(), role, name: "", allergies: [], dislikes: [] };
}

export function createEmptyProfile(): HouseholdProfile {
  return {
    version: 1,
    householdName: "",
    adults: 2,
    kids: 1,
    persons: [
      createPerson("erwachsen"),
      createPerson("erwachsen"),
      createPerson("kind"),
    ],
    favoriteDishes: [],
    warmMeal: "abends",
    kidsLunchAway: "ja",
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

/** Anzeigename, falls kein Name eingetragen wurde, z. B. "Erwachsene:r 2". */
export function personLabel(person: Person, persons: Person[]): string {
  if (person.name.trim()) return person.name.trim();
  const sameRole = persons.filter((p) => p.role === person.role);
  const index = sameRole.findIndex((p) => p.id === person.id) + 1;
  return person.role === "erwachsen" ? `Erwachsene:r ${index}` : `Kind ${index}`;
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
      const parsed = JSON.parse(raw) as HouseholdProfile;
      if (parsed?.version === 1) cachedProfile = parsed;
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
