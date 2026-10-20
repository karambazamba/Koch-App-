"use client";

// SPORT (grün) – S: "2 / 3 diese Woche", Balken, "🔥 4 Wo." bei Serie; M: Kopf
// "🏃 SPORT · WOCHENZIEL 3×" + "+", 7 Punkte Mo–So (✓ trainiert, Kreis mit
// Uhrzeit geplant, gestrichelt frei, Punkt unter heute), ein Satz ohne Druck,
// "Nächstes Training" (Zeit, Art, Packliste, Wetter zur Trainingszeit); L: + 4
// Wochen als Balken und der Monat ("Oktober: 11 Einheiten · 9 h 20 min · 🔥 4
// Wochen in Folge"). Antippen → Sport-Seite. "+" → eintragen.

import Link from "next/link";
import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { QuickButton } from "@/components/ui/QuickButton";
import { clockLabel } from "@/lib/aufgaben/answers";
import type { CalendarEntry } from "@/lib/aufgaben/model";
import { weekdayIndex, weekdayShort } from "@/lib/aufgaben/model";
import type { TileSize } from "@/lib/core/homeLayout";
import { addDays } from "@/lib/core/now";
import { addTraining } from "@/lib/sport/actions";
import {
  guessSport,
  hoursLabel,
  monthName,
  monthStats,
  nextTraining,
  packFor,
  sportById,
  statusLine,
  trainingsBetween,
  useSport,
  weekDots,
  weekStatus,
  weekStreak,
  weeksHistory,
} from "@/lib/sport";
import { useForecast } from "@/lib/wetter/client";
import { round } from "@/lib/wetter/forecast";
import { WeatherSymbol } from "@/components/wetter/WeatherSymbol";
import { buzz } from "@/components/alltag/actions";
import { SportAddSheet } from "./SportAddSheet";

const BOX = "relative flex flex-col gap-2 rounded-card border border-sport-line bg-linear-to-br from-sport-soft to-sport-2 p-3.5";

