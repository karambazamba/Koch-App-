// Offene Aufgaben wandern abends mit auf morgen. Sobald die Startseite abends
// auf morgen umschaltet (ab Feierabend bzw. 19 Uhr, wenn heute kein Termin und
// kein Essen mehr kommt – Tafel 98), gehört Offenes von heute (und Älteres)
// schon zu morgen: zuerst diese Aufgaben mit leisem „von heute“ (Älteres
// „von gestern“, „von Montag“ …), dann die echten Aufgaben für morgen.
// Reine Anzeige-Logik: In den Daten wird nichts verschoben, um Mitternacht
// rutscht wie bisher alles still auf den neuen Tag („von gestern“).
// EINE Stelle für Startseite (Kachel, Jetzt-Karte, „Dein Tag“), Aufgaben-Seite
// und Mia (mit und ohne KI). Rein.
//
// Entschieden: Wiederkehrende Aufgaben wandern nicht mit – wie um Mitternacht
// kommt einfach das nächste Vorkommen (sonst stünde „täglich“ doppelt da).

import { addDays } from "@/lib/core/now";
import { first, sortBy } from "@/lib/core/sort";
import { carriedLabel, dueLabel, isUrgent, itemsForDay, mondayOf, orderedTasks, taskOverview, type CalendarEntry, type DayItem } from "@/lib/kalender/model";

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

/** Überschrift der Gruppen: abends „Morgen dran“ (Sonntagabend „Nächste Woche“ statt „Diese Woche“) */
export function gruppenName(id: string, label: string, m: Mitwandern): string {
  if (!m.abends) return label;
  if (id === "heute") return "Morgen dran";
  return id === "woche" && mondayOf(addDays(m.heute, 1)) !== mondayOf(m.heute) ? "Nächste Woche" : label;
}

/** Echtes Heute und ob die Startseite schon auf morgen steht */
export type Mitwandern = { heute: string; abends: boolean };

/** Der Tag, den die Aufgaben gerade zeigen: abends schon morgen */
export const aufgabenTag = (m: Mitwandern) => (m.abends ? addDays(m.heute, 1) : m.heute);

/** „von heute“ bzw. „von gestern“, „von Montag“ … – immer vom echten Heute aus */
function vonWann(anchor: string, heute: string, nurWoche: boolean): string {
  if (anchor === heute) return "von heute";
  // „diese Woche“ am Sonntagabend: wandert in die neue Woche
  if (nurWoche && anchor === mondayOf(heute)) return "von dieser Woche";
  return carriedLabel(anchor, heute);
}

/**
 * Alle Aufgaben, gruppiert wie `taskOverview` – abends für morgen: „heute“
 * heißt dann „Morgen dran“ und enthält zuerst das Mitgewanderte (dringend
 * bleibt ganz vorne), dann was für morgen steht. Fristen und „von …“ zählen
 * vom echten Heute aus; Erledigtes bleibt das von heute.
 */
export function aufgabenUebersicht(entries: CalendarEntry[], m: Mitwandern): ReturnType<typeof taskOverview> {
  const jetzt = taskOverview(entries, m.heute);
  if (!m.abends) return jetzt;
  const tag = addDays(m.heute, 1);
  const g = taskOverview(entries, tag);
  // Sonntagabend: „diese Woche“ von morgen aus ist schon die nächste
  const neueWoche = mondayOf(tag) !== mondayOf(m.heute);
  const fix = (i: DayItem): DayItem => {
    if (neueWoche && i.when === "diese Woche") i = { ...i, when: "nächste Woche" };
    if (i.entry.typ !== "aufgabe" || i.entry.data.repeat) return i;
    const a = i.entry.data;
    const due = a.due && a.due >= tag ? dueLabel(a.due, m.heute) : null;
    if (!i.carried) return { ...i, dueLabel: due };
    const anchor = a.date ?? a.due ?? a.week ?? m.heute;
    // Abhaken am echten Tag: Mitgewandertes steht (unsichtbar) noch auf heute
    return { ...i, key: `${i.entry.id}@${m.heute}`, date: m.heute, carried: vonWann(anchor, m.heute, !a.date && !a.due), dueLabel: due };
  };
  const heuteDran = sortBy(g.heute.map(fix), first(isUrgent), first((i: DayItem) => i.carried));
  return { ...g, heute: heuteDran, woche: g.woche.map(fix), spaeter: g.spaeter.map(fix), erledigt: jetzt.erledigt };
}

/**
 * Welche offenen Aufgaben an einem angezeigten Tag erscheinen (mit leisem
 * „von heute“/„von gestern“): heute die „Heute dran“, abends für morgen
 * zuerst das Mitgewanderte, sonst was an dem Tag steht.
 */
export function aufgabenFuerTag(entries: CalendarEntry[], tag: string, m: Mitwandern): DayItem[] {
  if (tag === aufgabenTag(m)) return aufgabenUebersicht(entries, m).heute;
  if (tag === m.heute) return taskOverview(entries, m.heute).heute;
  return itemsForDay(entries, tag, m.heute).filter((i) => i.entry.typ === "aufgabe" && !i.done);
}

/** EINE Reihenfolge für die Startseite (dringend → dran → Frist → Woche …), abends für morgen mit Mitgewandertem zuerst */
export function aufgabenReihe(entries: CalendarEntry[], m: Mitwandern) {
  const list = orderedTasks(entries, aufgabenTag(m), aufgabenUebersicht(entries, m));
  return m.abends ? sortBy(list, first(isUrgent), first((i) => i.group === "heute" && i.carried)) : list;
}

/** Wie viele Aufgaben insgesamt offen sind (nur für „+N weitere“ in der Kachel) */
export function offeneAufgaben(entries: CalendarEntry[], m: Mitwandern): number {
  const g = aufgabenUebersicht(entries, m);
  return g.heute.length + g.woche.length + g.spaeter.length + g.irgendwann.length;
}
