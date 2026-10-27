"use client";

// Steht die Startseite gerade abends auf morgen? Für Seiten ohne Tagesphase
// (Aufgaben-Seite): Feierabend aus „Feierabend ab“, Termine und das heutige
// Essen – die Regel selbst steht in `kalender/mitwandern.ts`.

import { useMinutes } from "@/lib/core/now";
import { useRoutine } from "@/lib/heute/tagesablauf";
import { mealIsOver, useCookedDays } from "@/lib/essen/mealDone";
import { mealClockFor } from "@/lib/einstellungen/profileFood";
import { dishOf } from "@/components/essen/useMeals";
import { useHomeData } from "@/components/heute/useHomeData";
import { abendsNachUhr } from "@/lib/kalender/mitwandern";
import type { CalendarEntry } from "@/lib/kalender/model";

export function useAbendsMorgen(entries: CalendarEntry[] | null | undefined, heute: string | undefined): boolean {
  const minutes = useMinutes();
  const routine = useRoutine();
  const data = useHomeData();
  const cooked = useCookedDays();
  if (!entries || !heute || minutes === undefined || !routine) return false;
  const day = data?.day;
  const offen = data && day && cooked && dishOf(day) && !mealIsOver(day, data.profile, minutes, cooked);
  return abendsNachUhr({ entries, heute, minutes, feierabendAb: routine.feierabendAb, essenUm: offen ? mealClockFor(data.profile, day.weekday) : null });
}
