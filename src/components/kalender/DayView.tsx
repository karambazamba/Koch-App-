"use client";

// Ein Tag (/tag?datum=YYYY-MM-DD): Titel = Wochentag, darunter „22. Oktober ·
// morgen“, dann Termine · Aufgaben · Essen (eine Zeile). Plus = dasselbe
// „Was möchtest du eintragen?“ wie im Kalender, für diesen Tag.

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PagePlus } from "@/components/ui/QuickButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, PAGE_MAIN } from "@/components/ui/styles";
import { useEntries } from "@/lib/kalender/store";
import { useToday, toIsoDate } from "@/lib/core/now";
import { helperName } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { AddSheet } from "@/components/kalender/AddSheet";
import { DayAgenda } from "@/components/kalender/DayAgenda";
import { dayHeading, relativeDay } from "@/components/kalender/CalendarPage";
import { useMeals } from "@/components/essen/useMeals";

const WEEKDAY = new Intl.DateTimeFormat("de-DE", { weekday: "long", timeZone: "UTC" });

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
  const title = date ? WEEKDAY.format(new Date(`${date}T12:00:00Z`)) : "Tag";
  const name = helperName(profile);
  return (
    <>
      <PageHeader title={title} subtitle={date && today ? dayHeading(date, today) : undefined} backHref="/?seite=kalender" action={date ? <PagePlus label="Neu für diesen Tag" onClick={() => setAdding(true)} /> : undefined} />
      <main className={PAGE_MAIN}>
        {!entries || !date || !today ? (
          <div className={`${CARD} h-40 animate-pulse`} />
        ) : (
          <DayAgenda date={date} today={today} entries={entries} meal={meals?.get(date)} name={name} askLabel={relativeDay(date, today) ?? `am ${title}`} />
        )}
      </main>
      {adding && date && <AddSheet date={date} name={name} onClose={() => setAdding(false)} />}
    </>
  );
}
