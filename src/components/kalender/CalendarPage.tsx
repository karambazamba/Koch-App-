"use client";

// Reiter "Kalender": Monat | Woche | Liste. Monat: Raster Mo–So mit Punkten
// (orange = Familie, blau = Arbeit, grün = Sport), heute als oranger Kreis,
// darunter der gewählte Tag (Termine · Aufgaben · Essen). Woche: die sieben
// Tage der Woche als Karten (‹ ›). Liste: die nächsten Tage am Stück.
// Plus = "Was möchtest du eintragen?" für den gewählten Tag.
// Tipps aus der Region: eigene lila Ebene über `dayDots` (Chip „Tipps“), nie als Termin.

import { WEEKDAYS_SHORT_MO } from "@/lib/core/days";
import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PagePlus } from "@/components/ui/QuickButton";
import { Segmented } from "@/components/ui/Segmented";
import { CARD, ICON_BUTTON, buttonClass } from "@/components/ui/styles";
import { clockLabel } from "@/lib/kalender/answers";
import { itemsForDay, weekdayShort, type CalendarEntry, type DayItem } from "@/lib/kalender/model";
import { addDays } from "@/lib/core/now";
import { useWorkRoom } from "@/lib/einstellungen/welcomeStore";
import { dishOf, useMeals } from "@/components/essen/useMeals";
import { roomBarProps } from "@/components/kalender/Items";
import { DayAgenda, type RoomFilter } from "@/components/kalender/DayAgenda";
import { TipDot, TipsChip, useCalendarTips } from "@/components/tipps/CalendarTips";
import dynamic from "next/dynamic";

// Fenster erst beim Öffnen laden (hält die Seite beim Start klein)
const AddSheet = dynamic(() => import("@/components/kalender/AddSheet").then((m) => m.AddSheet), { ssr: false });

type View = "monat" | "woche" | "liste";
const STEP = 14;
const MONTH = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
const LONG = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const WEEKDAYS = WEEKDAYS_SHORT_MO;

const utc = (iso: string) => new Date(`${iso}T12:00:00Z`);
/** Montag der Woche eines Datums */
export const mondayOf = (iso: string) => addDays(iso, -((utc(iso).getUTCDay() + 6) % 7));
const monthStart = (iso: string, offset: number) => {
  const d = utc(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1, 12)).toISOString().slice(0, 10);
};

/** Punkte eines Tages: Familie (orange), Arbeit (blau), Sport (grün) – höchstens je einer */
export function dayDots(items: DayItem[]): ("familie" | "arbeit" | "sport")[] {
  const open = items.filter((i) => !i.done);
  const dots: ("familie" | "arbeit" | "sport")[] = [];
  if (open.some((i) => i.room === "familie" && !/sport/i.test(i.label ?? ""))) dots.push("familie");
  if (open.some((i) => i.room === "arbeit" && !/sport/i.test(i.label ?? ""))) dots.push("arbeit");
  if (open.some((i) => /sport/i.test(i.label ?? ""))) dots.push("sport");
  return dots;
}
const DOT: Record<"familie" | "arbeit" | "sport", string> = { familie: "bg-accent", arbeit: "bg-work", sport: "bg-good" };

/** "Morgen", "Heute" oder der Wochentag – für Zeilen wie „22. Oktober · morgen“ */
export function relativeDay(date: string, today: string): string | null {
  if (date === today) return "heute";
  if (date === addDays(today, 1)) return "morgen";
  if (date === addDays(today, -1)) return "gestern";
  return null;
}

export function CalendarPage({ today, entries, name }: { today: string; entries: CalendarEntry[]; name: string }) {
  const [view, setView] = useState<View>("monat");
  const [filter, setFilter] = useState<RoomFilter>("alles");
  const [selected, setSelected] = useState(today);
  const [adding, setAdding] = useState(false);
  // Filter nur, wenn es "Arbeit" gibt (im Kennenlernen gewählt oder schon Einträge)
  const work = useWorkRoom() || entries.some((e) => e.raum === "arbeit");
  const pick = (list: DayItem[]) => list.filter((i) => filter === "alles" || i.room === filter);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Segmented
            label="Ansicht"
            value={view}
            onChange={setView}
            options={[
              { value: "monat", label: "Monat" },
              { value: "woche", label: "Woche" },
              { value: "liste", label: "Liste" },
            ]}
          />
        </div>
        <PagePlus label="Neu eintragen" onClick={() => setAdding(true)} />
      </div>
      {work && (
        <Segmented
          label="Filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "alles", label: "Alle" },
            { value: "familie", label: "Familie" },
            { value: "arbeit", label: "Arbeit" },
          ]}
        />
      )}
      {view === "monat" && <MonthView today={today} entries={entries} pick={pick} selected={selected} onSelect={setSelected} filter={filter} name={name} />}
      {view === "woche" && <WeekView today={today} entries={entries} pick={pick} selected={selected} onSelect={setSelected} filter={filter} />}
      {view === "liste" && <ListView today={today} entries={entries} pick={pick} filter={filter} />}
      {adding && <AddSheet date={view === "liste" ? today : selected} name={name} onClose={() => setAdding(false)} />}
    </div>
  );
}

