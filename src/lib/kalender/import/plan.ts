// Aus gelesenen Kalender-Dateien (`ics.ts`) werden ganz normale Termine:
// Vorschau-Zahlen („112 Termine gefunden · 8 Serien · ab heute 46“), Auswahl
// (ab heute / alles, Familie oder Arbeit je Kalender), dann `planImport` und
// `mergeImport`. Was unser Modell nicht als Serie kann, wird für 12 Monate
// einzeln angelegt und im Bericht genannt – nie still verloren. Doppelte
// vermeidet die Herkunft (Quelle + UID): erneutes Einlesen aktualisiert.

import { createEntry, type Room } from "@/lib/core/entries";
import { sanitizeEntry, type CalendarEntry, type Reminder, type TerminData } from "@/lib/kalender/model";
import { shiftDate, type IcsCalendar, type IcsEvent } from "@/lib/kalender/import/ics";
import { describeRule, lastDate, occurrences, simpleRepeat } from "@/lib/kalender/import/rrule";

export type ImportRange = "ab-heute" | "alles";

export type CalendarSummary = { name: string; source: IcsCalendar["source"]; found: number; series: number; fromToday: number };

export type ImportPlan = {
  entries: CalendarEntry[];
  /** Serien, die wir einzeln angelegt haben: „Elternabend – jeden 2. Dienstag im Monat → 12 einzelne Termine“ */
  expanded: { title: string; rule: string; count: number }[];
};

/** Wie weit einzelne Termine aus besonderen Serien reichen */
const HORIZON_DAYS = 365;

const masters = (cal: IcsCalendar) => cal.events.filter((e) => !e.recurrenceId && !e.cancelled);

/** Liegt (noch) etwas ab heute? */
function fromToday(e: IcsEvent, today: string): boolean {
  if (e.rrule) {
    const last = lastDate(e.rrule, e.start.date);
    return last === null || last >= today;
  }
  return (e.end?.date ?? e.start.date) >= today;
}

/** Zahlen für die Vorschau je Kalender */
export function summarize(cals: IcsCalendar[], today: string, fallbackName = "Kalender"): CalendarSummary[] {
  return cals.map((cal, i) => {
    const list = masters(cal);
    return {
      name: cal.name ?? (cals.length > 1 ? `${fallbackName} ${i + 1}` : fallbackName),
      source: cal.source,
      found: list.length,
      series: list.filter((e) => e.rrule).length,
      fromToday: list.filter((e) => fromToday(e, today)).length,
    };
  });
}

/** Erinnerung (Minuten vor Beginn) → unsere Stufen; Vorabend = am Tag davor zwischen 16 und 22 Uhr */
export function reminderFrom(alarms: number[], start: { time: string | null }): Reminder {
  if (!alarms.length) return "aus";
  const m = Math.min(...alarms);
  const startMin = start.time ? Number(start.time.slice(0, 2)) * 60 + Number(start.time.slice(3, 5)) : 0;
  if (start.time) {
    if (m <= 15) return "15";
    if (m <= 30) return "30";
    if (m <= 60) return "60";
  }
  // Uhrzeit der Erinnerung am Vortag (Minuten ab Mitternacht)
  const prevDay = 1440 + startMin - m;
  return prevDay >= 16 * 60 && prevDay <= 22 * 60 ? "vorabend" : "aus";
}

