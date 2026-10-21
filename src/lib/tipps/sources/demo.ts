// Beispieldaten (TIPS_SOURCE=demo): rund 15 Veranstaltungen rund um Eutin,
// Malente, Plön, Bad Segeberg und Scharbeutz, verteilt über die nächsten zwei
// Wochen, plus eine Aktion „von KARAMBA“. Nur für den Demo-/Testbetrieb – in
// der App überall als „Beispiel“ erkennbar, nie als echte Veranstaltung.

import type { Tip } from "../model";
import type { TipArea, TipSource } from "./types";

const PLACES = {
  eutin: { ort: "Eutin", lat: 54.1376, lng: 10.6181 },
  malente: { ort: "Malente", lat: 54.1725, lng: 10.5594 },
  ploen: { ort: "Plön", lat: 54.1622, lng: 10.4217 },
  segeberg: { ort: "Bad Segeberg", lat: 53.9363, lng: 10.3087 },
  scharbeutz: { ort: "Scharbeutz", lat: 54.0219, lng: 10.7461 },
  neustadt: { ort: "Neustadt in Holstein", lat: 54.1063, lng: 10.8137 },
  timmendorf: { ort: "Timmendorfer Strand", lat: 53.9946, lng: 10.7808 },
  luebeck: { ort: "Lübeck", lat: 53.8655, lng: 10.6866 },
} as const;

type Def = {
  id: string;
  /** Wochentag (0 = Mo) und wie viele Wochen später */
  wd: number;
  week?: number;
  time: string | null;
  end?: string;
  place: keyof typeof PLACES;
  adresse: string;
  titel: string;
  kurztext: string;
  kategorien: string[];
  kinder?: boolean;
  drinnen: boolean | null;
  kostenlos?: boolean;
  preis?: string;
  alter?: number;
  veranstalter: string;
  lizenz?: string;
  urheber?: string;
};

