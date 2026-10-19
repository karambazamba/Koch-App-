"use client";

// Seite "Woche": Filter Alles · Familie · Arbeit, Tageskarten ab heute
// (scrollbar in die nächsten Wochen). Links Wochentag + Datum groß, rechts
// Einträge mit Punkt und Uhrzeit, darunter das Essen. Heute umrandet, leere
// Tage "frei". Antippen öffnet den Tag; Plus = neuer Eintrag.

import Link from "next/link";
import { useState } from "react";
import { CircleCheck, NotebookPen, Plus } from "lucide-react";
import { Segmented } from "@/components/ui/Segmented";
import { CARD, buttonClass } from "@/components/ui/styles";
import { clockLabel } from "@/lib/aufgaben/answers";
import { itemsForDay, weekdayShort, type CalendarEntry } from "@/lib/aufgaben/model";
import { addDays } from "@/lib/core/now";
import { dishOf, useMeals } from "./useMeals";
import { roomBar } from "./Items";
import { TerminQuickAdd } from "./TerminQuickAdd";
import { useWorkRoom } from "@/lib/einstellungen/welcomeStore";

type Filter = "alles" | "familie" | "arbeit";
const STEP = 14;

export function WeekPage({ today, entries }: { today: string; entries: CalendarEntry[] }) {
  const [filter, setFilter] = useState<Filter>("alles");
  const [days, setDays] = useState(STEP);
  const [adding, setAdding] = useState(false);
  const meals = useMeals(today, days);
  const dates = Array.from({ length: days }, (_, i) => addDays(today, i));
  // Filter nur, wenn es "Arbeit" gibt (im Kennenlernen gewählt oder schon Einträge)
  const work = useWorkRoom() || entries.some((e) => e.raum === "arbeit");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          {work && (
            <Segmented
              label="Filter"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "alles", label: "Alles" },
                { value: "familie", label: "Familie" },
                { value: "arbeit", label: "Arbeit" },
              ]}
            />
          )}
        </div>
        <button type="button" onClick={() => setAdding(true)} aria-label="Neuer Termin" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-sm active:scale-95">
          <Plus className="h-5 w-5" strokeWidth={2.75} aria-hidden />
        </button>
      </div>
      <ol className="flex flex-col gap-2.5" aria-label="Die nächsten Tage">
        {dates.map((date) => {
          const items = itemsForDay(entries, date, today).filter((i) => !i.done && (filter === "alles" || i.room === filter));
          const dish = filter === "arbeit" ? null : dishOf(meals?.get(date));
          const isToday = date === today;
          return (
            <li key={date}>
              <Link
                href={`/tag?datum=${date}`}
                className={`${CARD} flex gap-4 p-3.5 ${isToday ? "border-2 border-accent" : ""}`}
                aria-label={`${weekdayShort(date)} ${Number(date.slice(8))}.${isToday ? " (heute)" : ""}`}
                aria-current={isToday ? "date" : undefined}
              >
                <span className="flex w-11 shrink-0 flex-col items-center">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isToday ? "text-accent-strong" : "text-muted"}`}>{weekdayShort(date)}</span>
                  <span className="text-[26px] font-extrabold leading-tight">{Number(date.slice(8))}</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                  {meals?.get(date)?.paused ? <span className="text-base text-muted">Pause ☀️</span> : items.length === 0 && !dish && <span className="text-base text-muted">frei</span>}
                  {items.slice(0, 4).map((i) => (
                    i.entry.typ === "aufgabe" ? (
                      // Aufgabe (Tag oder Frist an diesem Tag): klein mit Kreis
                      <span key={i.key} className="flex items-center gap-2 text-sm text-muted">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full border-2 ${i.room === "arbeit" ? "border-work" : "border-accent"}`} aria-hidden />
                        <span className="truncate">{i.title}</span>
                        {i.dueLabel && <span className="shrink-0 text-xs">{i.dueLabel}</span>}
                      </span>
                    ) : (
                      <span key={i.key} className="flex items-center gap-2 text-base">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${roomBar(i.room)}`} aria-hidden />
                        {i.time && <span className="shrink-0 text-sm font-bold tabular-nums">{clockLabel(i.time)}</span>}
                        <span className="truncate">{i.title}</span>
                      </span>
                    )
                  ))}
                  {items.length > 4 && <span className="text-sm text-muted">+ {items.length - 4} weitere</span>}
                  {dish && <span className="truncate text-sm text-muted">🍽 {dish}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={() => setDays((d) => d + STEP)} className={`${buttonClass("secondary")} self-center`}>
        Weitere Wochen
      </button>
      <nav className="mt-2 grid grid-cols-2 gap-2" aria-label="Mehr">
        <Link href="/aufgaben" className={`${CARD} flex h-14 items-center gap-2 px-4 text-base font-semibold`}>
          <CircleCheck className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
          Aufgaben
        </Link>
        <Link href="/notizen" className={`${CARD} flex h-14 items-center gap-2 px-4 text-base font-semibold`}>
          <NotebookPen className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
          Notizen
        </Link>
      </nav>
      {adding && <TerminQuickAdd defaultDate={today} onClose={() => setAdding(false)} />}
    </div>
  );
}
