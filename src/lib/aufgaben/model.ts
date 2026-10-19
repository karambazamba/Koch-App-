// Termine und Aufgaben im einheitlichen Eintrags-Modell (core/entries.ts):
// jeder Eintrag mit id, typ, raum, besitzer, erstellt, geändert – bereit für
// Supabase. Hier nur reine Funktionen (ohne Speicher), damit App, Vorschau
// und Server (Lotte) gleich rechnen.
//
// Regeln:
// - Termin = feste Uhrzeit an einem Tag (optional wiederkehrend).
// - Aufgabe = zu erledigen: an einem Wunschtag, bis zu einer Frist, "diese
//   Woche" oder ohne alles ("Irgendwann" – steht dann an keinem Tag).
// - Notizen (nur festhalten) liegen getrennt in `../notizen`.
// - Unerledigte (einmalige) Aufgaben mit Tag rutschen still auf heute – kein
//   "überfällig", nur ein kleiner Hinweis "von gestern"/"von letzter Woche".
// - Verpasste Vorkommen wiederkehrender Einträge und vergangene Termine
//   verschwinden leise.

import { createEntry, type Entry, type Room } from "../core/entries";
import { addDays, fromIsoDate } from "../core/now";

/** Wiederholung: täglich, wöchentlich (wie der erste Tag), monatlich (gleicher Tag im Monat) oder bestimmte Wochentage (0 = Mo … 6 = So) */
export type Repeat = { kind: "taeglich" } | { kind: "woechentlich" } | { kind: "monatlich" } | { kind: "wochentage"; days: number[] };

/** Erinnerung: aus, 15/30/60 Minuten vorher oder am Vorabend (19 Uhr) */
export type Reminder = "aus" | "15" | "30" | "60" | "vorabend";

export const REMINDERS: { value: Reminder; label: string; short: string }[] = [
  { value: "aus", label: "Keine Erinnerung", short: "aus" },
  { value: "15", label: "15 Minuten vorher", short: "15 Min vorher" },
  { value: "30", label: "30 Minuten vorher", short: "30 Min vorher" },
  { value: "60", label: "1 Stunde vorher", short: "1 Std vorher" },
  { value: "vorabend", label: "Am Vorabend", short: "am Vorabend" },
];

export type TerminData = {
  title: string;
  /** Erster Tag "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" */
  start: string;
  end?: string;
  /** Ort oder Notiz */
  place?: string;
  /** Etikett, z. B. "Kita", "Café", "Eisladen" */
  label?: string;
  repeat?: Repeat | null;
  reminder: Reminder;
  /** Wer (Personen-IDs aus dem Profil), optional */
  who?: string[];
  /** Erledigt an diesen Tagen (abgehakt) */
  doneDates?: string[];
  /** Einzelne Tage einer Serie, die entfallen (verschoben oder gelöscht) */
  skipDates?: string[];
};

export type AufgabeData = {
  title: string;
  /** Wunschtag "YYYY-MM-DD"; ohne = ab dem Tag, an dem sie angelegt wurde */
  date?: string;
  /** Frist "YYYY-MM-DD" ("bis Mittwoch") */
  due?: string;
  /** Zeitraum: Montag der Woche ("diese Woche") – ohne Tag und Frist */
  week?: string;
  /** "HH:MM", optional */
  time?: string;
  label?: string;
  repeat?: Repeat | null;
  reminder: Reminder;
  /** Erledigt am (einmalige Aufgabe) */
  doneOn?: string | null;
  /** Erledigt an diesen Tagen (wiederkehrende Aufgabe) */
  doneDates?: string[];
  skipDates?: string[];
};

export type Termin = Entry<TerminData> & { typ: "termin" };
export type Aufgabe = Entry<AufgabeData> & { typ: "aufgabe" };
export type CalendarEntry = Termin | Aufgabe;

/** Ein Eintrag an einem bestimmten Tag, wie er in Heute/Woche erscheint */
export type DayItem = {
  /** Eindeutig je Tag: "<id>@<datum>" */
  key: string;
  entry: CalendarEntry;
  date: string;
  time: string | null;
  end: string | null;
  title: string;
  label: string | null;
  room: Room;
  reminder: Reminder;
  done: boolean;
  /** Aufgabe von früher, still mitgenommen: "von gestern" */
  carried: string | null;
  /** Frist: "bis Mi" */
  dueLabel: string | null;
  repeat: Repeat | null;
  /** Nur in der Aufgaben-Übersicht: wann ("Do", "diese Woche", "nächste Woche") */
  when?: string | null;
};

