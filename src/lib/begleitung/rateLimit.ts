// Einfaches Rate-Limit pro Gerät (und IP) im Speicher der Server-Instanz.
// Auf Vercel hat jede Instanz ihren eigenen Zähler – als Schutz gegen
// Dauerfeuer reicht das; die App zählt das Tageslimit zusätzlich selbst.

import { LIMITS } from "@/lib/begleitung/protocol";

/** Kurzfristige Grenzen je Aufruf-Art (gegen Dauerfeuer) */
const WINDOWS = [
  { ms: 60_000, max: 10 }, // pro Minute
  { ms: 60 * 60_000, max: 60 }, // pro Stunde
];
const DAY = 24 * 60 * 60_000;

const hits = new Map<string, number[]>();

/**
 * true = erlaubt (und gezählt), false = zu viele Anfragen. `factor` hebt die
 * Grenzen an (z. B. pro IP, hinter der mehrere Familien-Geräte stecken können).
 */
export function allowRequest(key: string, factor = 1, now = Date.now()): boolean {
  const longest = WINDOWS[WINDOWS.length - 1].ms;
  const list = (hits.get(key) ?? []).filter((t) => now - t < longest);
  const blocked = WINDOWS.some((w) => list.filter((t) => now - t < w.ms).length >= w.max * factor);
  if (!blocked) list.push(now);
  hits.set(key, list);
  // Speicher klein halten
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= longest)) hits.delete(k);
  }
  return !blocked;
}

/** Gemeinsames Tageslimit aller KI-Aufrufe (LIMITS.dailyPerDevice); true = erlaubt und gezählt */
const daily = new Map<string, number[]>();

export function allowDaily(key: string, factor = 1, now = Date.now()): boolean {
  const list = (daily.get(key) ?? []).filter((t) => now - t < DAY);
  const ok = list.length < LIMITS.dailyPerDevice * factor;
  if (ok) list.push(now);
  daily.set(key, list);
  if (daily.size > 5000) {
    for (const [k, v] of daily) if (v.every((t) => now - t >= DAY)) daily.delete(k);
  }
  return ok;
}

const wrongCodes = new Map<string, number[]>();

/** Gegen Durchprobieren: nach 10 falschen Codes 15 Minuten Pause (je Adresse) */
const CODE_TRIES = 10;
const CODE_PAUSE_MS = 15 * 60_000;

export function codeAttemptsLeft(key: string, now = Date.now()): boolean {
  const list = (wrongCodes.get(key) ?? []).filter((t) => now - t < CODE_PAUSE_MS);
  wrongCodes.set(key, list);
  return list.length < CODE_TRIES;
}

export function noteWrongCode(key: string, now = Date.now()) {
  wrongCodes.set(key, [...(wrongCodes.get(key) ?? []), now]);
  if (wrongCodes.size > 5000) wrongCodes.clear();
}
