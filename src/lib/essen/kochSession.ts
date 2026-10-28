// Kochen (`wasgibts.kochen` v2, pro Gerät, gilt nur für heute – von gestern
// Gebliebenes verfällt still): von Hand gestartet ("Ich koche jetzt"), welche
// Rezept-Schritte abgehakt bzw. auf der Rezeptseite durchgestrichen sind,
// wo der Kochmodus steht (Tafel 122: ✕ merkt sich den Schritt) und welche
// Zutaten abgehakt sind. Dazu rein: Schritte mit Zeitangabe erkennen
// ("10 Minuten köcheln" → ⏱) und den aktuellen Schritt bestimmen.
// v1 → v2: `at` und `zutaten` kommen leer dazu (nichts geht verloren).

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { now, todayIso } from "@/lib/core/now";

type CookSession = {
  date: string;
  /** Von Hand gestartet (ms) */
  manualAt: number | null;
  /** Abgehakte (bzw. durchgestrichene) Schritte je Rezept */
  steps: Record<string, number[]>;
  /** Kochmodus je Rezept: 0 = Zutaten, 1…n = Schritt (Tafel 122) */
  at: Record<string, number>;
  /** Abgehakte Zutaten je Rezept (Zutaten-IDs) */
  zutaten: Record<string, string[]>;
};

type Stored = { version: 2 } & CookSession;

const record = <T>(raw: unknown, ok: (v: unknown) => v is T): Record<string, T> => {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(raw && typeof raw === "object" ? raw : {})) if (ok(v)) out[k] = v;
  return out;
};
const isStepList = (v: unknown): v is number[] => Array.isArray(v);
const isIndex = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
const isIdList = (v: unknown): v is string[] => Array.isArray(v);

/** @public (Tests: Migration v1 → v2) */
export function migrateCooking(raw: unknown): Stored | null {
  const version = raw && typeof raw === "object" ? (raw as { version?: unknown }).version : null;
  if (version !== 1 && version !== 2) return null;
  const r = raw as Partial<Stored>;
  const steps = record(r.steps, isStepList);
  for (const k of Object.keys(steps)) steps[k] = steps[k].filter((n) => Number.isInteger(n) && n >= 0);
  const zutaten = record(r.zutaten, isIdList);
  for (const k of Object.keys(zutaten)) zutaten[k] = zutaten[k].filter((x) => typeof x === "string");
  return {
    version: 2,
    date: typeof r.date === "string" ? r.date : "",
    manualAt: typeof r.manualAt === "number" ? r.manualAt : null,
    steps,
    at: record(r.at, isIndex),
    zutaten,
  };
}

const store = createLocalStore("wasgibts.kochen", migrateCooking);

const fresh = (date: string): CookSession => ({ date, manualAt: null, steps: {}, at: {}, zutaten: {} });
const sessionOf = (s: Stored): CookSession => ({ date: s.date, manualAt: s.manualAt, steps: s.steps, at: s.at, zutaten: s.zutaten });

/** Heutige Sitzung (von gestern Gebliebenes zählt nicht) */
export function loadCooking(today = todayIso()): CookSession {
  const s = store.load();
  return s && s.date === today ? sessionOf(s) : fresh(today);
}

function save(s: CookSession) {
  store.save({ version: 2, ...s });
}

export function useCooking(today: string): CookSession | undefined {
  const raw = useExternalStore(store.subscribe, store.load, () => undefined);
  if (raw === undefined) return undefined;
  return raw && raw.date === today ? sessionOf(raw) : fresh(today);
}

/** Kochmodus: wo er steht (✕ merkt sich den Schritt, nur heute) */
export function setCookAt(recipe: string, step: number): void {
  const before = loadCooking();
  if (before.at[recipe] === step) return;
  save({ ...before, at: { ...before.at, [recipe]: Math.max(0, Math.round(step)) } });
}

/** „Gegessen“: Kochen vorbei – Kochmodus-Stand und Start weg (Schritte bleiben bis morgen); liefert das Zurücknehmen */
export function endCooking(recipe: string | null): () => void {
  const before = loadCooking();
  const at = { ...before.at };
  if (recipe) delete at[recipe];
  save({ ...before, manualAt: null, at });
  return () => save(before);
}

/** Zutat abhaken bzw. wieder zurück (nur heute) */
export function toggleZutat(recipe: string, id: string): void {
  const before = loadCooking();
  const list = before.zutaten[recipe] ?? [];
  save({ ...before, zutaten: { ...before.zutaten, [recipe]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] } });
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

/** Kochmodus: alle Schritte vor `index` gelten als erledigt (die Koch-Kachel zeigt „Schritt 3 von 6“) */
export function markStepsBefore(recipe: string, index: number): void {
  const before = loadCooking();
  const done = Array.from({ length: Math.max(0, index) }, (_, i) => i);
  const old = before.steps[recipe] ?? [];
  if (old.length === done.length && old.every((n, i) => n === done[i])) return;
  save({ ...before, steps: { ...before.steps, [recipe]: done } });
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
