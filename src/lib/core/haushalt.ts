// Mia für alle (allein, zu zweit, Familie): die Wörter je Haushaltsart an
// EINER Stelle. Zwei Räume (A-021): der gemeinsame heißt intern immer
// „familie“, sichtbar „Familie“ (allein auch) bzw. „Wir“ (zu zweit, WG);
// „arbeit“ heißt überall „Geschäftlich“ (nur ich, nach Feierabend weg). Die Haushaltsart steht im Profil (`householdType`).

import type { Room } from "@/lib/core/entries";
import type { HouseholdType } from "@/lib/einstellungen/profileHousehold";

export type Haushalt = "allein" | "paar" | "familie";

/** Profil-Wert → Haushaltsart (WG spricht wie ein Paar: „Wir“) */
export const haushaltOf = (type: HouseholdType | null | undefined): Haushalt => (type === "single" ? "allein" : type === "paar" || type === "wg" ? "paar" : "familie");

/** Haushaltsart → Profil-Wert (Startfrage „Für wen soll ich sortieren?“) */
export const HOUSEHOLD_FOR: Record<Haushalt, HouseholdType> = { allein: "single", paar: "paar", familie: "familie" };

/** Sichtbarer Name des gemeinsamen Bereichs: „Wir“ zu zweit, sonst „Familie“ */
export const raumName = (h: Haushalt) => (h === "paar" ? "Wir" : "Familie");

/** Sichtbarer Name von „arbeit“ (Schalter, Schild, Filter, Mia) */
export const GESCHAEFTLICH = "Geschäftlich";

/** Sichtbarer Name eines Raums: „Familie“/„Wir“ bzw. „Geschäftlich“ */
export const raumLabel = (r: Room, h: Haushalt) => (r === "arbeit" ? GESCHAEFTLICH : raumName(h));

/** Die Räume im Schalter „Familie | Geschäftlich“ – für Aufgaben und Termine gleich, auch allein */
export const RAUM_WAHL: readonly Room[] = ["familie", "arbeit"];

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

/** Überschrift „Familie verbinden“ je Haushaltsart (Einstellungen, /konto) */
export const verbindenTitel = (h: Haushalt) => (h === "allein" ? "Mit jemandem teilen" : h === "paar" ? "Zu zweit verbinden" : "Familie verbinden");

/** Standard-Name des gemeinsamen Haushalts im Konto (mit Nachname: „Familie Gabriel“, `konten/namen.ts`) */
export const haushaltName = (h: Haushalt) => (h === "allein" ? "Privat" : h === "paar" ? "Wir zwei" : "Familie");

/** Unter dem Einladungs-Link: wer ihn öffnet, gehört dazu */
export const linkWerSatz = (h: Haushalt) => `Wer ihn öffnet, ${h === "familie" ? "gehört zur Familie" : "gehört dazu"}. Danach einfach neu holen.`;
