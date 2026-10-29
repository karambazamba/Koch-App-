// Wundertüte · Heute vor 100 Jahren: nur an Tagen mit sicher belegtem
// Ereignis (`tag` = „MM-TT“ im Jahr 1926, bzw. 100 Jahre vor dem Jahr der
// Anzeige: `jahr`). Kindgerecht, ohne Politik, Kriege, Religion oder
// Unglücke. Quelle Pflicht, nie angezeigt. Nachfüllen: jedes Jahr die
// Einträge für das Jahr 100 Jahre zuvor ergänzen.

import type { Eintrag } from "@/lib/wundertuete/sorten";

const e = (n: number, jahr: number, tag: string, vorne: string, hinten: string, quelle: string): Eintrag => ({ id: `h1-${String(n).padStart(3, "0")}`, sorte: "heute100", jahr, tag, vorne, hinten, quelle });

export const HEUTE100: Eintrag[] = [
  e(1, 1926, "01-06", "Welche Fluggesellschaft wurde heute in Berlin gegründet?", "Die Deutsche Luft Hansa, die heutige **Lufthansa**.", "Lufthansa Group: Unternehmensgeschichte (Gründung 6. Januar 1926)"),
  e(2, 1926, "01-26", "Was zeigte John Logie Baird heute in London?", "Das erste **Fernsehen** mit bewegten Bildern, vor Publikum.", "Encyclopaedia Britannica: John Logie Baird (26. Januar 1926)"),
  e(3, 1926, "03-07", "Erstes Telefonat über den Atlantik: zwischen welchen Städten?", "Zwischen **London** und New York, per Funk.", "AT&T Archives: First transatlantic telephone call (7. März 1926)"),
  e(4, 1926, "03-16", "Wie lange flog die erste Rakete mit flüssigem Treibstoff?", "Nur **2,5** Sekunden, gut zwölf Meter hoch.", "NASA: Dr. Robert H. Goddard (16. März 1926)"),
  e(5, 1926, "05-08", "Welcher berühmte Tierfilmer wurde heute geboren?", "**David Attenborough**, in London.", "BBC: Sir David Attenborough (geboren 8. Mai 1926)"),
  e(6, 1926, "05-12", "Wie hieß das Luftschiff, das heute über den Nordpol flog?", "**Norge**, mit Roald Amundsen an Bord.", "Encyclopaedia Britannica: Roald Amundsen (12. Mai 1926)"),
  e(7, 1926, "05-26", "Welcher große Jazz-Trompeter wurde heute geboren?", "**Miles Davis**.", "Encyclopaedia Britannica: Miles Davis (geboren 26. Mai 1926)"),
  e(8, 1926, "06-28", "Welche zwei Autofirmen taten sich heute zusammen?", "**Daimler** und Benz, daraus wurde Mercedes-Benz.", "Mercedes-Benz Group: Chronik (Fusion 28. Juni 1926)"),
  e(9, 1926, "07-11", "Welches Autorennen gab es heute zum ersten Mal?", "Den ersten **Großen Preis** von Deutschland, auf der AVUS.", "Encyclopaedia Britannica / Motorsport: German Grand Prix 1926 (11. Juli 1926)"),
  e(10, 1926, "08-06", "Erste Frau quer durch den Ärmelkanal: wie lange brauchte sie?", "Gertrude Ederle brauchte **14** Stunden und 39 Minuten.", "Encyclopaedia Britannica: Gertrude Ederle (6. August 1926)"),
  e(11, 1926, "10-14", "Welches Buch über einen Honig-Bären erschien heute?", "**Pu der Bär** von A. A. Milne.", "Encyclopaedia Britannica: Winnie-the-Pooh (erschienen 14. Oktober 1926)"),
  e(12, 1926, "10-18", "Welcher Rock’n’Roll-Gitarrist wurde heute geboren?", "**Chuck Berry**.", "Encyclopaedia Britannica: Chuck Berry (geboren 18. Oktober 1926)"),
  e(13, 1926, "11-11", "Welche berühmte Straße in den USA bekam heute ihre Nummer?", "Die **Route 66**.", "U.S. National Park Service: Route 66 (11. November 1926)"),
  e(14, 1926, "06-01", "Welcher spätere Filmstar kam heute in Los Angeles zur Welt?", "**Marilyn Monroe**.", "Encyclopaedia Britannica: Marilyn Monroe (geboren 1. Juni 1926)"),
];
