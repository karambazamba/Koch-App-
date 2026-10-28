// Termine und Aufgaben im einheitlichen Eintrags-Modell (core/entries.ts):
// jeder Eintrag mit id, typ, raum, besitzer, erstellt, geändert – bereit für
// Supabase. Hier nur reine Funktionen (ohne Speicher), damit App, Vorschau
// und Server (Lotte) gleich rechnen.
//
// Regeln:
// - Termin = feste Uhrzeit an einem Tag (optional wiederkehrend).
// - Aufgabe = steht JETZT an (Tafel 103/104): alles ist heute, eine Liste.
//   Ohne genannten Tag gehört sie zum Tag, an dem sie angelegt wurde; mit
//   ausdrücklich genanntem Tag ("Freitag KFZ-Steuer") erscheint sie ab diesem
//   Tag (bis dahin "Geplant"). Eine Frist ("bis Mittwoch") ändert daran nichts.
// - Notizen (nur festhalten) liegen getrennt in `../notizen`.
// - Unerledigte (einmalige) Aufgaben rutschen still auf heute – ohne Etikett,
//   kein "überfällig", kein "von gestern".
// - Verpasste Vorkommen wiederkehrender Einträge und vergangene Termine
//   verschwinden leise.

import { WEEKDAYS_MO, WEEKDAYS_SHORT_MO } from "@/lib/core/days";
import { createEntry, roomOf, type Entry, type Room } from "@/lib/core/entries";
import { addDays, berlinTime, fromIsoDate, now } from "@/lib/core/now";
import { first, sortBy, TASKS, TASKS_DONE, TERMINE, timeThenCreated, via } from "@/lib/core/sort";
import { abgehaktUm, erledigtFelder, nochErledigt, serienZeiten } from "@/lib/kalender/erledigt";

/** Wiederholung: täglich, wöchentlich (wie der erste Tag, `every` = alle N Wochen), monatlich (gleicher Tag im Monat) oder bestimmte Wochentage (0 = Mo … 6 = So) */
export type Repeat = { kind: "taeglich" } | { kind: "woechentlich"; every?: number } | { kind: "monatlich" } | { kind: "wochentage"; days: number[] };

/** Woher ein übernommener Termin kommt (Kalender-Datei): Quelle und UID – erneutes Einlesen aktualisiert statt doppelt */
export type TerminSource = { kind: "google" | "apple" | "ics"; uid: string };

/** Erinnerung: aus, 15/30/60 Minuten vorher oder am Vorabend (19 Uhr) */
export type Reminder = "aus" | "10" | "15" | "30" | "60" | "vorabend";

export const REMINDERS: { value: Reminder; label: string; short: string }[] = [
  { value: "aus", label: "Keine Erinnerung", short: "aus" },
  { value: "10", label: "10 Minuten vorher", short: "10 Min vorher" },
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
  /** Kurze Notiz (z. B. „aus Tipps“) und Link zur Quelle */
  note?: string;
  link?: string;
  /** Erledigt an diesen Tagen (abgehakt) */
  doneDates?: string[];
  /** Einzelne Tage einer Serie, die entfallen (verschoben oder gelöscht) */
  skipDates?: string[];
  /** Letzter Tag einer Serie (ohne = endlos) */
  until?: string;
  /** Mehrtägig: letzter Tag (z. B. Urlaub) */
  endDate?: string;
  /** Aus Google/Apple übernommen */
  source?: TerminSource;
};

type TerminExtras = Pick<TerminData, "note" | "link" | "until" | "endDate" | "source">;

/** Was das Formular nicht zeigt, aber beim Sichern bleiben muss (z. B. Link, „aus Tipps“, Serienende, Herkunft) */
export function terminExtras(data: TerminExtras | undefined): TerminExtras {
  return {
    ...(data?.note ? { note: data.note } : {}),
    ...(data?.link ? { link: data.link } : {}),
    ...(data?.until ? { until: data.until } : {}),
    ...(data?.endDate ? { endDate: data.endDate } : {}),
    ...(data?.source ? { source: data.source } : {}),
  };
}

type AufgabeExtras = Pick<AufgabeData, "dringend" | "seit" | "fuer" | "zurueck" | "liste">;

/** Was das Formular bei Aufgaben nicht zeigt, aber beim Sichern bleiben muss (dringend, Reihenfolge, abgegeben) */
export function aufgabeExtras(data: AufgabeExtras | undefined): AufgabeExtras {
  return {
    ...(data?.dringend ? { dringend: true } : {}),
    ...(data?.seit ? { seit: data.seit } : {}),
    ...(data?.fuer ? { fuer: data.fuer } : {}),
    ...(data?.zurueck ? { zurueck: data.zurueck } : {}),
    ...(data?.liste ? { liste: data.liste } : {}),
  };
}

