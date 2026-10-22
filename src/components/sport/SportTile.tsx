"use client";

// SPORT – Pastell-Kachel ohne Zähler: S = die Woche Mo–So als Kreise; M/L +
// ein freundlicher Satz und "Nächstes Training" (Zeit, Packliste, Wetter zur
// Trainingszeit). Jeder Tag öffnet sein Fenster, "+" = eintragen, die
// Kachel öffnet die Sport-Seite.

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { QuickButton } from "@/components/ui/QuickButton";
import { TILE, TILE_LABEL } from "@/components/ui/styles";
import { clockLabel } from "@/lib/kalender/answers";
import type { CalendarEntry } from "@/lib/kalender/model";
import { tomorrowLabel, weekdayIndex, weekdayShort } from "@/lib/kalender/model";
import type { TileSize } from "@/lib/core/homeLayout";
import { addDays } from "@/lib/core/now";
import { addTraining } from "@/lib/sport/actions";
import { guessSport, nextTraining, packFor, statusLine, trainingsBetween, useSport, weekDots, weekStatus } from "@/lib/sport";
import { useForecast } from "@/lib/wetter/client";
import { round } from "@/lib/wetter/forecast";
import { WeatherSymbol } from "@/components/wetter/WeatherSymbol";
import { buzz } from "@/components/heute/actions";
import { SportAddSheet } from "@/components/sport/SportAddSheet";
import { SportWeekRow } from "@/components/sport/SportWeekRow";
import dynamic from "next/dynamic";

// Fenster erst beim Öffnen laden (hält die Seite beim Start klein)
const SportDaySheet = dynamic(() => import("@/components/sport/SportDaySheet").then((m) => m.SportDaySheet), { ssr: false });

const BOX = `${TILE} flex flex-col gap-2 p-3.5`;

export function SportTile({ size = "M", entries, today, minutes, me }: { size?: TileSize; entries: CalendarEntry[]; today: string; minutes: number; me: string | null }) {
  const sport = useSport();
  const { forecast } = useForecast();
  const [adding, setAdding] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  if (!sport) return <section className={`${BOX} h-24 animate-pulse`} aria-label="Sport" />;
  const week = weekStatus(sport, entries, today, me);
  const lastWeek = weekStatus(sport, entries, today, me, addDays(week.monday, -7));
  const line = statusLine(week, weekdayIndex(today), lastWeek.reached);
  const recent = [...new Set(trainingsBetween(sport, entries, addDays(today, -60), today, today, me).reverse().map((t) => t.data.sport))];
  const dots = weekDots(sport, entries, today, me);
  const next = size === "S" ? null : nextTraining(entries, today, minutes, me);
  const nextSport = next ? (guessSport(next.title) ?? "fitness") : null;
  const hour = next?.time ? Number(next.time.slice(0, 2)) : null;
  const weatherAt = next && hour !== null ? forecast?.hours.find((h) => h.date === next.date && h.hour === hour) : undefined;
  return (
    <>
      <section className={`${BOX} ${size === "S" ? "min-h-[92px]" : ""}`} aria-label="Sport">
        <Link href="/sport" className="flex items-center pr-8" aria-label="Sport öffnen">
          <span className={TILE_LABEL}>Sport</span>
        </Link>
        <span className="absolute right-3.5 top-3">
          <QuickButton icon={Plus} label="Training eintragen" onClick={() => setAdding(true)} />
        </span>
        <SportWeekRow dots={dots} onDay={setDay} />
        {size !== "S" && (
          <p className="text-[14px] font-semibold leading-snug" role="status">
            {line}
          </p>
        )}
        {next && (
          <Link href={`/tag?datum=${next.date}`} className="flex flex-col gap-0.5 rounded-field bg-fill px-3 py-2">
            <span className={TILE_LABEL}>Nächstes Training</span>
            <span className="flex items-center gap-2 text-[14px] font-bold">
              <span>
                {next.date === today ? "Heute" : next.date === addDays(today, 1) ? tomorrowLabel(next.date) : weekdayShort(next.date)}
                {next.time ? ` ${clockLabel(next.time)}` : ""} · {next.title}
              </span>
              {weatherAt && (
                <span className="ml-auto flex shrink-0 items-center gap-1 text-[13px] font-semibold text-muted">
                  <WeatherSymbol code={weatherAt.code} className="h-5 w-5" />
                  {round(weatherAt.temp)}°
                </span>
              )}
            </span>
            <span className="truncate text-[12.5px] text-muted">Mitnehmen: {packFor(sport, nextSport!).join(", ")}</span>
          </Link>
        )}
      </section>
      {adding && (
        <SportAddSheet
          today={today}
          recent={recent}
          onClose={() => setAdding(false)}
          onSave={(data) => {
            addTraining(data);
            buzz();
            setAdding(false);
          }}
        />
      )}
      {day && <SportDaySheet date={day} today={today} state={sport} entries={entries} me={me} forecast={forecast} onClose={() => setDay(null)} />}
    </>
  );
}
