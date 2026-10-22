"use client";

// Eigene Termine und Aufgaben plus die Termine der Kalender-Links (nur lesen)
// – für alles, was anzeigt oder beantwortet (Heute, Kalender, Wetter-Tipp,
// Jetzt-Karte, Begleitung). Ändern geht nur über die eigenen (`store.ts`).

import { useMemo } from "react";
import { loadEntries, useEntries } from "@/lib/kalender/store";
import { loadAboEntries, useAboEntries } from "@/lib/kalender/abo/store";
import type { CalendarEntry } from "@/lib/kalender/model";

export function useCalendarEntries(): CalendarEntry[] | undefined {
  const own = useEntries();
  const abo = useAboEntries();
  return useMemo(() => (own === undefined ? undefined : abo.length ? [...own, ...abo] : own), [own, abo]);
}

export function loadCalendarEntries(): CalendarEntry[] {
  const abo = loadAboEntries();
  return abo.length ? [...loadEntries(), ...abo] : loadEntries();
}
