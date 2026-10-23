"use client";

// Ein Tag (/tag?datum=YYYY-MM-DD): Titel = Wochentag, darunter „22. Oktober ·
// morgen“, dann Termine · Aufgaben · Essen (eine Zeile). Plus = Schnelleingabe
// „NEUER TERMIN“ für diesen Tag (wie im Kalender).

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PagePlus } from "@/components/ui/QuickButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, PAGE_MAIN } from "@/components/ui/styles";
import { useCalendarEntries } from "@/lib/kalender/useCalendarEntries";
import { useToday, toIsoDate } from "@/lib/core/now";
import { helperName } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { TerminQuickAdd } from "@/components/kalender/TerminQuickAdd";
import { DayAgenda } from "@/components/kalender/DayAgenda";
import { dayHeading, relativeDay } from "@/components/kalender/CalendarPage";
import { useMeals } from "@/components/essen/useMeals";
import { openQuick } from "@/lib/core/schnelleingabe";

const WEEKDAY = new Intl.DateTimeFormat("de-DE", { weekday: "long", timeZone: "UTC" });

export function DayView() {
  const params = useSearchParams();
  const now = useToday();
  const entries = useCalendarEntries();
  const profile = useProfile();
  const [adding, setAdding] = useState<string | null>(null);
  const today = now ? toIsoDate(now) : undefined;
  const raw = params.get("datum") ?? "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : today;
  const meals = useMeals(date, 1);
  const title = date ? WEEKDAY.format(new Date(`${date}T12:00:00Z`)) : "Tag";
  const name = helperName(profile);
  return (
    <>
      <PageHeader title={title} subtitle={date && today ? dayHeading(date, today) : undefined} backHref="/?seite=kalender" action={date ? <PagePlus label="Neuer Termin an diesem Tag" onClick={() => openQuick({ kind: "termin", date, more: setAdding })} /> : undefined} />
      <main className={PAGE_MAIN}>
        {!entries || !date || !today ? (
          <div className={`${CARD} h-40 animate-pulse`} />
        ) : (
          <DayAgenda date={date} today={today} entries={entries} meal={meals?.get(date)} name={name} askLabel={relativeDay(date, today) ?? `am ${title}`} />
        )}
      </main>
      {adding !== null && date && <TerminQuickAdd defaultDate={date} initialText={adding} onClose={() => setAdding(null)} />}
    </>
  );
}
