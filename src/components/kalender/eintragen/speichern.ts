"use client";

// Speichern aus den Fenstern „Neue Aufgabe“/„Neuer Termin“: Neues meldet sich
// mit „Steht drin · Rückgängig“ (auch „Mach das rückgängig“ bei Mia),
// Geändertes still (Rückgängig über Mia).

import { nowIso, todayIso } from "@/lib/core/now";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { noteUserAction } from "@/lib/core/activity";
import { sanitizeEntry, upsertEntry, type CalendarEntry } from "@/lib/kalender/model";
import { changeEntries } from "@/lib/kalender/store";
import { act, buzz } from "@/components/heute/actions";

/** Speichert; `false` = ungültig (nichts passiert) */
export function eintragSpeichern(entries: CalendarEntry[], neu: boolean): boolean {
  const clean = entries.map((e) => sanitizeEntry({ ...e, geaendert: nowIso() })).filter((e): e is CalendarEntry => e !== null);
  if (!clean.length) return false;
  const title = clean.map((e) => e.data.title).join(", ");
  if (!neu) {
    act((list) => clean.reduce(upsertEntry, list), title);
    return true;
  }
  const undo = changeEntries((list) => clean.reduce(upsertEntry, list));
  buzz();
  noteUserAction(todayIso());
  showToast({ text: "Steht drin", undo: pushUndo(`Eingetragen: ${title}`, undo), undoneText: "Wieder weg", seconds: 4, small: true });
  return true;
}
