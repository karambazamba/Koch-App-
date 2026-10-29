// Prüfstand „mehrere Sachen“ (A-056): Aufzählungen und Füllwörter, wie sie
// beim Sprechen wirklich kommen. Bezug wie der große Prüfstand: Mittwoch,
// 21.10.2026, 10:30, Familie Müller (Felix, Lisa, Mathis 8). Erwartet: je
// Sache ein Eintrag (`termine`, `aufgaben`, `anzahl` Einkauf), Titel ohne
// Füll- und Steuerwörter mit großem Anfangsbuchstaben (`titel`). Die Sätze
// laufen im großen Prüfstand mit der echten KI mit (`saetze.ts`) und ohne KI
// über die Regel-Notlösung (`aufteilen.ts`, Test
// `tests/begleitung/mehrereSachen.test.ts`). Ziel ≥ 98 %.

import type { PruefSatz } from "@/lib/begleitung/pruefstand/saetze";

const S = (text: string, ops: string[], extra: Omit<PruefSatz, "text" | "ops"> = {}): PruefSatz => ({ text, ops, ...extra });
const AUFGABE = ["upsert_entry"];
const EINKAUF = ["add_shopping"];
const BEIDES = ["upsert_entry", "add_shopping"];

export const AUFZAEHL_SAETZE: PruefSatz[] = [
  // Aufgaben-Aufzählungen mit Steuerwörtern vorn
  S("Ähm, Aufgabe heute dazu: Maler kommt und Bank anrufen", AUFGABE, { aufgaben: 2, titel: ["Maler kommt", "Bank anrufen"], datum: "2026-10-21", woerter: 2 }),
  S("Aufgabe heute: Maler kommt und Bank anrufen", AUFGABE, { aufgaben: 2, titel: ["Maler kommt", "Bank anrufen"], datum: "2026-10-21" }),
  S("Aufgabe Aufgabe heute Maler kommt und Bank anrufen", AUFGABE, { aufgaben: 2, titel: ["Maler kommt", "Bank anrufen"] }),
  S("Aufgaben: Fenster putzen, Keller aufräumen, Altglas wegbringen", AUFGABE, { aufgaben: 3, titel: ["Fenster putzen", "Keller aufräumen", "Altglas wegbringen"] }),
  S("Aufgabe morgen: Auto waschen und Reifendruck prüfen", AUFGABE, { aufgaben: 2, titel: ["Auto waschen", "Reifendruck prüfen"], datum: "2026-10-22" }),
  S("Aufgabe aufgabe Rasen mähen", AUFGABE, { aufgaben: 1, titel: ["Rasen mähen"] }),
  S("Bitte Aufgabe: Oma anrufen", AUFGABE, { aufgaben: 1, titel: ["Oma anrufen"] }),
  S("Also Aufgaben heute, äh, Wäsche aufhängen und Spülmaschine ausräumen", AUFGABE, { aufgaben: 2, titel: ["Wäsche aufhängen", "Spülmaschine ausräumen"], datum: "2026-10-21" }),
  // Aufgaben-Aufzählungen ohne Steuerwort
  S("Also bitte Rechnung bezahlen und Tim antworten", AUFGABE, { aufgaben: 2, titel: ["Rechnung bezahlen", "Tim antworten"] }),
  S("äh Steuerberater anrufen, Kita-Formular abgeben und Reifen wechseln", AUFGABE, { aufgaben: 3, titel: ["Steuerberater anrufen", "Kita-Formular abgeben", "Reifen wechseln"] }),
  S("Ähm, also, Paket abholen und Müll rausbringen", AUFGABE, { aufgaben: 2, titel: ["Paket abholen", "Müll rausbringen"] }),
  S("Hm also Arzttermin vereinbaren und Rezept abholen", AUFGABE, { aufgaben: 2, titel: ["Arzttermin vereinbaren", "Rezept abholen"] }),
  S("Noch dazu: Blumen gießen und Post holen", AUFGABE, { aufgaben: 2, titel: ["Blumen gießen", "Post holen"] }),
  S("Wäsche aufhängen und dann Spülmaschine ausräumen", AUFGABE, { aufgaben: 2, titel: ["Wäsche aufhängen", "Spülmaschine ausräumen"] }),
  S("Ähm Garage aufräumen, außerdem Fahrrad reparieren", AUFGABE, { aufgaben: 2, titel: ["Garage aufräumen", "Fahrrad reparieren"] }),
  // Einkauf: Aufzählung = mehrere Sachen auf der Liste
  S("Milch, Eier und Butter auf die Liste", EINKAUF, { anzahl: 3 }),
  S("Hm, Brot und Käse auf die Liste", EINKAUF, { anzahl: 2 }),
  S("Wir brauchen Milch, Eier und Mehl", EINKAUF, { anzahl: 3 }),
  S("Ähm, Nudeln, Tomaten und Parmesan auf die Liste", EINKAUF, { anzahl: 3 }),
  S("Äh Milch äh Milch auf die Liste", EINKAUF, { anzahl: 1 }),
  S("Mal Joghurt und Bananen auf die Liste", EINKAUF, { anzahl: 2 }),
  S("Äh, Brot, Butter, äh, und Marmelade auf die Liste", EINKAUF, { anzahl: 3 }),
  S("Pack mal Äpfel und Gurken drauf", EINKAUF, { anzahl: 2 }),
  // Gemischt: Termin + Aufgabe, Termin + Einkauf, Aufgabe + Einkauf
  S("Termin morgen 10 Uhr Zahnarzt und danach Bank", AUFGABE, { termine: 1, aufgaben: 1, titel: ["Zahnarzt", "Bank"], datum: "2026-10-22", zeit: "10:00", lage: ["ohne-zahnarzt"] }),
  S("Morgen 9 Uhr Friseur, danach Geschenk für Oma kaufen", AUFGABE, { termine: 1, aufgaben: 1, titel: ["Friseur", "Geschenk für Oma kaufen"], datum: "2026-10-22", zeit: "09:00" }),
  S("Freitag 18 Uhr Elternabend und außerdem Kuchen backen", AUFGABE, { termine: 1, aufgaben: 1, titel: ["Elternabend", "Kuchen backen"], datum: "2026-10-23", zeit: "18:00" }),
  S("Hmm, morgen 15 Uhr Kinderarzt und danach Apotheke", AUFGABE, { termine: 1, aufgaben: 1, titel: ["Kinderarzt", "Apotheke"], datum: "2026-10-22", zeit: "15:00" }),
  S("Termin Donnerstag 17 Uhr Physio und dann Mathis abholen", AUFGABE, { termine: 1, aufgaben: 1, titel: ["Physio"], datum: "2026-10-22", zeit: "17:00" }),
  S("Zahnarzt Montag 10 Uhr und Butter auf die Liste", BEIDES, { alle: true, termine: 1, anzahl: 1, datum: "2026-10-26", zeit: "10:00", lage: ["ohne-zahnarzt"] }),
  S("Bank anrufen und danach Milch auf die Liste", BEIDES, { alle: true, aufgaben: 1, anzahl: 1, titel: ["Bank anrufen"] }),
  S("Bitte Zahnpasta und Shampoo auf die Liste und Paket zur Post bringen", BEIDES, { alle: true, aufgaben: 1, anzahl: 2 }),
  S("Kaffee und Klopapier auf die Liste und Mathis Freitag 15 Uhr Fußball", BEIDES, { alle: true, termine: 1, anzahl: 2, datum: "2026-10-23", zeit: "15:00" }),
  // Zwei Termine
  S("Sonntag 11 Uhr Brunch bei Oma, Samstag 14 Uhr Kindergeburtstag", AUFGABE, { termine: 2, datum: "2026-10-25", zeit: "14:00" }),
  S("Ähm Termin Termin morgen 8 Uhr Elternsprechtag", AUFGABE, { termine: 1, titel: ["Elternsprechtag"], datum: "2026-10-22", zeit: "08:00" }),
];
