"use client";

// Ein Tag zum Nachschauen (Kalender unten und /tag): Abschnitte Termine,
// Aufgaben und Essen (eine Zeile). Leer: "Ein freier Tag."

import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { CARD } from "@/components/ui/styles";
import { DayItemsCard } from "@/components/kalender/Items";
import { itemsForDay, type CalendarEntry } from "@/lib/kalender/model";
import type { PlanDay } from "@/lib/essen/mealPlan";
import { openHelper } from "@/lib/begleitung/open";
import { dishOf } from "@/components/essen/useMeals";
import { TipsDayList, useCalendarTips } from "@/components/tipps/CalendarTips";

export type RoomFilter = "alles" | "familie" | "arbeit";

export function DayAgenda({ date, today, entries, meal, name, filter = "alles", askLabel }: { date: string; today: string; entries: CalendarEntry[]; meal: PlanDay | undefined; name: string; filter?: RoomFilter; askLabel: string }) {
  const items = itemsForDay(entries, date, today).filter((i) => filter === "alles" || i.room === filter);
  const termine = items.filter((i) => i.entry.typ === "termin");
  const aufgaben = items.filter((i) => i.entry.typ === "aufgabe");
  const dish = filter === "arbeit" ? null : dishOf(meal);
  const paused = meal?.paused;
  const tips = useCalendarTips(today).byDay.get(date) ?? [];
  return (
    <div className="flex flex-col gap-3">
      {!items.length && <p className="px-1 text-base text-muted">{paused ? "Pause – genießt die Zeit." : "Ein freier Tag."}</p>}
      <DayItemsCard items={termine} title="Termine" limit={50} allDoneText="Alles erledigt" />
      {filter !== "arbeit" && <TipsDayList tips={tips} />}
      <DayItemsCard items={aufgaben} title="Aufgaben" limit={50} allDoneText="Alles erledigt" titleHref="/aufgaben" linkLabel="Alle" />
      {filter !== "arbeit" && !paused && (
        <section className={`${CARD} flex min-h-14 items-center gap-3 px-4 py-2`} aria-label="Essen">
          <UtensilsCrossed className="h-5 w-5 shrink-0 text-accent" strokeWidth={2} aria-hidden />
          {dish ? (
            <Link href="/?seite=essen" className="min-w-0 flex-1 truncate text-base font-semibold">
              {dish}
            </Link>
          ) : (
            <button type="button" onClick={() => openHelper(undefined, `Was könnten wir ${askLabel} essen?`)} className="min-w-0 flex-1 text-left text-base text-muted">
              Noch frei – <span className="font-semibold text-accent-strong">{name} fragen</span>
            </button>
          )}
        </section>
      )}
    </div>
  );
}
