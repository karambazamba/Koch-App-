"use client";

import Link from "next/link";
import { formatWeekRange, isPlanningTime, nextMonday, useToday, useWeekPlan } from "@/lib/weekPlan";

/**
 * Startseite, Freitag bis Montag: Aufforderung, die nächste Woche zu planen –
 * oder Bestätigung, dass die Vorgaben schon stehen.
 */
export function NextWeekCard() {
  const today = useToday();
  const weekStart = today ? nextMonday(today) : undefined;
  const plan = useWeekPlan(weekStart);

  if (!today || !weekStart || plan === undefined || !isPlanningTime(today)) return null;

  const range = formatWeekRange(weekStart);

  if (plan) {
    return (
      <Link
        href="/woche/check"
        className="flex items-center gap-4 rounded-3xl bg-emerald-100 p-5 text-emerald-900 shadow-sm active:scale-[0.98]"
      >
        <span className="text-4xl" aria-hidden>
          ✅
        </span>
        <span className="flex-1">
          <span className="block text-lg font-extrabold">Vorgaben für nächste Woche stehen ✓</span>
          <span className="block text-sm">
            <span className="whitespace-nowrap">{range}</span> · Tippen zum Ändern
          </span>
        </span>
      </Link>
    );
  }

  return (
    <section className="rounded-3xl bg-orange-500 p-5 text-white shadow-md">
      <h2 className="text-xl font-extrabold">📅 Nächste Woche planen</h2>
      <p className="mt-1 text-lg">
        Kurzer Wochen-Check für <span className="whitespace-nowrap">{range}</span>: Ausflüge,
        Fleisch/Veggie/Fisch, Budget.
      </p>
      <Link
        href="/woche/check"
        className="mt-4 flex h-14 items-center justify-center rounded-2xl bg-white text-lg font-extrabold text-orange-600 active:scale-95"
      >
        Zum Wochen-Check
      </Link>
    </section>
  );
}
