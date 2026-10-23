// Termine-Kachel (Feinschliff nach Handy-Test, Tafel 58/59): chronologisch
// untereinander. Ganztägige stehen oben und bleiben den ganzen Tag. Ein
// laufender Termin bleibt ab Beginn 30 Minuten stehen („läuft“), mit Ende bis
// zum Ende; danach rutscht der nächste hoch. Der nächste kommende Termin ist
// hervorgehoben, bis 60 Minuten vorher mit „gleich“. Ist heute alles vorbei,
// zeigt die Kachel „Morgen · Sa“ mit den ersten Terminen von morgen.

import { tomorrowLabel, type DayItem } from "@/lib/kalender/model";

/** So lange bleibt ein Termin ohne Ende nach Beginn stehen */
export const RUNNING_MIN = 30;
/** Ab so vielen Minuten vorher heißt der nächste Termin „gleich“ */
export const SOON_MIN = 60;

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
