// Lottes EIN Satz oben auf "Heute": kurz, ruhig, als Überblick – nie als
// Aufgaben-Stapel ("Ruhiger Tag: 2 Termine, eine Aufgabe, abends
// Gemüsepfanne."). Rein, damit es testbar ist.

import type { DayItem } from "./model";

/** "Guten Morgen" (bis 11 Uhr), "Hallo" (bis 18 Uhr), sonst "Guten Abend" */
export function greeting(minutesNow: number): string {
  if (minutesNow < 11 * 60) return "Guten Morgen";
  if (minutesNow < 18 * 60) return "Hallo";
  return "Guten Abend";
}

const count = (n: number, one: string, many: string) => (n === 1 ? one : `${n} ${many}`);

/** "abends Gemüsepfanne" / "mittags Gulasch" */
function dishPart(dish: string, clock: string | null): string {
  const hour = clock ? Number(clock.slice(0, 2)) : 18;
  return `${hour < 15 ? "mittags" : "abends"} ${dish}`;
}

export function todaySentence({ items, dish, dishClock }: { items: DayItem[]; dish: string | null; dishClock: string | null }): string {
  const open = items.filter((i) => !i.done);
  const termine = open.filter((i) => i.entry.typ === "termin").length;
  const aufgaben = open.length - termine;
  const parts = [termine ? count(termine, "ein Termin", "Termine") : "", aufgaben ? count(aufgaben, "eine Aufgabe", "Aufgaben") : "", dish ? dishPart(dish, dishClock) : ""].filter(Boolean);
  if (!open.length) {
    if (items.length) return dish ? `Alles erledigt – ${dishPart(dish, dishClock)}.` : "Alles erledigt – jetzt ist Zeit für euch.";
    return dish ? `Ein freier Tag – ${dishPart(dish, dishClock)}.` : "Ein freier Tag – nichts eingetragen.";
  }
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} und ${parts[parts.length - 1]}` : parts[0];
  return `${open.length <= 3 ? "Ruhiger Tag" : "Einiges los heute"}: ${list}.`;
}

/** Ein Satz in Stücken – `b` = fett */
export type SentencePart = { t: string; b?: boolean };

export type HomeSentenceInput = {
  minutes: number;
  /** Termine heute (alle, auch erledigte) und die noch anstehenden */
  termineToday: DayItem[];
  termineUpcoming: DayItem[];
  /** Aufgaben: heute dran (offen) und heute erledigt */
  tasksToday: DayItem[];
  tasksDoneToday: number;
  /** Aufgaben mit Frist (bzw. Tag) genau heute */
  dueToday?: DayItem[];
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
  const due = (x.dueToday ?? []).find((t) => !t.done);
  if (due) return { parts: [{ t: short(due.title), b: true }, { t: " ist heute dran." }] };
  if (x.minutes >= 15 * 60 && x.minutes < 18 * 60 && x.dinnerOpen) return { parts: [{ t: "Noch kein Essen geplant – " }, { t: "Ideen?", b: true }], action: "essen" };
  if (x.minutes >= 20 * 60) {
    const first = x.tomorrowTermine.find((t) => t.time);
    if (first?.time) return { parts: [{ t: "Morgen: " }, { t: `${clockOf(first.time)} ${short(first.title, 22)}.`, b: true }] };
    const task = Array.isArray(x.tomorrowTasks) ? x.tomorrowTasks[0] : null;
    if (task) return { parts: [{ t: "Morgen: " }, { t: end(short(task.title)), b: true }] };
  }
  const open = x.termineUpcoming.length + x.tasksToday.length;
  const hadSomething = x.termineToday.length > 0 || x.tasksDoneToday > 0;
  if (!open && hadSomething) return { parts: [{ t: "Alles geschafft für heute 🌙" }] };
  return { parts: [{ t: x.minutes >= 20 * 60 ? "Heute ist es ruhig. 🌙" : "Heute ist es ruhig. ☀️" }] };
}

const clockOf = (t: string) => t.replace(/^0(\d)/, "$1");

/** Satz als Text (für Tests und Vorlesen) */
export const sentenceText = (parts: SentencePart[]) => parts.map((p) => p.t).join("");
