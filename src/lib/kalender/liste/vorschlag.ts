// „Mia nervt nie“: Liegen viele Aufgaben ohne Datum herum (meist nach dem
// Einfügen einer großen Liste), schlägt die Aufgaben-Seite höchstens einmal
// pro Woche drei davon für diese Woche vor – nicht in den ersten 3 Tagen nach
// dem Einfügen. „Übernehmen“ legt sie in „diese Woche“, „Nicht jetzt“ =
// Ruhe bis nächste Woche. Kein Zähler, kein Druck.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { addDays } from "@/lib/core/now";
import { sortBy, TASK_SUGGEST, via } from "@/lib/core/sort";
import { isUrgent, mondayOf, taskOverview, type CalendarEntry, type DayItem } from "@/lib/kalender/model";

/** Ab so vielen Aufgaben ohne Datum lohnt ein Vorschlag */
const AB = 8;

export type VorschlagState = { version: 1; weekOff?: string };

export function migrateVorschlag(raw: unknown): VorschlagState | null {
  if (!raw || typeof raw !== "object" || (raw as VorschlagState).version !== 1) return null;
  const w = (raw as VorschlagState).weekOff;
  return { version: 1, ...(typeof w === "string" && /^\d{4}-\d{2}-\d{2}$/.test(w) ? { weekOff: w } : {}) };
}

/** Drei Aufgaben ohne Datum (dringende, dann die ältesten) – oder null */
export function wochenVorschlag(entries: CalendarEntry[], today: string, state: VorschlagState): DayItem[] | null {
  if (state.weekOff === mondayOf(today)) return null;
  const undated = taskOverview(entries, today).irgendwann;
  if (undated.length < AB) return null;
  // Nicht in den ersten 3 Tagen: erst, wenn genug davon schon 3 Tage liegen
  const settled = undated.filter((i) => i.entry.erstellt.slice(0, 10) <= addDays(today, -3));
  if (settled.length < AB) return null;
  return sortBy(settled, ...via((i: DayItem) => ({ urgent: isUrgent(i), erstellt: i.entry.erstellt }), TASK_SUGGEST)).slice(0, 3);
}

/** Gewählte Aufgaben in „diese Woche“ legen (rein) */
export function inDieseWoche(entries: CalendarEntry[], ids: string[], today: string, stamp: string): CalendarEntry[] {
  const week = mondayOf(today);
  return entries.map((e) => (e.typ === "aufgabe" && ids.includes(e.id) ? { ...e, data: { ...e.data, week }, geaendert: stamp } : e));
}

const store = createLocalStore("wasgibts.aufgabenvorschlag", migrateVorschlag);
const EMPTY: VorschlagState = { version: 1 };

/** Diese Woche nicht mehr fragen */
export const vorschlagRuhe = (today: string) => store.save({ version: 1, weekOff: mondayOf(today) });

export function useVorschlagState(): VorschlagState | undefined {
  const s = useExternalStore(store.subscribe, store.load, () => undefined);
  return s === undefined ? undefined : (s ?? EMPTY);
}
