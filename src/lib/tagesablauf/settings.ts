// Tagesablauf (`wasgibts.tagesablauf` v1): Zeiten der Phasen, Arbeitstage,
// Kochen-Modus und "Ruhe nach Feierabend" (Arbeit und Aufgaben machen Pause,
// keine Push dazu). Den früheren Modus "Mitdenkend/Immer gleich" gibt es seit
// v0.29 nicht mehr – die Kachel-Anordnung ändert sich nie von selbst; ein
// gespeichertes `mode` wird still übergangen. Dazu die Zeit-Vorschau "So tun,
// als wäre es …" (nur diese Sitzung, ändert keine Daten – sie wirkt nur auf
// die Startseite).

import { createLocalStore } from "../core/localStore";
import { useExternalStore } from "../core/useExternalStore";
import type { StorageKey } from "@/lib/core/storage";

export type DayRoutine = {
  /** Ruhe nach Feierabend: im Feierabend keine Push zu Arbeit und Aufgaben */
  ruhe: boolean;
  /** Morgen-Phase bis "HH:MM" */
  morgenBis: string;
  /** Feierabend ab "HH:MM" */
  feierabendAb: string;
  /** … aber frühestens nach dem letzten Arbeit-Termin des Tages */
  nachArbeit: boolean;
  /** Arbeitstage (0 = Mo … 6 = So) */
  arbeitstage: number[];
  /** Kochen-Modus automatisch vor der Essenszeit */
  kochenAuto: boolean;
  /** … so viele Minuten vorher */
  kochenMin: number;
};

export const DEFAULT_ROUTINE: DayRoutine = {
  ruhe: true,
  morgenBis: "10:00",
  feierabendAb: "20:00",
  nachArbeit: true,
  arbeitstage: [0, 1, 2, 3, 4, 5, 6],
  kochenAuto: true,
  kochenMin: 20,
};

export const WEEKDAY_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
export const clockMinutes = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));

/** Gespeicherte Werte prüfen (Unbekanntes → Standard) */
function sanitizeRoutine(raw: unknown): DayRoutine {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<DayRoutine>;
  const days = Array.isArray(r.arbeitstage) ? [...new Set(r.arbeitstage.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : DEFAULT_ROUTINE.arbeitstage;
  const min = Number(r.kochenMin);
  return {
    ruhe: r.ruhe !== false,
    morgenBis: typeof r.morgenBis === "string" && CLOCK.test(r.morgenBis) ? r.morgenBis : DEFAULT_ROUTINE.morgenBis,
    feierabendAb: typeof r.feierabendAb === "string" && CLOCK.test(r.feierabendAb) ? r.feierabendAb : DEFAULT_ROUTINE.feierabendAb,
    nachArbeit: r.nachArbeit !== false,
    arbeitstage: days,
    kochenAuto: r.kochenAuto !== false,
    kochenMin: Number.isFinite(min) && min >= 5 && min <= 90 ? Math.round(min) : DEFAULT_ROUTINE.kochenMin,
  };
}

type RoutineStore = { version: 1; routine: DayRoutine };

const store = createLocalStore("wasgibts.tagesablauf", (raw: unknown): RoutineStore | null => {
  if (!raw || typeof raw !== "object" || (raw as RoutineStore).version !== 1) return null;
  return { version: 1, routine: sanitizeRoutine((raw as RoutineStore).routine) };
});

export const loadRoutine = (): DayRoutine => store.load()?.routine ?? DEFAULT_ROUTINE;

function saveRoutine(routine: DayRoutine) {
  store.save({ version: 1, routine: sanitizeRoutine(routine) });
}

/** Teil ändern; liefert das Zurücknehmen */
export function changeRoutine(patch: Partial<DayRoutine>): () => void {
  const before = loadRoutine();
  saveRoutine({ ...before, ...patch });
  return () => saveRoutine(before);
}

export function useRoutine(): DayRoutine | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data?.routine ?? DEFAULT_ROUTINE);
}

// --- Zeit-Vorschau ("So tun, als wäre es …") – nur diese Sitzung --------------------

export type TimePreview = { clock: string; weekday: number | null };

const PREVIEW_KEY: StorageKey = "wasgibts.zeitvorschau";
const previewListeners = new Set<() => void>();
let previewRaw: string | null | undefined;
let previewValue: TimePreview | null = null;

function loadPreview(): TimePreview | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(PREVIEW_KEY);
  } catch {
    raw = null;
  }
  if (raw === previewRaw) return previewValue;
  previewRaw = raw;
  previewValue = null;
  try {
    const p = raw ? (JSON.parse(raw) as TimePreview) : null;
    if (p && typeof p.clock === "string" && CLOCK.test(p.clock)) previewValue = { clock: p.clock, weekday: Number.isInteger(p.weekday) && p.weekday! >= 0 && p.weekday! <= 6 ? p.weekday : null };
  } catch {
    previewValue = null;
  }
  return previewValue;
}

export function setPreview(preview: TimePreview | null) {
  try {
    if (preview) sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(preview));
    else sessionStorage.removeItem(PREVIEW_KEY);
  } catch {
    // ohne Speicher keine Vorschau
  }
  previewListeners.forEach((l) => l());
}

export function usePreview(): TimePreview | null {
  return useExternalStore(
    (l) => {
      previewListeners.add(l);
      return () => previewListeners.delete(l);
    },
    loadPreview,
    () => null,
  );
}

/** "Sa 18:20" bzw. "18:20" */
export const previewLabel = (p: TimePreview) => `${p.weekday !== null ? `${WEEKDAY_SHORT[p.weekday]} ` : ""}${p.clock}`;