type ViewProps = { today: string; entries: CalendarEntry[]; pick: (l: DayItem[]) => DayItem[]; filter: RoomFilter };

function MonthView({ today, entries, pick, selected, onSelect, filter, name }: ViewProps & { selected: string; onSelect: (d: string) => void; name: string }) {
  const [offset, setOffset] = useState(0);
  const first = monthStart(today, offset);
  const start = mondayOf(first);
  const month = first.slice(0, 7);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const rows = days[35].slice(0, 7) === month ? 6 : 5;
  const meals = useMeals(selected, 1);
  const rel = relativeDay(selected, today);
  const tipLayer = useCalendarTips(today);
  return (
    <>
      <section className={`${CARD} flex flex-col gap-2 p-3`} aria-label="Monat">
        <div className="flex items-center justify-between">
          <h2 className="pl-1 text-[18px] font-extrabold capitalize">{MONTH.format(utc(first))}</h2>
          <span className="flex items-center gap-1">
            {tipLayer.available && filter !== "arbeit" && <TipsChip shown={tipLayer.shown} />}
            <button type="button" onClick={() => setOffset((o) => o - 1)} aria-label="Voriger Monat" className={`${ICON_BUTTON} h-9 w-9 border-0`}>
              <ChevronLeft className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </button>
            <button type="button" onClick={() => setOffset((o) => o + 1)} aria-label="Nächster Monat" className={`${ICON_BUTTON} h-9 w-9 border-0`}>
              <ChevronRight className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </button>
          </span>
        </div>
        <div className="grid grid-cols-7 text-center text-[12px] font-semibold text-muted" aria-hidden>
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5" role="grid" aria-label="Tage">
          {days.slice(0, rows * 7).map((date) => {
            const inMonth = date.slice(0, 7) === month;
            const isToday = date === today;
            const isSelected = date === selected;
            const dots = inMonth ? dayDots(pick(itemsForDay(entries, date, today))) : [];
            return (
              <button
                key={date}
                type="button"
                role="gridcell"
                aria-selected={isSelected}
                aria-current={isToday ? "date" : undefined}
                aria-label={`${LONG.format(utc(date))}${isToday ? " (heute)" : ""}${dots.length ? " – Einträge" : ""}`}
                onClick={() => onSelect(date)}
                className="flex h-12 flex-col items-center justify-start gap-0.5 pt-1"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[15px] font-bold ${
                    isToday ? "bg-accent text-on-accent" : isSelected ? "bg-accent-soft text-accent-strong" : inMonth ? "text-ink" : "text-faint"
                  }`}
                >
                  {Number(date.slice(8))}
                </span>
                <span className="flex h-1.5 gap-0.5" aria-hidden>
                  {dots.map((d) => (
                    <span key={d} className={`h-1.5 w-1.5 rounded-full ${DOT[d]}`} />
                  ))}
                  {inMonth && filter !== "arbeit" && tipLayer.byDay.has(date) && <TipDot />}
                </span>
              </button>
            );
          })}
        </div>
      </section>
      <section className="flex flex-col gap-2" aria-label="Gewählter Tag">
        <Link href={`/tag?datum=${selected}`} className="flex min-h-11 items-center justify-between px-1">
          <h2 className="text-[17px] font-extrabold">{LONG.format(utc(selected))}</h2>
          <span className="text-sm font-semibold text-muted">{rel ?? ""}</span>
        </Link>
        <DayAgenda date={selected} today={today} entries={entries} meal={meals?.get(selected)} name={name} filter={filter} askLabel={rel ?? `am ${weekdayShort(selected)}`} />
      </section>
    </>
  );
}

/** Karte eines Tages: links Wochentag + Datum, rechts Einträge und Essen */
function DayCard({ date, today, items, dish, paused }: { date: string; today: string; items: DayItem[]; dish: string | null; paused: boolean }) {
  const isToday = date === today;
  return (
    <Link
      href={`/tag?datum=${date}`}
      className={`${CARD} flex gap-4 p-3.5 ${isToday ? "border-2 border-accent" : ""}`}
      aria-label={`${weekdayShort(date)} ${Number(date.slice(8))}.${isToday ? " (heute)" : ""}`}
      aria-current={isToday ? "date" : undefined}
    >
      <span className="flex w-11 shrink-0 flex-col items-center">
        <span className={`text-[15px] font-extrabold ${isToday ? "text-accent-strong" : "text-muted"}`}>{weekdayShort(date)}</span>
        <span className="text-[26px] font-extrabold leading-tight">{Number(date.slice(8))}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        {paused ? <span className="text-base text-muted">Pause</span> : items.length === 0 && !dish && <span className="text-base text-muted">frei</span>}
        {items.slice(0, 4).map((i) =>
          i.entry.typ === "aufgabe" ? (
            <span key={i.key} className="flex items-center gap-2 text-sm text-muted">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full border-2 ${i.room === "arbeit" ? "border-work" : "border-accent"}`} aria-hidden />
              <span className="truncate">{i.title}</span>
              {i.dueLabel && <span className="shrink-0 text-xs">{i.dueLabel}</span>}
            </span>
          ) : (
            <span key={i.key} className="flex items-center gap-2 text-base">
              <span className={`h-2 w-2 shrink-0 rounded-full ${roomBarProps(i).className}`} style={roomBarProps(i).style} aria-hidden />
              {i.time && <span className="shrink-0 text-sm font-bold tabular-nums">{clockLabel(i.time)}</span>}
              <span className="truncate">{i.title}</span>
            </span>
          ),
        )}
        {items.length > 4 && <span className="text-sm text-muted">+ {items.length - 4} weitere</span>}
        {dish && <span className="truncate text-sm text-muted">Essen: {dish}</span>}
      </span>
    </Link>
  );
}

