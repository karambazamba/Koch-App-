// Profil – der Haushalt: für wen gekocht wird (Haushaltstyp), die Personen
// (Rollen, Anzeigenamen, Anzahl angleichen), Kinder und wer unter der Woche
// mittags zu Hause isst.

import { createPerson, type HouseholdProfile, type Person, type PersonRole, type WeekdayLunch } from "@/lib/einstellungen/profileModel";

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

/** Nur für mich → "du" statt "ihr" */
export function isSolo(profile: Pick<HouseholdProfile, "householdType"> | null | undefined): boolean {
  return profile?.householdType === "single";
}

/** Kleiner Haushalt (1–2 Personen): kleine Mengen, Reste bewusst einplanen */
export function isSmallHousehold(profile: Pick<HouseholdProfile, "householdType">): boolean {
  return profile.householdType === "single" || profile.householdType === "paar";
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

/** "Unsere Familie" bzw. "Mein Haushalt" / "Unser Haushalt" (Titel der Einstellungen) */
export function householdTitle(profile: { householdType: string } | null | undefined): string {
  if (!profile || profile.householdType === "familie") return "Unsere Familie";
  return profile.householdType === "single" ? "Mein Haushalt" : "Unser Haushalt";
}
