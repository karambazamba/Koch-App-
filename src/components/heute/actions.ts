"use client";

// Kleine Änderungen an Terminen/Aufgaben aus der Oberfläche: sofort und still
// (Hinzufügen, Verschieben – nur leichte Vibration). Abhaken meldet sich kurz
// mit "Erledigt · Rückgängig" (4 Sekunden), echtes Löschen mit "Gelöscht ·
// Rückgängig" (3 Sekunden).

import { changeEntries, loadEntries } from "@/lib/kalender/store";
import { itemsForDay, type CalendarEntry } from "@/lib/kalender/model";
import { triggerAvatar } from "@/lib/core/avatarState";
import { noteUserAction } from "@/lib/core/activity";
import { todayIso } from "@/lib/core/now";
import { showDeleted, showDone } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";

/** Abgehakt: so lange durchgestrichen stehen (nochmal tippen = doch nicht), dann weich weg */
export const LEAVE_MS = 2000;

/**
 * Änderung anwenden – still. `label` merkt sich das Zurücknehmen für "Mach das
 * rückgängig"; `deleted` = echtes Löschen, `done` = abgehakt → kleine Meldung mit Rückgängig.
 */
export function act(change: (entries: CalendarEntry[], stamp: string) => CalendarEntry[], label?: string, opts: { deleted?: boolean; done?: boolean } = {}) {
  const today = todayIso();
  const openToday = () => itemsForDay(loadEntries(), today, today).filter((i) => i.entry.typ !== "termin" && !i.done).length;
  const before = openToday();
  const undo = changeEntries(change);
  // Echter Erfolg: die letzte Aufgabe des Tages ist erledigt → der Avatar freut sich (nicht bei jedem Abhaken)
  if (before > 0 && openToday() === 0 && !opts.deleted) triggerAvatar("freuen");
  noteUserAction(todayIso());
  const registered = label ? pushUndo(label, undo) : undo;
  if (opts.deleted) showDeleted(registered);
  else if (opts.done) showDone(registered);
}

/** Kurzes Antippen spüren (wo möglich; nie ohne Tipp – sonst warnt der Browser) */
export function buzz() {
  try {
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    navigator.vibrate?.(12);
  } catch {
    // ohne Vibration
  }
}
