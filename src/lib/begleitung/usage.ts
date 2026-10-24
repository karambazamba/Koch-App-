// KI-Verbrauch je Tag auf diesem Gerät – nur Zahlen, nie Inhalte. Vorbereitung
// für ein späteres Guthaben: Anfragen, davon mit kleinem/großem Modell bzw.
// hochgeschaltet, vorgelesene Zeichen und gehörte Sekunden (Mias Stimme vom
// Server), Kosten in Millionstel US-Dollar. Nur in den Entwickler-
// Einstellungen sichtbar („KI-Kosten letzte 7 Tage“) – keine Zähler in der App.

import { createLocalStore } from "@/lib/core/localStore";
import type { AssistantUsage } from "@/lib/begleitung/protocol";
import { STIMME_KOSTEN } from "@/lib/begleitung/stimmeProtokoll";

type DayUsage = { requests: number; small: number; large: number; upgraded: number; micro: number; zeichen: number; sekunden: number };
type UsageState = { version: 1; days: Record<string, DayUsage> };

const KEEP_DAYS = 62;
const EMPTY: DayUsage = { requests: 0, small: 0, large: 0, upgraded: 0, micro: 0, zeichen: 0, sekunden: 0 };

const store = createLocalStore("wasgibts.verbrauch", (raw: unknown): UsageState | null => {
  if (!raw || typeof raw !== "object" || (raw as UsageState).version !== 1) return null;
  const days = (raw as UsageState).days;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
  const clean: Record<string, DayUsage> = {};
  for (const [date, d] of Object.entries(days && typeof days === "object" ? days : {})) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && d && typeof d === "object") clean[date] = { requests: n(d.requests), small: n(d.small), large: n(d.large), upgraded: n(d.upgraded), micro: n(d.micro), zeichen: n(d.zeichen), sekunden: n(d.sekunden) };
  }
  return { version: 1, days: clean };
});

/** Reine Fortschreibung eines Tages @public */
export function addUsage(state: UsageState | null, today: string, u: AssistantUsage): UsageState {
  const days = { ...(state?.days ?? {}) };
  const d = days[today] ?? EMPTY;
  days[today] = { ...d, requests: d.requests + 1, small: d.small + (u.size === "klein" ? 1 : 0), large: d.large + (u.size === "gross" ? 1 : 0), upgraded: d.upgraded + (u.upgraded ? 1 : 0), micro: d.micro + (u.micro ?? 0) };
  return keepDays(days);
}

/** Mias Stimme vom Server: vorgelesene Zeichen bzw. gehörte Sekunden, Kosten geschätzt (rein) @public */
export function addStimme(state: UsageState | null, today: string, u: { zeichen?: number; sekunden?: number }): UsageState {
  const days = { ...(state?.days ?? {}) };
  const d = days[today] ?? EMPTY;
  const zeichen = Math.max(0, u.zeichen ?? 0);
  const sekunden = Math.max(0, u.sekunden ?? 0);
  const micro = Math.round((zeichen * STIMME_KOSTEN.jeZeichen + sekunden * STIMME_KOSTEN.jeSekunde) * 1_000_000);
  days[today] = { ...d, zeichen: d.zeichen + zeichen, sekunden: d.sekunden + sekunden, micro: d.micro + micro };
  return keepDays(days);
}

function keepDays(days: Record<string, DayUsage>): UsageState {
  const keep = Object.keys(days).sort().slice(-KEEP_DAYS);
  return { version: 1, days: Object.fromEntries(keep.map((k) => [k, days[k]])) };
}

/** Nach jedem Vorlesen/Zuhören über den Server (still, ohne Anzeige) */
export function recordStimme(today: string, u: { zeichen?: number; sekunden?: number }) {
  try {
    store.save(addStimme(store.load(), today, u));
  } catch {
    // Speicher voll/gesperrt – Verbrauch ist nur Vorbereitung
  }
}

/** Nach jeder KI-Antwort aufrufen (still, ohne Anzeige) */
export function recordUsage(today: string, u: AssistantUsage | undefined) {
  if (!u) return;
  try {
    store.save(addUsage(store.load(), today, u));
  } catch {
    // Speicher voll/gesperrt – Verbrauch ist nur Vorbereitung
  }
}

export type CostSummary = { requests: number; small: number; large: number; upgraded: number; zeichen: number; sekunden: number; usd: number };

/** Summe der letzten `days` Tage bis einschließlich `today` (rein) @public */
export function costSummary(state: UsageState | null, today: string, days = 7): CostSummary {
  const from = new Date(`${today}T12:00:00Z`);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  const start = from.toISOString().slice(0, 10);
  const sum: CostSummary = { requests: 0, small: 0, large: 0, upgraded: 0, zeichen: 0, sekunden: 0, usd: 0 };
  for (const [date, d] of Object.entries(state?.days ?? {})) {
    if (date < start || date > today) continue;
    sum.requests += d.requests;
    sum.small += d.small;
    sum.large += d.large;
    sum.upgraded += d.upgraded;
    sum.zeichen += d.zeichen;
    sum.sekunden += d.sekunden;
    sum.usd += d.micro / 1_000_000;
  }
  return sum;
}

/** KI-Kosten der letzten 7 Tage auf diesem Gerät */
export const lastWeekCosts = (today: string) => costSummary(store.load(), today);
