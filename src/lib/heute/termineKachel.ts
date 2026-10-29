// Termine-Kachel (Feinschliff nach Handy-Test, Tafel 58/59): chronologisch
// untereinander. Ganztägige stehen oben und bleiben den ganzen Tag. Ein
// laufender Termin bleibt ab Beginn 30 Minuten stehen („läuft“), mit Ende bis
// zum Ende; danach rutscht der nächste hoch. Der nächste kommende Termin ist
// hervorgehoben, bis 60 Minuten vorher mit „gleich“. Ist heute alles vorbei,
// zeigt die Kachel „Morgen · Sa“ mit den ersten Terminen von morgen.

import { tomorrowLabel, type DayItem } from "@/lib/kalender/model";

/** So lange bleibt ein Termin ohne Ende nach Beginn stehen */
const RUNNING_MIN = 30;
/** Ab so vielen Minuten vorher heißt der nächste Termin „gleich“ */
const SOON_MIN = 60;

export type TerminState = "laeuft" | "gleich" | "naechster" | null;
export type TerminRow = { item: DayItem; state: TerminState };

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Bis wann (Minuten) ein Termin in der Kachel steht */
const visibleUntil = (i: DayItem) => (i.time === null ? 24 * 60 : i.end ? toMin(i.end) : toMin(i.time) + RUNNING_MIN);

/** Heutige Termine für die Kachel: was noch steht, mit Zustand (läuft / gleich / nächster) */
export function terminRows(items: DayItem[], minutesNow: number): TerminRow[] {
  const shown = items
    .filter((i) => i.entry.typ === "termin" && !i.done && visibleUntil(i) > minutesNow)
    .sort((a, b) => (a.time === null ? -1 : b.time === null ? 1 : toMin(a.time) - toMin(b.time)));
  const next = shown.find((i) => i.time !== null && toMin(i.time) > minutesNow);
  return shown.map((item) => {
    if (item.time !== null && toMin(item.time) <= minutesNow) return { item, state: "laeuft" };
    if (item === next) return { item, state: toMin(item.time!) - minutesNow <= SOON_MIN ? "gleich" : "naechster" };
    return { item, state: null };
  });
}

/** Was die Kachel zeigt: heute (solange noch etwas steht), sonst „Morgen · Sa“ */
export function termineTile(today: DayItem[], tomorrow: DayItem[], tomorrowIso: string, minutesNow: number): { label: string | null; rows: TerminRow[] } {
  const rows = terminRows(today, minutesNow);
  if (rows.length) return { label: null, rows };
  const next = terminRows(tomorrow, -1).map((r) => ({ ...r, state: null }));
  return next.length ? { label: tomorrowLabel(tomorrowIso), rows: next } : { label: null, rows: [] };
}

/**
 * Titel und Ort für die Termin-Zeile (nie mit „…“ gekürzt): steht nach dem
 * letzten Komma oder „ · “ etwas Kurzes, ist es der Ort (kleine zweite
 * Zeile) – „Zahnarzt, Praxis Meyer“ → „Zahnarzt“ + „Praxis Meyer“. Sonst bleibt
 * der Titel ganz (er darf umbrechen).
 */
export function titelUndOrt(titel: string): { titel: string; ort: string | null } {
  const m = titel.match(/^(.{2,}),\s+([^,·]{2,40})$/) ?? titel.match(/^(.{2,}?) ·\s+([^,·]{2,40})$/);
  if (!m || /^\d/.test(m[2].trim())) return { titel, ort: null };
  return { titel: m[1].trim(), ort: m[2].trim() };
}

/** Zeichen je Zeile im Titel, bis die echte Breite gemessen ist (13,5 px fett): halbe Kachel bzw. ganze Breite */
export const ZEICHEN_JE_ZEILE = { halb: 13, ganz: 30 };
/** Mittlere Zeichenbreite (px) des Titels – zum Umrechnen der gemessenen Breite */
export const ZEICHEN_PX = 7.4;

/** Zeilen eines Textes bei `je` Zeichen pro Zeile, umgebrochen an Wortgrenzen (zu lange Wörter brechen selbst) */
function umbruchZeilen(text: string, je: number): number {
  let zeilen = 1;
  let frei = je;
  for (const wort of text.split(/\s+/).filter(Boolean)) {
    const lang = wort.length;
    if (lang <= frei - (frei === je ? 0 : 1)) {
      frei -= lang + (frei === je ? 0 : 1);
      continue;
    }
    if (frei !== je) zeilen++;
    zeilen += Math.ceil(lang / je) - 1;
    frei = je - (lang % je || je);
  }
  return zeilen;
}

/** Wie viele Zeilen ein Termin in der Kachel braucht (Titel umgebrochen, Ort darunter) */
export function zeilenBedarf(titel: string, je: number): number {
  const { titel: t, ort } = titelUndOrt(titel);
  return umbruchZeilen(t, Math.max(4, je)) + (ort ? umbruchZeilen(ort, Math.max(4, Math.round(je * 1.15))) : 0);
}

/**
 * So viele Termine, wie in `max` einzeilige Plätze passen (mindestens einer):
 * lange Titel brechen um statt „…“, dafür steht eine Zeile weniger da (zählt
 * bei „+N“) – so wird nie etwas abgeschnitten. `je` = Zeichen pro Zeile.
 */
export function termineDiePassen(titel: string[], max: number, je: number): number {
  let platz = max;
  let n = 0;
  for (const t of titel.slice(0, max)) {
    platz -= zeilenBedarf(t, je);
    if (platz < 0 && n > 0) break;
    n++;
  }
  return Math.max(1, Math.min(n, max));
}
