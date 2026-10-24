// Kalender-Dateien (.ics, iCalendar) lesen – eigener kleiner Parser ohne
// Bibliothek: Zeilen entfalten, Eigenschaften mit Parametern, VEVENT mit
// VALARM. Alle Zeiten landen in Europe/Berlin (auch aus anderen Zeitzonen,
// inklusive Sommerzeit); ganztägige Termine bleiben Tage. Rein: kein Speicher,
// keine Uhr – `plan.ts` macht daraus Termine.

import { berlinTime } from "@/lib/core/now";

/** Zeitpunkt in Berlin: Tag und Uhrzeit (null = ganztägig) */
type Local = { date: string; time: string | null };

export type Rrule = {
  freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  count: number | null;
  /** Letzter Tag (Berlin) */
  until: string | null;
  /** [Nummer (0 = jede), Wochentag 0 = Mo … 6 = So] */
  byDay: [number, number][];
  byMonthDay: number[];
  byMonth: number[];
  bySetPos: number[];
};

export type IcsEvent = {
  uid: string;
  summary: string;
  start: Local;
  /** Ende (bei ganztägig: letzter Tag, nicht exklusiv) */
  end: Local | null;
  allDay: boolean;
  location: string;
  description: string;
  url: string;
  rrule: Rrule | null;
  /** Ein Wiederholungs-Teil, den es so nicht gibt (z. B. SECONDLY) – wird als Einzeltermin genommen */
  oddRule: boolean;
  /** Entfallende Tage (EXDATE) */
  exdates: string[];
  /** Geänderter Einzeltermin einer Serie: ursprünglicher Tag */
  recurrenceId: string | null;
  cancelled: boolean;
  /** Erinnerungen in Minuten vor Beginn */
  alarms: number[];
  /** Aus einer Aufgabe (VTODO, z. B. Todoist) statt einem Termin */
  todo?: boolean;
};

type IcsSource = "google" | "apple" | "ics";
export type IcsCalendar = { name: string | null; source: IcsSource; events: IcsEvent[] };

type Prop = { name: string; params: Record<string, string>; value: string };

/** Zeilen entfalten (RFC 5545: Fortsetzung beginnt mit Leerzeichen/Tab) */
function unfold(text: string): string[] {
  return text
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n")
    .filter((l) => l.trim());
}

function parseLine(line: string): Prop | null {
  // Doppelpunkt außerhalb von Anführungszeichen trennt Name;Parameter von Wert
  let quoted = false;
  let split = -1;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') quoted = !quoted;
    else if (line[i] === ":" && !quoted) {
      split = i;
      break;
    }
  }
  if (split < 0) return null;
  const [name, ...rawParams] = line.slice(0, split).split(";");
  const params: Record<string, string> = {};
  for (const p of rawParams) {
    const eq = p.indexOf("=");
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, "");
  }
  return { name: name.toUpperCase(), params, value: line.slice(split + 1) };
}

/** Text-Wert: \n, \, \; \\ */
const text = (v: string) => v.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").trim();

// --- Zeitzonen ------------------------------------------------------------------

/** Windows-Namen (Outlook) auf IANA */
const WINDOWS_ZONES: Record<string, string> = {
  "W. Europe Standard Time": "Europe/Berlin",
  "Central Europe Standard Time": "Europe/Budapest",
  "Central European Standard Time": "Europe/Warsaw",
  "Romance Standard Time": "Europe/Paris",
  "GMT Standard Time": "Europe/London",
  "Greenwich Standard Time": "Atlantic/Reykjavik",
  "E. Europe Standard Time": "Europe/Chisinau",
  "FLE Standard Time": "Europe/Kiev",
  "Eastern Standard Time": "America/New_York",
  "Central Standard Time": "America/Chicago",
  "Mountain Standard Time": "America/Denver",
  "Pacific Standard Time": "America/Los_Angeles",
  UTC: "UTC",
};

function validZone(tz: string | undefined): string {
  const name = tz ? (WINDOWS_ZONES[tz] ?? tz.replace(/^\/.*?\//, "")) : "Europe/Berlin";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: name });
    return name;
  } catch {
    return "Europe/Berlin";
  }
}

const offsetCache = new Map<string, Intl.DateTimeFormat>();

/** Abstand der Zone zu UTC (Minuten) zu einem Zeitpunkt */
function zoneOffset(tz: string, utcMs: number): number {
  let f = offsetCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    offsetCache.set(tz, f);
  }
  const p = Object.fromEntries(f.formatToParts(utcMs).map((x) => [x.type, x.value]));
  return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - utcMs) / 60_000;
}