/** „aus Google“ / „aus Apple“ / „aus dem Kalender“ (kleiner Hinweis im Termin) */
export function sourceLabel(source: TerminSource | undefined): string | null {
  if (!source) return null;
  return source.kind === "google" ? "aus Google" : source.kind === "apple" ? "aus Apple" : "aus dem Kalender";
}

export type AufgabeData = {
  title: string;
  /** Wunschtag "YYYY-MM-DD"; ohne = ab dem Tag, an dem sie angelegt wurde */
  date?: string;
  /** Frist "YYYY-MM-DD" ("bis Mittwoch") */
  due?: string;
  /** Alt (bis v0.136): Montag der Woche ("diese Woche") – der Speicher setzt es still auf heute bzw. den Tag (kalender/store.ts) */
  week?: string;
  /** "HH:MM", optional */
  time?: string;
  label?: string;
  repeat?: Repeat | null;
  reminder: Reminder;
  /** Erledigt am (einmalige Aufgabe) */
  doneOn?: string | null;
  /** Abgehakt um (ISO, einmalige Aufgabe) – 12 h unter „Erledigt“, dann still weg (kalender/erledigt.ts) */
  doneAt?: string;
  /** Erledigt an diesen Tagen (wiederkehrende Aufgabe) */
  doneDates?: string[];
  /** Serie: abgehakt um (ISO) je Runde „YYYY-MM-DD“ – nur die letzten 12 h */
  doneTimes?: Record<string, string>;
  skipDates?: string[];
  /** Dringend: steht immer ganz vorne (kleines oranges "!") */
  dringend?: boolean;
  /** Platz in der Reihenfolge (Zeitstempel): sonst `erstellt`; "Auf morgen" setzt ihn neu (dort hinten) */
  seit?: string;
  /** Liste („Haus“, „Kinder“ …) aus einer eingefügten To-do-Liste (kalender/liste) */
  liste?: string;
  /** Abgegeben an (Konto-ID im Haushalt, Tafel 52 B) – siehe kalender/abgeben */
  fuer?: string;
  /** Zuletzt zurückgegeben von (Konto-ID) – nur für die Datenbank-Regeln */
  zurueck?: string;
  /** Aus dem Gespräch: an wen (Name), wird beim Übernehmen zur Konto-ID */
  an?: string;
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
  /** Frist: "bis Mi" */
  dueLabel: string | null;
  repeat: Repeat | null;
  /** Nur bei „Geplant“: ab wann ("Fr 30.10.") */
  when?: string | null;
};

const WEEKDAYS_SHORT = WEEKDAYS_SHORT_MO;
const WEEKDAYS_LONG = WEEKDAYS_MO;

/** Wochentag 0 = Mo … 6 = So */
export const weekdayIndex = (iso: string) => (fromIsoDate(iso).getDay() + 6) % 7;
export const weekdayShort = (iso: string) => WEEKDAYS_SHORT[weekdayIndex(iso)];
export const weekdayLong = (iso: string) => WEEKDAYS_LONG[weekdayIndex(iso)];
/** Der nächste Tag immer mit Wochentag: "Morgen · Mi" */
export const tomorrowLabel = (iso: string) => `Morgen · ${weekdayShort(iso)}`;

const dayDiff = (a: string, b: string) => Math.round((fromIsoDate(a).getTime() - fromIsoDate(b).getTime()) / 86_400_000);

/** Fällt eine Wiederholung (ab `start`) auf `date`? */
function repeatsOn(repeat: Repeat, start: string, date: string): boolean {
  if (date < start) return false;
  switch (repeat.kind) {
    case "taeglich":
      return true;
    case "woechentlich":
      return dayDiff(date, start) % (7 * (repeat.every ?? 1)) === 0;
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
      if ((repeat.every ?? 1) > 1) return start ? `alle ${repeat.every} Wochen ${WEEKDAYS_LONG[weekdayIndex(start)]}s` : `alle ${repeat.every} Wochen`;
      return start ? `jeden ${WEEKDAYS_LONG[weekdayIndex(start)]}` : "wöchentlich";
    case "monatlich":
      return "monatlich";
    case "wochentage":
      return repeat.days.length === 7 ? "täglich" : `jeden ${repeat.days.map((d) => WEEKDAYS_LONG[d]).join(", ")}`;
  }
}

const isTermin = (e: CalendarEntry): e is Termin => e.typ === "termin";

