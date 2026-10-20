// Zentrale Zeit: "jetzt" für die ganze App. Die Familie lebt in
// Europe/Berlin – Datum, Wochentag und Uhrzeit werden dort gerechnet (auch
// auf dem Server, der in UTC läuft). In Tests überschreibbar:
// `setNowForTests(...)` oder im Browser `window.__WASGIBTS_NOW__ = "2026-10-21T18:00:00"`.

import { useExternalStore } from "./useExternalStore";

const TIME_ZONE = "Europe/Berlin";

let override: (() => Date) | null = null;

/** Für Tests: feste Zeit (Date) oder Funktion; `null` = echte Uhr @public */
export function setNowForTests(value: Date | (() => Date) | null) {
  override = value === null ? null : typeof value === "function" ? value : () => new Date(value.getTime());
}

/** Jetzt (überschreibbar) */
export function now(): Date {
  if (override) return override();
  if (typeof window !== "undefined") {
    const forced = (window as unknown as { __WASGIBTS_NOW__?: string }).__WASGIBTS_NOW__;
    if (forced) return new Date(forced);
  }
  return new Date();
}

/** Jetzt als Zeitstempel (ISO) – für erstellt/geändert */
export const nowIso = () => now().toISOString();

const PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Datum und Uhrzeit in Berlin: { iso: "2026-10-21", minutes: 1110, clock: "18:30" } */
export function berlinTime(date: Date = now()): { iso: string; minutes: number; clock: string } {
  const p = Object.fromEntries(PARTS.formatToParts(date).map((x) => [x.type, x.value]));
  const hour = Number(p.hour) % 24;
  return { iso: `${p.year}-${p.month}-${p.day}`, minutes: hour * 60 + Number(p.minute), clock: `${String(hour).padStart(2, "0")}:${p.minute}` };
}

/** Lokales Kalenderdatum als "YYYY-MM-DD" (das Gerät steht in Berlin) */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const date = fromIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** Heute als "YYYY-MM-DD" */
export const todayIso = () => toIsoDate(now());

const noop = () => () => {};

/**
 * Heutiges Datum, erst im Browser bekannt (beim statischen Vorrendern
 * `undefined`, damit kein falsches Datum ins HTML gebacken wird).
 */
export function useToday(): Date | undefined {
  const iso = useExternalStore(noop, todayIso, () => undefined);
  return iso ? fromIsoDate(iso) : undefined;
}

/** Jede halbe Minute neu nachsehen (z. B. damit das Gericht nach dem Essen von selbst verschwindet) */
const everyHalfMinute = (onChange: () => void) => {
  const timer = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(timer);
};

/** Minuten seit Mitternacht (im Browser, läuft mit) */
export function useMinutes(): number | undefined {
  return useExternalStore(everyHalfMinute, () => now().getHours() * 60 + now().getMinutes(), () => undefined);
}
