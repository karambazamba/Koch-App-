// Sanft automatisch erkennen: Wer gern plant, aber 3 Wochen kaum geplant hat,
// wird EINMAL gefragt, ob die Planung ausgeblendet werden soll – und
// umgekehrt. Nie automatisch umstellen. Rein, damit es testbar ist.

import type { StoredEntry } from "./mealPlan";
import { addDays, fromIsoDate, weekStartFor, weekdayName } from "./weekPlan";

/** Selbst geplante Tage (nicht aus den Ideen gewählt) im Zeitraum [from, to] */
export function plannedDays(mealPlans: Record<string, Record<string, StoredEntry>>, shoppingDay: string, from: string, to: string): number {
  let count = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const start = weekStartFor(new Date(`${d}T12:00:00`), shoppingDay);
    const e = mealPlans[start]?.[weekdayName(fromIsoDate(d))];
    if (e && (e.kind === "wish" || ((e.kind === "recipe" || e.kind === "text") && !e.spontan))) count++;
  }
  return count;
}

/** "Plane gern", aber in den letzten 3 Wochen höchstens 2 Tage selbst geplant (und die App ist schon so lange da) */
export function plansRarely(mealPlans: Record<string, Record<string, StoredEntry>>, shoppingDay: string, today: string, since: string | undefined): boolean {
  if (!since || since > addDays(today, -21)) return false;
  return plannedDays(mealPlans, shoppingDay, addDays(today, -21), addDays(today, -1)) <= 2;
}

/**
 * "Spontan", plant aber öfter selbst: mindestens 2× "nur diese Woche planen"
 * in den letzten 6 Wochen (Schlüssel `planwoche:<Wochenstart>` im Aktivitäts-Speicher).
 */
export function plansOften(asked: Record<string, true>, today: string): boolean {
  const from = addDays(today, -42);
  return Object.keys(asked).filter((k) => k.startsWith("planwoche:") && k.slice(10) >= from).length >= 2;
}