/** "bis Mi" (diese Woche), sonst "bis 24.10." */
export function dueLabel(due: string, date: string): string {
  const days = dayDiff(due, date);
  if (days === 0) return "bis heute";
  if (days === 1) return "bis morgen";
  if (days > 1 && days < 7) return `bis ${WEEKDAYS_SHORT[weekdayIndex(due)]}`;
  const [, m, d] = due.split("-");
  return `bis ${Number(d)}.${Number(m)}.`;
}

/**
 * Ab welchem Tag eine Aufgabe in der Liste steht: der genannte Tag, sonst
 * (alt: „diese/nächste Woche“) der Montag, sonst der Tag des Anlegens.
 */
export const taskFrom = (a: Pick<AufgabeData, "date" | "week">, created: string) => a.date ?? a.week ?? created.slice(0, 10);
const taskStart = taskFrom;

/** Montag der Woche eines Tages */
export const mondayOf = (iso: string) => addDays(iso, -weekdayIndex(iso));

/** Heute angelegt? Dann trägt die Aufgabe heute das Schild „neu“ (am nächsten Tag weg) */
export const isNeu = (i: Pick<DayItem, "entry">, today: string) => i.entry.typ === "aufgabe" && Boolean(i.entry.erstellt) && berlinTime(new Date(i.entry.erstellt)).iso === today;

/**
 * Alle Einträge an einem Tag. `today` bestimmt, wo unerledigte Aufgaben
 * landen: einmalige Aufgaben von früher erscheinen still heute, an
 * vergangenen Tagen nicht mehr; geplante stehen ab ihrem Tag.
 */
export function itemsForDay(entries: CalendarEntry[], date: string, today: string): DayItem[] {
  const items: DayItem[] = [];
  for (const entry of entries) {
    if (isTermin(entry)) {
      const t = entry.data;
      const on = t.repeat ? repeatsOn(t.repeat, t.date, date) && !t.skipDates?.includes(date) && (!t.until || date <= t.until) : t.endDate ? t.date <= date && date <= t.endDate : t.date === date;
      if (!on) continue;
      // Mehrtägig: Uhrzeit nur am ersten Tag, Ende nur am letzten
      const first = !t.endDate || t.repeat || date === t.date;
      const last = !t.endDate || t.repeat || date === t.endDate;
      items.push({
        key: `${entry.id}@${date}`,
        entry,
        date,
        time: first ? t.start || null : null,
        end: last ? t.end || null : null,
        title: t.title,
        label: t.label || null,
        room: entry.raum,
        reminder: t.reminder,
        done: Boolean(t.doneDates?.includes(date)),
        dueLabel: null,
        repeat: t.repeat ?? null,
      });
      continue;
    }
    const a = entry.data;
    const start = taskStart(a, entry.erstellt);
    let on: boolean;
    let done: boolean;
    if (a.repeat) {
      on = repeatsOn(a.repeat, start, date) && !a.skipDates?.includes(date);
      done = Boolean(a.doneDates?.includes(date));
    } else if (a.doneOn) {
      // Erledigt: an dem Tag, an dem es abgehakt wurde
      on = a.doneOn === date;
      done = true;
    } else {
      // Alles ist heute: ab ihrem Tag still auf heute, geplante an ihrem Tag
      done = false;
      on = date === today ? start <= today : date > today && start === date;
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
      dueLabel: a.due && !done ? dueLabel(a.due, date) : null,
      repeat: a.repeat ?? null,
    });
  }
  return sortItems(items);
}

/** Ist der Eintrag eine dringende Aufgabe? */
export const isUrgent = (i: Pick<DayItem, "entry">) => i.entry.typ === "aufgabe" && i.entry.data.dringend === true;

/** Platz in der Reihenfolge: "Auf morgen" (seit), sonst wann angelegt – nie das Alphabet */
const sortStamp = (i: Pick<DayItem, "entry">) => (i.entry.typ === "aufgabe" ? (i.entry.data.seit ?? i.entry.erstellt) : i.entry.erstellt);

/** Innerhalb einer Gruppe: Regel `timeThenCreated` aus core/sort (Uhrzeit, sonst Anlegen) */
const byTimeThenAge = (x: Pick<DayItem, "entry" | "time">, y: Pick<DayItem, "entry" | "time">): number =>
  timeThenCreated({ time: x.time, stamp: sortStamp(x) }, { time: y.time, stamp: sortStamp(y) });

/** Ganztägiger Termin (ohne Uhrzeit) – steht am Tag vor allem mit Uhrzeit */
const allDay = (i: Pick<DayItem, "entry" | "time">) => i.entry.typ === "termin" && i.time === null;

