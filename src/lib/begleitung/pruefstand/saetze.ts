// Prüfstand (Auftrag „Mia auf Claude-Niveau“): 138 echte Alltagssätze einer
// Familie mit erwarteter Aktion – Einkauf, Termine, Aufgaben, Kochen, Fragen,
// Durcheinander, Dialekt, Tippfehler. Bezug: Mittwoch, 21.10.2026, 10:30,
// Familie Müller (Felix, Lisa, Mathis 8). `ops` = welche Vorschlags-Arten
// richtig sind (eine genügt), leer = reine Antwort ohne Aktion; `datum`/`zeit`
// prüfen die Daten des Termins bzw. der Aufgabe, `person` den Namen im Titel
// oder bei „wer“. `lage` = passende Ausgangslage (haushalt.ts), `max` =
// erlaubte Sätze (Aktion 2, Ratgeber/Zusammenfassung 3).

import type { Lage } from "@/lib/begleitung/pruefstand/haushalt";

export type PruefSatz = {
  text: string;
  /**
   * Richtige Vorschlags-Arten (ChangeOp.type) – leer = nur antworten.
   * Besondere: "kann_nicht" = ehrlich ablehnen, "antwort" = Antwort ohne
   * Aktion zählt auch, "hinweis_doppelt" = keine Aktion + Hinweis „steht schon drin“,
   * "kommt_bald" = in 1.0 gesperrt: keine Aktion + „Kommt bald.“, "rueckfrage" =
   * keine Aktion + eine Frage (z. B. Tausch mit einem schon vergangenen Tag).
   */
  ops: string[];
  datum?: string;
  /** Letzter Tag bei mehrtägigen Terminen */
  bis?: string;
  zeit?: string;
  person?: string;
  lage?: Lage[];
  /** Höchstens so viele Sätze (Standard 2) */
  max?: number;
  /** Alle erwarteten Aktionen müssen kommen (Mehrfach-Aktion) */
  alle?: boolean;
  /** Höchstens so viele Wörter (Mehrfach-Aktion: „Erledigt.“) */
  woerter?: number;
  /** Jeder Einkaufs-Vorschlag gehört in diesen Laden (Läden bewusst wählen) */
  laden?: string;
  /** Kein Name einer Sache (Im Haus, Einkauf) darf das enthalten – Satzteile sind keine Sachen (Tafel 102) */
  nieName?: string;
  /** Genau so viele Einkaufs-Sachen (Einsprechen: nichts Falsches auf die Liste, Doppeltes einmal) */
  anzahl?: number;
  /** Eine Einkaufs-Sache trägt diese Menge („zwei Milch“ → „2“) */
  menge?: string;
};

const S = (text: string, ops: string[], extra: Omit<PruefSatz, "text" | "ops"> = {}): PruefSatz => ({ text, ops, ...extra });
/** Wissens-/Ratgeberfrage: Antwort ohne Aktion, bis 3 kurze Sätze */
const R = (text: string, extra: Omit<PruefSatz, "text" | "ops"> = {}): PruefSatz => ({ text, ops: [], max: 3, ...extra });
const EINKAUF = ["add_shopping"];
const TERMIN = ["upsert_entry"];
const ANTWORT: string[] = [];

