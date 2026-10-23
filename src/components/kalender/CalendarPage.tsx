"use client";

// Reiter "Kalender" – nur Termine (Tafel 74): Monat | Woche | Liste. Monat:
// Raster Mo–So, unter jedem Tag bis zu 3 Punkte in der Farbe der Person
// (Familie ohne Person Orange, Arbeit Blau), heute = Zahl in Orange mit Ring,
// gewählter Tag = oranger Kreis; darunter der Tag (`DayPanel`). Lange drücken
// auf einen Tag (0,4 s) bzw. ＋ = Schnelleingabe „NEUER TERMIN“ für diesen
// Tag. Woche/Liste: Termine je Tag. Aufgaben und Essen stehen nie hier.
// Tipps aus der Region: eigene lila Ebene (Chip „Tipps“), nie als Termin.

import { WEEKDAYS_SHORT_MO } from "@/lib/core/days";
import Link from "next/link";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PagePlus } from "@/components/ui/QuickButton";
import { Segmented } from "@/components/ui/Segmented";
import { CARD, ICON_BUTTON, buttonClass } from "@/components/ui/styles";
import { clockLabel } from "@/lib/kalender/answers";
import { weekdayShort, type CalendarEntry, type DayItem } from "@/lib/kalender/model";
import { calendarDots, termineOn, type Dot } from "@/lib/kalender/monat";
import { addDays } from "@/lib/core/now";
import { useWorkRoom } from "@/lib/einstellungen/welcomeStore";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { avatarHex } from "@/lib/einstellungen/profileHelper";
import { roomBarProps } from "@/components/kalender/Items";
import { DayPanel, type RoomFilter } from "@/components/kalender/DayPanel";
import { TipDot, TipsChip, useCalendarTips } from "@/components/tipps/CalendarTips";
import { buzz } from "@/components/heute/actions";
import dynamic from "next/dynamic";
import { openQuick } from "@/lib/core/schnelleingabe";

// Fenster erst beim Öffnen laden (hält die Seite beim Start klein)
const TerminQuickAdd = dynamic(() => import("@/components/kalender/TerminQuickAdd").then((m) => m.TerminQuickAdd), { ssr: false });

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

const TONES = ["bg-accent", "bg-work", "bg-person-3", "bg-person-4"];
const HOLD_MS = 400;

/** Punkt unter einem Tag: Person, Familie (Orange), Arbeit (Blau), ich = „Meine Farbe im Kalender“ */
function DotMark({ dot, myHex }: { dot: Dot; myHex: string }) {
  if (dot.kind === "ich") return <span className="h-[5px] w-[5px] rounded-full" style={{ backgroundColor: myHex }} />;
  const cls = dot.kind === "person" ? TONES[dot.tone] : dot.kind === "arbeit" ? "bg-work" : "bg-accent";
  return <span className={`h-[5px] w-[5px] rounded-full ${cls}`} />;
}

/** "Morgen", "Heute" oder der Wochentag – für Zeilen wie „22. Oktober · morgen“ */
export function relativeDay(date: string, today: string): string | null {
  if (date === today) return "heute";
  if (date === addDays(today, 1)) return "morgen";
  if (date === addDays(today, -1)) return "gestern";
  return null;
}

export function CalendarPage({ today, entries }: { today: string; entries: CalendarEntry[] }) {
  const [view, setView] = useState<View>("monat");
  const [filter, setFilter] = useState<RoomFilter>("alles");
  const [selected, setSelected] = useState(today);
  const [adding, setAdding] = useState<string | null>(null);
  const day = view === "liste" ? today : selected;
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
        <PagePlus label="Neuer Termin" onClick={() => openQuick({ kind: "termin", date: day, more: setAdding })} />
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
      {view === "monat" && <MonthView today={today} entries={entries} pick={pick} selected={selected} onSelect={setSelected} filter={filter} />}
      {view === "woche" && <WeekView today={today} entries={entries} pick={pick} selected={selected} onSelect={setSelected} filter={filter} />}
      {view === "liste" && <ListView today={today} entries={entries} pick={pick} filter={filter} />}
      {adding !== null && <TerminQuickAdd defaultDate={day} initialText={adding} onClose={() => setAdding(null)} />}
    </div>
  );
}

type ViewProps = { today: string; entries: CalendarEntry[]; pick: (l: DayItem[]) => DayItem[]; filter: RoomFilter };

/**
 * Lange drücken (0,4 s, leichtes Vibrieren) = Schnelleingabe für diesen Tag;
 * kurz = auswählen. Das Fenster kommt erst beim Loslassen (sonst schlösse der
 * Klick des Loslassens es gleich wieder) – auf Android über „contextmenu“,
 * weil dort die Berührung beim Halten abbricht.
 */
