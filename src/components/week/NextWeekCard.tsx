"use client";

import Link from "next/link";
import { CalendarCheck, ClipboardList } from "lucide-react";
import { IconBadge } from "@/components/ui/IconBadge";
import { ListRow } from "@/components/ui/ListRow";
import { CARD, buttonClass } from "@/components/ui/styles";
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
      <div className={CARD}>
        <ListRow
          href={href}
          icon={CalendarCheck}
          title="Nächste Woche steht ✓"
          subtitle={
            <>
              <span className="whitespace-nowrap">{range}</span> · Tippen zum Ändern
            </>
          }
        />
      </div>
    );
  }

  return (
    <section className={`${CARD} p-5`}>
      <div className="flex items-center gap-3">
        <IconBadge icon={ClipboardList} />
        <h2 className="text-lg font-bold">{isNext ? "Nächste Woche planen" : "Diese Woche planen"}</h2>
      </div>
      <p className="mt-3 text-base text-muted">
        Kurzer Wochen-Check für <span className="whitespace-nowrap">{range}</span>: Ausflüge,
        Fleisch/Veggie/Fisch, Budget.
      </p>
      <Link href={href} className={`${buttonClass("primary")} mt-4 w-full`}>
        Zum Wochen-Check
      </Link>
    </section>
  );
}
