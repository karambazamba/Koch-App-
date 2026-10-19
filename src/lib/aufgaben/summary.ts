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
  /** Nächste Frist (für "… ist bis Mittwoch dran") */
  nextDue: DayItem | null;
  dish: string | null;
  /** Abends warm essen und für heute noch nichts geplant */
  dinnerOpen: boolean;
  tomorrowTermine: DayItem[];
  tomorrowTasks: number;
  /** Erinnerungen, die schon mit "Okay" gesehen wurden – nicht nochmal ankündigen */
  seen?: string[];
};

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const n = (k: number, one: string, many: string) => (k === 1 ? `1 ${one}` : `${k} ${many}`);

/**
 * Lottes EIN Satz oben auf "Heute" – je nach Tageszeit und Lage. Termine und
 * Aufgaben getrennt gezählt, ohne Druck-Wörter ("dran", "bis …").
 * `action` = kleiner Knopf (Essensvorschlag).
 */
export function homeSentence(x: HomeSentenceInput): { parts: SentencePart[]; action?: "essen" } {
  const soon = x.termineUpcoming.find((t) => t.time && !x.seen?.includes(t.key) && toMin(t.time) >= x.minutes && toMin(t.time) - x.minutes <= 60);
  if (soon?.time) {
    const inMin = toMin(soon.time) - x.minutes;
    return { parts: [{ t: inMin <= 1 ? "Jetzt: " : `In ${inMin} Minuten: ` }, { t: soon.title, b: true }, { t: "." }] };
  }
  const openTermine = x.termineUpcoming.length;
  const openTasks = x.tasksToday.length;
  // Abends: Vorschau auf morgen
  if (x.minutes >= 18 * 60 + 30 && !openTermine) {
    const first = x.tomorrowTermine[0];
    if (!first && !x.tomorrowTasks) return { parts: [{ t: openTasks ? "Für morgen ist noch nichts eingetragen – ein ruhiger Start." : "Alles geschafft für heute 🌙 Morgen ist noch nichts eingetragen." }] };
    const parts: SentencePart[] = [{ t: "Morgen: " }];
    if (first?.time) parts.push({ t: `${clockOf(first.time)} ${first.title}`, b: true });
    if (x.tomorrowTermine.length > 1) parts.push({ t: ` und ${n(x.tomorrowTermine.length - 1, "weiterer Termin", "weitere Termine")}` });
    if (x.tomorrowTasks) parts.push({ t: `${first ? ", dazu " : ""}` }, { t: n(x.tomorrowTasks, "Aufgabe", "Aufgaben"), b: true });
    parts.push({ t: "." });
    return { parts };
  }
  // Alles geschafft
  const hadSomething = x.termineToday.length > 0 || x.tasksDoneToday > 0;
  if (!openTermine && !openTasks && hadSomething) return { parts: [{ t: "Alles geschafft für heute 🌙" }] };
  // Nachmittags: Abendessen noch frei
  if (x.minutes >= 14 * 60 && x.minutes < 18 * 60 + 30 && x.dinnerOpen) {
    return { parts: [{ t: "Für heute Abend ist noch nichts geplant – soll ich dir was vorschlagen?" }], action: "essen" };
  }
  // Ruhiger Tag
  if (openTermine + openTasks <= 1) {
    if (!openTermine && !openTasks) return { parts: [{ t: "Heute ist es ruhig – nichts eingetragen." }] };
    return { parts: [{ t: "Heute ist es ruhig – nur " }, { t: openTermine ? "ein Termin" : "eine Aufgabe", b: true }, { t: "." }] };
  }
  // Überblick (morgens "Heute", später "Heute noch")
  const parts: SentencePart[] = [{ t: x.minutes < 11 * 60 ? "Heute " : "Heute noch " }];
  const counts = [openTermine ? n(openTermine, "Termin", "Termine") : "", openTasks ? n(openTasks, "Aufgabe", "Aufgaben") : ""].filter(Boolean);
  counts.forEach((c, i) => {
    if (i) parts.push({ t: " und " });
    parts.push({ t: c, b: true });
  });
  if (x.nextDue?.dueLabel) parts.push({ t: " – " }, { t: x.nextDue.title, b: true }, { t: ` ist ${x.nextDue.dueLabel} dran` });
  parts.push({ t: "." });
  return { parts };
}

const clockOf = (t: string) => t.replace(/^0(\d)/, "$1");

/** Satz als Text (für Tests und Vorlesen) */
export const sentenceText = (parts: SentencePart[]) => parts.map((p) => p.t).join("");