const WEEKDAYS_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const WEEKDAYS_LONG = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

/** Wochentag 0 = Mo … 6 = So */
export const weekdayIndex = (iso: string) => (fromIsoDate(iso).getDay() + 6) % 7;
export const weekdayShort = (iso: string) => WEEKDAYS_SHORT[weekdayIndex(iso)];
export const weekdayLong = (iso: string) => WEEKDAYS_LONG[weekdayIndex(iso)];

const dayDiff = (a: string, b: string) => Math.round((fromIsoDate(a).getTime() - fromIsoDate(b).getTime()) / 86_400_000);

/** Fällt eine Wiederholung (ab `start`) auf `date`? */
export function repeatsOn(repeat: Repeat, start: string, date: string): boolean {
  if (date < start) return false;
  switch (repeat.kind) {
    case "taeglich":
      return true;
    case "woechentlich":
      return dayDiff(date, start) % 7 === 0;
    case "monatlich":
      return fromIsoDate(date).getDate() === fromIsoDate(start).getDate();
    case "wochentage":
      return repeat.days.includes(weekdayIndex(date));
  }
}

/** "jeden Dienstag", "täglich", "wöchentlich", "monatlich" */
export function repeatLabel(repeat: Repeat | null | undefined, start?: string): string {
  if (!repeat) return "";
  switch (repeat.kind) {
    case "taeglich":
      return "täglich";
    case "woechentlich":
      return start ? `jeden ${WEEKDAYS_LONG[weekdayIndex(start)]}` : "wöchentlich";
    case "monatlich":
      return "monatlich";
    case "wochentage":
      return repeat.days.length === 7 ? "täglich" : `jeden ${repeat.days.map((d) => WEEKDAYS_LONG[d]).join(", ")}`;
  }
}

const isTermin = (e: CalendarEntry): e is Termin => e.typ === "termin";

/** Von wann eine mitgenommene Aufgabe ist: "von gestern", "von Montag", "von letzter Woche" */
export function carriedLabel(from: string, today: string): string {
  const days = dayDiff(today, from);
  if (days <= 1) return "von gestern";
  if (days < 7 && weekdayIndex(from) < weekdayIndex(today)) return `von ${WEEKDAYS_LONG[weekdayIndex(from)]}`;
  if (days < 14) return "von letzter Woche";
  return "von früher";
}

/** "bis Mi" (diese Woche), sonst "bis 24.10." */
export function dueLabel(due: string, date: string): string {
  const days = dayDiff(due, date);
  if (days === 0) return "bis heute";
  if (days === 1) return "bis morgen";
  if (days > 1 && days < 7) return `bis ${WEEKDAYS_SHORT[weekdayIndex(due)]}`;
  const [, m, d] = due.split("-");
  return `bis ${Number(d)}.${Number(m)}.`;
}

/** Anfangstag einer Aufgabe (Wunschtag, sonst Tag des Anlegens) */
export const taskStart = (a: AufgabeData, created: string) => a.date ?? created.slice(0, 10);

/** Montag der Woche eines Tages */
export const mondayOf = (iso: string) => addDays(iso, -weekdayIndex(iso));

/** Tag, an dem eine einmalige Aufgabe steht: Wunschtag, sonst Frist (ohne beides: an keinem Tag) */
const taskAnchor = (a: AufgabeData) => a.date ?? a.due ?? null;

/**
 * Alle Einträge an einem Tag. `today` bestimmt, wo unerledigte Aufgaben
 * landen: einmalige Aufgaben von früher erscheinen heute (mit "von …"), an
 * vergangenen Tagen nicht mehr; ab heute stehen sie an ihrem Tag.
 */
