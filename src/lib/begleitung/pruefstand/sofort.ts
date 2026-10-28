// Prüfstand Sofort-Weg (Auftrag „Mia schneller und flüssiger“): Kurzsätze mit
// der erwarteten lokalen Zuordnung – oder `null` = nicht lokal (die KI macht
// es). Bezug wie der große Prüfstand: Mittwoch, 21.10.2026, 10:30, Familie
// Müller (Felix, Lisa, Mathis 8), Zahnarzt Do 16 Uhr steht schon drin.
// Ziel ≥ 98 % richtig (Test `tests/begleitung/sofortPruefstand.test.ts`),
// sonst gehört die Regel nicht in den Sofort-Weg.

import type { Sofort, SofortArt } from "@/lib/begleitung/sofort/erkennen";

export type SofortSatz = {
  text: string;
  /** Erwartet: diese Art lokal – oder null (KI) */
  art: SofortArt | null;
  datum?: string;
  zeit?: string;
  /** Titel bzw. Artikel/Name enthält das */
  name?: string;
  /** So viele Änderungen (Aufzählung) */
  anzahl?: number;
  laden?: string;
};

const S = (text: string, art: SofortArt | null, extra: Omit<SofortSatz, "text" | "art"> = {}): SofortSatz => ({ text, art, ...extra });

export const SOFORT_SAETZE: SofortSatz[] = [
  // Einkauf: nur Katalog, auch Aufzählung
  S("Milch auf die Liste", "einkauf", { name: "Milch" }),
  S("Milch und Eier auf die Liste", "einkauf", { anzahl: 2 }),
  S("Wir brauchen Brot und Butter", "einkauf", { anzahl: 2 }),
  S("Setz Klopapier auf den Einkaufszettel", "einkauf", { name: "Klopapier" }),
  S("pack mal zahnpasta drauf", "einkauf", { name: "Zahnpasta" }),
  S("Shampoo bei Rossmann", "einkauf", { name: "Shampoo", laden: "Rossmann" }),
  S("Joghurt bei Rewe", "einkauf", { name: "Joghurt", laden: "Rewe" }),
  S("Für Lidl: Milch, Eier", "einkauf", { anzahl: 2, laden: "Lidl" }),
  S("Äpfel, Birnen und Bananen", "einkauf", { anzahl: 3 }),
  S("noch 2 liter milch bitte auf die liste", "einkauf", { name: "Milch" }),
  S("Kaffee auf die Liste", "einkauf", { name: "Kaffee" }),
  S("Windeln auf die Liste", "einkauf", { name: "Windeln" }),
  // Einkauf, aber unklar → KI
  S("Luftballons auf die Liste", null),
  S("Tomaten für die Soße am Samstag", null),
  S("Sachen fürs Frühstück auf die Liste", null),
  S("Milch", null),
  S("Eier sind alle", null),
  S("Tomaten kaufe ich immer bei Rewe", null),
  // Termin: Uhrzeit oder Tag + Uhrzeit
  S("Elternabend Freitag 19:30", "termin", { datum: "2026-10-23", zeit: "19:30", name: "Elternabend" }),
  S("13 Uhr Mittagessen mit Jens", "termin", { datum: "2026-10-21", zeit: "13:00" }),
  S("Freitag 9 Uhr Elternabend", "termin", { datum: "2026-10-23", zeit: "09:00", name: "Elternabend" }),
  S("morgen halb drei Friseur", "termin", { datum: "2026-10-22", zeit: "14:30", name: "Friseur" }),
  S("Morgen um 9 Steuerberater", "termin", { datum: "2026-10-22", zeit: "09:00", name: "Steuerberater" }),
  S("Kinderarzt Montag 8:15", "termin", { datum: "2026-10-26", zeit: "08:15", name: "Kinderarzt" }),
  S("heute abend 20 uhr kino", "termin", { datum: "2026-10-21", zeit: "20:00" }),
  S("Physio Dienstag 17 Uhr", "termin", { datum: "2026-10-27", zeit: "17:00", name: "Physio" }),
  // Termin, aber unklar → KI
  S("Zahnarzt Donnerstag 16 Uhr", null), // steht schon drin
  S("9 Uhr Bäcker", null), // heute schon vorbei
  S("Jeden Montag Schwimmen um 17 Uhr", null),
  S("Montag Zahnarzt um 9 und Dienstag Friseur um 14 Uhr", null),
  S("Verschieb den Friseur auf Freitag 10 Uhr", null),
  S("Samstag Grillen bei Oma ab 14 Uhr", null),
  S("Hab ich morgen um 15 Uhr Zeit?", null),
  // Aufgabe: Ding + Tätigkeit, „Erinner mich …“
  S("Tim antworten", "aufgabe", { name: "Tim antworten", datum: "2026-10-21" }),
  S("Steuerberater anrufen", "aufgabe", { name: "Steuerberater anrufen" }),
  S("Rechnung bezahlen", "aufgabe", { name: "Rechnung bezahlen" }),
  S("Paket abholen", "aufgabe", { name: "Paket abholen" }),
  S("Mail an Oma schicken", null), // „Mail“ → KI (Mail-Entwurf?)
  S("Handyvertrag kündigen", "aufgabe", { name: "Handyvertrag kündigen" }),
  S("Kindergeld beantragen", "aufgabe", { name: "Kindergeld beantragen" }),
  S("Freitag KFZ-Steuer überweisen", "aufgabe", { datum: "2026-10-23", name: "KFZ-Steuer" }),
  S("Kita-Formular bis Freitag abgeben", "aufgabe", { name: "Kita-Formular" }),
  S("Erinner mich morgen an den Müll", "aufgabe", { datum: "2026-10-22", name: "Müll" }),
  S("Erinner mich morgen um 8 an die Mülltonne", "aufgabe", { datum: "2026-10-22", zeit: "08:00", name: "Mülltonne" }),
  S("Dringend: Versicherung anrufen", "aufgabe", { name: "Versicherung anrufen" }),
  S("Ich muss noch die Steuer machen", "aufgabe", { name: "Steuer machen" }),
  // Aufgabe, aber unklar → KI
  S("Lisa soll die Geschenke besorgen", null),
  S("Sag Lisa, sie soll den Turnbeutel waschen", null),
  S("Steuer ist erledigt", null),
  S("Milch besorgen", null),
  // Notiz
  S("Merk dir das WLAN-Passwort: Sonnenblume42", "notiz", { name: "WLAN-Passwort" }),
  S("Notier dir, Mathis' Schuhgröße ist 33", "notiz", { name: "Mathis" }),
  S("Schreib auf: Fahrradschloss 4711", "notiz", { name: "Fahrradschloss" }),
  S("Schreib in die Schnellnotiz: Elternabend Zettel", null),
  S("Merk dir, Lisa mag keine Pilze", null),
  S("Schreib Spülmittel auf", null),
  // Pinnwand
  S("Pinnwand: Bin um 20 Uhr da", "pinnwand", { name: "Bin um 20 Uhr da" }),
  S("An alle: Essen ist fertig", null), // „fertig“ → nie raten
  S("An alle: Bin gleich zurück", null), // „zurück“ → nie raten
  S("An alle: Oma kommt heute", "pinnwand", { name: "Oma kommt heute" }),
  S("Sag Lisa, ich komm später", "pinnwand", { name: "Lisa" }),
  S("Schreib an die Pinnwand: Hund war schon draußen", "pinnwand", { name: "Hund" }),
  S("Pinnwand wieder in Standardfarbe", null), // Kachel-Farbe, kein Zettel
  // Timer
  S("Timer 10 Minuten Nudeln", "timer", { name: "Nudeln" }),
  S("Stell einen Timer auf 5 Minuten", "timer"),
  S("Timer für die Eier 7 Minuten", "timer", { name: "Eier" }),
  S("Timer eine Stunde", "timer"),
  S("Timer stoppen", null),
  S("Wie lange läuft der Timer noch?", null),
  // Alles andere: KI
  S("Plan mir die Woche", null),
  S("Was koche ich heute?", null),
  S("Danke dir", null),
  S("Moin", null),
  S("Milch auf die Liste und Zahnarzt Freitag 10 Uhr", null),
  S("Moin! Brot alle und Mathis hat Freitag 15 Uhr Fußball", null),
];

