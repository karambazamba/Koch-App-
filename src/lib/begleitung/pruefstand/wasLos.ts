// Prüfstand „Was los?“ (A-055): Fragen nach Veranstaltungen. Bezug wie der
// ganze Prüfstand: Mittwoch, 21.10.2026, 10:30, Eutin. Veranstaltungen =
// die Beispieldaten aus `region/demo.ts` (nur hier und im Testbetrieb, nie
// für Nutzer). `waslos` = die Antwort zeigt die Karten mit „In den Kalender“,
// `nennt` = ein Titel aus dem Zeitraum steht in der Antwort.

export type WasLosSatz = { text: string; waslos: boolean; nennt?: string; nenntNie?: string };

export const WAS_LOS_SAETZE: WasLosSatz[] = [
  { text: "Was ist los?", waslos: true },
  { text: "Was ist heute in Eutin los?", waslos: true },
  { text: "Was können wir am Wochenende mit den Kindern machen?", waslos: true, nennt: "Laternen" },
  { text: "Was ist am Wochenende los?", waslos: true },
  { text: "Gibt’s am Samstag was in Eutin?", waslos: true, nennt: "Herbstmarkt" },
  { text: "Was geht am Sonntag mit Kindern?", waslos: true, nennt: "Laternen" },
  { text: "Gibt es nächste Woche einen Markt?", waslos: true, nennt: "Wochenmarkt" },
  { text: "Irgendwelche Veranstaltungen heute?", waslos: true },
  { text: "Was ist morgen in Malente los?", waslos: false, nenntNie: "Herbstmarkt" },
  { text: "Was kann man am Samstag draußen unternehmen?", waslos: true, nennt: "Nachtwächter" },
];
