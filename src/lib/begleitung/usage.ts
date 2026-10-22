// KI-Verbrauch je Tag auf diesem Gerät – nur Zahlen, nie Inhalte. Vorbereitung
// für ein späteres Guthaben: Anfragen, davon mit kleinem/großem Modell bzw.
// hochgeschaltet, Kosten in Millionstel US-Dollar. Wird (noch) nirgends
// angezeigt – keine Zähler in der App.

import { createLocalStore } from "@/lib/core/localStore";
import type { AssistantUsage } from "@/lib/begleitung/protocol";

type DayUsage = { requests: number; small: number; large: number; upgraded: number; micro: number };
type UsageState = { version: 1; days: Record<string, DayUsage> };

const KEEP_DAYS = 62;
const EMPTY: DayUsage = { requests: 0, small: 0, large: 0, upgraded: 0, micro: 0 };

const store = createLocalStore("wasgibts.verbrauch", (raw: unknown): UsageState | null => {
  if (!raw || typeof raw !== "object" || (raw as UsageState).version !== 1) return null;
  const days = (raw as UsageState).days;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
  const clean: Record<string, DayUsage> = {};
  for (const [date, d] of Object.entries(days && typeof days === "object" ? days : {})) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && d && typeof d === "object") clean[date] = { requests: n(d.requests), small: n(d.small), large: n(d.large), upgraded: n(d.upgraded), micro: n(d.micro) };
  }
  return { version: 1, days: clean };
});

/** Reine Fortschreibung eines Tages @public */
export function addUsage(state: UsageState | null, today: string, u: AssistantUsage): UsageState {
  const days = { ...(state?.days ?? {}) };
  const d = days[today] ?? EMPTY;
  days[today] = { requests: d.requests + 1, small: d.small + (u.size === "klein" ? 1 : 0), large: d.large + (u.size === "gross" ? 1 : 0), upgraded: d.upgraded + (u.upgraded ? 1 : 0), micro: d.micro + (u.micro ?? 0) };
  const keep = Object.keys(days).sort().slice(-KEEP_DAYS);
  return { version: 1, days: Object.fromEntries(keep.map((k) => [k, days[k]])) };
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