/** Passt die lokale Lesart zum erwarteten Satz? (Gründe = was nicht passt) */
export function bewerteSofort(s: SofortSatz, r: Sofort | null): { ok: boolean; gruende: string[] } {
  if (s.art === null) return r === null ? { ok: true, gruende: [] } : { ok: false, gruende: [`lokal als ${r.art}, erwartet KI`] };
  if (!r) return { ok: false, gruende: [`nicht lokal, erwartet ${s.art}`] };
  const g: string[] = [];
  if (r.art !== s.art) g.push(`Art ${r.art} statt ${s.art}`);
  const texte = r.ops.map((op) => JSON.stringify(op)).join(" ");
  if (s.anzahl !== undefined && r.ops.length !== s.anzahl) g.push(`${r.ops.length} statt ${s.anzahl} Änderungen`);
  if (s.name && !texte.toLowerCase().includes(s.name.toLowerCase())) g.push(`ohne „${s.name}“`);
  if (s.laden && !r.ops.every((op) => op.type === "add_shopping" && op.shop === s.laden)) g.push(`ohne Laden ${s.laden}`);
  const entry = r.ops.find((op) => op.type === "upsert_entry");
  const data = entry?.type === "upsert_entry" ? (entry.entry.data as { date?: string; start?: string; time?: string }) : null;
  if (s.datum && data?.date !== s.datum) g.push(`Datum ${data?.date ?? "–"} statt ${s.datum}`);
  if (s.zeit && (data?.start ?? data?.time) !== s.zeit) g.push(`Zeit ${data?.start ?? data?.time ?? "–"} statt ${s.zeit}`);
  return { ok: g.length === 0, gruende: g };
}
