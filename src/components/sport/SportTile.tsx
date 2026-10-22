"use client";

// SPORT – Pastell-Kachel ohne Zähler (Tafel 25): S = nur „Als Nächstes“;
// M = die Woche Mo–So als Kreise (Uhrzeit darunter) + „Als Nächstes“; L
// zusätzlich die letzten Trainings. „Als Nächstes“: Icon, „Sa 18:00 · Laufen
// · 45 Min“, Wetter zur Trainingszeit – antippen öffnet das Training. Jeder
// Tag öffnet sein Fenster, „+“ = Training planen (mit Tageswahl, oder „Schon
// trainiert? Eintragen“), das Label öffnet die Sport-Seite.

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { QuickButton } from "@/components/ui/QuickButton";
import { Sheet } from "@/components/ui/Sheet";
import { TILE, TILE_LABEL } from "@/components/ui/styles";
import type { CalendarEntry } from "@/lib/kalender/model";
import { weekdayShort } from "@/lib/kalender/model";
import type { TileSize } from "@/lib/core/homeLayout";
import { addDays } from "@/lib/core/now";
import { addTraining } from "@/lib/sport/actions";
import { nextLine, nextTraining, whenLabel, sportById, sportOfTitle, trainingsBetween, useSport, weekDots } from "@/lib/sport";
import { useForecast } from "@/lib/wetter/client";
import { round } from "@/lib/wetter/forecast";
import { WeatherSymbol } from "@/components/wetter/WeatherSymbol";
import { buzz } from "@/components/heute/actions";
import { SportAddSheet } from "@/components/sport/SportAddSheet";
import { SportIcon } from "@/components/sport/SportIcon";
import { SportWeekRow } from "@/components/sport/SportWeekRow";
import dynamic from "next/dynamic";

// Fenster erst beim Öffnen laden (hält die Seite beim Start klein)
const SportDaySheet = dynamic(() => import("@/components/sport/SportDaySheet").then((m) => m.SportDaySheet), { ssr: false });
const SportPlanForm = dynamic(() => import("@/components/sport/SportPlanForm").then((m) => m.SportPlanForm), { ssr: false });

const BOX = `${TILE} flex flex-col gap-2.5 p-3.5`;

export function SportTile({ size = "M", entries, today, minutes, me }: { size?: TileSize; entries: CalendarEntry[]; today: string; minutes: number; me: string | null }) {
  const sport = useSport();
  const { forecast } = useForecast();
  const [sheet, setSheet] = useState<"planen" | "eintragen" | null>(null);
  const [day, setDay] = useState<string | null>(null);
  if (!sport) return <section className={`${BOX} h-24 animate-pulse`} aria-label="Sport" />;
  const done = trainingsBetween(sport, entries, addDays(today, -60), today, today, me).reverse();
  const recent = [...new Set(done.map((t) => t.data.sport))];
  const dots = weekDots(sport, entries, today, me);
  const next = nextTraining(entries, today, minutes, me);
  const hour = next?.time ? Number(next.time.slice(0, 2)) : null;
  const weatherAt = next && hour !== null ? forecast?.hours.find((h) => h.date === next.date && h.hour === hour) : undefined;
  return (
    <>
      <section className={`${BOX} ${size === "S" ? "min-h-[92px]" : ""}`} aria-label="Sport">
        <Link href="/sport" className="flex items-center pr-8" aria-label="Sport öffnen">
          <span className={TILE_LABEL}>Sport</span>
        </Link>
        <span className="absolute right-3.5 top-3">
          <QuickButton icon={Plus} label="Training planen" onClick={() => setSheet("planen")} />
        </span>
        {size !== "S" && <SportWeekRow dots={dots} onDay={setDay} times />}
        {next && size === "S" ? (
          <button type="button" onClick={() => setDay(next.date)} className="flex min-h-11 flex-col items-start gap-0.5 rounded-field bg-tile-inner px-3 py-2 text-left" aria-label={`Als Nächstes: ${nextLine(next, today)} – öffnen`}>
            <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-muted">
              <SportIcon sport={sportOfTitle(next.title)} className="h-3.5 w-3.5 text-good-ink" />
              Als Nächstes
            </span>
            <span className="text-[14.5px] font-bold">{whenLabel(next, today)}</span>
            <span className="w-full truncate text-[13px] text-muted">{next.title}</span>
          </button>
        ) : next ? (
          <button type="button" onClick={() => setDay(next.date)} className="flex min-h-11 items-center gap-3 rounded-field bg-tile-inner px-3 py-2 text-left" aria-label={`Als Nächstes: ${nextLine(next, today)} – öffnen`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-good-soft text-good-ink">
              <SportIcon sport={sportOfTitle(next.title)} className="h-[18px] w-[18px]" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Als Nächstes</span>
              <span className="truncate text-[14.5px] font-bold">{nextLine(next, today)}</span>
            </span>
            {weatherAt && (
              <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-muted">
                <WeatherSymbol code={weatherAt.code} className="h-5 w-5" />
                {round(weatherAt.temp)}°
              </span>
            )}
          </button>
        ) : (
          <p className="text-[14px] font-semibold leading-snug text-muted">Diese Woche noch nichts geplant – einfach Plus tippen.</p>
        )}
        {size === "L" && done.length > 0 && (
          <ul className="flex flex-col gap-1" aria-label="Zuletzt">
            {done.slice(0, 3).map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-[13.5px]">
                <SportIcon sport={t.data.sport} className="h-4 w-4 shrink-0 text-good-ink" />
                <span className="truncate">
                  <span className="font-bold">{t.data.date === today ? "Heute" : t.data.date === addDays(today, -1) ? "Gestern" : weekdayShort(t.data.date)}</span> · {sportById(t.data.sport).label} · {t.data.minutes} Min
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {sheet === "planen" && (
        <Sheet title="Training planen" onClose={() => setSheet(null)}>
          <div className="flex flex-col gap-3 pb-3">
            <SportPlanForm
              date={dots.find((d) => d.date >= today && d.state === "frei")?.date ?? today}
              days={Array.from({ length: 7 }, (_, i) => addDays(today, i))}
              today={today}
              entries={entries}
              state={sport}
              me={me}
              recent={recent}
              fallbackMinutes={45}
              onDone={() => (buzz(), setSheet(null))}
            />
            <button type="button" onClick={() => setSheet("eintragen")} className="hit mx-auto min-h-11 text-[15px] font-semibold text-accent-strong">
              Schon trainiert? Eintragen
            </button>
          </div>
        </Sheet>
      )}
      {sheet === "eintragen" && (
        <SportAddSheet
          today={today}
          recent={recent}
          onClose={() => setSheet(null)}
          onSave={(data) => {
            addTraining(data);
            buzz();
            setSheet(null);
          }}
        />
      )}
      {day && <SportDaySheet date={day} today={today} state={sport} entries={entries} me={me} forecast={forecast} onClose={() => setDay(null)} />}
    </>
  );
}
