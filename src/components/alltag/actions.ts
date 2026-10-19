"use client";

// Kleine Änderungen an Terminen/Aufgaben aus der Oberfläche: sofort und still
// (Hinzufügen, Abhaken, Verschieben – nur leichte Vibration). Nur echtes
// Löschen meldet sich kurz mit "Gelöscht · Rückgängig" (3 Sekunden).

import { changeEntries } from "@/lib/aufgaben/store";
import type { CalendarEntry } from "@/lib/aufgaben/model";
import { noteUserAction } from "@/lib/core/activity";
import { todayIso } from "@/lib/core/now";
import { showDeleted } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";

/**
 * Änderung anwenden – still. `label` merkt sich das Zurücknehmen für "Mach das
 * rückgängig"; `deleted` = echtes Löschen → kleine Meldung mit Rückgängig.
 */
export function act(change: (entries: CalendarEntry[], stamp: string) => CalendarEntry[], label?: string, opts: { deleted?: boolean } = {}) {
  const undo = changeEntries(change);
  noteUserAction(todayIso());
  const registered = label ? pushUndo(label, undo) : undo;
  if (opts.deleted) showDeleted(registered);
}

/** Kurzes Antippen spüren (wo möglich) */
export function buzz() {
  try {
    navigator.vibrate?.(12);
  } catch {
    // ohne Vibration
  }
}
