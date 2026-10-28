// Prüfstand Raum-Wahl (A-034): Termine und Aufgaben mit erwartetem Raum
// (Familie · Ich · Arbeit). Bezug wie im großen Prüfstand: Mittwoch,
// 21.10.2026, Familie Müller. Die Sätze laufen im großen Prüfstand mit der
// echten KI mit (`saetze.ts`) und ohne KI über dieselbe Raten-Regel wie
// Schnelleingabe, Sofort-Weg und Testmodus (`raum/raten.ts`, Test
// `tests/kalender/raeume.test.ts`). Ziel ≥ 95 %.

import type { Room } from "@/lib/core/entries";
import type { RaumArt } from "@/lib/kalender/raum/raten";

export type RaumSatz = { text: string; art: RaumArt; raum: Room; datum?: string; zeit?: string; person?: string };

const T = (text: string, raum: Room, extra: Omit<RaumSatz, "text" | "art" | "raum"> = {}): RaumSatz => ({ text, art: "termin", raum, ...extra });
const A = (text: string, raum: Room, extra: Omit<RaumSatz, "text" | "art" | "raum"> = {}): RaumSatz => ({ text, art: "aufgabe", raum, ...extra });

export const RAUM_SAETZE: RaumSatz[] = [
  // Termine: Standard Familie
  T("Morgen um 9 Lieferant im Tohuus", "arbeit", { datum: "2026-10-22", zeit: "09:00" }),
  T("Freitag 14 Uhr Personalgespräch bei KARAMBA Eis", "arbeit", { datum: "2026-10-23", zeit: "14:00" }),
  T("Montag 8 Uhr Großhandel anrufen wegen Eisbechern", "arbeit", { datum: "2026-10-26" }),
  T("Meeting mit dem Team Freitag 10 Uhr", "arbeit", { datum: "2026-10-23", zeit: "10:00" }),
  T("Kundentermin Donnerstag 11 Uhr", "arbeit", { datum: "2026-10-22", zeit: "11:00" }),
  T("Videocall mit dem Büro Montag 9 Uhr", "arbeit", { datum: "2026-10-26", zeit: "09:00" }),
  T("Kinderarzt mit Mathis Donnerstag 15 Uhr", "familie", { datum: "2026-10-22", zeit: "15:00", person: "Mathis" }),
  T("Elternabend in der Schule Dienstag halb acht abends", "familie", { datum: "2026-10-27", zeit: "19:30" }),
  T("Kita-Fest Samstag 11 Uhr", "familie", { datum: "2026-10-24", zeit: "11:00" }),
  T("Für alle: Sonntag 15 Uhr Kaffee bei Oma", "familie", { datum: "2026-10-25", zeit: "15:00" }),
  T("Omas Geburtstag Sonntag 15 Uhr", "familie", { datum: "2026-10-25", zeit: "15:00" }),
  T("Schulaufführung von Mathis Freitag 18 Uhr", "familie", { datum: "2026-10-23", zeit: "18:00" }),
  T("Kino Samstag 20 Uhr", "familie", { datum: "2026-10-24", zeit: "20:00" }),
  T("Therapie Donnerstag 17 Uhr, nur für mich", "ich", { datum: "2026-10-22", zeit: "17:00" }),
  T("Friseur Samstag 10 Uhr", "ich", { datum: "2026-10-24", zeit: "10:00" }),
  T("Hausarzt Montag 8:30", "ich", { datum: "2026-10-26", zeit: "08:30" }),
  T("Physiotherapie Dienstag 18 Uhr", "ich", { datum: "2026-10-27", zeit: "18:00" }),
  T("Zahnreinigung Freitag 8 Uhr", "ich", { datum: "2026-10-23", zeit: "08:00" }),
  // Aufgaben: Standard Ich
  A("Tim antworten, nur für mich", "ich"),
  A("Privat: Geschenk für Lisa besorgen", "ich"),
  A("Nur für mich: Bewerbung schreiben", "ich"),
  A("Friseur anrufen", "ich"),
  A("Arzttermin ausmachen", "ich"),
  A("Fahrrad zur Werkstatt bringen", "ich"),
  A("Steuererklärung machen", "ich"),
  A("Familie: Müll rausbringen", "familie"),
  A("Schulranzen für Mathis bestellen", "familie"),
  A("Geschenk für Omas Geburtstag besorgen", "familie"),
  A("Kita-Gebühren überweisen", "familie"),
  A("Zettel für die Schule unterschreiben", "familie"),
  A("Rechnung Steuerberater fürs Büro bezahlen", "arbeit"),
  A("Angebot für den Kunden schreiben", "arbeit"),
  A("Lieferant wegen Waffeln anrufen", "arbeit"),
  A("Personalplan für nächste Woche schreiben", "arbeit"),
  A("Präsentation fürs Meeting vorbereiten", "arbeit"),
];