const firstUrl = (s: string) => s.match(/https?:\/\/[^\s<>"]+/)?.[0] ?? "";

/** Gemeinsame Daten eines Termins aus einem Ereignis */
function baseData(e: IcsEvent, date: string): TerminData {
  const url = /^https?:\/\//.test(e.url) ? e.url : firstUrl(e.description);
  return {
    title: e.summary.slice(0, 120),
    date,
    start: e.start.time ?? "",
    ...(e.end?.time ? { end: e.end.time } : {}),
    ...(e.location ? { place: e.location.slice(0, 120) } : {}),
    ...(e.description ? { note: e.description.replace(/\s+/g, " ").slice(0, 200) } : {}),
    ...(url ? { link: url.slice(0, 300) } : {}),
    reminder: reminderFrom(e.alarms, e.start),
    repeat: null,
    doneDates: [],
    skipDates: [],
  };
}

function entry(data: TerminData, raum: Room, source: IcsCalendar["source"], uid: string): CalendarEntry | null {
  return sanitizeEntry(createEntry("termin", { ...data, source: { kind: source, uid } }, { raum }));
}

/** Termine planen (noch nichts gespeichert) */
export function planImport(cals: IcsCalendar[], opts: { range: ImportRange; today: string; rooms?: Room[] }): ImportPlan {
  const out = new Map<string, CalendarEntry>();
  const expanded: ImportPlan["expanded"] = [];
  const horizon = shiftDate(opts.today, HORIZON_DAYS);
  const wanted = (date: string, endDate?: string) => opts.range === "alles" || (endDate ?? date) >= opts.today;
  cals.forEach((cal, i) => {
    const raum = opts.rooms?.[i] ?? "familie";
    const add = (e: CalendarEntry | null) => e && out.set(`${cal.source}|${e.typ === "termin" ? e.data.source?.uid : ""}`, e);
    for (const e of masters(cal)) {
      const overrides = cal.events.filter((o) => o.uid === e.uid && o.recurrenceId);
      const moved = overrides.map((o) => o.recurrenceId as string);
      // Geänderte Einzeltermine einer Serie: eigener Termin (abgesagte fallen nur weg)
      for (const o of overrides) {
        if (!o.cancelled && wanted(o.start.date, o.end?.date)) add(entry({ ...baseData(o, o.start.date), ...multiDay(o) }, raum, cal.source, `${e.uid}@${o.recurrenceId}`));
      }
      if (!e.rrule) {
        if (wanted(e.start.date, e.end?.date)) add(entry({ ...baseData(e, e.start.date), ...multiDay(e) }, raum, cal.source, e.uid));
        continue;
      }
      if (!fromToday(e, opts.today) && opts.range === "ab-heute") continue;
      const until = lastDate(e.rrule, e.start.date);
      const repeat = simpleRepeat(e.rrule, e.start.date);
      if (repeat) {
        add(entry({ ...baseData(e, e.start.date), repeat, skipDates: [...new Set([...e.exdates, ...moved])].sort(), ...(until ? { until } : {}) }, raum, cal.source, e.uid));
        continue;
      }
      // Besondere Serie: einzeln für 12 Monate
      const skip = new Set([...e.exdates, ...moved]);
      const days = occurrences(e.rrule, e.start.date, until && until < horizon ? until : horizon).filter((d) => !skip.has(d) && wanted(d));
      for (const d of days) add(entry(baseData(e, d), raum, cal.source, `${e.uid}#${d}`));
      if (days.length) expanded.push({ title: e.summary, rule: describeRule(e.rrule), count: days.length });
    }
  });
  return { entries: [...out.values()], expanded };
}

/** Mehrtägig: letzter Tag (nur ohne Wiederholung) */
const multiDay = (e: IcsEvent): Partial<TerminData> => (e.end && e.end.date > e.start.date ? { endDate: e.end.date } : {});

/**
 * In die vorhandenen Termine einfügen: gleiche Herkunft (Quelle + UID) wird
 * aktualisiert (id, erstellt und Abgehaktes bleiben), Neues kommt dazu.
 */
export function mergeImport(existing: CalendarEntry[], planned: CalendarEntry[], stamp: string): { entries: CalendarEntry[]; added: number; updated: number } {
  const key = (e: CalendarEntry) => (e.typ === "termin" && e.data.source ? `${e.data.source.kind}|${e.data.source.uid}` : null);
  const byKey = new Map(planned.map((p) => [key(p), p] as const));
  let updated = 0;
  const entries = existing.map((e) => {
    const k = key(e);
    const next = k ? byKey.get(k) : undefined;
    if (!next || next.typ !== "termin" || e.typ !== "termin") return e;
    byKey.delete(k);
    updated++;
    return { ...e, raum: next.raum, geaendert: stamp, data: { ...next.data, doneDates: e.data.doneDates ?? [] } };
  });
  const fresh = [...byKey.values()];
  return { entries: [...entries, ...fresh], added: fresh.length, updated };
}
