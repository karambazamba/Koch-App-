// Mia für alle (allein, zu zweit, Familie): die Wörter je Haushaltsart an
// EINER Stelle. Der Raum heißt intern immer „familie“; sichtbar heißt er
// „Privat“ (allein), „Wir“ (zu zweit, WG) bzw. „Familie“. „Arbeit“ bleibt
// überall „Arbeit“. Die Haushaltsart steht im Profil (`householdType`).

import type { HouseholdType } from "@/lib/einstellungen/profileHousehold";

export type Haushalt = "allein" | "paar" | "familie";

/** Profil-Wert → Haushaltsart (WG spricht wie ein Paar: „Wir“) */
export const haushaltOf = (type: HouseholdType | null | undefined): Haushalt => (type === "single" ? "allein" : type === "paar" || type === "wg" ? "paar" : "familie");

/** Haushaltsart → Profil-Wert (Startfrage „Für wen soll ich sortieren?“) */
export const HOUSEHOLD_FOR: Record<Haushalt, HouseholdType> = { allein: "single", paar: "paar", familie: "familie" };

/** Sichtbarer Name des gemeinsamen Bereichs */
export const raumName = (h: Haushalt) => (h === "allein" ? "Privat" : h === "paar" ? "Wir" : "Familie");

/** Knopf zum Einladen */
export const einladenKnopf = (h: Haushalt) => (h === "allein" ? "Jemanden dazuholen" : h === "paar" ? "Partner einladen" : "Familie einladen");

/** „Wer sieht das?“ – bei allein entfällt der Satz */
export const teilenSatz = (h: Haushalt): string | null => (h === "allein" ? null : h === "paar" ? "Ihr beide seht dasselbe." : "Die Familie sieht dasselbe.");

/** Die drei Antworten der Startfrage, gleichwertig, nichts vorausgewählt */
export const HAUSHALT_WAHL: { value: Haushalt; label: string }[] = [
  { value: "allein", label: "Nur für mich" },
  { value: "paar", label: "Für uns zwei" },
  { value: "familie", label: "Für die Familie" },
];

/**
 * Einmal vorschlagen, wenn aus „allein“ zwei Personen werden (Einladung
 * angenommen): „Seid ihr zu zweit? Dann heißt der Bereich ‚Wir‘.“
 */
export const zuZweitVorschlag = (h: Haushalt, persons: number, asked: boolean): string | null => (h === "allein" && persons >= 2 && !asked ? "Seid ihr zu zweit? Dann heißt der Bereich ‚Wir‘." : null);
