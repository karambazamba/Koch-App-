"use client";

// Einmal im Layout (über KitchenHelper): Meldung, wenn eine abgegebene Aufgabe
// erledigt wurde, und einmalig der leise Hinweis, dass Aufgaben jetzt
// persönlich sind (Tafel 52 B). Ohne Konto bzw. allein im Haushalt passiert nichts.

import { useEffect } from "react";
import { showToast } from "@/lib/core/toast";
import { hintSeen, markHintSeen } from "@/lib/core/hints";
import { useEntries } from "@/lib/kalender/store";
import { useCachedAccount } from "@/lib/konten/cache";
import { useNoteDone } from "@/components/kalender/abgeben/useNoteDone";

export function DoneNotes() {
  const household = useCachedAccount().household;
  useNoteDone(useEntries(), household?.me.userId ?? null, household?.members ?? []);
  const shared = (household?.members.length ?? 0) > 1;
  useEffect(() => {
    if (!shared || hintSeen("aufgaben-persoenlich")) return;
    markHintSeen("aufgaben-persoenlich");
    showToast({ text: "Aufgaben sind jetzt nur für dich – abgeben geht mit einem Tipp.", seconds: 6 });
  }, [shared]);
  return null;
}
