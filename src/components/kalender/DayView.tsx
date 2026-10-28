"use client";

// Ein Tag (/tag?datum=YYYY-MM-DD): Titel = Wochentag, darunter „22. Oktober ·
// morgen“, dann die Termine des Tages und „Termin am …“ (`DayPanel`, wie im
// Kalender). Plus = das Fenster „Neuer Termin“ für diesen Tag.

import { useSearchParams } from "next/navigation";
import { PagePlus } from "@/components/ui/QuickButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, PAGE_MAIN } from "@/components/ui/styles";
import { useCalendarEntries } from "@/lib/kalender/useCalendarEntries";
import { useToday, toIsoDate } from "@/lib/core/now";
import { DayPanel } from "@/components/kalender/DayPanel";
import { dayHeading } from "@/components/kalender/CalendarPage";
import { neuEintragen } from "@/lib/kalender/eintragen/oeffnen";

const WEEKDAY = new Intl.DateTimeFormat("de-DE", { weekday: "long", timeZone: "UTC" });

export function DayView() {
  const params = useSearchParams();
  const now = useToday();
  const entries = useCalendarEntries();
  const today = now ? toIsoDate(now) : undefined;
  const raw = params.get("datum") ?? "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : today;
  const title = date ? WEEKDAY.format(new Date(`${date}T12:00:00Z`)) : "Tag";
  return (
    <>
      <PageHeader title={title} subtitle={date && today ? dayHeading(date, today) : undefined} backHref="/?seite=kalender" action={date ? <PagePlus label="Neuer Termin an diesem Tag" onClick={() => neuEintragen("termin", date)} /> : undefined} />
      <main className={PAGE_MAIN}>
        {!entries || !date || !today ? (
          <div className={`${CARD} h-40 animate-pulse`} />
        ) : (
          <DayPanel date={date} today={today} entries={entries} heading={false} />
        )}
      </main>
    </>
  );
}
