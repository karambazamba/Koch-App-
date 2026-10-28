// Mia für alle (allein, zu zweit, Familie): die Wörter je Haushaltsart an
// EINER Stelle. Drei Räume (A-034), für Termine und Aufgaben gleich: der
// gemeinsame heißt intern immer „familie“, sichtbar „Familie“, zu zweit „Wir“,
// allein „Privat“; „Ich“ (nur ich, grau) und „Arbeit“ (nur ich, blau, nach
// Feierabend weg) heißen überall so. Allein entfällt „Ich“ (es sieht ja nur
// einer): eine Ich-Aufgabe zeigt sich dort als „Privat“ und bleibt gespeichert
// „ich“, damit sie auch später mit Partner nur für einen bleibt.
// Die Haushaltsart steht im Profil (`householdType`).

import type { Room } from "@/lib/core/entries";
import type { HouseholdType } from "@/lib/einstellungen/profileHousehold";

export type Haushalt = "allein" | "paar" | "familie";

/** Profil-Wert → Haushaltsart (WG spricht wie ein Paar: „Wir“) */
export const haushaltOf = (type: HouseholdType | null | undefined): Haushalt => (type === "single" ? "allein" : type === "paar" || type === "wg" ? "paar" : "familie");

/** Haushaltsart → Profil-Wert (Startfrage „Für wen soll ich sortieren?“) */
export const HOUSEHOLD_FOR: Record<Haushalt, HouseholdType> = { allein: "single", paar: "paar", familie: "familie" };

/** Sichtbarer Name des gemeinsamen Bereichs: „Familie“, zu zweit „Wir“, allein „Privat“ */
export const raumName = (h: Haushalt) => (h === "allein" ? "Privat" : h === "paar" ? "Wir" : "Familie");

/** Sichtbare Namen von „ich“ und „arbeit“ (Chips, Schild, Filter, Mia) */
export const ICH = "Ich";
export const ARBEIT = "Arbeit";

/** Sichtbarer Name eines Raums: „Familie“/„Wir“/„Privat“, „Ich“, „Arbeit“ */
export const raumLabel = (r: Room, h: Haushalt) => (r === "arbeit" ? ARBEIT : r === "ich" ? ICH : raumName(h));

/** Die Chips „Familie · Ich · Arbeit“ (allein „Privat · Arbeit“) – für Aufgaben und Termine gleich */
export const raumWahl = (h: Haushalt): Room[] => (h === "allein" ? ["familie", "arbeit"] : ["familie", "ich", "arbeit"]);

/** Wie ein Eintrag sich zeigt: allein ist „Ich“ dasselbe wie „Privat“ */
export const sichtRaum = (r: Room, h: Haushalt): Room => (h === "allein" && r === "ich" ? "familie" : r);

/** Menü „lange drücken“: „Für Familie“ (zu zweit „Für uns beide“, allein „Privat“) · „Nur ich“ · „Arbeit“ */
export const raumAktion = (r: Room, h: Haushalt) => (r === "arbeit" ? ARBEIT : r === "ich" ? "Nur ich" : h === "allein" ? "Privat" : h === "paar" ? "Für uns beide" : "Für Familie");

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
