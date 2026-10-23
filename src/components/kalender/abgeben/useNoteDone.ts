"use client";

// Abgegebene Aufgabe erledigt → kurze Meldung für den Absender („Lisa hat
// ‚Turnbeutel waschen‘ erledigt ✓“; Push, sobald es Push gibt). Vergleicht
// mit dem letzten Stand dieser Sitzung – beim ersten Laden keine Meldungen.

import { useEffect, useRef } from "react";
import { showToast } from "@/lib/core/toast";
import { doneNotes } from "@/lib/kalender/abgeben/model";
import type { CalendarEntry } from "@/lib/kalender/model";
import type { Member } from "@/lib/konten/model";

export function useNoteDone(entries: CalendarEntry[] | undefined, me: string | null, members: Member[]) {
  const before = useRef<CalendarEntry[] | null>(null);
  useEffect(() => {
    if (!entries) return;
    if (before.current && me) for (const text of doneNotes(before.current, entries, me, members)) showToast({ text });
    before.current = entries;
  }, [entries, me, members]);
}