function WeekView({ today, entries, pick, selected, onSelect, filter }: ViewProps & { selected: string; onSelect: (d: string) => void }) {
  const monday = mondayOf(selected);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const meals = useMeals(monday, 7);
  const thisWeek = monday === mondayOf(today);
  const label = thisWeek ? "Diese Woche" : monday === addDays(mondayOf(today), 7) ? "Nächste Woche" : `${Number(monday.slice(8))}.${Number(monday.slice(5, 7))}. – ${Number(dates[6].slice(8))}.${Number(dates[6].slice(5, 7))}.`;
  return (
    <>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => onSelect(addDays(monday, -7))} aria-label="Vorige Woche" className={ICON_BUTTON}>
          <ChevronLeft className="h-6 w-6" strokeWidth={2.25} aria-hidden />
        </button>
        <span className="text-[17px] font-extrabold">{label}</span>
        <button type="button" onClick={() => onSelect(addDays(monday, 7))} aria-label="Nächste Woche" className={ICON_BUTTON}>
          <ChevronRight className="h-6 w-6" strokeWidth={2.25} aria-hidden />
        </button>
      </div>
      <ol className="flex flex-col gap-2.5" aria-label="Woche">
        {dates.map((date) => (
          <li key={date}>
            <DayCard date={date} today={today} items={pick(itemsForDay(entries, date, today)).filter((i) => !i.done)} dish={filter === "arbeit" ? null : dishOf(meals?.get(date))} paused={Boolean(meals?.get(date)?.paused)} />
          </li>
        ))}
      </ol>
    </>
  );
}

function ListView({ today, entries, pick, filter }: ViewProps) {
  const [days, setDays] = useState(STEP);
  const meals = useMeals(today, days);
  const dates = Array.from({ length: days }, (_, i) => addDays(today, i));
  return (
    <>
      <ol className="flex flex-col gap-2.5" aria-label="Die nächsten Tage">
        {dates.map((date) => (
          <li key={date}>
            <DayCard date={date} today={today} items={pick(itemsForDay(entries, date, today)).filter((i) => !i.done)} dish={filter === "arbeit" ? null : dishOf(meals?.get(date))} paused={Boolean(meals?.get(date)?.paused)} />
          </li>
        ))}
      </ol>
      <button type="button" onClick={() => setDays((d) => d + STEP)} className={`${buttonClass("secondary")} self-center`}>
        Weitere Wochen
      </button>
    </>
  );
}

/** "Morgen · Do" bzw. "22. Oktober · morgen" für Kopfzeilen */
export function dayHeading(date: string, today: string): string {
  const rel = relativeDay(date, today);
  const d = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", timeZone: "UTC" }).format(utc(date));
  return rel ? `${d} · ${rel}` : d;
}
