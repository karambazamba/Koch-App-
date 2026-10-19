"use client";

// Kleine Änderungen an Terminen/Aufgaben aus der Oberfläche: sofort
// erledigen, kurz melden, "Rückgängig" im Toast.

import { changeEntries } from "@/lib/aufgaben/store";
import type { CalendarEntry } from "@/lib/aufgaben/model";
import { noteUserAction } from "@/lib/core/activity";
import { todayIso } from "@/lib/core/now";
import { showToast } from "@/lib/core/toast";

/** Änderung anwenden und mit Rückgängig melden (ohne Text: still) */
export function act(change: (entries: CalendarEntry[], stamp: string) => CalendarEntry[], text?: string) {
  const undo = changeEntries(change);
  noteUserAction(todayIso());
  if (text) showToast({ text, undo, undoneText: "Rückgängig gemacht." });
}

/** Kurzes Antippen spüren (wo möglich) */
export function buzz() {
  try {
    navigator.vibrate?.(12);
  } catch {
    // ohne Vibration
  }
}
