"use client";

import { effectivePlanStyle, type PlanStyle } from "./profile";
import { useProfile } from "./useProfile";
import { useToday, weekStartFor } from "./weekPlan";

/**
 * Welcher Planstil gilt heute (Spontan mit "nur diese Woche planen" → "mix")
 * und ob Planung sichtbar ist. `undefined` = lädt.
 */
export function usePlanStyle(): { style: PlanStyle; planning: boolean; weekStart: string } | undefined {
  const profile = useProfile();
  const today = useToday();
  if (profile === undefined || !today) return undefined;
  const weekStart = weekStartFor(today, profile?.shoppingDay || "Montag");
  const style = effectivePlanStyle(profile, weekStart);
  return { style, planning: style !== "spontan", weekStart };
}
