// Der Mia-Knopf macht beim Runterscrollen Platz (Tafel 67/68, „Weniger Mia“):
// ab etwas Abstand nach oben und bei echtem Runterscrollen gleitet er weg,
// beim Hochscrollen bzw. nach kurzer Ruhe (REST_MS) kommt er zurück. Rein,
// damit Knopf und Tests gleich rechnen.

/** Nach so viel Ruhe ist der Knopf wieder da */
export const REST_MS = 600;
const TOP = 80;
const STEP = 6;

/** Ob der Knopf nach einer Scroll-Bewegung von `from` nach `to` weg ist */
export function knopfAway(away: boolean, from: number, to: number): boolean {
  if (to <= TOP) return false;
  if (to - from > STEP) return true;
  if (from - to > STEP) return false;
  return away;
}
