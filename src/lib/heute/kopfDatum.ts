// Startseiten-Kopf (Tafel 55): rechts das kurze Datum „Fr, 23. Okt“ –
// Wochentag und Monat ohne Punkt, damit es ruhig und klein bleibt.

const WEEKDAY = new Intl.DateTimeFormat("de-DE", { weekday: "short", timeZone: "Europe/Berlin" });
const MONTH = new Intl.DateTimeFormat("de-DE", { month: "short", timeZone: "Europe/Berlin" });
const DAY = new Intl.DateTimeFormat("de-DE", { day: "numeric", timeZone: "Europe/Berlin" });

/** „Fr, 23. Okt“ */
export function headerDate(date: Date): string {
  const strip = (s: string) => s.replace(/\.$/, "");
  return `${strip(WEEKDAY.format(date))}, ${strip(DAY.format(date))}. ${strip(MONTH.format(date))}`;
}
