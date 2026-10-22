// „Übernimm meinen Google-Kalender“, „Wie bekomme ich meine Apple-Termine
// rein?“ → die Begleitung erklärt kurz den Weg und öffnet /profil/kalender
// (schaltet den Baustein „Kalender übernehmen“ frei). Rein.

/** Will jemand Termine aus Google/Apple/Outlook holen? */
export function isCalendarImportRequest(text: string): boolean {
  const t = text.toLowerCase();
  const source = /(google|apple|icloud|outlook|iphone|handy)[- ]?(kalender|termine)|(kalender|termine) (aus|von|vom) (google|apple|icloud|outlook|dem iphone|meinem iphone|dem handy|meinem handy)/;
  const verb = /(übernimm|übernehmen|importier|hol|rein|rüber|synchron|verbind|einlesen|bekomm|krieg)/;
  return (source.test(t) && verb.test(t)) || /(?<![a-zäöüß])kalender (übernehmen|importieren|einlesen)(?![a-zäöüß])/.test(t);
}

/** Antwort: kurz beide Wege (die App kann den Handy-Kalender nicht direkt lesen) */
export const CALENDAR_IMPORT_REPLY =
  "Gern! Den Handy-Kalender kann ich nicht direkt lesen – dafür gibt’s zwei Wege: einmal eine Kalender-Datei aus Google oder Apple einlesen, oder dauerhaft per Kalender-Link verbinden, dann bleibt alles aktuell. Ich hab dir „Kalender übernehmen“ geöffnet.";