export const PRUEFSAETZE: PruefSatz[] = [
  // Einkauf (20)
  S("Milch auf die Liste", EINKAUF),
  S("Wir brauchen noch Brot und Butter", EINKAUF),
  S("Setz Klopapier auf den Einkaufszettel", EINKAUF),
  S("Eier sind alle", EINKAUF),
  S("Kannst du Bananen auf die Liste schreiben?", EINKAUF),
  S("noch 2 liter milch bitte", EINKAUF),
  S("Mlich und Kaffe auf die Liste", EINKAUF),
  S("Für Freitag brauchen wir Hackfleisch", EINKAUF),
  S("Schreib Spülmittel auf", EINKAUF),
  S("Wir haben keine Windeln mehr", EINKAUF),
  S("Äpfel, Birnen und Trauben brauchen wir", EINKAUF),
  S("Tomaten für die Soße am Samstag", EINKAUF),
  S("Bei REWE noch Joghurt holen", EINKAUF),
  S("Shampoo bei Rossmann", EINKAUF, { laden: "Rossmann" }),
  S("Für Lidl: Milch, Eier", EINKAUF, { laden: "Lidl" }),
  // Feste Laden-Regeln („Mia merkt sich den Laden“)
  S("Tomaten kaufe ich immer bei Rewe", ["set_shop_rule"], { laden: "Rewe" }),
  S("Butter immer bei Lidl", ["set_shop_rule"], { laden: "Lidl" }),
  S("Shampoo nur bei Rossmann", ["set_shop_rule"], { laden: "Rossmann" }),
  S("Kaffee kaufen wir ab jetzt bei Edeka", ["set_shop_rule"], { laden: "Edeka" }),
  S("Tomaten nicht mehr bei Rewe", ["set_shop_rule"]),
  S("Milch egal wo", ["set_shop_rule"]),
  S("Was kauf ich wo?", []),
  S("Katzenfutter nicht vergessen", EINKAUF),
  S("Moin, Brötchen für morgen früh", EINKAUF),
  S("Haferflocken sind fast leer", EINKAUF),
  S("pack mal zahnpasta drauf", EINKAUF),
  S("Für den Kindergeburtstag Luftballons und Kuchen", EINKAUF),
  S("Wir brauchen Mehl, Zucker und Backpulver zum Backen", EINKAUF),
  S("Batterien AA auf die Liste", EINKAUF),
  // Termine (28)
  S("Zahnarzt Donnerstag 16 Uhr", TERMIN, { datum: "2026-10-22", zeit: "16:00", lage: ["ohne-zahnarzt"] }),
  S("Trag den Zahnarzt Donnerstag 16 Uhr ein", ["hinweis_doppelt"]),
  S("Morgen um 9 Steuerberater", TERMIN, { datum: "2026-10-22", zeit: "09:00" }),
  S("Mathis hat Freitag um 15 Uhr Fußball", TERMIN, { datum: "2026-10-23", zeit: "15:00", person: "Mathis" }),
  S("Elternabend nächsten Dienstag 19:30", TERMIN, { datum: "2026-10-27", zeit: "19:30" }),
  S("Am 2. November Friseur um halb elf", TERMIN, { datum: "2026-11-02", zeit: "10:30" }),
  S("Lisa hat übermorgen Yoga um 18 Uhr", TERMIN, { datum: "2026-10-23", zeit: "18:00", person: "Lisa" }),
  S("Kinderarzt mit Mathis Montag 8:15", TERMIN, { datum: "2026-10-26", zeit: "08:15", person: "Mathis" }),
  S("Samstag Grillen bei Oma ab 14 Uhr", TERMIN, { datum: "2026-10-24", zeit: "14:00" }),
  S("heute abend 20 uhr kino", TERMIN, { datum: "2026-10-21", zeit: "20:00" }),
  S("Trag ein: Werkstatt am Freitag um 7:30", TERMIN, { datum: "2026-10-23", zeit: "07:30" }),
  S("zahnartz do 16 uhr", TERMIN, { datum: "2026-10-22", zeit: "16:00", lage: ["ohne-zahnarzt"] }),
  S("Jeden Montag Schwimmen um 17 Uhr", TERMIN, { zeit: "17:00" }),
  S("Felix fliegt am 5.11. um 6 Uhr nach München", TERMIN, { datum: "2026-11-05", zeit: "06:00", person: "Felix" }),
  S("Termin beim Bürgeramt morgen 11:00", TERMIN, { datum: "2026-10-22", zeit: "11:00" }),
  S("Sonntag Brunch mit Jensens um 11", TERMIN, { datum: "2026-10-25", zeit: "11:00" }),
  // Launch 1.0: Tag ohne Monat, „um 14 Uhr“, Wochentag der nächsten Woche, mehrere Termine
  S("Am 29. um 14 Uhr Kinderturnen", TERMIN, { datum: "2026-10-29", zeit: "14:00" }),
  S("Mittwoch nächste Woche um 14 Uhr Elterngespräch", TERMIN, { datum: "2026-10-28", zeit: "14:00" }),
  S("Montag Zahnarzt um 9 und Dienstag Friseur um 14 Uhr", TERMIN, { datum: "2026-10-26", zeit: "09:00" }),
  S("Lisa hat Donnerstag um 14 Uhr Physio und Freitag um 10 Uhr Friseur", TERMIN, { datum: "2026-10-22", zeit: "14:00", person: "Lisa" }),
  S("Physio Donnerstag in einer Woche um 10", TERMIN, { datum: "2026-10-29", zeit: "10:00" }),
  S("Laternenumzug am 11.11. um 17 Uhr", TERMIN, { datum: "2026-11-11", zeit: "17:00" }),
  S("Verschieb den Zahnarzt auf Freitag", ["move_entry", "upsert_entry"]),
  S("Mathis Klassenfahrt vom 9. bis 13. November", TERMIN, { datum: "2026-11-09", bis: "2026-11-13", person: "Mathis" }),
  S("Klassenfahrt 9. bis 13. Nov", TERMIN, { datum: "2026-11-09", bis: "2026-11-13" }),
  S("Moin, Lisa hat morgen um viertel nach drei Elterngespräch", TERMIN, { datum: "2026-10-22", zeit: "15:15", person: "Lisa" }),
  S("Hab grad gesehen, Freitag 16 Uhr Turnen fällt aus", ["remove_entry", "upsert_entry", "move_entry"], { lage: ["turnen"] }),
  S("Ich muss am Mittwoch nächste Woche um 9 zum Arzt", TERMIN, { datum: "2026-10-28", zeit: "09:00" }),
  S("Fußballtraining Mathis immer dienstags 16 Uhr", TERMIN, { zeit: "16:00", person: "Mathis" }),
  S("Geburtstag Oma am 30. Oktober", TERMIN, { datum: "2026-10-30" }),
  // Aufgaben und Notizen (22)
  S("Ich muss noch die Steuer machen", TERMIN, { lage: ["ohne-steuer"] }),
  S("Kita-Formular bis Freitag abgeben", TERMIN, { datum: "2026-10-23" }),
  S("Erinner mich morgen an den Müll", TERMIN, { datum: "2026-10-22" }),
  S("Lisa soll die Geschenke besorgen", TERMIN, { person: "Lisa" }),
  // Notizen gehören zu 1.0
  S("Merk dir das WLAN-Passwort: Sonnenblume42", ["upsert_note"]),
  S("Notier dir, Mathis' Schuhgröße ist 33", ["upsert_note"]),
  S("Schreib dir auf: Handwerker Müller 0176 1234", ["upsert_note"]),
  S("Schreib auf: Fahrradschloss 4711", ["upsert_note"]),
  S("Schreib in die Schnellnotiz: Elternabend Zettel unterschreiben", ["upsert_note"]),
  S("Setz Laufrad auf die Geschenkideen", ["upsert_note"]),
  S("Dringend: Versicherung anrufen", TERMIN),
  S("Steuer ist erledigt", ["done_entry"]),
  // Alles ist heute (Tafel 103): ohne genannten Tag für heute, mit Tag ab dem Tag
  S("Irgendwann mal den Keller aufräumen", TERMIN, { datum: "2026-10-21" }),
  S("Diese Woche noch Reifen wechseln", TERMIN, { datum: "2026-10-21" }),
  S("Aufgabe: Fahrrad zur Werkstatt bringen", TERMIN, { datum: "2026-10-21" }),
  S("Freitag KFZ-Steuer überweisen", TERMIN, { datum: "2026-10-23" }),
  S("Idee fürs Wochenende: Tierpark", TERMIN),
  S("Mathis braucht bis Montag Bastelsachen für die Schule", TERMIN, { datum: "2026-10-26", person: "Mathis" }),
  S("Ruf mal Opa wegen Sonntag an", ["upsert_entry", "kann_nicht"]),
  S("Rechnung vom Klempner bezahlen", TERMIN),
  S("schreib an die pinnwand: bin um 18 uhr da", ["add_pin"]),
  S("Sag allen, dass es heute Pizza gibt", ["add_pin"]),
  // Kühlschranktür (Tafel 106): Zettel für die anderen, Notiz für mich, nur nicht Erledigtes vorlesen
  S("Häng an die Pinnwand: Ole braucht Gummistiefel", ["add_pin"]),
  S("Was steht auf der Pinnwand?", ["antwort"]),
  // „Bleibt hängen“ (A-024): geht nie von selbst ins Archiv
  S("Häng dauerhaft an die Pinnwand: Müll ist immer dienstags", ["add_pin"]),
  S("Merk dir für mich die PIN vom Fahrradschloss: 4711", ["upsert_note"]),
  // Kochen und Essen (20)
  S("Was soll ich heute kochen?", ["app_command", "set_meal"]),
  S("Plan mir die Woche, vegetarisch bitte", ["set_meal", "add_recipe", "update_week"], { max: 3 }),
  // Wochenkarte gehört zu 1.0
  S("Was gibt's Mittwoch?", ["antwort"], { lage: ["plan"] }),
  S("Plan mir nächste Woche", ["set_meal", "add_recipe", "update_week"], { max: 3 }),
  S("Freitag gibt’s Pizza", ["set_meal"]),
  S("Mathis wünscht sich Sonntag Milchreis", ["add_wish", "set_meal", "update_week"]),
  S("Heute sind wir nur zu zweit", ["set_persons"], { lage: ["plan"] }),
  S("Timer 10 Minuten", ["add_timer"]),
  S("Stell einen Timer für die Nudeln auf 8 Minuten", ["add_timer"]),
  S("Wir haben noch Paprika und Reis, was geht damit?", ["app_command", "set_meal", "add_recipe", "antwort"], { max: 3 }),
  S("Kannst du ein Rezept für Linsensuppe anlegen?", ["add_recipe"]),
  // Tafel 122: „Rezept“ ohne Rezept → „Ja, gern“ schickt genau diese Bitte (Mia liefert Kurz und Ausführlich mit)
  S("Schreib mir ein Rezept für Gemüselasagne.", ["add_recipe"]),
  S("Timer 5 Minuten für die Béchamel", ["add_timer"]),
  // Montag ist am Prüftag (Mi) schon vorbei – eine Rückfrage ist richtig
  S("Tausch Montag und Mittwoch", ["move_meal", "set_meal", "rueckfrage"], { lage: ["plan"] }),
  S("Donnerstag doppelt kochen, Reste für Freitag", ["set_double"], { lage: ["plan"] }),
  // Die nächsten 7 Tage: verschieben über den Namen, auch über die Wochengrenze; nachschauen
  S("Schieb die Pizza auf Samstag", ["move_meal"], { lage: ["plan"] }),
  S("Schieb das Curry auf Montag", ["move_meal"], { lage: ["plan"] }),
  S("Tausch Freitag und Samstag", ["move_meal"], { lage: ["plan"] }),
  S("Was gibt’s Samstag?", ["antwort"], { lage: ["plan"] }),
  // Wochenplan gehört zu 1.0: leeren = Vorschau mit „Übernehmen“
  S("Lösch den Wochenplan", ["clear_week"]),
  S("Schalt Sport ein", ["set_feature"]),
  S("Wir sind ab Montag eine Woche im Urlaub", ["set_pause"]),
  S("Ich koche jetzt", ["start_cooking"]),
  S("Nächster Schritt", ["cook_step"], { lage: ["kochmodus"] }),
  S("Kochidee", ["app_command"]),
  // „Im Haus“ gehört zu 1.0: „Hab noch …“ = rein
  S("Wir haben noch 4 Joghurt im Kühlschrank", ["add_pantry"]),
  // „Was ist da?“ reinsprechen (Tafel 102): rein und raus in einem Satz, nie Satzteile als Sache
  S("[Im Haus] Milch und Eier sind da, Thunfisch ist alle", ["add_pantry", "use_pantry"], { alle: true, nieName: "alle|nicht" }),
  S("[Im Haus] Zucchini gar nicht im Haus", ["use_pantry"], { nieName: "im haus|nicht" }),
  S("[Im Haus] Wir haben keine Butter mehr", ["use_pantry"], { nieName: "kein|mehr" }),
  S("[Im Haus] Thunfisch haben wir nicht mehr", ["use_pantry"], { nieName: "nicht|haben" }),
  S("[Im Haus] Hab Hack und Paprika gekauft", ["add_pantry"], { nieName: "gekauft|hab" }),
  S("[Im Haus] Kuchen ist alle, Honig ist noch da", ["add_pantry", "use_pantry"], { alle: true, nieName: "alle|noch da" }),
  S("[Im Haus] Gar nicht im Haus: Zucchini und Sahne", ["use_pantry"], { nieName: "im haus|nicht" }),
  S("[Im Haus] Wir haben noch Joghurt im Kühlschrank, aber kein Brot mehr", ["add_pantry", "use_pantry"], { alle: true, nieName: "kein|kühlschrank" }),
  S("[Im Haus] Äpfel, Bananen und zwei Gurken sind da", ["add_pantry"], { nieName: "sind da|zwei" }),
  // Einkauf einsprechen (Tafel 110): nur Lebensmittel und Verbrauchsartikel, Füllwörter/Abbrüche/Smalltalk/Namen raus, Korrekturen, Mengen
  S("[Einkauf] Äh Milch, Brot und ähm Eier", EINKAUF, { anzahl: 3, nieName: "äh" }),
  S("[Einkauf] Milch, M…, Käse", EINKAUF, { anzahl: 2, nieName: "…|^m$" }),
  S("[Einkauf] Sahne, Butter, nee, keine Sahne", EINKAUF, { anzahl: 1, nieName: "sahne|kein|nee" }),
  S("[Einkauf] Milch, nee Hafermilch", EINKAUF, { anzahl: 1, nieName: "^milch$|nee" }),
  S("[Einkauf] Zwei Milch und drei Joghurt", EINKAUF, { anzahl: 2, menge: "2", nieName: "zwei|drei" }),
  S("[Einkauf] Klopapier, Windeln und Spülmittel", EINKAUF, { anzahl: 3 }),
  S("[Einkauf] Brot, was noch, weiß ich nicht mehr, Butter", EINKAUF, { anzahl: 2, nieName: "weiß|noch" }),
  S("[Einkauf] Mathis wollte Joghurt, und schönes Wetter heute übrigens", EINKAUF, { anzahl: 1, nieName: "mathis|wetter" }),
  S("[Einkauf] Tomaten und Gurke bei Rewe", EINKAUF, { anzahl: 2, laden: "Rewe" }),
  S("[Einkauf] Milch, Brot und noch mal Milch", EINKAUF, { anzahl: 2 }),
  S("[Einkauf] Bananen, Äpfel, also das war's eigentlich", EINKAUF, { anzahl: 2, nieName: "war|eigentlich" }),
  S("[Einkauf] Wir haben keine Windeln mehr und Kaffee ist alle", EINKAUF, { anzahl: 2, nieName: "kein|alle|mehr" }),
  S("Was anderes als Spaghetti bitte", ["app_command", "set_meal"]),
  S("Mach heute was Schnelles, wir haben wenig Zeit", ["set_meal", "app_command"]),
  S("Lisa mag keine Pilze mehr in Soßen, merk dir das", ["set_dislike", "antwort"]),
  S("Merk dir: Lisa mag keine Pilze", ["set_dislike", "antwort"]),
  // Allgemeine Fragen (20) – Mia antwortet selbst, kurz und richtig
  R("Wie lange muss ein Ei hart kochen?"),
  R("Wie viel Gramm sind ein Esslöffel Mehl?"),
  R("Kann man Reis einfrieren?"),
  R("Was hilft gegen Kalk im Wasserkocher?"),
  R("Wie lange hält gekochter Reis im Kühlschrank?"),
  R("Rechne 3 Tassen in Milliliter um"),
  R("Was ist ein guter Ersatz für Buttermilch?"),
  R("Ab wann dürfen Kinder Honig essen?"),
  R("Wie bekomme ich Rotweinflecken raus?"),
  R("Wie viele Löffel Kaffee für eine Kanne?"),
  R("Wann ist eigentlich Laternelaufen?"),
  R("Wie heißt der Hauptstadt von Australien?"),
  R("Was kann ich mit übrigen Kartoffeln machen?"),
  R("Muss man Zucchini schälen?"),
  R("Wie lange Spaghetti al dente?"),
  S("Was steht heute an?", ANTWORT, { max: 3 }),
  S("Was ist noch bei der Arbeit?", ANTWORT, { max: 3 }),
  S("Wie wird das Wetter morgen?", ANTWORT),
  S("Wer bist du?", ANTWORT),
  S("Danke dir!", ANTWORT),
  S("Du bist super, danke dir", ANTWORT),
  // Durcheinander, Dialekt, mehrere Dinge, Grenzen (22)
  S("Ähm also morgen, nee übermorgen, um drei Zahnarzt", TERMIN, { datum: "2026-10-23", zeit: "15:00" }),
  S("Moin! Brot alle und Mathis hat Freitag 15 Uhr Fußball", ["add_shopping", "upsert_entry"]),
  S("Watt gifft dat hüüt to eten?", ["app_command", "set_meal"]),
  S("Mach ma Milch und Eier rauf", EINKAUF),
  S("Ich glaub wir brauchen noch so Sachen fürs Frühstück", EINKAUF),
  S("Sachen fürs Frühstück", EINKAUF),
  S("Termin Zahnarzt, also nicht Donnerstag sondern Freitag 16 Uhr", TERMIN, { datum: "2026-10-23", zeit: "16:00" }),
  S("Bestell mir eine Pizza", ["kann_nicht"]),
  S("Schick Lisa eine SMS", ["kann_nicht", "add_pin"]),
  S("Überweis 50 Euro an Oma", ["kann_nicht"]),
  S("Buch uns einen Tisch beim Italiener", ["kann_nicht", "upsert_entry"]),
  S("Mach das rückgängig", ["undo_last"]),
  S("Nimm die Einkaufsliste von der Startseite", ["home"]),
  S("Mach die Notizen blau", ["home"]),
  S("Pinnwand wieder in Standardfarbe", ["home"]),
  S("Zeig mir den Vorrat", ["app_command", "set_feature", "antwort"]),
  S("Schreib der Kita, dass Mathis morgen krank ist", ["mail_draft", "app_command"]),
  S("Lies mir den Kalender vor", ["app_command", "antwort"], { max: 3 }),
  S("Lass uns die Woche durchgehen", ["app_command"], { max: 3 }),
  S("Brauch ich morgen einen Schirm?", ANTWORT),
  R("Mathis hat Halsschmerzen, was soll ich tun?"),
  S("Ich bin so müde heute", ANTWORT),
  S("Ich bin müde", ANTWORT),
  S("äh ja also nee doch nicht", ANTWORT),

  // Mehreres auf einmal: alle Aktionen, Text nur „Erledigt.“ (3)
  S("Pack Milch, Brot und Eier auf die Liste und Kita-Formular und Geschenk für Oma in die Aufgaben", ["add_shopping", "upsert_entry"], { alle: true, woerter: 2 }),
  S("Zahnarzt Montag 10 Uhr, Turnen Freitag 16 Uhr und Butter auf die Liste", ["upsert_entry", "add_shopping"], { alle: true, woerter: 2, lage: ["ohne-zahnarzt"] }),
  S("Kaffee und Klopapier auf die Liste, Mathis Freitag 15 Uhr Fußball und Steuer bis Mittwoch als Aufgabe", ["add_shopping", "upsert_entry"], { alle: true, woerter: 2, lage: ["ohne-steuer"] }),
];
