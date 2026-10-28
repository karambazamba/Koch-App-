"use client";

// Das Gericht von heute für Rezeptseite und Kochmodus (Tafel 122): Datum,
// Plan-Eintrag, Rezept-ID (eigenes oder eingebautes über den Titel), Uhrzeit
// und Personen aus dem Haushalt. Dazu „Gegessen“ – genau wie früher in der
// Koch-Kachel: als gekocht vermerken, Kochen beenden, die Kachel zeigt den
// Vorschlag für morgen; Mia sagt nur einen kurzen Satz.

import { useMinutes } from "@/lib/core/now";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { mealClockFor } from "@/lib/einstellungen/profile";
import { clockLabel } from "@/lib/kalender/answers";
import { tidyMiaText } from "@/lib/begleitung/tidy";
import type { Recipe } from "@/lib/essen/cookbook";
import { rezeptIdFuer } from "@/lib/essen/kochen";
import { endCooking } from "@/lib/essen/kochSession";
import { gegessenSatz } from "@/lib/essen/kochModus";
import { cookableEntry, markCooked, mealIsOver, unmarkCooked, useCookedDays } from "@/lib/essen/mealDone";
import type { PlanDay } from "@/lib/essen/mealPlan";
import { toIsoDate, useToday } from "@/lib/essen/weekPlan";
import { nudgePhase } from "@/lib/heute/nudge";
import { useMeals } from "@/components/essen/useMeals";

export type HeuteGericht = {
  date: string;
  day: PlanDay;
  entry: { title: string; recipeId?: string };
  /** Rezept dazu: eigenes bzw. eingebautes über den Titel */
  recipeId: string | null;
  clock: string;
  persons: number | null;
  /** Schon gegessen (von Hand oder nach Essenszeit + 90 Min) */
  over: boolean;
};

/** `undefined` = lädt, `null` = heute nichts geplant */
export function useHeuteGericht(): HeuteGericht | null | undefined {
  const today = useToday();
  const iso = today ? toIsoDate(today) : undefined;
  const meals = useMeals(iso, 1);
  const profile = useProfile();
  const cooked = useCookedDays();
  const minutes = useMinutes();
  if (!iso || !meals || profile === undefined || !cooked || minutes === undefined) return undefined;
  const day = meals.get(iso);
  const entry = cookableEntry(day);
  if (!day || !entry || !profile) return null;
  return {
    date: iso,
    day,
    entry,
    recipeId: entry.recipeId ?? rezeptIdFuer(entry.title),
    clock: clockLabel(mealClockFor(profile, day.weekday)),
    persons: day.persons,
    over: mealIsOver(day, profile, minutes, cooked),
  };
}

/** „Gegessen“: für heute erledigt (Mia kann es rückgängig machen), ein kurzer Satz */
export function gegessen(h: HeuteGericht, recipes: Record<string, Recipe>) {
  markCooked(h.date, h.entry, recipes, { how: "marked" });
  const undoCook = endCooking(h.recipeId);
  pushUndo("„Gegessen“", () => {
    unmarkCooked(h.date);
    undoCook();
  });
  nudgePhase();
  showToast({ text: tidyMiaText(gegessenSatz(h.persons)), small: true });
}
