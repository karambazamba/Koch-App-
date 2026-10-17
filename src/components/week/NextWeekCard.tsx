"use client";

import Link from "next/link";
import { useProfile } from "@/lib/useProfile";
import {
  DEFAULT_SHOPPING_DAY,
  formatWeekRange,
  planningWeekStart,
  useToday,
  useWeekPlan,
} from "@/lib/weekPlan";

/**
 * Wochen-Check-Karte auf der Startseite:
 * - bis 2 Tage vor dem nächsten Einkaufstag "diese Woche": ohne Vorgaben
 *   "Diese Woche planen", mit Vorgaben ausgeblendet (Status steht in der
 *   Wochenplan-Kachel);
 * - danach "Nächste Woche planen" bzw. "Nächste Woche steht ✓".
 */
export function NextWeekCard() {
  const today = useToday();
  const profile = useProfile();
  const target =
    today && profile !== undefined
      ? planningWeekStart(today, profile?.shoppingDay ?? DEFAULT_SHOPPING_DAY)
      : undefined;
  const plan = useWeekPlan(target?.weekStart);

  if (!target || plan === undefined) return null;
  const { weekStart, isNext } = target;
  const range = formatWeekRange(weekStart);
  // Ohne ?woche= öffnet der Wochen-Check genau diese Woche und führt danach
  // zurück zur Startseite.
  const href = "/woche/check";

  if (plan) {
    if (!isNext) return null;
    return (
      <Link
        href={href}
        className="flex items-center gap-4 rounded-3xl bg-emerald-100 p-5 text-emerald-900 shadow-sm active:scale-[0.98]"
      >
        <span className="text-4xl" aria-hidden>
          ✅
        </span>
        <span className="flex-1">
          <span className="block text-lg font-extrabold">Nächste Woche steht ✓</span>
          <span className="block text-sm">
            <span className="whitespace-nowrap">{range}</span> · Tippen zum Ändern
          </span>
        </span>
      </Link>
    );
  }

  return (
    <section className="rounded-3xl bg-orange-500 p-5 text-white shadow-md">
      <h2 className="text-xl font-extrabold">
        📅 {isNext ? "Nächste Woche planen" : "Diese Woche planen"}
      </h2>
      <p className="mt-1 text-lg">
        Kurzer Wochen-Check für <span className="whitespace-nowrap">{range}</span>: Ausflüge,
        Fleisch/Veggie/Fisch, Budget.
      </p>
      <Link
        href={href}
        className="mt-4 flex h-14 items-center justify-center rounded-2xl bg-white text-lg font-extrabold text-orange-600 active:scale-95"
      >
        Zum Wochen-Check
      </Link>
    </section>
  );
}
