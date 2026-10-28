"use client";

// Aufgaben-Seite: Ist gerade Feierabend, und ruht die Arbeit (Tagesablauf im
// Profil, Arbeit-Termine von heute)? Die Regel selbst steht in
// `heute/phases.ts` (`arbeitRuht`, `istFeierabend`) – gleich wie auf der Startseite.

import { useMinutes } from "@/lib/core/now";
import { useRoutine } from "@/lib/heute/tagesablauf";
import { arbeitRuht, arbeitsEnde, istFeierabend } from "@/lib/heute/phases";
import { itemsForDay, weekdayIndex, type CalendarEntry } from "@/lib/kalender/model";

export function useArbeitRuht(entries: CalendarEntry[] | null | undefined, heute: string | undefined): { ruht: boolean; feierabend: boolean } {
  const minutes = useMinutes();
  const routine = useRoutine();
  if (!entries || !heute || minutes === undefined || !routine) return { ruht: false, feierabend: false };
  const ctx = { minutes, weekday: weekdayIndex(heute), routine, workEnd: arbeitsEnde(itemsForDay(entries, heute, heute)) };
  return { ruht: arbeitRuht(ctx), feierabend: istFeierabend(ctx) };
}