export function itemsForDay(entries: CalendarEntry[], date: string, today: string): DayItem[] {
  const items: DayItem[] = [];
  for (const entry of entries) {
    if (isTermin(entry)) {
      const t = entry.data;
      const on = t.repeat ? repeatsOn(t.repeat, t.date, date) && !t.skipDates?.includes(date) : t.date === date;
      if (!on) continue;
      items.push({
        key: `${entry.id}@${date}`,
        entry,
        date,
        time: t.start || null,
        end: t.end || null,
        title: t.title,
        label: t.label || null,
        room: entry.raum,
        reminder: t.reminder,
        done: Boolean(t.doneDates?.includes(date)),
        carried: null,
        dueLabel: null,
        repeat: t.repeat ?? null,
      });
      continue;
    }
    const a = entry.data;
    const start = taskStart(a, entry.erstellt);
    let on: boolean;
    let carried: string | null = null;
    let done: boolean;
    if (a.repeat) {
      on = repeatsOn(a.repeat, start, date) && !a.skipDates?.includes(date);
      done = Boolean(a.doneDates?.includes(date));
    } else if (a.doneOn) {
      // Erledigt: an dem Tag, an dem es abgehakt wurde
      on = a.doneOn === date;
      done = true;
    } else {
      // Ohne Tag und Frist ("Irgendwann", "diese Woche") steht eine Aufgabe an keinem Tag –
      // nur "diese Woche" von letzter Woche rutscht still auf heute
      const anchor = taskAnchor(a) ?? (a.week && a.week < mondayOf(today) ? a.week : null);
      done = false;
      if (!anchor) on = false;
      else if (date === today) {
        on = anchor <= today;
        if (on && anchor < today) carried = carriedLabel(anchor, today);
      } else on = date > today && anchor === date;
    }
    if (!on) continue;
    items.push({
      key: `${entry.id}@${date}`,
      entry,
      date,
      time: a.time || null,
      end: null,
      title: a.title,
      label: a.label || null,
      room: entry.raum,
      reminder: a.reminder,
      done,
      carried,
      dueLabel: a.due && !done ? dueLabel(a.due, date) : null,
      repeat: a.repeat ?? null,
    });
  }
  return sortItems(items);
}

/** Nach Uhrzeit; ohne Uhrzeit danach; Erledigtes ans Ende */
export function sortItems(items: DayItem[]): DayItem[] {
  return [...items].sort(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      Number(a.time === null) - Number(b.time === null) ||
      (a.time ?? "").localeCompare(b.time ?? "") ||
      a.title.localeCompare(b.title, "de"),
  );
}

/** Einträge der nächsten `days` Tage ab `today` (für Woche und Lotte) */
export function itemsForRange(entries: CalendarEntry[], today: string, days: number): { date: string; items: DayItem[] }[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i);
    return { date, items: itemsForDay(entries, date, today) };
  });
}

// --- Aufgaben-Übersicht und Startseite ------------------------------------------

export type TaskGroup = "heute" | "woche" | "spaeter" | "irgendwann" | "erledigt";

export const TASK_GROUPS: { id: TaskGroup; label: string }[] = [
  { id: "heute", label: "Heute dran" },
  { id: "woche", label: "Diese Woche" },
  { id: "spaeter", label: "Später" },
  { id: "irgendwann", label: "Irgendwann" },
  { id: "erledigt", label: "Erledigt" },
];