/** Wanduhr-Zeit in einer Zone → UTC (Sommerzeit-Wechsel: zweite Probe) */
function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, tz: string): number {
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const first = wall - zoneOffset(tz, wall) * 60_000;
  return wall - zoneOffset(tz, first) * 60_000;
}

const toLocal = (utcMs: number): Local => {
  const b = berlinTime(new Date(utcMs));
  return { date: b.iso, time: b.clock };
};

/** DTSTART/DTEND/EXDATE/RECURRENCE-ID-Wert → Berlin (eine Liste bei EXDATE) */
function parseTimes(p: Prop, fallbackZone: string): { local: Local; allDay: boolean }[] {
  return p.value
    .split(",")
    .map((raw) => raw.trim())
    .flatMap((v): { local: Local; allDay: boolean }[] => {
      const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
      if (!m) return [];
      const [, y, mo, d, h, mi, , z] = m;
      if (!h || p.params.VALUE === "DATE") return [{ local: { date: `${y}-${mo}-${d}`, time: null }, allDay: true }];
      const utc = z ? Date.UTC(+y, +mo - 1, +d, +h, +mi) : zonedToUtc(+y, +mo, +d, +h, +mi, validZone(p.params.TZID ?? fallbackZone));
      return [{ local: toLocal(utc), allDay: false }];
    });
}

// --- Dauer und Erinnerungen -----------------------------------------------------

/** "PT15M", "-P1D", "-PT1H30M", "P1W" → Minuten (mit Vorzeichen) */
export function durationMinutes(v: string): number | null {
  const m = v.trim().match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return null;
  const [, sign, w, d, h, mi] = m;
  const total = (+(w ?? 0) * 7 + +(d ?? 0)) * 1440 + +(h ?? 0) * 60 + +(mi ?? 0);
  return sign === "-" ? -total : total;
}

const DAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

function parseRrule(v: string, fallbackZone: string): Rrule | "odd" {
  const parts = Object.fromEntries(v.split(";").map((kv) => kv.split("=") as [string, string]).map(([k, x]) => [k?.toUpperCase(), x ?? ""]));
  const freq = parts.FREQ;
  if (freq !== "DAILY" && freq !== "WEEKLY" && freq !== "MONTHLY" && freq !== "YEARLY") return "odd";
  const nums = (s: string | undefined) => (s ? s.split(",").map(Number).filter((n) => Number.isInteger(n) && n !== 0) : []);
  const until = parts.UNTIL ? (parseTimes({ name: "UNTIL", params: {}, value: parts.UNTIL }, fallbackZone)[0]?.local.date ?? null) : null;
  const byDay = (parts.BYDAY ? parts.BYDAY.split(",") : []).flatMap((d): [number, number][] => {
    const m = d.trim().match(/^([+-]?\d{1,2})?(MO|TU|WE|TH|FR|SA|SU)$/);
    return m ? [[m[1] ? Number(m[1]) : 0, DAYS.indexOf(m[2])]] : [];
  });
  return {
    freq,
    interval: Math.max(1, Number(parts.INTERVAL) || 1),
    count: parts.COUNT ? Math.max(1, Number(parts.COUNT) || 1) : null,
    until,
    byDay,
    byMonthDay: nums(parts.BYMONTHDAY),
    byMonth: nums(parts.BYMONTH),
    bySetPos: nums(parts.BYSETPOS),
  };
}

// --- Datei ---------------------------------------------------------------------

function sourceOf(prodId: string): IcsSource {
  if (/google/i.test(prodId)) return "google";
  if (/apple|icloud|mac os|ios/i.test(prodId)) return "apple";
  return "ics";
}

