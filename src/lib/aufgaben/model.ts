// Termine und Aufgaben im einheitlichen Eintrags-Modell (core/entries.ts):
// jeder Eintrag mit id, typ, raum, besitzer, erstellt, geändert – bereit für
// Supabase. Hier nur reine Funktionen (ohne Speicher), damit App, Vorschau
// und Server (Lotte) gleich rechnen.
//
// Regeln:
// - Termin = feste Uhrzeit an einem Tag (optional wiederkehrend).
// - Aufgabe = irgendwann, an einem Wunschtag oder bis zu einer Frist.
// - Unerledigte (einmalige) Aufgaben rutschen still auf heute – kein
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
    } else if (date === today) {
      on = start <= today;
      if (on && start < today) carried = carriedLabel(start, today);
      done = false;
    } else {
      on = date > today && start === date;
      done = false;
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