export function SportTile({ size = "M", entries, today, minutes, me }: { size?: TileSize; entries: CalendarEntry[]; today: string; minutes: number; me: string | null }) {
  const sport = useSport();
  const { forecast } = useForecast();
  const [adding, setAdding] = useState(false);
  if (!sport) return <section className={`${BOX} h-24 animate-pulse`} aria-label="Sport" />;
  const week = weekStatus(sport, entries, today, me);
  const streak = weekStreak(sport, entries, today, me);
  const lastWeek = weekStatus(sport, entries, today, me, addDays(week.monday, -7));
  const line = statusLine(week, weekdayIndex(today), lastWeek.reached);
  const recent = [...new Set(trainingsBetween(sport, entries, addDays(today, -60), today, today, me).reverse().map((t) => t.data.sport))];
  const sheet = adding && (
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
  );
  const plus = (
    <span className="absolute right-3.5 top-3">
      <QuickButton icon={Plus} tone="sport" label="Training eintragen" onClick={() => setAdding(true)} />
    </span>
  );

  if (size === "S") {
    return (
      <>
        <section className={`${BOX} min-h-[92px]`} aria-label="Sport">
          <Link href="/sport" className="flex flex-col gap-1.5 pr-6">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sport-ink">🏃 Sport</span>
            <span className="text-[18px] font-extrabold tabular-nums leading-none">
              {week.count} / {week.goal} <span className="text-[13px] font-semibold text-muted">diese Woche</span>
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-sport-line" aria-hidden>
              <span className="block h-full rounded-full bg-sport" style={{ width: `${Math.min(100, (week.count / week.goal) * 100)}%` }} />
            </span>
            {streak >= 2 && <span className="text-[12px] font-bold text-sport-ink">🔥 {streak} Wo.</span>}
          </Link>
          {plus}
        </section>
        {sheet}
      </>
    );
  }

  const dots = weekDots(sport, entries, today, me);
  const next = nextTraining(entries, today, minutes, me);
  const nextSport = next ? (guessSport(next.title) ?? "fitness") : null;
  const hour = next?.time ? Number(next.time.slice(0, 2)) : null;
  const weatherAt = next && hour !== null ? forecast?.hours.find((h) => h.date === next.date && h.hour === hour) : undefined;
  const history = size === "L" ? weeksHistory(sport, entries, today, me) : [];
  const month = size === "L" ? monthStats(sport, entries, today, me) : null;
  const maxBar = Math.max(week.goal, ...history.map((h) => h.count), 1);
  return (
    <>
      <section className={BOX} aria-label="Sport">
        <Link href="/sport" className="flex flex-col gap-2 pr-6" aria-label="Sport öffnen">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sport-ink">🏃 Sport · Wochenziel {week.goal}×</span>
        </Link>
        {plus}
        <ol className="grid grid-cols-7 gap-1" aria-label="Diese Woche">
          {dots.map((d) => (
            <li key={d.date} className="flex flex-col items-center gap-0.5" aria-label={`${d.label}: ${d.state}${d.time ? ` ${d.time}` : ""}`}>
              <span className="text-[10.5px] font-semibold text-muted">{d.label}</span>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold ${
                  d.state === "trainiert" ? "bg-sport text-white" : d.state === "geplant" ? "border-2 border-sport text-sport-ink" : "border-2 border-dashed border-sport-line"
                }`}
              >
                {d.state === "trainiert" ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> : d.state === "geplant" ? clockLabel(d.time ?? "").replace(/:00$/, "") : ""}
              </span>
              <span className={`h-1 w-1 rounded-full ${d.today ? "bg-sport" : "bg-transparent"}`} aria-hidden />
            </li>
          ))}
        </ol>
        <p className="text-[14px] font-semibold leading-snug" role="status">
          {line}
        </p>
        {next && (
          <Link href={`/tag?datum=${next.date}`} className="flex flex-col gap-0.5 rounded-xl bg-surface/70 px-3 py-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Nächstes Training</span>
            <span className="flex items-center gap-2 text-[14px] font-bold">
              <span>
                {next.date === today ? "Heute" : next.date === addDays(today, 1) ? "Morgen" : weekdayShort(next.date)}
                {next.time ? ` ${clockLabel(next.time)}` : ""} · {sportById(nextSport!).emoji} {next.title}
              </span>
              {weatherAt && (
                <span className="ml-auto flex shrink-0 items-center gap-1 text-[13px] font-semibold text-muted">
                  <WeatherSymbol code={weatherAt.code} className="h-5 w-5" />
                  {round(weatherAt.temp)}°
                </span>
              )}
            </span>
            <span className="truncate text-[12.5px] text-muted">🎒 {packFor(sport, nextSport!).join(", ")}</span>
          </Link>
        )}
        {size === "L" && month && (
          <div className="flex flex-col gap-2 border-t border-sport-line pt-2">
            <div className="flex h-16 items-end gap-2" aria-label="Letzte 4 Wochen">
              {history.map((h) => (
                <div key={h.monday} className="flex flex-1 flex-col items-center gap-0.5">
                  <span className="text-[11px] font-bold tabular-nums">{h.count}</span>
                  <span className={`w-full rounded-t-md ${h.current ? "bg-sport" : "bg-sport/35"}`} style={{ height: `${Math.max(4, (h.count / maxBar) * 40)}px` }} />
                  <span className="text-[10.5px] text-muted">KW {h.kw}</span>
                </div>
              ))}
            </div>
            <p className="text-[13px] font-semibold">
              {monthName(today)}: {month.count} {month.count === 1 ? "Einheit" : "Einheiten"} · {hoursLabel(month.minutes)}
              {month.km ? ` · ${month.km} km` : ""}
              {streak >= 2 ? ` · 🔥 ${streak} Wochen in Folge` : ""}
            </p>
          </div>
        )}
      </section>
      {sheet}
    </>
  );
}
