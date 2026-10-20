"use client";

// Ein Tag aus der Woche (/tag?datum=YYYY-MM-DD): wie "Heute", nur für
// dieses Datum – alle Einträge, das Essen und "Neu für diesen Tag".

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CARD, PAGE_MAIN, buttonClass } from "@/components/ui/styles";
import { itemsForDay } from "@/lib/aufgaben/model";
import { useEntries } from "@/lib/aufgaben/store";
import { addDays, useToday, toIsoDate } from "@/lib/core/now";
import { openHelper } from "@/lib/lotte/open";
import { helperName } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { DayItemsCard } from "./Items";
import { EntryForm } from "./EntryForm";
import { dishOf, useMeals } from "./useMeals";

const LONG = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "numeric", timeZone: "UTC" });

export function DayView() {
  const params = useSearchParams();
  const now = useToday();
  const entries = useEntries();
  const profile = useProfile();
  const [adding, setAdding] = useState(false);
  const today = now ? toIsoDate(now) : undefined;
  const raw = params.get("datum") ?? "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : today;
  const meals = useMeals(date, 1);
  const title = !date || !today ? "Tag" : date === today ? "Heute" : date === addDays(today, 1) ? "Morgen" : LONG.format(new Date(`${date}T00:00:00Z`));
  const items = date && today && entries ? itemsForDay(entries, date, today) : [];
  const dish = date ? dishOf(meals?.get(date)) : null;
  return (
    <>
      <PageHeader title={title} backHref="/?seite=woche" />
      <main className={PAGE_MAIN}>
        {!entries || !date ? (
          <div className={`${CARD} h-40 animate-pulse`} />
        ) : (
          <>
            {items.length ? (
              <DayItemsCard items={items} title="Termine & Aufgaben" limit={50} allDoneText="Alles erledigt 🌙" />
            ) : (
              <p className="px-1 text-base text-muted">Noch nichts eingetragen – ein freier Tag.</p>
            )}
            <section className={`${CARD} flex items-center gap-3 p-4`} aria-label="Essen">
              <span className="text-2xl" aria-hidden>
                🍽
              </span>
              {dish ? (
                <span className="min-w-0 flex-1 truncate text-base font-semibold">{dish}</span>
              ) : (
                <button type="button" onClick={() => openHelper(undefined, `Was könnten wir ${title === "Heute" || title === "Morgen" ? title.toLowerCase() : `am ${title.split(",")[0]}`} essen?`)} className="min-w-0 flex-1 text-left text-base text-muted">
                  noch frei – <span className="font-semibold text-accent-strong">{helperName(profile)} fragen</span>
                </button>
              )}
            </section>
            <button type="button" onClick={() => setAdding(true)} className={`${buttonClass("secondary")} self-start`}>
              <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
              Neu für diesen Tag
            </button>
          </>
        )}
      </main>
      {adding && date && <EntryForm date={date} onClose={() => setAdding(false)} />}
    </>
  );
}
