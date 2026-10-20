// Lottes EIN Satz oben auf "Heute": kurz, ruhig, als Überblick – nie als
// Aufgaben-Stapel ("Ruhiger Tag: 2 Termine, eine Aufgabe, abends
// Gemüsepfanne."). Rein, damit es testbar ist.

import { weekdayShort, type DayItem } from "./model";

/** "Guten Morgen" (bis 11 Uhr), "Hallo" (bis 18 Uhr), sonst "Guten Abend" */
export function greeting(minutesNow: number): string {
  if (minutesNow < 11 * 60) return "Guten Morgen";
  if (minutesNow < 18 * 60) return "Hallo";
  return "Guten Abend";
}

/** Ein Satz in Stücken – `b` = fett */
export type SentencePart = { t: string; b?: boolean };

type HomeSentenceInput = {
  minutes: number;
  /** Termine heute (alle, auch erledigte) und die noch anstehenden */
  termineToday: DayItem[];
  termineUpcoming: DayItem[];
  /** Aufgaben: heute dran (offen) und heute erledigt */
  tasksToday: DayItem[];
  tasksDoneToday: number;
  /** Aufgaben mit Frist (bzw. Tag) genau heute */
  dueToday?: DayItem[];
  /** Dringende Aufgaben (offen) – darf genannt werden, ohne Druck-Wörter */
  urgent?: DayItem[];
  /** Für heute ist noch kein Essen geplant (und es wäre eins dran) */
  dinnerOpen: boolean;
  tomorrowTermine: DayItem[];
  tomorrowTasks: DayItem[] | number;
  /** Erinnerungen, die schon mit "Okay" gesehen wurden – nicht nochmal ankündigen */
  seen?: string[];
  /** Alt (nicht mehr genutzt): Gericht und nächste Frist stehen schon in den Kacheln */
  dish?: string | null;
  nextDue?: DayItem | null;
};

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
/** Titel im Satz kurz halten – der Satz bleibt eine Zeile */
const short = (title: string, max = 26) => (title.length > max ? `${title.slice(0, max - 1).trimEnd()}…` : title);
const end = (title: string) => (/[.!?…]$/.test(title) ? title : `${title}.`);

/**
 * Lottes EIN Satz oben auf "Heute": eine Zeile, höchstens ca. 8 Wörter, nur
 * was die Kacheln nicht schon zeigen – keine Zählerei, kein Gerichtname.
 * Vorrang: gleich ein Termin → als Nächstes → heute dran → Essen-Ideen
 * (15–18 Uhr) → ab 20 Uhr morgen → alles geschafft → ruhig.
 * `action` = kleiner Knopf (Essensideen).
 */
export function homeSentence(x: HomeSentenceInput): { parts: SentencePart[]; action?: "essen" } {
  const upcoming = x.termineUpcoming.filter((t) => t.time && toMin(t.time) >= x.minutes);
  const soon = upcoming.find((t) => !x.seen?.includes(t.key) && toMin(t.time!) - x.minutes <= 60);
  if (soon?.time) {
    const inMin = toMin(soon.time) - x.minutes;
    return { parts: [{ t: inMin <= 1 ? "Jetzt: " : `In ${inMin} Minuten: ` }, { t: end(short(soon.title)), b: true }] };
  }
  const next = upcoming[0];
  if (next?.time) return { parts: [{ t: "Als Nächstes: " }, { t: `${short(next.title, 22)} um ${clockOf(next.time)}.`, b: true }] };
  const urgent = (x.urgent ?? []).find((t) => !t.done);
  if (urgent) return { parts: [{ t: short(urgent.title), b: true }, { t: " ist heute wichtig." }] };
  const due = (x.dueToday ?? []).find((t) => !t.done);
  if (due) return { parts: [{ t: short(due.title), b: true }, { t: " ist heute dran." }] };
  if (x.minutes >= 15 * 60 && x.minutes < 18 * 60 && x.dinnerOpen) return { parts: [{ t: "Noch kein Essen geplant – " }, { t: "Ideen?", b: true }], action: "essen" };
  if (x.minutes >= 20 * 60) {
    const first = x.tomorrowTermine.find((t) => t.time);
    // Der nächste Tag immer mit Wochentag: "Morgen (Mi): …"
    if (first?.time) return { parts: [{ t: `Morgen (${weekdayShort(first.date)}): ` }, { t: `${clockOf(first.time)} ${short(first.title, 22)}.`, b: true }] };
    const task = Array.isArray(x.tomorrowTasks) ? x.tomorrowTasks[0] : null;
    if (task) return { parts: [{ t: `Morgen (${weekdayShort(task.date)}): ` }, { t: end(short(task.title)), b: true }] };
  }
  const open = x.termineUpcoming.length + x.tasksToday.length;
  const hadSomething = x.termineToday.length > 0 || x.tasksDoneToday > 0;
  if (!open && hadSomething) return { parts: [{ t: "Alles geschafft für heute 🌙" }] };
  return { parts: [{ t: x.minutes >= 20 * 60 ? "Heute ist es ruhig. 🌙" : "Heute ist es ruhig. ☀️" }] };
}

const clockOf = (t: string) => t.replace(/^0(\d)/, "$1");