/** Ein Tag: Erledigtes ans Ende, dringende Aufgaben vorne, ganztägige Termine, dann nach Uhrzeit bzw. Anlegen */
export function sortItems(items: DayItem[]): DayItem[] {
  return sortBy(items, first((i) => !i.done), first(isUrgent), first(allDay), byTimeThenAge);
}

// --- Aufgaben: alles ist heute, eine Liste (Tafel 103/104) -----------------------

/** Heute (eine Liste), Geplant (ab einem genannten Tag), Erledigt (letzte 12 Stunden, neueste oben) */
export type TaskGroups = { heute: DayItem[]; geplant: DayItem[]; erledigt: DayItem[] };

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
    dueLabel: null,
    repeat: a.repeat ?? null,
    when: null,
    ...extra,
  };
}

/** Reihenfolge der Liste (Regel `TASKS` aus core/sort): dringend → neu → nach Erstellungszeit */
function sortTasks(items: DayItem[], neuAm: string): DayItem[] {
  return sortBy(items, ...via((i: DayItem) => ({ urgent: isUrgent(i), neu: isNeu(i, neuAm), stamp: sortStamp(i) }), TASKS));
}

/**
 * Alle Aufgaben: Heute = alles, was ab heute ansteht (ohne Tag, von früher,
 * Frist egal wann) – EINE Liste; Geplant = erst ab einem genannten Tag;
 * Erledigt = höchstens 12 Stunden nach dem Abhaken (A-043, `jetzt`).
 * `neuAm`: Tag, an dem Angelegtes „neu“ ist (abends für morgen bleibt es das
 * echte Heute).
 */
