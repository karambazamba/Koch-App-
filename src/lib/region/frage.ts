// „Was los?“ für Mia (rein): Fragen erkennen und aus den Veranstaltungen
// antworten – „Was ist los?“, „Was ist heute in Eutin los?“, „Was können wir
// am Wochenende mit den Kindern machen?“, „Gibt’s heute was in Malente?“.
// Nie „Was gibt’s heute?“ (Essen), nie Wetter, Termine, Einkauf, Pinnwand.

import { WEEKDAYS_MO } from "@/lib/core/days";
import { addDays } from "@/lib/core/now";
import type { Filter, Kategorie } from "@/lib/region/kategorien";
import { erkenneOrt } from "@/lib/region/orte";
import { imUmkreis, nachTagen, wochenendeVon, wochentag, type RegionEvent, type WasLosKarte } from "@/lib/region/model";

export type WasLosFrage = { von: string; bis: string; filter: Filter; ort: string | null; label: string };

const FRAGE = [
  /(?<![a-zäöüß])was\s+(ist|geht|läuft|war)(?![a-zäöüß]).*(?<![a-zäöüß])los(?![a-zäöüß])/i,
  /(?<![a-zäöüß])was\s+(können|könnten|kann|wollen|sollen|machen)\s+(wir|man)(?![a-zäöüß]).*(?<![a-zäöüß])(machen|unternehmen|tun|anstellen|hin)(?![a-zäöüß])/i,
  /(?<![a-zäöüß])was\s+geht\s+(heute|morgen|übermorgen|am|diese|nächste|kommende)(?![a-zäöüß])/i,
  /(?<![a-zäöüß])(veranstaltung\w*|events?|ausflugs?tipps?|unternehmungen|was\s+los)(?![a-zäöüß])/i,
  /(?<![a-zäöüß])[Gg]ibt['’]?s(?![a-zäöüß]).*(?<![a-zäöüß])was(?![a-zäöüß]).*(?<![a-zäöüß])in\s+[A-ZÄÖÜ]/,
  /(?<![a-zäöüß])gibt(['’]s|\s+es)(?![a-zäöüß]).*(markt|märkte|flohmarkt|konzert|kinderkino|laterne\w*|führung|ausstellung)/i,
  /(?<![a-zäöüß])(irgendwas|etwas|was)\s+(los|unternehmen)(?![a-zäöüß])/i,
];
const NICHT = /(?<![a-zäöüß])(essen|kochen|koch\w*|gericht\w*|mittag\w*|abendbrot|abendessen|frühstück|einkauf\w*|liste|wetter|regnet|schirm|termin\w*|aufgabe\w*|pinnwand|kalender|steht\s+an|ansteht|mit\s+dir|bei\s+dir|mit\s+mir)(?![a-zäöüß])/i;

const TAGE: [RegExp, number][] = [
  [/(?<![a-zäöüß])montag/i, 0], [/(?<![a-zäöüß])dienstag/i, 1], [/(?<![a-zäöüß])mittwoch/i, 2], [/(?<![a-zäöüß])donnerstag/i, 3], [/(?<![a-zäöüß])freitag/i, 4], [/(?<![a-zäöüß])(samstag|sonnabend)/i, 5], [/(?<![a-zäöüß])sonntag/i, 6],
];

/** Frage nach Veranstaltungen? Mit Zeitraum, Filter und Ort; sonst null */
export function wasLosFrage(text: string, heute: string): WasLosFrage | null {
  const t = text.trim();
  if (!FRAGE.some((re) => re.test(t)) || NICHT.test(t)) return null;
  const filter: Filter = /(?<![a-zäöüß])(kinder\w*|kids|kleinen|kurzen)(?![a-zäöüß])/i.test(t)
    ? "kinder"
    : /(?<![a-zäöüß])(markt|märkte|flohmarkt)/i.test(t)
      ? "markt"
      : /(?<![a-zäöüß])(draußen|draussen|frische\s+luft|raus)(?![a-zäöüß])/i.test(t)
        ? "draussen"
        : /(?<![a-zäöüß])(kultur|museum|konzert|theater|ausstellung)/i.test(t)
          ? "kultur"
          : "alles";
  const nach = t.match(/(?<![a-zäöüß])in\s+((?:Bad\s+)?[A-ZÄÖÜ][\wäöüß-]+(?:\s+[A-ZÄÖÜ][\wäöüß-]+)?)/)?.[1] ?? null;
  const ort = nach ? erkenneOrt(nach) : null;
  if (/(?<![a-zäöüß])heute(?![a-zäöüß])/i.test(t)) return { von: heute, bis: heute, filter, ort, label: "heute" };
  if (/(?<![a-zäöüß])übermorgen(?![a-zäöüß])/i.test(t)) return { von: addDays(heute, 2), bis: addDays(heute, 2), filter, ort, label: "übermorgen" };
  if (/(?<![a-zäöüß])morgen(?![a-zäöüß])/i.test(t)) return { von: addDays(heute, 1), bis: addDays(heute, 1), filter, ort, label: "morgen" };
  if (/wochenende/i.test(t)) return { ...wochenendeVon(heute), filter, ort, label: "am Wochenende" };
  const tag = TAGE.find(([re]) => re.test(t));
  if (tag) {
    const datum = addDays(heute, (tag[1] - wochentag(heute) + 7) % 7);
    return { von: datum, bis: datum, filter, ort, label: `am ${WEEKDAYS_MO[tag[1]]}` };
  }
  if (/(?<![a-zäöüß])(nächste|kommende)\s+woche/i.test(t)) return { von: addDays(heute, 7 - wochentag(heute)), bis: addDays(heute, 13 - wochentag(heute)), filter, ort, label: "nächste Woche" };
  return { von: heute, bis: addDays(heute, 6), filter, ort, label: "in den nächsten Tagen" };
}

export type WasLosLage = { orte: string[]; umkreis: number; kategorienAus: Kategorie[]; heute: string; jetzt: number };

/** Bis zu 3 Treffer für die Frage: im Umkreis (bzw. im genannten Ort), Zeitraum, Filter */
export function wasLosTreffer(events: RegionEvent[], f: Pick<WasLosFrage, "von" | "bis" | "filter" | "ort">, lage: WasLosLage, max = 3): WasLosKarte[] {
  const nah = f.ort ? events.filter((e) => e.gemeinde === f.ort && e.kategorien.some((k) => !lage.kategorienAus.includes(k))) : imUmkreis(events, lage.orte, lage);
  const we = wochenendeVon(lage.heute);
  const wochenende = f.von === we.von && f.bis === we.bis;
  // Jeder Eintrag einmal, am ersten passenden Tag (Wochenende: Freitag erst ab 15 Uhr)
  const tage = nachTagen(nah, wochenende ? "wochenende" : "zwei", lage.heute, lage.jetzt, f.filter).flatMap((g) => g.events.map((event) => ({ event, tag: g.tag < f.von ? f.von : g.tag })));
  const imZeitraum = tage.filter(({ event, tag }) => tag <= f.bis && (event.bis_datum ?? event.datum) >= f.von);
  return imZeitraum.slice(0, max);
}