const shortDay = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${WEEKDAYS_SHORT[weekdayIndex(iso)]} ${Number(d)}.${Number(m)}.`;
};

/** Nächstes Vorkommen einer Serie ab `from` (bis 60 Tage) */
function nextOccurrence(a: AufgabeData, start: string, from: string): string | null {
  if (!a.repeat) return null;
  for (let i = 0; i < 60; i++) {
    const d = addDays(from, i);
    if (repeatsOn(a.repeat, start, d) && !a.skipDates?.includes(d) && !a.doneDates?.includes(d)) return d;
  }
  return null;
}

function taskItem(entry: Aufgabe, date: string, extra: Partial<DayItem>): DayItem {
  const a = entry.data;
  return {
    key: `${entry.id}@${date}`,
    entry,
    date,
    time: a.time || null,
    end: null,
    title: a.title,
    label: a.label || null,
    room: entry.raum,
    reminder: a.reminder,
    done: false,
    carried: null,
    dueLabel: null,
    repeat: a.repeat ?? null,
    when: null,
    ...extra,
  };
}

/**
 * Alle Aufgaben, gruppiert: Heute dran (heute, Frist heute, von früher
 * mitgenommen), Diese Woche (Tag/Frist bis Sonntag, Zeitraum "diese Woche"),
 * Später, Irgendwann (ohne Tag und Frist), Erledigt (letzte 14 Tage).
 */
export function taskOverview(entries: CalendarEntry[], today: string): Record<TaskGroup, DayItem[]> {
  const groups: Record<TaskGroup, DayItem[]> = { heute: [], woche: [], spaeter: [], irgendwann: [], erledigt: [] };
  const sunday = addDays(mondayOf(today), 6);
  const thisMonday = mondayOf(today);
  const recent = addDays(today, -14);
  for (const entry of entries) {
    if (entry.typ !== "aufgabe") continue;
    const a = entry.data;
    if (a.repeat) {
      const start = taskStart(a, entry.erstellt);
      if (a.doneDates?.includes(today) && repeatsOn(a.repeat, start, today)) groups.erledigt.push(taskItem(entry, today, { done: true }));
      const next = nextOccurrence(a, start, today);
      if (!next) continue;
      const item = taskItem(entry, next, { when: next === today ? null : shortDay(next) });
      groups[next === today ? "heute" : next <= sunday ? "woche" : "spaeter"].push(item);
      continue;
    }
    if (a.doneOn) {
      if (a.doneOn >= recent) groups.erledigt.push(taskItem(entry, a.doneOn, { done: true }));
      continue;
    }
    const anchor = taskAnchor(a);
    if (anchor) {
      if (anchor <= today) {
        groups.heute.push(taskItem(entry, today, { carried: anchor < today ? carriedLabel(anchor, today) : null, dueLabel: a.due && a.due >= today ? dueLabel(a.due, today) : null }));
      } else {
        const item = taskItem(entry, anchor, { dueLabel: a.due ? dueLabel(a.due, today) : null, when: a.due ? null : shortDay(anchor) });
        groups[anchor <= sunday ? "woche" : "spaeter"].push(item);
      }
      continue;
    }
    if (a.week) {
      if (a.week < thisMonday) groups.heute.push(taskItem(entry, today, { carried: carriedLabel(a.week, today) }));
      else if (a.week === thisMonday) groups.woche.push(taskItem(entry, today, { when: "diese Woche" }));
      else groups.spaeter.push(taskItem(entry, a.week, { when: a.week === addDays(thisMonday, 7) ? "nächste Woche" : `ab ${shortDay(a.week)}` }));
      continue;
    }
    groups.irgendwann.push(taskItem(entry, today, {}));
  }
  const byTime = (x: DayItem, y: DayItem) => Number(x.time === null) - Number(y.time === null) || (x.time ?? "").localeCompare(y.time ?? "") || x.title.localeCompare(y.title, "de");
  // Mit Tag/Frist nach Datum, "diese Woche" ohne Tag danach
  const byDate = (x: DayItem, y: DayItem) => Number(x.when === "diese Woche") - Number(y.when === "diese Woche") || x.date.localeCompare(y.date) || byTime(x, y);
  // Heute dran: Frist bzw. Tag heute ganz oben, dann von früher Mitgenommenes, dann der Rest (je mit Uhrzeit zuerst)
  const rank = (i: DayItem) => (!i.carried && i.entry.typ === "aufgabe" && (i.entry.data.due === today || i.entry.data.date === today || i.repeat) ? 0 : i.carried ? 1 : 2);
  groups.heute.sort((x, y) => rank(x) - rank(y) || byTime(x, y));
  groups.woche.sort(byDate);
  groups.spaeter.sort(byDate);
  groups.irgendwann.sort((x, y) => x.entry.erstellt.localeCompare(y.entry.erstellt));
  groups.erledigt.sort((x, y) => y.date.localeCompare(x.date));
  return groups;
}

/** Kurz rechts in der Zeile: "heute", "bis Mi", "diese Woche", "von gestern" */
export function taskBadge(item: DayItem, today: string): string {
  if (item.carried) return item.carried;
  if (item.dueLabel) return item.dueLabel === "bis heute" ? "heute" : item.dueLabel;
  if (item.when) return item.when;
  return item.date === today ? "heute" : "";
}

/** Die dringendsten Aufgaben für "Heute": heute dran, dann nächste Frist, dann "diese Woche" */
export function urgentTasks(entries: CalendarEntry[], today: string): DayItem[] {
  const g = taskOverview(entries, today);
  return [...g.heute, ...g.woche];
}

/** Alle noch nicht erledigten Aufgaben (Zahl für "+ N weitere") */
export function openTaskCount(entries: CalendarEntry[], today: string): number {
  const g = taskOverview(entries, today);
  return g.heute.length + g.woche.length + g.spaeter.length + g.irgendwann.length;
}

/** Termine von heute, die noch anstehen (läuft gerade oder kommt noch; ohne Ende zählt 1 Stunde) */
export function upcomingTermine(entries: CalendarEntry[], today: string, minutesNow: number): DayItem[] {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return itemsForDay(entries, today, today).filter((i) => i.entry.typ === "termin" && !i.done && (i.end ? toMin(i.end) : toMin(i.time ?? "00:00") + 60) > minutesNow);
}

// --- Änderungen (rein: neue Liste zurück) -----------------------------------------

const replace = (entries: CalendarEntry[], updated: CalendarEntry) => entries.map((e) => (e.id === updated.id ? updated : e));
const touch = <T extends CalendarEntry>(entry: T, data: Partial<T["data"]>, stamp: string): T => ({ ...entry, data: { ...entry.data, ...data }, geaendert: stamp });
const addUnique = (list: string[] | undefined, value: string) => [...new Set([...(list ?? []), value])];

/** Abhaken (bzw. wieder öffnen) an einem Tag */
export function setDone(entries: CalendarEntry[], item: Pick<DayItem, "entry" | "date">, done: boolean, stamp: string): CalendarEntry[] {
  const e = entries.find((x) => x.id === item.entry.id);
  if (!e) return entries;
  if (e.typ === "aufgabe" && !e.data.repeat) {
    return replace(entries, touch(e, { doneOn: done ? item.date : null }, stamp));
  }
  const doneDates = done ? addUnique(e.data.doneDates, item.date) : (e.data.doneDates ?? []).filter((d) => d !== item.date);
  return replace(entries, touch(e, { doneDates } as Partial<typeof e.data>, stamp));
}

/**
 * Auf einen anderen Tag verschieben. Einmalige Einträge wandern ganz; bei
 * einer Serie entfällt nur dieser Tag und ein einzelner Eintrag kommt an den
 * neuen Tag.
 */
export function moveItem(entries: CalendarEntry[], item: Pick<DayItem, "entry" | "date">, to: string, stamp: string, time?: string): CalendarEntry[] {
  const e = entries.find((x) => x.id === item.entry.id);
  if (!e) return entries;
  if (!e.data.repeat) {
    if (e.typ === "termin") return replace(entries, touch(e, { date: to, ...(time ? { start: time } : {}) }, stamp));
    return replace(entries, touch(e, { date: to, ...(time ? { time } : {}) }, stamp));
  }
  const withSkip = replace(entries, touch(e, { skipDates: addUnique(e.data.skipDates, item.date) } as Partial<typeof e.data>, stamp));
  const copy =
    e.typ === "termin"
      ? createEntry("termin", { ...e.data, date: to, start: time ?? e.data.start, repeat: null, doneDates: [], skipDates: [] }, { raum: e.raum, besitzer: e.besitzer })
      : createEntry("aufgabe", { ...e.data, date: to, ...(time ? { time } : {}), repeat: null, doneDates: [], skipDates: [], doneOn: null }, { raum: e.raum, besitzer: e.besitzer });
  return [...withSkip, copy as CalendarEntry];
}

/** Erinnerung ändern (für den ganzen Eintrag) */
export function setReminder(entries: CalendarEntry[], entryId: string, reminder: Reminder, stamp: string): CalendarEntry[] {
  const e = entries.find((x) => x.id === entryId);
  return e ? replace(entries, touch(e, { reminder } as Partial<typeof e.data>, stamp)) : entries;
}

/** Löschen: ganzer Eintrag, oder bei einer Serie nur dieser Tag (`onlyDate`) */
export function removeItem(entries: CalendarEntry[], entryId: string, stamp: string, onlyDate?: string): CalendarEntry[] {
  const e = entries.find((x) => x.id === entryId);
  if (!e) return entries;
  if (onlyDate && e.data.repeat) return replace(entries, touch(e, { skipDates: addUnique(e.data.skipDates, onlyDate) } as Partial<typeof e.data>, stamp));
  return entries.filter((x) => x.id !== entryId);
}

/** Eintrag neu anlegen oder ersetzen */
export function upsertEntry(entries: CalendarEntry[], entry: CalendarEntry): CalendarEntry[] {
  return entries.some((e) => e.id === entry.id) ? replace(entries, entry) : [...entries, entry];
}

/** Eintrag nach Titel finden (für "Verschieb den Steuerberater …") – ungefähr, ohne Groß/Klein */
export function findByTitle(entries: CalendarEntry[], query: string): CalendarEntry[] {
  const words = query
    .toLowerCase()
    .replace(/[^a-zäöüß0-9 -]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !/^(den|die|das|dem|der|termin|aufgabe|mit|beim|zum|zur)$/.test(w));
  if (!words.length) return [];
  const score = (e: CalendarEntry) => words.filter((w) => e.data.title.toLowerCase().includes(w) || (e.data.label ?? "").toLowerCase().includes(w)).length;
  const best = Math.max(0, ...entries.map(score));
  return best ? entries.filter((e) => score(e) === best) : [];
}

/** Prüfen und reparieren (Laden, Daten von der KI) */
export function sanitizeEntry(raw: unknown): CalendarEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Partial<CalendarEntry>;
  if (typeof e.id !== "string" || (e.typ !== "termin" && e.typ !== "aufgabe") || !e.data || typeof e.data !== "object") return null;
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  const TIME = /^\d{2}:\d{2}$/;
  const d = e.data as Partial<TerminData & AufgabeData>;
  if (typeof d.title !== "string" || !d.title.trim()) return null;
  const reminder: Reminder = REMINDERS.some((r) => r.value === d.reminder) ? (d.reminder as Reminder) : "aus";
  const repeat = sanitizeRepeat(d.repeat);
  const dates = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && DATE.test(x)) : []);
  const base = {
    id: e.id,
    raum: e.raum === "arbeit" ? ("arbeit" as const) : ("familie" as const),
    besitzer: typeof e.besitzer === "string" ? e.besitzer : "lokal",
    erstellt: typeof e.erstellt === "string" ? e.erstellt : new Date(0).toISOString(),
    geaendert: typeof e.geaendert === "string" ? e.geaendert : new Date(0).toISOString(),
  };
  const label = typeof d.label === "string" && d.label.trim() ? d.label.trim().slice(0, 40) : undefined;
  if (e.typ === "termin") {
    if (typeof d.date !== "string" || !DATE.test(d.date) || typeof d.start !== "string" || !TIME.test(d.start)) return null;
    return {
      ...base,
      typ: "termin",
      data: {
        title: d.title.trim().slice(0, 120),
        date: d.date,
        start: d.start,
        end: typeof d.end === "string" && TIME.test(d.end) ? d.end : undefined,
        place: typeof d.place === "string" && d.place.trim() ? d.place.trim().slice(0, 120) : undefined,
        label,
        repeat,
        reminder,
        who: Array.isArray(d.who) ? d.who.filter((x): x is string => typeof x === "string") : undefined,
        doneDates: dates(d.doneDates),
        skipDates: dates(d.skipDates),
      },
    };
  }
  return {
    ...base,
    typ: "aufgabe",
    data: {
      title: d.title.trim().slice(0, 120),
      date: typeof d.date === "string" && DATE.test(d.date) ? d.date : undefined,
      due: typeof d.due === "string" && DATE.test(d.due) ? d.due : undefined,
      week: typeof d.week === "string" && DATE.test(d.week) ? d.week : undefined,
      time: typeof d.time === "string" && TIME.test(d.time) ? d.time : undefined,
      label,
      repeat,
      reminder,
      doneOn: typeof d.doneOn === "string" && DATE.test(d.doneOn) ? d.doneOn : null,
      doneDates: dates(d.doneDates),
      skipDates: dates(d.skipDates),
    },
  };
}

export function sanitizeRepeat(raw: unknown): Repeat | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<Repeat> & { days?: unknown };
  if (r.kind === "taeglich" || r.kind === "woechentlich" || r.kind === "monatlich") return { kind: r.kind };
  if (r.kind === "wochentage" && Array.isArray(r.days)) {
    const days = [...new Set(r.days.filter((x): x is number => Number.isInteger(x) && x >= 0 && x <= 6))].sort();
    return days.length ? { kind: "wochentage", days } : null;
  }
  return null;
}

/** "Das ist kein Termin, sondern eine Aufgabe": gleiche id, Tag bleibt (als Wunschtag), Uhrzeit fällt weg */
export function terminToAufgabe(e: Termin, stamp: string, opts: { due?: string } = {}): Aufgabe {
  const t = e.data;
  return { ...e, typ: "aufgabe", geaendert: stamp, data: { title: t.title, ...(opts.due ? { due: opts.due } : { date: t.date }), label: t.label, repeat: t.repeat ?? null, reminder: t.reminder, doneOn: null, doneDates: [], skipDates: t.skipDates ?? [] } };
}

/** "… sondern ein Termin um 15 Uhr": gleiche id, Tag (Wunschtag/Frist/heute) + Uhrzeit */
export function aufgabeToTermin(e: Aufgabe, stamp: string, start: string, date?: string): Termin {
  const a = e.data;
  return { ...e, typ: "termin", geaendert: stamp, data: { title: a.title, date: date ?? a.date ?? a.due ?? stamp.slice(0, 10), start, label: a.label, repeat: a.repeat ?? null, reminder: a.reminder, doneDates: [], skipDates: a.skipDates ?? [] } };
}
