// Offene Aufgaben wandern abends mit auf morgen. Sobald die Startseite abends
// auf morgen umschaltet (ab Feierabend bzw. 19 Uhr, wenn heute kein Termin und
// kein Essen mehr kommt – Tafel 98), gehört Offenes von heute schon zu morgen:
// still in derselben einen Liste, ohne „von heute“/„von gestern“ (Tafel 103).
// Reine Anzeige-Logik: In den Daten wird nichts verschoben, um Mitternacht
// rutscht wie bisher alles still auf den neuen Tag.
// EINE Stelle für Startseite (Kachel, Jetzt-Karte, „Dein Tag“) und Mia (mit
// und ohne KI). Rein.
//
// Entschieden: Wiederkehrende Aufgaben wandern nicht mit – wie um Mitternacht
// kommt einfach das nächste Vorkommen (sonst stünde „täglich“ doppelt da).

import { addDays } from "@/lib/core/now";
import { itemsForDay, taskFrom, taskOverview, type CalendarEntry, type DayItem, type TaskGroups } from "@/lib/kalender/model";

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Was die Startseite abends weiß: Uhrzeit, Feierabend, Kochen, kommt heute noch ein Termin bzw. Essen? */
export type AbendLage = { minutes: number; feierabend: boolean; kochen?: boolean; nochTermin: boolean; nochEssen?: boolean };

/**
 * Steht die Startseite schon auf morgen? Ab Feierabend bzw. 19 Uhr bis
 * Mitternacht, solange heute kein Termin und kein Essen mehr kommt und nicht
 * gekocht wird. Vor 6 Uhr nie – dann ist der neue Tag schon da.
 */
export function aufMorgen(x: AbendLage): boolean {
  if (x.minutes < 6 * 60) return false;
  if (!x.feierabend && x.minutes < 19 * 60) return false;
  return !x.kochen && !x.nochTermin && !x.nochEssen;
}

/** Kommt heute noch ein Termin mit Uhrzeit? */
const nochTerminHeute = (entries: CalendarEntry[], heute: string, minutes: number) =>
  itemsForDay(entries, heute, heute).some((i) => i.entry.typ === "termin" && !i.done && i.time !== null && toMin(i.time) > minutes);

/**
 * Für Aufgaben-Seite und Mia, die die Tagesphase nicht kennen: Feierabend nach
 * der Einstellung („Feierabend ab“), Termine aus den Einträgen, Essen nur,
 * wenn die Uhrzeit des heutigen Essens bekannt ist.
 */
export function abendsNachUhr(o: { entries: CalendarEntry[]; heute: string; minutes: number; feierabendAb?: string | null; essenUm?: string | null }): boolean {
  return aufMorgen({
    minutes: o.minutes,
    feierabend: o.minutes >= toMin(o.feierabendAb || "20:00"),
    nochTermin: nochTerminHeute(o.entries, o.heute, o.minutes),
    nochEssen: Boolean(o.essenUm && toMin(o.essenUm) > o.minutes),
  });
}

/** Echtes Heute und ob die Startseite schon auf morgen steht */
export type Mitwandern = { heute: string; abends: boolean };

/** Der Tag, den die Aufgaben gerade zeigen: abends schon morgen */
export const aufgabenTag = (m: Mitwandern) => (m.abends ? addDays(m.heute, 1) : m.heute);

/** Wandert diese Aufgabe von heute still mit (einmalig, steht ab heute oder früher)? */
export const wandertMit = (i: DayItem, heute: string) => i.entry.typ === "aufgabe" && !i.entry.data.repeat && taskFrom(i.entry.data, i.entry.erstellt) <= heute;

/**
 * Alle Aufgaben wie `taskOverview` – abends schon für morgen: das Offene von
 * heute steht still mit in der einen Liste (ohne Etikett), dazu, was für
 * morgen geplant ist. „neu“ und Erledigtes bleiben die von heute.
 */
export function aufgabenUebersicht(entries: CalendarEntry[], m: Mitwandern): TaskGroups {
  const jetzt = taskOverview(entries, m.heute);
  if (!m.abends) return jetzt;
  const g = taskOverview(entries, addDays(m.heute, 1), m.heute);
  // Abhaken am echten Tag: Mitgewandertes steht (unsichtbar) noch auf heute
  const fix = (i: DayItem): DayItem => (wandertMit(i, m.heute) ? { ...i, key: `${i.entry.id}@${m.heute}`, date: m.heute } : i);
  return { heute: g.heute.map(fix), geplant: g.geplant, erledigt: jetzt.erledigt };
}

/**
 * Welche Aufgaben an einem angezeigten Tag erscheinen: heute die eine Liste,
 * abends für morgen zuerst mit dem Mitgewanderten, sonst was an dem Tag steht.
 */
export function aufgabenFuerTag(entries: CalendarEntry[], tag: string, m: Mitwandern): DayItem[] {
  if (tag === aufgabenTag(m)) return aufgabenUebersicht(entries, m).heute;
  if (tag === m.heute) return taskOverview(entries, m.heute).heute;
  return itemsForDay(entries, tag, m.heute).filter((i) => i.entry.typ === "aufgabe" && !i.done);
}
