"use client";

// Eigene Termine und Aufgaben plus die Termine der Kalender-Links (nur lesen)
// – für alles, was anzeigt oder beantwortet (Heute, Kalender, Wetter-Tipp,
// Jetzt-Karte, Begleitung). Ändern geht nur über die eigenen (`store.ts`).
// Aufgaben sind persönlich (Tafel 52 B): nur meine und die mir gegebenen;
// abgegebene stehen leise unter „Abgegeben“ (Aufgaben-Seite).

import { useMemo } from "react";
import { loadEntries, useEntries } from "@/lib/kalender/store";
import { loadAboEntries, useAboEntries } from "@/lib/kalender/abo/store";
import type { CalendarEntry } from "@/lib/kalender/model";
import { isMyTask } from "@/lib/kalender/abgeben/model";
import { myUserId, useCachedAccount } from "@/lib/konten/cache";

export function useCalendarEntries(): CalendarEntry[] | undefined {
  const all = useEntries();
  const me = useCachedAccount().household?.me.userId ?? null;
  const abo = useAboEntries();
  return useMemo(() => {
    if (all === undefined) return undefined;
    const own = me ? all.filter((e) => isMyTask(e, me)) : all;
    return abo.length ? [...own, ...abo] : own;
  }, [all, abo, me]);
}

export function loadCalendarEntries(): CalendarEntry[] {
  const abo = loadAboEntries();
  const me = myUserId();
  const own = me ? loadEntries().filter((e) => isMyTask(e, me)) : loadEntries();
  return abo.length ? [...own, ...abo] : own;
}