function useDayHold(onTap: (date: string) => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const opened = useRef(false);
  const startY = useRef(0);
  const clear = () => timer.current && (clearTimeout(timer.current), (timer.current = null));
  const open = (date: string) => {
    if (opened.current) return;
    opened.current = true;
    openQuick({ kind: "termin", date });
  };
  return (date: string) => ({
    onPointerDown: () => {
      held.current = false;
      opened.current = false;
      startY.current = window.scrollY;
      clear();
      timer.current = setTimeout(() => {
        timer.current = null;
        // Hat die Seite inzwischen gescrollt, war es kein Halten
        if (Math.abs(window.scrollY - startY.current) > 6) return;
        held.current = true;
        buzz();
        onTap(date);
      }, HOLD_MS);
    },
    onPointerUp: clear,
    onPointerMove: (e: React.PointerEvent) => e.pointerType !== "mouse" && Math.abs(e.movementX) + Math.abs(e.movementY) > 8 && clear(),
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      if (held.current || timer.current) {
        clear();
        held.current = true;
        open(date);
      }
    },
    onClick: () => {
      if (held.current) return open(date);
      onTap(date);
    },
  });
}

function MonthView({ today, entries, pick, selected, onSelect, filter }: ViewProps & { selected: string; onSelect: (d: string) => void }) {
  const [offset, setOffset] = useState(0);
  const profile = useProfile();
  const persons = profile?.persons ?? [];
  const meId = persons[0]?.id ?? null;
  const myHex = avatarHex(profile?.calendarColor);
  const first = monthStart(today, offset);
  const start = mondayOf(first);
  const month = first.slice(0, 7);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const rows = days[35].slice(0, 7) === month ? 6 : 5;
  const tipLayer = useCalendarTips(today);
  const hold = useDayHold(onSelect);
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
        <div className="grid grid-cols-7 gap-y-0.5" role="grid" aria-label="Tage" data-no-swipe data-no-longpress>
          {days.slice(0, rows * 7).map((date) => {
            const inMonth = date.slice(0, 7) === month;
            const isToday = date === today;
            const isSelected = date === selected;
            const dots = inMonth ? calendarDots(pick(termineOn(entries, date, today)), persons, meId) : [];
            return (
              <button
                key={date}
                type="button"
                role="gridcell"
                aria-selected={isSelected}
                aria-current={isToday ? "date" : undefined}
                aria-label={`${LONG.format(utc(date))}${isToday ? " (heute)" : ""}${dots.length ? " – Termine" : ""}`}
                {...hold(date)}
                className="flex h-12 select-none flex-col items-center justify-start gap-0.5 pt-1 [-webkit-touch-callout:none]"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[15px] font-bold ${
                    isSelected ? "bg-accent text-on-accent" : isToday ? "text-accent-strong ring-1 ring-accent" : inMonth ? "text-ink" : "text-faint"
                  }`}
                >
                  {Number(date.slice(8))}
                </span>
                <span className="flex h-[5px] gap-[3px]" aria-hidden>
                  {dots.map((d) => (
                    <DotMark key={d.key} dot={d} myHex={myHex} />
                  ))}
                  {inMonth && filter !== "arbeit" && tipLayer.byDay.has(date) && <TipDot />}
                </span>
              </button>
            );
          })}
        </div>
      </section>
      <DayPanel date={selected} today={today} entries={entries} filter={filter} />
    </>
  );
}

/** Karte eines Tages: links Wochentag + Datum, rechts die Termine */
function DayCard({ date, today, items }: { date: string; today: string; items: DayItem[] }) {
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
        {items.length === 0 && <span className="text-base text-muted">frei</span>}
        {items.slice(0, 4).map((i) => (
          <span key={i.key} className="flex items-center gap-2 text-base">
            <span className={`h-2 w-2 shrink-0 rounded-full ${roomBarProps(i).className}`} style={roomBarProps(i).style} aria-hidden />
            {i.time && <span className="shrink-0 text-sm font-bold tabular-nums text-work">{clockLabel(i.time)}</span>}
            <span className="truncate">{i.title}</span>
          </span>
        ))}
        {items.length > 4 && <span className="text-sm text-muted">+ {items.length - 4} weitere</span>}
      </span>
    </Link>
  );
}

function WeekView({ today, entries, pick, selected, onSelect }: ViewProps & { selected: string; onSelect: (d: string) => void }) {
  const monday = mondayOf(selected);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
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
            <DayCard date={date} today={today} items={pick(termineOn(entries, date, today)).filter((i) => !i.done)} />
          </li>
        ))}
      </ol>
    </>
  );
}

function ListView({ today, entries, pick }: ViewProps) {
  const [days, setDays] = useState(STEP);
  const dates = Array.from({ length: days }, (_, i) => addDays(today, i));
  return (
    <>
      <ol className="flex flex-col gap-2.5" aria-label="Die nächsten Tage">
        {dates.map((date) => (
          <li key={date}>
            <DayCard date={date} today={today} items={pick(termineOn(entries, date, today)).filter((i) => !i.done)} />
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
