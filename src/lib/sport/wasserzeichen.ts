// Wasserzeichen der Sport-Kachel (Tafel 124 A, rein): welches Linien-Symbol
// groß und still unten rechts steht. Sportart des nächsten Trainings, sonst
// des letzten, sonst der Laufschuh. Unbekannte eigene Sportarten bekommen in
// `SportIcon` das allgemeine Bewegungs-Symbol.

import { sportOfTitle } from "@/lib/sport/plan";

/** Schlüssel für den Laufschuh (wenn noch nichts geplant oder trainiert ist) */
export const LAUFSCHUH = "laufschuh";

/**
 * `next` = Titel des nächsten geplanten Trainings (oder null), `recent` =
 * Sportarten der letzten Trainings, neueste zuerst.
 */
export function wasserzeichenSport(next: string | null, recent: readonly string[]): string {
  if (next) return sportOfTitle(next);
  return recent[0] ?? LAUFSCHUH;
}
