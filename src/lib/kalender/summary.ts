// Begrüßung oben auf "Heute". Lottes früherer EIN Satz ist seit v0.29 die
// Jetzt-Karte (`src/lib/jetzt/topics.ts`).

/** "Guten Morgen" (bis 11 Uhr), "Hallo" (bis 18 Uhr), sonst "Guten Abend" */
export function greeting(minutesNow: number): string {
  if (minutesNow < 11 * 60) return "Guten Morgen";
  if (minutesNow < 18 * 60) return "Hallo";
  return "Guten Abend";
}