export function taskOverview(entries: CalendarEntry[], today: string, neuAm = today, jetzt = now().getTime()): TaskGroups {
  const groups: TaskGroups = { heute: [], geplant: [], erledigt: [] };
  for (const entry of entries) {
    if (entry.typ !== "aufgabe") continue;
    const a = entry.data;
    if (a.repeat) {
      const start = taskStart(a, entry.erstellt);
      // Nur die erledigte Runde (12 h), die Reihe bleibt
      for (const [d, um] of Object.entries(a.doneTimes ?? {})) if (a.doneDates?.includes(d) && nochErledigt(um, jetzt)) groups.erledigt.push(taskItem(entry, d, { done: true }));
      const next = nextOccurrence(a, start, today);
      if (!next) continue;
      if (next === today) groups.heute.push(taskItem(entry, today, {}));
      else groups.geplant.push(taskItem(entry, next, { when: shortDay(next) }));
      continue;
    }
    if (a.doneOn) {
      if (nochErledigt(a.doneAt, jetzt)) groups.erledigt.push(taskItem(entry, a.doneOn, { done: true }));
      continue;
    }
    const from = taskFrom(a, entry.erstellt);
    if (from <= today) groups.heute.push(taskItem(entry, today, { dueLabel: a.due && a.due >= today ? dueLabel(a.due, today) : null }));
    else groups.geplant.push(taskItem(entry, from, { when: shortDay(from), dueLabel: a.due ? dueLabel(a.due, today) : null }));
  }
  return {
    heute: sortTasks(groups.heute, neuAm),
    geplant: sortBy(groups.geplant, ...via((i: DayItem) => ({ date: i.date, time: i.time, stamp: sortStamp(i) }), TERMINE)),
    erledigt: sortBy(groups.erledigt, ...via((i: DayItem) => ({ um: i.entry.typ === "aufgabe" ? abgehaktUm(i.entry.data, i.date) : null }), TASKS_DONE)),
  };
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

/** Aufgabe als dringend markieren (bzw. nicht mehr) */
export function setUrgent(entries: CalendarEntry[], entryId: string, on: boolean, stamp: string): CalendarEntry[] {
  return entries.map((e) => (e.id === entryId && e.typ === "aufgabe" ? touch(e, { dringend: on || undefined }, stamp) : e));
}

/** Abhaken (bzw. wieder öffnen) an einem Tag – mit Zeitpunkt (12 h unter „Erledigt“, kalender/erledigt.ts) */
export function setDone(entries: CalendarEntry[], item: Pick<DayItem, "entry" | "date">, done: boolean, stamp: string): CalendarEntry[] {
  const e = entries.find((x) => x.id === item.entry.id);
  if (!e) return entries;
  if (e.typ === "aufgabe" && !e.data.repeat) {
    return replace(entries, touch(e, { doneOn: done ? item.date : null, doneAt: done ? stamp : undefined }, stamp));
  }
  const doneDates = done ? addUnique(e.data.doneDates, item.date) : (e.data.doneDates ?? []).filter((d) => d !== item.date);
  if (e.typ === "aufgabe") return replace(entries, touch(e, { doneDates, doneTimes: serienZeiten(e.data.doneTimes, item.date, done, stamp) }, stamp));
  return replace(entries, touch(e, { doneDates }, stamp));
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
    // Auf einen anderen Tag geschoben: dort hinten einsortiert
    return replace(entries, touch(e, { date: to, seit: stamp, ...(time ? { time } : {}) }, stamp));
  }
  const withSkip = replace(entries, touch(e, { skipDates: addUnique(e.data.skipDates, item.date) } as Partial<typeof e.data>, stamp));
  const copy =
    e.typ === "termin"
      ? createEntry("termin", { ...e.data, date: to, start: time ?? e.data.start, repeat: null, doneDates: [], skipDates: [] }, { raum: e.raum, besitzer: e.besitzer })
      : createEntry("aufgabe", { ...e.data, date: to, seit: stamp, ...(time ? { time } : {}), repeat: null, doneDates: [], skipDates: [], doneOn: null, doneAt: undefined, doneTimes: undefined }, { raum: e.raum, besitzer: e.besitzer });
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
    raum: roomOf(e.raum),
    besitzer: typeof e.besitzer === "string" ? e.besitzer : "lokal",
    erstellt: typeof e.erstellt === "string" ? e.erstellt : new Date(0).toISOString(),
    geaendert: typeof e.geaendert === "string" ? e.geaendert : new Date(0).toISOString(),
  };
  const label = typeof d.label === "string" && d.label.trim() ? d.label.trim().slice(0, 40) : undefined;
  if (e.typ === "termin") {
    // Ohne Uhrzeit (start "") = ganztägig
    if (typeof d.date !== "string" || !DATE.test(d.date) || typeof d.start !== "string" || (d.start !== "" && !TIME.test(d.start))) return null;
    const src = d.source as Partial<TerminSource> | undefined;
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
        note: typeof d.note === "string" && d.note.trim() ? d.note.trim().slice(0, 200) : undefined,
        link: typeof d.link === "string" && /^https?:\/\//.test(d.link) ? d.link.slice(0, 300) : undefined,
        doneDates: dates(d.doneDates),
        skipDates: dates(d.skipDates),
        ...(repeat && typeof d.until === "string" && DATE.test(d.until) && d.until >= d.date ? { until: d.until } : {}),
        ...(!repeat && typeof d.endDate === "string" && DATE.test(d.endDate) && d.endDate > d.date ? { endDate: d.endDate } : {}),
        ...(src && (src.kind === "google" || src.kind === "apple" || src.kind === "ics") && typeof src.uid === "string" && src.uid ? { source: { kind: src.kind, uid: src.uid.slice(0, 300) } } : {}),
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
      ...erledigtFelder({ ...d, repeat }),
      doneDates: dates(d.doneDates),
      skipDates: dates(d.skipDates),
      ...(d.dringend === true ? { dringend: true } : {}),
      ...(typeof d.seit === "string" && d.seit ? { seit: d.seit } : {}),
      ...(typeof d.liste === "string" && d.liste.trim() ? { liste: d.liste.trim().slice(0, 40) } : {}),
      // Abgeben (kalender/abgeben): beim Laden nie verlieren
      ...(typeof d.fuer === "string" && d.fuer ? { fuer: d.fuer } : {}),
      ...(typeof d.zurueck === "string" && d.zurueck ? { zurueck: d.zurueck } : {}),
      ...(typeof d.an === "string" && d.an.trim() ? { an: d.an.trim().slice(0, 40) } : {}),
    },
  };
}

/**
 * v2 → v3 (Tafel 103/104, alles ist heute): „Irgendwann“ war schon ohne Tag
 * (= ab dem Anlegen, also heute). „Diese Woche“ (`week`) kommt still auf
 * heute; ein Zeitraum in der Zukunft („nächste Woche“) wird zum Tag, ab dem
 * die Aufgabe erscheint. Nichts geht verloren.
 */
export function ohneZeitraum(e: CalendarEntry, today: string): CalendarEntry {
  if (e.typ !== "aufgabe" || !e.data?.week) return e;
  const { week, ...data } = e.data;
  return { ...e, data: !data.date && !data.repeat && !data.doneOn && week > today ? { ...data, date: week } : data };
}

export function sanitizeRepeat(raw: unknown): Repeat | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<Repeat> & { days?: unknown };
  const every = (r as { every?: unknown }).every;
  if (r.kind === "woechentlich" && Number.isInteger(every) && (every as number) > 1 && (every as number) <= 12) return { kind: "woechentlich", every: every as number };
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
