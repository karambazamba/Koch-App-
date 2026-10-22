// Kochen (`wasgibts.kochen` v1, pro Gerät, gilt nur für heute): von Hand
// gestartet ("Ich koche jetzt"), welche Rezept-Schritte abgehakt sind. Dazu
// rein: Schritte mit Zeitangabe erkennen ("10 Minuten köcheln" → ⏱) und den
// aktuellen Schritt bestimmen.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { now, todayIso } from "@/lib/core/now";

type CookSession = {
  date: string;
  /** Von Hand gestartet (ms) */
  manualAt: number | null;
  /** Abgehakte Schritte je Rezept */
  steps: Record<string, number[]>;
};

type Stored = { version: 1 } & CookSession;

const store = createLocalStore("wasgibts.kochen", (raw: unknown): Stored | null => {
  if (!raw || typeof raw !== "object" || (raw as Stored).version !== 1) return null;
  const r = raw as Stored;
  const steps: Record<string, number[]> = {};
  for (const [k, v] of Object.entries(r.steps && typeof r.steps === "object" ? r.steps : {})) if (Array.isArray(v)) steps[k] = v.filter((n) => Number.isInteger(n) && n >= 0);
  return { version: 1, date: typeof r.date === "string" ? r.date : "", manualAt: typeof r.manualAt === "number" ? r.manualAt : null, steps };
});

const fresh = (date: string): CookSession => ({ date, manualAt: null, steps: {} });

/** Heutige Sitzung (von gestern Gebliebenes zählt nicht) */
export function loadCooking(today = todayIso()): CookSession {
  const s = store.load();
  return s && s.date === today ? { date: s.date, manualAt: s.manualAt, steps: s.steps } : fresh(today);
}

function save(s: CookSession) {
  store.save({ version: 1, ...s });
}

export function useCooking(today: string): CookSession | undefined {
  const raw = useExternalStore(store.subscribe, store.load, () => undefined);
  if (raw === undefined) return undefined;
  return raw && raw.date === today ? { date: raw.date, manualAt: raw.manualAt, steps: raw.steps } : fresh(today);
}

/** "Ich koche jetzt" – liefert das Zurücknehmen */
export function startCooking(): () => void {
  const before = loadCooking();
  save({ ...before, manualAt: now().getTime() });
  return () => save(before);
}

/** Kochen von Hand beenden (z. B. "Gegessen ✓") */
export function stopCooking(): () => void {
  const before = loadCooking();
  save({ ...before, manualAt: null });
  return () => save(before);
}

/** Schritt abhaken bzw. wieder öffnen */
export function toggleStep(recipe: string, index: number): () => void {
  const before = loadCooking();
  const done = before.steps[recipe] ?? [];
  save({ ...before, steps: { ...before.steps, [recipe]: done.includes(index) ? done.filter((n) => n !== index) : [...done, index].sort((a, b) => a - b) } });
  return () => save(before);
}

/** Aktueller Schritt = der erste nicht abgehakte (null = alle fertig) */
export function currentStep(total: number, done: number[]): number | null {
  for (let i = 0; i < total; i++) if (!done.includes(i)) return i;
  return null;
}

/** "Nächster Schritt": aktuellen abhaken; liefert den neuen aktuellen (oder null = fertig) */
export function nextStep(recipe: string, total: number): { done: number | null; next: number | null; undo: () => void } {
  const before = loadCooking();
  const doneList = before.steps[recipe] ?? [];
  const cur = currentStep(total, doneList);
  if (cur === null) return { done: null, next: null, undo: () => {} };
  const after = [...doneList, cur].sort((a, b) => a - b);
  save({ ...before, steps: { ...before.steps, [recipe]: after } });
  return { done: cur, next: currentStep(total, after), undo: () => save(before) };
}

const NUM: Record<string, number> = { ein: 1, eine: 1, einen: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, zwölf: 12, fünfzehn: 15, zwanzig: 20, dreißig: 30 };

/** Zeitangabe in einem Schritt: "10 Minuten köcheln" → 10, "8–10 Min" → 10, "1 Stunde" → 60 */
export function stepMinutes(step: string): number | null {
  const t = step.toLowerCase();
  const m = t.match(/(\d+)\s*(?:[-–]|bis)\s*(\d+)\s*(min|minute|minuten|std|stunde|stunden)\b/) ?? t.match(/(\d+(?:[.,]\d+)?|[a-zäöüß]+)\s*(min|minute|minuten|std|stunde|stunden)\b/);
  if (!m) return null;
  const unit = m.length === 4 ? m[3] : m[2];
  const raw = m.length === 4 ? m[2] : m[1];
  const n = /\d/.test(raw) ? Number(raw.replace(",", ".")) : NUM[raw];
  if (!n) return null;
  const min = /^st/.test(unit) ? n * 60 : n;
  return min >= 1 && min <= 600 ? min : null;
}

/** Kurzer Name für den Timer aus dem Schritt: "Nudeln 10 Minuten kochen" → "Nudeln kochen" */
export function stepTimerName(step: string): string {
  const words = step
    .replace(/\(.*?\)/g, "")
    .replace(/\d+\s*(?:[-–]|bis)?\s*\d*\s*(min|minute|minuten|std|stunde|stunden)\b\.?/gi, "")
    .replace(/[.,;:!].*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return (words.length > 28 ? `${words.slice(0, 27).trimEnd()}…` : words) || "Schritt";
}
