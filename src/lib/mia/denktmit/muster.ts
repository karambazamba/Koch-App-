// Mia erkennt Muster (Tafel 90, Bild 3). Gleicher Termin bzw. gleiche
// Aufgabe (ähnlicher Titel) an 3 verschiedenen Tagen desselben Wochentags zu
// ähnlicher Uhrzeit (± 1 Std) → einmal fragen, ob das jede Woche rein soll.
// Gleiches für Essen: 3× dasselbe Gericht am selben Wochentag → fest
// einplanen. Läden lernt schon der Einkauf (einkauf/shopRules) – nicht doppelt.
// Jede Frage nur einmal (Antwort in store.antworten). Rein.

import { addDays } from "@/lib/core/now";
import { createEntry } from "@/lib/core/entries";
import { weekdayIndex, type CalendarEntry, type Termin } from "@/lib/kalender/model";

const TAGE = ["Montags", "Dienstags", "Mittwochs", "Donnerstags", "Freitags", "Samstags", "Sonntags"];
/** So weit zurück wird geschaut (8 Wochen) */
const FENSTER = 56;

export type Muster = { key: string; title: string; weekday: number; time: string; satz: string; room: CalendarEntry["raum"] };
export type EssenMuster = { key: string; title: string; weekday: number; recipeId?: string; satz: string };

/** Ähnlicher Titel: klein, ohne Satzzeichen, Ziffern und doppelte Leerzeichen */
export const titelKern = (t: string) => t.toLowerCase().replace(/[^a-zäöüß ]+/g, " ").replace(/\s+/g, " ").trim();

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
/** „18 Uhr“ bzw. „18:30 Uhr“ */
export const uhr = (hhmm: string) => (hhmm.endsWith(":00") ? `${Number(hhmm.slice(0, 2))} Uhr` : `${hhmm} Uhr`);

/** Einmalige Einträge mit Tag und Uhrzeit (Serien zählen nicht, sie sind schon fest) */
function einzelne(entries: CalendarEntry[]) {
  return entries.flatMap((e) => {
    if (e.data.repeat) return [];
    const date = e.data.date;
    const time = e.typ === "termin" ? e.data.start : e.data.time;
    return date && time && /^\d\d:\d\d$/.test(time) ? [{ e, date, time }] : [];
  });
}

/** Titel, die schon als Serie laufen */
const serien = (entries: CalendarEntry[]) => new Set(entries.filter((e) => e.data.repeat).map((e) => titelKern(e.data.title)));

/**
 * Erstes Muster, nach dem Mia noch nicht gefragt hat. `gefragt` = schon
 * beantwortete Schlüssel (Ja oder Nein).
 */
export function findeMuster(entries: CalendarEntry[], today: string, gefragt: Record<string, unknown>): Muster | null {
  const from = addDays(today, -FENSTER);
  const laufend = serien(entries);
  const groups = new Map<string, { e: CalendarEntry; date: string; time: string }[]>();
  for (const x of einzelne(entries)) {
    if (x.date < from || x.date > today) continue;
    const kern = titelKern(x.e.data.title);
    if (!kern || laufend.has(kern)) continue;
    const key = `muster:${kern}:${weekdayIndex(x.date)}`;
    groups.set(key, [...(groups.get(key) ?? []), x]);
  }
  for (const [key, list] of groups) {
    if (key in gefragt) continue;
    const times = list.map((x) => minutes(x.time)).sort((a, b) => a - b);
    const mitte = times[Math.floor(times.length / 2)];
    const nah = list.filter((x) => Math.abs(minutes(x.time) - mitte) <= 60);
    if (new Set(nah.map((x) => x.date)).size < 3) continue;
    const last = nah.reduce((a, b) => (a.date > b.date ? a : b));
    const weekday = weekdayIndex(last.date);
    const time = clock(mitte);
    const title = last.e.data.title.trim();
    return { key, title, weekday, time, room: last.e.raum, satz: `${TAGE[weekday]} ist bei dir immer ${title} um ${uhr(time)}. Soll ich das jede Woche eintragen?` };
  }
  return null;
}

/** „Ja, jeden Freitag“: Serie ab dem nächsten passenden Tag nach heute (Termin, wöchentlich) */
export function serieAus(m: Muster, today: string): Termin {
  let date = addDays(today, 1);
  while (weekdayIndex(date) !== m.weekday) date = addDays(date, 1);
  return createEntry("termin", { title: m.title, date, start: m.time, reminder: "aus", repeat: { kind: "woechentlich" } }, { raum: m.room }) as Termin;
}

/** Essens-Rituale: gekochte Tage (Datum → Titel) */
export function findeEssenMuster(cooked: Record<string, { title: string; recipeId?: string }>, today: string, gefragt: Record<string, unknown>, rituale: { weekday: number }[], allein = false): EssenMuster | null {
  const from = addDays(today, -FENSTER);
  const groups = new Map<string, { date: string; title: string; recipeId?: string }[]>();
  for (const [date, d] of Object.entries(cooked)) {
    if (date < from || date > today) continue;
    const key = `essen:${titelKern(d.title)}:${weekdayIndex(date)}`;
    groups.set(key, [...(groups.get(key) ?? []), { date, ...d }]);
  }
  for (const [key, list] of groups) {
    if (key in gefragt || list.length < 3) continue;
    const weekday = weekdayIndex(list[0].date);
    if (rituale.some((r) => r.weekday === weekday)) continue;
    const last = list.reduce((a, b) => (a.date > b.date ? a : b));
    const title = last.title.trim().replace(/^./, (c) => c.toUpperCase());
    return { key, title, weekday, recipeId: last.recipeId, satz: `${TAGE[weekday]} gibt’s bei ${allein ? "dir" : "euch"} ${title}. Soll ich das fest einplanen?` };
  }
  return null;
}

/** Nächster Tag (ab heute, 7 Tage), an dem ein Ritual eingeplant werden kann */
export function ritualTag(r: { weekday: number }, today: string, eingeplant: string[], geplant: (date: string) => boolean): string | null {
  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i);
    if (weekdayIndex(date) === r.weekday && !eingeplant.includes(date) && !geplant(date)) return date;
  }
  return null;
}
