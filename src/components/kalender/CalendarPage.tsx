"use client";

// Reiter "Kalender" – nur Termine (Tafel 74): Monat | Woche | Liste. Monat:
// Raster Mo–So, unter jedem Tag bis zu 3 Punkte in der Farbe der Person
// (Familie ohne Person Orange, Arbeit Blau), heute = Zahl in Orange mit Ring,
// gewählter Tag = oranger Kreis; darunter der Tag (`DayPanel`). Woche/Liste:
// Termine je Tag, Antippen zeigt den Tag genauso direkt darunter. Eintragen
// nur über ＋ (Schnelleingabe für den gewählten Tag), kein langes Drücken.
// Aufgaben und Essen stehen nie hier.
// Tipps aus der Region: eigene lila Ebene (Chip „Tipps“), nie als Termin.
// Oben (solange nichts verbunden ist) „Kalender mitbringen“.

import { WEEKDAYS_SHORT_MO } from "@/lib/core/days";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PagePlus } from "@/components/ui/QuickButton";
import { Segmented } from "@/components/ui/Segmented";
import { CARD, ICON_BUTTON, buttonClass } from "@/components/ui/styles";
import { clockLabel } from "@/lib/kalender/answers";
import { weekdayShort, type CalendarEntry, type DayItem } from "@/lib/kalender/model";
import { calendarDots, termineOn, type Dot } from "@/lib/kalender/monat";
import { addDays } from "@/lib/core/now";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { avatarHex } from "@/lib/einstellungen/profileHelper";
import { roomBarProps } from "@/components/kalender/Items";
import { DayPanel, mitTipps, type RoomFilter } from "@/components/kalender/DayPanel";
import { TipDot, TipsChip, useCalendarTips } from "@/components/tipps/CalendarTips";
import { neuEintragen } from "@/lib/kalender/eintragen/oeffnen";
import { isAboEntry } from "@/lib/kalender/abo/model";
import { MitbringenKarte } from "@/components/kalender/mitbringen/KalenderMitbringen";
import { useHaushalt } from "@/lib/einstellungen/useHaushalt";
import { sichtRaum } from "@/lib/core/haushalt";
import { filterLabel, raumChips } from "@/lib/kalender/aufgaben";


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

/** Punkt unter einem Tag: Person, Familie (Orange), Raum Ich (Grün), Arbeit (Blau), ich = „Meine Farbe im Kalender“ */
function DotMark({ dot, myHex }: { dot: Dot; myHex: string }) {
  if (dot.kind === "ich") return <span className="h-[5px] w-[5px] rounded-full" style={{ backgroundColor: myHex }} />;
  const cls = dot.kind === "person" ? TONES[dot.tone] : dot.kind === "arbeit" ? "bg-work" : dot.kind === "nurIch" ? "bg-ich" : "bg-accent";
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
  const haushalt = useHaushalt();
  const [view, setView] = useState<View>("monat");
  const [filter, setFilter] = useState<RoomFilter>("alles");
  const [selected, setSelected] = useState(today);
  const day = selected;
  // Filter „Alle · Familie · Ich · Arbeit“ nur, wenn es Ich- oder Arbeit-Termine gibt (Tafel 114)
  const chips = raumChips(entries.filter((e) => e.typ === "termin").map((e) => e.raum), haushalt);
  const wirksam: RoomFilter = filter !== "alles" && chips.includes(filter) ? filter : "alles";
  const pick = (list: DayItem[]) => list.filter((i) => wirksam === "alles" || sichtRaum(i.room, haushalt) === wirksam);
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
        <PagePlus label="Neuer Termin" onClick={() => neuEintragen("termin", day)} />
      </div>
      {chips.length > 0 && (
        <Segmented<RoomFilter>
          label="Filter"
          value={wirksam}
          onChange={setFilter}
          options={chips.map((c) => ({ value: c === "alle" ? "alles" : c, label: filterLabel(c, haushalt) }))}
        />
      )}
      <MitbringenKarte today={today} ownTermine={entries.filter((e) => e.typ === "termin" && !isAboEntry(e)).length} />
      {view === "monat" && <MonthView today={today} entries={entries} pick={pick} selected={selected} onSelect={setSelected} filter={wirksam} />}
      {view === "woche" && <WeekView today={today} entries={entries} pick={pick} selected={selected} onSelect={setSelected} filter={wirksam} />}
      {view === "liste" && <ListView today={today} entries={entries} pick={pick} filter={wirksam} selected={selected} onSelect={setSelected} />}
    </div>
  );
}

type ViewProps = { today: string; entries: CalendarEntry[]; pick: (l: DayItem[]) => DayItem[]; filter: RoomFilter };

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
  return (
    <>
      <section className={`${CARD} flex flex-col gap-2 p-3`} aria-label="Monat">
        <div className="flex items-center justify-between">
          <h2 className="pl-1 text-[18px] font-extrabold capitalize">{MONTH.format(utc(first))}</h2>
          <span className="flex items-center gap-1">
            {tipLayer.available && mitTipps(filter) && <TipsChip shown={tipLayer.shown} />}
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
        <div className="grid grid-cols-7 gap-y-0.5" role="grid" aria-label="Tage" data-no-longpress>
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
                onClick={() => onSelect(date)}
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
                  {inMonth && mitTipps(filter) && tipLayer.byDay.has(date) && <TipDot />}
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

/**
 * Karte eines Tages (Woche, Liste): links Wochentag + Datum, rechts die
 * Termine. Antippen wählt den Tag – wie im Monat steht er dann direkt darunter
 * (`DayPanel`), überall gleich.
 */
function DayCard({ date, today, items, selected, onSelect, entries, filter }: { date: string; today: string; items: DayItem[]; selected: boolean; onSelect: (d: string) => void; entries: CalendarEntry[]; filter: RoomFilter }) {
  const isToday = date === today;
  return (
    <>
      <button
        type="button"
        onClick={() => onSelect(date)}
        aria-pressed={selected}
        className={`${CARD} flex w-full gap-4 p-3.5 text-left ${selected ? "border-2 border-accent" : isToday ? "border-2 border-accent/40" : ""}`}
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
      </button>
      {selected && (
        <div className="mt-2.5">
          <DayPanel date={date} today={today} entries={entries} filter={filter} heading={false} />
        </div>
      )}
    </>
  );
}

function WeekView({ today, entries, pick, selected, onSelect, filter }: ViewProps & { selected: string; onSelect: (d: string) => void }) {
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
            <DayCard date={date} today={today} items={pick(termineOn(entries, date, today)).filter((i) => !i.done)} selected={date === selected} onSelect={onSelect} entries={entries} filter={filter} />
          </li>
        ))}
      </ol>
    </>
  );
}

function ListView({ today, entries, pick, filter, selected, onSelect }: ViewProps & { selected: string; onSelect: (d: string) => void }) {
  const [days, setDays] = useState(STEP);
  const dates = Array.from({ length: days }, (_, i) => addDays(today, i));
  return (
    <>
      <ol className="flex flex-col gap-2.5" aria-label="Die nächsten Tage">
        {dates.map((date) => (
          <li key={date}>
            <DayCard date={date} today={today} items={pick(termineOn(entries, date, today)).filter((i) => !i.done)} selected={date === selected} onSelect={onSelect} entries={entries} filter={filter} />
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
