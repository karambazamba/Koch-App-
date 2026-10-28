// Gemeinsamer Alltags-Haushalt für die Tempo-Messung (Auftrag „Mia schneller
// und flüssiger“): Familie Müller mit vollem Alltag – Termine, Aufgaben,
// Notizen, Vorrat, Kochbuch, Pinnwand, Einkaufsliste. (Keine Test-Datei.)
import { createNote } from "@/lib/notizen/model";
import type { AssistantData } from "@/lib/begleitung/ops";
import { aufgabe, daten, HEUTE, rezept, termin } from "./werkzeugKontext";

const TAGE = ["2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-26", "2026-10-27", "2026-10-28"];

export function alltagsHaushalt(): AssistantData {
  const entries = [
    ...["Zahnarzt Mathis", "Elternabend", "Turnen", "Steuerberater", "Friseur Lisa", "Kita-Fest", "Fußball", "Oma Geburtstag", "Teammeeting", "Physio"].map((title, i) => termin({ title, date: TAGE[i % TAGE.length], start: `${String(8 + i).padStart(2, "0")}:30` }, i === 8 ? "arbeit" : "familie")),
    ...["Steuer machen", "Kita-Formular abgeben", "Reifen wechseln", "Geschenk für Oma", "Keller aufräumen", "Rechnung Handwerker bezahlen"].map((title) => aufgabe({ title, date: HEUTE })),
  ];
  const notes = [
    createNote({ title: "Packliste Urlaub", items: ["Zelt", "Schlafsack", "Taschenlampe", "Sonnencreme"] }),
    createNote({ title: "WLAN", text: "Passwort steht auf dem Router" }),
    createNote({ title: "Geschenkideen", items: ["Buch", "Puzzle", "Gutschein"] }),
    createNote({ title: "Handwerker", text: "Herr Jansen, kommt Dienstag" }),
    createNote({ title: "Filme", items: ["Paddington", "Ronja"] }),
  ];
  const recipes = Object.fromEntries(
    ["Spaghetti Bolognese", "Kartoffelsuppe", "Gemüsecurry", "Pfannkuchen", "Lachs mit Ofenkartoffeln", "Chili sin Carne", "Linsensuppe", "Pizza", "Frikadellen", "Milchreis", "Flammkuchen", "Risotto"].map((t, i) => [`r${i}`, rezept(`r${i}`, t, ["Zwiebel", "Tomaten", "Salz"])]),
  );
  return daten({
    entries,
    notes,
    recipes,
    pantry: ["Hack", "Zucchini", "Milch", "Eier", "Nudeln", "Reis", "Paprika", "Käse", "Joghurt", "Kartoffeln"].map((name, i) => ({ id: `v${i}`, name, place: "kuehlschrank", addedAt: "2026-10-18" })) as AssistantData["pantry"],
    pinnwand: [
      { author: "Lisa", text: "Bin um 8 da", at: "2026-10-21T07:00:00Z" },
      { author: "Felix", text: "Wer holt Mathis?", at: "2026-10-20T12:00:00Z" },
    ],
    laeden: { regeln: { Müsli: "Rossmann", Brot: "Bäcker" }, meine: ["Rewe", "Aldi", "Rossmann"] },
    features: ["notizen", "vorrat", "timer"],
  });
}

/** Typische Alltagsfragen und -befehle (Messung der Eingabe-Tokens) */
export const ALLTAGSFRAGEN = [
  "Milch auf die Liste",
  "Zahnarzt Donnerstag 16 Uhr",
  "Erinner mich morgen an die Mülltonne",
  "Timer 10 Minuten Nudeln",
  "Hab ich morgen Nachmittag Zeit?",
  "Was steht auf der Einkaufsliste?",
  "Was gibt’s heute?",
  "Wie wird das Wetter morgen?",
  "Notier: Herr Jansen kommt Dienstag",
  "Danke dir",
];

export const EINKAUFSLISTE = ["Brot", "Butter", "Äpfel", "Spülmittel", "Kaffee", "Bananen", "Joghurt", "Klopapier"];
