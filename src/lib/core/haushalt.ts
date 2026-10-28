// Mia für alle (allein, zu zweit, Familie): die Wörter je Haushaltsart an
// EINER Stelle. Drei Räume, benannt nach „wer sieht es“ (Tafel 114): der
// gemeinsame heißt intern immer „familie“, sichtbar „Familie“ bzw. „Wir“ (zu
// zweit, WG); „Ich“ (nur ich) und „Arbeit“ (nur ich, nach Feierabend weg)
// heißen überall so. Allein gibt es nur „Ich | Arbeit“ – Gemeinsames von
// früher zählt dort wie „Ich“. Die Haushaltsart steht im Profil (`householdType`).

import type { Room } from "@/lib/core/entries";
import type { HouseholdType } from "@/lib/einstellungen/profileHousehold";

export type Haushalt = "allein" | "paar" | "familie";

/** Profil-Wert → Haushaltsart (WG spricht wie ein Paar: „Wir“) */
export const haushaltOf = (type: HouseholdType | null | undefined): Haushalt => (type === "single" ? "allein" : type === "paar" || type === "wg" ? "paar" : "familie");

/** Haushaltsart → Profil-Wert (Startfrage „Für wen soll ich sortieren?“) */
export const HOUSEHOLD_FOR: Record<Haushalt, HouseholdType> = { allein: "single", paar: "paar", familie: "familie" };

/** Sichtbarer Name des gemeinsamen Bereichs (allein: „Ich“ – es sieht ja nur einer) */
export const raumName = (h: Haushalt) => (h === "allein" ? "Ich" : h === "paar" ? "Wir" : "Familie");

/** Sichtbarer Name eines Raums: „Familie“/„Wir“, „Ich“, „Arbeit“ */
export const raumLabel = (r: Room, h: Haushalt) => (r === "arbeit" ? "Arbeit" : r === "ich" ? "Ich" : raumName(h));

/** Die Räume im Schalter „Familie | Ich | Arbeit“ (allein nur „Ich | Arbeit“) */
export const raumWahl = (h: Haushalt): Room[] => (h === "allein" ? ["ich", "arbeit"] : ["familie", "ich", "arbeit"]);

/** Wie ein Eintrag in Listen zählt: allein ist Gemeinsames von früher dasselbe wie „Ich“ */
export const sichtRaum = (r: Room, h: Haushalt): Room => (h === "allein" && r === "familie" ? "ich" : r);

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
