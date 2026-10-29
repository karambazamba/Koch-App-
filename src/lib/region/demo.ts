// TEST-/BEISPIELDATEN für „Was los?“ – NUR für Durchklick, Bilder und
// Prüfstand im Testbetrieb (`REGION_TIPPS_QUELLE=demo` oder `TIPS_SOURCE=demo`,
// nie mit VERCEL_ENV=production, siehe `regionQuelle` in server.ts). Inhalte
// wie auf Tafel 142, Tage relativ zu „heute“. IDs beginnen mit „demo-“, die
// Quellenzeile sagt „Beispieldaten (Testbetrieb)“. Keine echten Termine.

import { addDays } from "@/lib/core/now";
import { sanitizeEvent, wochenendeVon, wochentag, type RegionEvent } from "@/lib/region/model";

const BEISPIEL_LINK = "https://www.kreis-oh.de/Bildung-Kultur-Sport/Kultur-erleben-Kultur-f%C3%B6rdern/Veranstaltungen/";

/** Beispiel-Veranstaltungen um Eutin (heute, Wochenende, nächste Woche) */
export function demoEvents(heute: string): RegionEvent[] {
  const { bis: sonntag } = wochenendeVon(heute);
  const samstag = addDays(sonntag, -1);
  // Mittwoch nach dem Wochenende
  const mittwoch = addDays(sonntag, 3);
  const wt = wochentag(heute);
  const roh = [
    { id: "demo-beletage", titel: "Rundgang durch die Beletage", datum: heute, beginn: "11:30", ort: "Schloss Eutin", kategorien: ["kultur"] },
    { id: "demo-puder", titel: "Von Puder, Pasteten und Seidentapeten", datum: heute, beginn: "14:00", ort: "Schloss Eutin · Familienführung", kategorien: ["kinder", "kultur"] },
    { id: "demo-fotografien", titel: "Eutin in Fotografien früher und heute", datum: heute, bis_datum: addDays(heute, 20), ort: "Ostholstein-Museum, Eutin", kategorien: ["kultur"] },
    { id: "demo-museum", titel: "Nachts im Museum", datum: heute, beginn: "19:00", ort: "Eutin", kategorien: ["kultur"] },
    { id: "demo-herbstmarkt", titel: "Herbstmarkt am Schloss", datum: samstag, beginn: "10:00", ende: "17:00", ort: "Schlossplatz Eutin", kategorien: ["markt", "kinder", "draussen"] },
    { id: "demo-nachtwaechter", titel: "Nachtwächter-Rundgang", datum: samstag, beginn: "17:00", ort: "Treffpunkt Tourist-Info, Markt 19, Eutin", kategorien: ["draussen", "kultur"] },
    { id: "demo-laternen", titel: "Laternenbasteln für Kinder", datum: sonntag, beginn: "11:00", ende: "13:00", ort: "Kreisbibliothek Eutin", kategorien: ["kinder"] },
    { id: "demo-wochenmarkt", titel: "Wochenmarkt", datum: mittwoch, beginn: "08:00", ende: "13:00", ort: "Lenter Platz, Malente", kategorien: ["markt"] },
    // Weiter weg (nur bei 30 km): bleibt bei „bis 15 km“ draußen
    { id: "demo-hafenfest", titel: "Lichterfahrt im Hafen", datum: samstag, beginn: "18:30", ort: "Hafen, Heiligenhafen", kategorien: ["draussen"] },
  ];
  // Freitags ab 15 Uhr zählt zum Wochenende: ein Beispiel, wenn heute Mo–Fr ist
  if (wt <= 4) roh.push({ id: "demo-kino", titel: "Kinderkino im Rathaus", datum: addDays(heute, 4 - wt), beginn: "15:30", ort: "Rathaus Eutin", kategorien: ["kinder", "kultur"] });
  return roh.map((r) => sanitizeEvent({ ...r, quelle: "demo", link: BEISPIEL_LINK })).filter((e): e is RegionEvent => e !== null);
}
