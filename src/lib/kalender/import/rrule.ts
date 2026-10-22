// Wiederholungen aus Kalender-Dateien (RRULE): passt die Regel in unser
// Modell (täglich, wöchentlich/alle N Wochen, bestimmte Wochentage,
// monatlich am gleichen Tag – mit Ende), wird sie eine Serie. Sonst (z. B.
// „jeden 2. Dienstag im Monat“, jährlich) rechnet `occurrences` die einzelnen
// Tage aus – `plan.ts` legt sie für 12 Monate einzeln an und nennt sie im
// Bericht. Rein, ohne Uhr.

import type { Repeat } from "@/lib/kalender/model";
import { shiftDate, type Rrule } from "@/lib/kalender/import/ics";

const dayOfWeek = (iso: string) => (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;
const parts = (iso: string) => iso.split("-").map(Number) as [number, number, number];
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Passt die Regel in unser Modell? Dann die Serie (ohne Ende – das kommt aus `lastDate`) */
export function simpleRepeat(rule: Rrule, start: string): Repeat | null {
  if (rule.byMonth.length || rule.bySetPos.length) return null;
  const plainDays = rule.byDay.every(([n]) => n === 0);
  if (!plainDays) return null;
  const days = [...new Set(rule.byDay.map(([, d]) => d))].sort();
  switch (rule.freq) {
    case "DAILY":
      return rule.interval === 1 && !days.length && !rule.byMonthDay.length ? { kind: "taeglich" } : null;
    case "WEEKLY":
      if (rule.byMonthDay.length) return null;
      if (!days.length || (days.length === 1 && days[0] === dayOfWeek(start))) return rule.interval === 1 ? { kind: "woechentlich" } : rule.interval <= 12 ? { kind: "woechentlich", every: rule.interval } : null;
      return rule.interval === 1 ? { kind: "wochentage", days } : null;
    case "MONTHLY":
      if (rule.interval !== 1 || days.length) return null;
      return !rule.byMonthDay.length || (rule.byMonthDay.length === 1 && rule.byMonthDay[0] === parts(start)[2]) ? { kind: "monatlich" } : null;
    default:
      return null;
  }
}

/** Fällt `date` (≥ start) auf die Regel? (ohne COUNT/UNTIL) */
function matches(rule: Rrule, start: string, date: string): boolean {
  const [sy, sm, sd] = parts(start);
  const [y, m, d] = parts(date);
  const wd = dayOfWeek(date);
  if (rule.byMonth.length && !rule.byMonth.includes(m)) return false;
  switch (rule.freq) {
    case "DAILY":
      return daysBetween(start, date) % rule.interval === 0 && (!rule.byDay.length || rule.byDay.some(([, x]) => x === wd)) && (!rule.byMonthDay.length || inMonthDays(rule.byMonthDay, y, m, d));
    case "WEEKLY": {
      const weeks = Math.floor(daysBetween(shiftDate(start, -dayOfWeek(start)), date) / 7);
      const days = rule.byDay.length ? rule.byDay.map(([, x]) => x) : [dayOfWeek(start)];
      return weeks % rule.interval === 0 && days.includes(wd);
    }
    case "MONTHLY": {
      if (((y - sy) * 12 + (m - sm)) % rule.interval !== 0) return false;
      return inMonth(rule, y, m, d, sd);
    }
    case "YEARLY": {
      if ((y - sy) % rule.interval !== 0) return false;
      if (!rule.byMonth.length && m !== sm) return false;
      if (!rule.byDay.length && !rule.byMonthDay.length) return d === sd;
      return inMonth(rule, y, m, d, sd);
    }
  }
}

const inMonthDays = (list: number[], y: number, m: number, d: number) => list.some((x) => (x > 0 ? x === d : daysInMonth(y, m) + x + 1 === d));

/** Innerhalb eines Monats: BYMONTHDAY, BYDAY (auch „2. Dienstag“, „letzter Freitag“), BYSETPOS */
function inMonth(rule: Rrule, y: number, m: number, d: number, startDay: number): boolean {
  if (rule.byMonthDay.length) return inMonthDays(rule.byMonthDay, y, m, d);
  if (!rule.byDay.length) return d === startDay;
  const len = daysInMonth(y, m);
  const candidates: number[] = [];
  for (let day = 1; day <= len; day++) {
    const wd = dayOfWeek(`${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    const ok = rule.byDay.some(([n, x]) => {
      if (x !== wd) return false;
      if (n === 0) return true;
      const nth = Math.ceil(day / 7);
      const fromEnd = Math.ceil((len - day + 1) / 7);
      return n > 0 ? nth === n : fromEnd === -n;
    });
    if (ok) candidates.push(day);
  }
  if (!rule.bySetPos.length) return candidates.includes(d);
  return rule.bySetPos.some((pos) => (pos > 0 ? candidates[pos - 1] : candidates[candidates.length + pos]) === d);
}

/**
 * Alle Tage der Serie von `start` bis höchstens `limit` (inklusive), mit
 * COUNT und UNTIL. Der erste Tag zählt immer mit (DTSTART ist der Anfang).
 */
export function occurrences(rule: Rrule, start: string, limit: string): string[] {
  const out: string[] = [];
  const end = rule.until && rule.until < limit ? rule.until : limit;
  for (let date = start; date <= end; date = shiftDate(date, 1)) {
    if (date === start || matches(rule, start, date)) {
      out.push(date);
      if (rule.count && out.length >= rule.count) break;
    }
    if (out.length > 3000) break;
  }
  return out;
}

/** Letzter Tag einer Serie mit Ende (COUNT oder UNTIL); null = endlos */
export function lastDate(rule: Rrule, start: string): string | null {
  if (rule.until) return rule.until;
  if (!rule.count) return null;
  const list = occurrences(rule, start, shiftDate(start, 366 * 30));
  return list[list.length - 1] ?? start;
}

const WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const NTH: Record<number, string> = { 1: "1.", 2: "2.", 3: "3.", 4: "4.", 5: "5.", [-1]: "letzten", [-2]: "vorletzten" };

/** Für den Bericht: „jeden 2. Dienstag im Monat“, „jährlich“, „alle 3 Tage“ */
export function describeRule(rule: Rrule): string {
  const every = (one: string, many: string) => (rule.interval === 1 ? one : `alle ${rule.interval} ${many}`);
  if (rule.freq === "MONTHLY" && rule.byDay.length === 1 && rule.byDay[0][0] !== 0) return `jeden ${NTH[rule.byDay[0][0]] ?? `${rule.byDay[0][0]}.`} ${WEEKDAYS[rule.byDay[0][1]]} im Monat`;
  if (rule.freq === "YEARLY") return every("jährlich", "Jahre");
  if (rule.freq === "MONTHLY") return every("monatlich", "Monate");
  if (rule.freq === "WEEKLY") return every("wöchentlich", "Wochen");
  return every("täglich", "Tage");
}