const DEFS: Def[] = [
  { id: "kinderkino", wd: 5, time: "15:00", place: "eutin", adresse: "Stadtbibliothek, Schloßplatz 4", titel: "Kinderkino: Die Schule der magischen Tiere", kurztext: "Ein Nachmittag im Kinderkino – mit Popcorn und Kissen auf dem Boden.", kategorien: ["Kinder", "Kino"], kinder: true, drinnen: true, preis: "3 € pro Kind, Erwachsene frei", alter: 6, veranstalter: "Stadtbibliothek Eutin", lizenz: "CC BY 4.0", urheber: "Beispiel-Veranstalter" },
  { id: "markt-sa", wd: 5, time: "08:00", end: "13:00", place: "eutin", adresse: "Marktplatz", titel: "Wochenmarkt", kurztext: "Obst, Gemüse, Käse und Blumen aus der Region.", kategorien: ["Markt", "Wochenmarkt"], drinnen: false, kostenlos: true, veranstalter: "Stadt Eutin" },
  { id: "markt-mi", wd: 2, time: "08:00", end: "13:00", place: "eutin", adresse: "Marktplatz", titel: "Wochenmarkt", kurztext: "Obst, Gemüse, Käse und Blumen aus der Region.", kategorien: ["Markt", "Wochenmarkt"], drinnen: false, kostenlos: true, veranstalter: "Stadt Eutin" },
  { id: "laterne", wd: 4, time: "17:30", place: "malente", adresse: "Kurpark", titel: "Laternenumzug durch den Kurpark", kurztext: "Mit Spielmannszug und Punsch am Ende – Laternen mitbringen.", kategorien: ["Kinder", "Laterne", "Brauchtum"], kinder: true, drinnen: false, kostenlos: true, veranstalter: "Tourismus Malente" },
  { id: "herbstkonzert", wd: 6, time: "16:00", place: "ploen", adresse: "Plöner Schloss, Festsaal", titel: "Herbstkonzert im Schloss", kurztext: "Kammermusik mit Werken von Mozart und Schubert.", kategorien: ["Konzert", "Klassik"], drinnen: true, preis: "12 €, ermäßigt 8 €", veranstalter: "Kulturverein Plön" },
  { id: "kellersee", wd: 6, time: "10:00", place: "malente", adresse: "Treffpunkt Bahnhof", titel: "Familien-Wanderung um den Kellersee", kurztext: "Gemütliche 6 km mit Picknickpause – kinderwagentauglich.", kategorien: ["Natur", "Wanderung", "Familie"], kinder: true, drinnen: false, kostenlos: true, veranstalter: "NABU Ostholstein" },
  { id: "kuerbis", wd: 5, time: "11:00", place: "scharbeutz", adresse: "Seebrückenvorplatz", titel: "Kürbisschnitzen am Strand", kurztext: "Kürbisse und Messer sind da – einfach vorbeikommen.", kategorien: ["Kinder", "Basteln", "Open Air"], kinder: true, drinnen: false, preis: "5 € pro Kürbis", alter: 5, veranstalter: "Tourismus-Service Scharbeutz" },
  { id: "indoor", wd: 6, time: null, place: "segeberg", adresse: "Kurhausstraße 2", titel: "Familientag im Indoor-Spielplatz", kurztext: "Den ganzen Tag toben, Kinder unter 3 frei.", kategorien: ["Kinder", "Familie"], kinder: true, drinnen: true, preis: "6 € pro Kind", veranstalter: "Spielhalle Segeberg" },
  { id: "vorlesen", wd: 1, time: "16:00", place: "eutin", adresse: "Stadtbücherei, Schloßplatz 4", titel: "Vorlesestunde für Kinder", kurztext: "Geschichten zum Zuhören für Kinder von 4 bis 7.", kategorien: ["Kinder", "Lesung", "Bücherei"], kinder: true, drinnen: true, kostenlos: true, alter: 4, veranstalter: "Stadtbibliothek Eutin" },
  { id: "flohmarkt", wd: 6, time: "08:00", end: "14:00", place: "neustadt", adresse: "Marktplatz", titel: "Flohmarkt", kurztext: "Trödel, Spielzeug und Kinderkleidung.", kategorien: ["Flohmarkt", "Markt"], drinnen: false, kostenlos: true, veranstalter: "Stadt Neustadt" },
  { id: "lauftreff", wd: 3, time: "18:00", place: "ploen", adresse: "Strandweg, Prinzeninsel", titel: "Lauftreff am See", kurztext: "Locker 5 oder 10 km – alle Tempos willkommen.", kategorien: ["Sport", "Lauf"], drinnen: false, kostenlos: true, veranstalter: "TSV Plön" },
  { id: "grueffelo", wd: 5, time: "15:00", place: "luebeck", adresse: "Figurentheater, Kolk 20", titel: "Figurentheater: Der Grüffelo", kurztext: "Das Bilderbuch als Puppenspiel – 45 Minuten.", kategorien: ["Kinder", "Theater", "Puppen"], kinder: true, drinnen: true, preis: "8 €", alter: 3, veranstalter: "Figurentheater Lübeck" },
  { id: "orgel", wd: 6, time: "17:00", place: "eutin", adresse: "St.-Michaelis-Kirche", titel: "Orgelmusik zum Sonntag", kurztext: "Eine halbe Stunde Orgelmusik zum Durchatmen. Eintritt frei, Spende willkommen.", kategorien: ["Konzert", "Orgel"], drinnen: true, kostenlos: true, veranstalter: "Kirchengemeinde Eutin" },
  { id: "schwimmen", wd: 5, time: "14:00", end: "17:00", place: "malente", adresse: "Hallenbad, Bahnhofstraße", titel: "Familienschwimmen mit Spielgeräten", kurztext: "Rutsche, Matten und Wasserspielzeug im ganzen Becken.", kategorien: ["Sport", "Schwimmen", "Familie"], kinder: true, drinnen: true, preis: "4 € / Kinder 2 €", veranstalter: "Hallenbad Malente" },
  { id: "herbstmarkt", wd: 5, week: 1, time: "11:00", end: "18:00", place: "timmendorf", adresse: "Kurpromenade", titel: "Herbstmarkt an der Promenade", kurztext: "Kunsthandwerk, Glühwein und Waffeln.", kategorien: ["Markt", "Kunsthandwerk"], drinnen: false, kostenlos: true, veranstalter: "Timmendorfer Strand Marketing" },
  { id: "basteln", wd: 2, week: 1, time: "15:00", place: "eutin", adresse: "Ostholstein-Museum", titel: "Bastelnachmittag im Museum", kurztext: "Wir basteln Herbstlaternen – Material ist da.", kategorien: ["Kinder", "Basteln", "Museum"], kinder: true, drinnen: true, preis: "2 €", alter: 5, veranstalter: "Ostholstein-Museum" },
  { id: "karamba", wd: 5, time: "14:00", place: "eutin", adresse: "Am Rosengarten 3", titel: "Eis-Probieren: neue Wintersorten", kurztext: "Wir probieren die neuen Wintersorten – kostenlos für alle Kinder.", kategorien: ["Familie", "Genuss"], kinder: true, drinnen: true, kostenlos: true, veranstalter: "KARAMBA Eis" },
];

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const weekday = (iso: string) => (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;

/** Beispiel-Tipps ab `today` (immer gleich für denselben Tag) */
export function demoTips(today: string): Tip[] {
  return DEFS.map((d) => {
    const date = addDays(today, ((d.wd - weekday(today) + 7) % 7) + 7 * (d.week ?? 0));
    const p = PLACES[d.place];
    return {
      id: `demo:${d.id}:${date}`,
      quelle: "demo" as const,
      quelle_id: d.id,
      titel: d.titel,
      kurztext: d.kurztext,
      beginn: `${date}T${d.time ?? "00:00"}`,
      ende: d.end ? `${date}T${d.end}` : null,
      ganztags: d.time === null,
      ort_name: p.ort,
      adresse: d.adresse,
      lat: p.lat,
      lng: p.lng,
      kategorien: d.kategorien,
      fuer_kinder: Boolean(d.kinder),
      drinnen: d.drinnen,
      kostenlos: Boolean(d.kostenlos),
      preis_text: d.kostenlos ? "Eintritt frei" : (d.preis ?? null),
      alter_ab: d.alter ?? null,
      url: null,
      veranstalter: d.veranstalter,
      lizenz: d.lizenz ?? "CC0 1.0",
      urheber: d.urheber ?? null,
      bild_url: null,
      bild_lizenz: null,
      aktualisiert_am: `${today}T06:00:00Z`,
    };
  });
}

export class DemoTipSource implements TipSource {
  readonly id = "demo" as const;

  constructor(private readonly today: string) {}

  async fetchRange(von: string, bis: string, gebiet: TipArea): Promise<Tip[]> {
    const [s, w, n, e] = gebiet.bbox;
    return demoTips(this.today).filter((t) => t.beginn.slice(0, 10) >= von && t.beginn.slice(0, 10) <= bis && t.lat >= s && t.lat <= n && t.lng >= w && t.lng <= e);
  }
}
