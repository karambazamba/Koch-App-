"use client";

// Kleine Änderungen an Terminen/Aufgaben aus der Oberfläche: sofort und still
// (Hinzufügen, Abhaken, Verschieben – nur leichte Vibration). Nur echtes
// Löschen meldet sich kurz mit "Gelöscht · Rückgängig" (3 Sekunden).

import { changeEntries, loadEntries } from "@/lib/aufgaben/store";
import { itemsForDay, type CalendarEntry } from "@/lib/aufgaben/model";
import { triggerAvatar } from "@/lib/core/avatarState";
import { noteUserAction } from "@/lib/core/activity";
import { todayIso } from "@/lib/core/now";
import { showDeleted } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";

/**
 * Änderung anwenden – still. `label` merkt sich das Zurücknehmen für "Mach das
 * rückgängig"; `deleted` = echtes Löschen → kleine Meldung mit Rückgängig.
 */
export function act(change: (entries: CalendarEntry[], stamp: string) => CalendarEntry[], label?: string, opts: { deleted?: boolean } = {}) {
  const today = todayIso();
  const openToday = () => itemsForDay(loadEntries(), today, today).filter((i) => i.entry.typ !== "termin" && !i.done).length;
  const before = openToday();
  const undo = changeEntries(change);
  // Echter Erfolg: die letzte Aufgabe des Tages ist erledigt → der Avatar freut sich (nicht bei jedem Abhaken)
  if (before > 0 && openToday() === 0 && !opts.deleted) triggerAvatar("freuen");
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
