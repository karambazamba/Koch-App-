// Fragen nach Tipps erkennen (rein, für die Regel ohne KI und fürs Vorab-Laden
// bei der KI): „Was ist am Wochenende los?“, „Was können wir bei Regen mit den
// Kindern machen?“, „Gibt’s heute was in Malente?“. Nie „Was gibt’s heute?“
// (das ist Essen).

import { WEEKDAYS_MO } from "@/lib/core/days";
import type { TipFilter } from "@/lib/tipps/categories";
import { rangeFor, weekday } from "@/lib/tipps/model";

export type TipQuestion = { von: string; bis: string; filters: TipFilter[]; ort: string | null; label: string };

const ASK = [
  /\bwas\s+(ist|geht|läuft)\b.*\blos\b/i,
  /\bwas\s+(können|könnten|kann|wollen|sollen)\s+wir\b.*\b(machen|unternehmen|tun|anstellen)\b/i,
  /\b(veranstaltung\w*|events?|ausflugs?tipps?|tipps?\s+(fürs|für das|am|aus der region)|unternehmungen)\b/i,
  /\b[Gg]ibt['’]?s\b.*\bwas\b.*\bin\s+[A-ZÄÖÜ]/,
  /\bwas\s+ist\s+(heute|morgen|am wochenende)\s+in\s+[A-ZÄÖÜ]/,
];
const NOT = /\b(essen|kochen|koch|gericht|mittag|abendbrot|abendessen|einkauf|wetter|schirm|termin\w*|aufgabe\w*)\b/i;

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const DAYS: [RegExp, number][] = [
  [/\bmontag/i, 0], [/\bdienstag/i, 1], [/\bmittwoch/i, 2], [/\bdonnerstag/i, 3], [/\bfreitag/i, 4], [/\bsamstag|\bsonnabend/i, 5], [/\bsonntag/i, 6],
];

export function tipQuestion(text: string, today: string): TipQuestion | null {
  const t = text.trim();
  if (!ASK.some((re) => re.test(t)) || NOT.test(t)) return null;
  const filters: TipFilter[] = [];
  if (/\bregen|\bdrinnen|\bindoor/i.test(t)) filters.push("regen");
  if (/\bkinder|\bkids|\bkleinen\b|\bfamilie/i.test(t)) filters.push("kinder");
  if (/\bdraußen|\bdraussen|\bfrische luft/i.test(t)) filters.push("draussen");
  if (/\bkostenlos|\bumsonst|\bgratis|\bnichts kostet/i.test(t)) filters.push("kostenlos");
  if (/\bmusik|\bkonzert/i.test(t)) filters.push("musik");
  if (/\bmarkt|\bmärkte/i.test(t)) filters.push("maerkte");
  if (/\bsport/i.test(t)) filters.push("sport");
  const ort = t.match(/\bin\s+((?:Bad\s+)?[A-ZÄÖÜ][\wäöüß-]+)/)?.[1] ?? null;
  let von = today;
  let bis = addDays(today, 6);
  let label = "in den nächsten Tagen";
  if (/\bheute\b/i.test(t)) [von, bis, label] = [today, today, "heute"];
  else if (/\bmorgen\b/i.test(t)) [von, bis, label] = [addDays(today, 1), addDays(today, 1), "morgen"];
  else if (/\bwochenende/i.test(t)) [von, bis, label] = [rangeFor("wochenende", today).von, rangeFor("wochenende", today).bis, "am Wochenende"];
  else if (/\bdiese\s+woche/i.test(t)) [von, bis, label] = [rangeFor("woche", today).von, rangeFor("woche", today).bis, "diese Woche"];
  else {
    const day = DAYS.find(([re]) => re.test(t));
    if (day) {
      const date = addDays(today, (day[1] - weekday(today) + 7) % 7);
      [von, bis, label] = [date, date, `am ${WEEKDAYS_MO[day[1]]}`];
    }
  }
  return { von, bis, filters, ort: ort && !/^(der|die|das|dem|den)$/i.test(ort) ? ort : null, label };
}
