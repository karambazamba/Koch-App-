// "Ich will doch mal planen": Spontane schalten die Planung frei – nur für
// diese Woche (danach wieder spontan) oder ab jetzt immer.

import { markAsked } from "../core/activity";
import { saveProfile, type HouseholdProfile, type PlanStyle } from "../einstellungen/profile";
import { weekStartFor } from "./weekPlan";

export type UnlockChoice = { kind: "woche" } | { kind: "immer"; style: Exclude<PlanStyle, "spontan"> };

export function unlockPlanning(profile: HouseholdProfile, today: Date, choice: UnlockChoice): { text: string; undo: () => void } {
  const before = profile;
  if (choice.kind === "woche") {
    const weekStart = weekStartFor(today, profile.shoppingDay || "Montag");
    saveProfile({ ...profile, planWeek: weekStart });
    // Fürs sanfte Erkennen: wie oft "nur diese Woche" geplant wurde
    markAsked(`planwoche:${weekStart}`);
    return { text: "Alles klar – der Wochenplan ist diese Woche da. Ab nächster Woche geht's wieder spontan weiter.", undo: () => saveProfile(before) };
  }
  saveProfile({ ...profile, planStyle: choice.style, planWeek: null });
  return {
    text: choice.style === "plan" ? "Gemacht ✓ Ab jetzt mit Wochenplan." : "Gemacht ✓ Ab jetzt mal so, mal so – freie Tage sind ganz normal.",
    undo: () => saveProfile(before),
  };
}

/** "Ich will doch mal planen", "Können wir die Woche planen?" … */
export function isPlanUnlockRequest(text: string): boolean {
  return /\b(doch (mal |lieber )?(planen|vorplanen)|will (mal |doch |lieber )*(planen|vorplanen)|(woche|tage) (vor)?planen|planung (wieder )?(ein|an)|wochenplan (wieder )?(an|ein|zeigen))\b/i.test(text);
}