/** Ganze Datei lesen; null = keine Kalender-Datei */
export function parseIcs(raw: string): IcsCalendar | null {
  const lines = unfold(raw);
  if (!lines.some((l) => /^BEGIN:VCALENDAR/i.test(l))) return null;
  let name: string | null = null;
  let prodId = "";
  let zone = "Europe/Berlin";
  const events: IcsEvent[] = [];
  const stack: string[] = [];
  let props: Prop[] = [];
  let alarms: number[] = [];
  let alarmTrigger: Prop | null = null;
  for (const line of lines) {
    const p = parseLine(line);
    if (!p) continue;
    if (p.name === "BEGIN") {
      stack.push(p.value.toUpperCase());
      if (p.value.toUpperCase() === "VEVENT" || p.value.toUpperCase() === "VTODO") {
        props = [];
        alarms = [];
      }
      if (p.value.toUpperCase() === "VALARM") alarmTrigger = null;
      continue;
    }
    if (p.name === "END") {
      const done = stack.pop();
      if (done === "VALARM" && alarmTrigger) {
        const m = durationMinutes(alarmTrigger.value);
        if (m !== null) alarms.push(-m);
      }
      if (done === "VEVENT" || done === "VTODO") {
        // Aufgaben: DUE statt DTSTART; Erledigtes bleibt draußen
        const todo = done === "VTODO";
        if (todo && /^(COMPLETED|CANCELLED)$/i.test(props.find((x) => x.name === "STATUS")?.value.trim() ?? "")) continue;
        const own = todo && !props.some((x) => x.name === "DTSTART") ? props.map((x) => (x.name === "DUE" ? { ...x, name: "DTSTART" } : x)) : props;
        const event = buildEvent(own, alarms, zone);
        if (event) {
          events.push(todo ? { ...event, todo: true } : event);
          // RDATE: zusätzliche einzelne Tage einer Serie
          for (const extra of own.filter((x) => x.name === "RDATE").flatMap((x) => parseTimes(x, zone))) {
            if (extra.local.date === event.start.date) continue;
            events.push({ ...event, uid: `${event.uid}#${extra.local.date}`, start: { date: extra.local.date, time: extra.allDay ? null : extra.local.time }, end: null, rrule: null, exdates: [], ...(todo ? { todo: true } : {}) });
          }
        }
      }
      continue;
    }
    const where = stack[stack.length - 1];
    if (where === "VCALENDAR") {
      if (p.name === "X-WR-CALNAME") name = text(p.value) || null;
      if (p.name === "PRODID") prodId = p.value;
      if (p.name === "X-WR-TIMEZONE") zone = validZone(p.value.trim());
    } else if (where === "VEVENT" || where === "VTODO") props.push(p);
    else if (where === "VALARM" && p.name === "TRIGGER" && p.params.VALUE !== "DATE-TIME") alarmTrigger = p;
  }
  return { name, source: sourceOf(prodId), events };
}

function buildEvent(props: Prop[], alarms: number[], zone: string): IcsEvent | null {
  const get = (n: string) => props.find((p) => p.name === n);
  const dtStart = get("DTSTART");
  const starts = dtStart ? parseTimes(dtStart, zone) : [];
  if (!starts.length) return null;
  const { local: start, allDay } = starts[0];
  let end: Local | null = null;
  const dtEnd = get("DTEND");
  const duration = get("DURATION");
  if (dtEnd) end = parseTimes(dtEnd, zone)[0]?.local ?? null;
  else if (duration && !allDay && dtStart) {
    const m = durationMinutes(duration.value);
    const startUtc = parseUtc(dtStart, zone);
    if (m !== null && startUtc !== null) end = toLocal(startUtc + m * 60_000);
  } else if (duration && allDay) {
    const m = durationMinutes(duration.value);
    if (m !== null && m >= 1440) end = { date: shiftDate(start.date, Math.round(m / 1440)), time: null };
  }
  // Ganztägig: DTEND ist exklusiv → letzter Tag
  if (allDay && end) end = end.date > start.date ? { date: shiftDate(end.date, -1), time: null } : null;
  const rruleProp = get("RRULE");
  const rule = rruleProp ? parseRrule(rruleProp.value, zone) : null;
  const recurrence = get("RECURRENCE-ID");
  return {
    uid: get("UID")?.value.trim() || `${text(get("SUMMARY")?.value ?? "")}-${start.date}-${start.time ?? ""}`,
    summary: text(get("SUMMARY")?.value ?? "") || "Termin",
    start,
    end,
    allDay,
    location: text(get("LOCATION")?.value ?? ""),
    description: text(get("DESCRIPTION")?.value ?? ""),
    url: (get("URL")?.value ?? "").trim(),
    rrule: rule && rule !== "odd" ? rule : null,
    oddRule: rule === "odd",
    exdates: props.filter((p) => p.name === "EXDATE").flatMap((p) => parseTimes(p, zone).map((t) => t.local.date)),
    recurrenceId: recurrence ? (parseTimes(recurrence, zone)[0]?.local.date ?? null) : null,
    cancelled: (get("STATUS")?.value ?? "").toUpperCase() === "CANCELLED",
    alarms: alarms.filter((m) => m >= 0),
  };
}

/** Beginn als UTC (für DURATION) */
function parseUtc(p: Prop, zone: string): number | null {
  const m = p.value.trim().match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})\d{0,2}(Z)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, z] = m;
  return z ? Date.UTC(+y, +mo - 1, +d, +h, +mi) : zonedToUtc(+y, +mo, +d, +h, +mi, validZone(p.params.TZID ?? zone));
}

/** Tag verschieben (rein, ohne Zeitzone) */
export function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}
