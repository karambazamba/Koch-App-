"use client";

// Bausteine der Wetter-Seite (v0.47, Tafel 16): Himmel-Karte für Heute/Morgen
// (Verlauf je Lage, nachts Nachtblau, weißer Text, großes Symbol oben rechts,
// unten Morgens/Mittags/Abends), „Bester Tag für draußen“, das Wochen-Band
// (7 Säulen mit Regenbalken und Sonnenstunden) und der eine Satz zur Woche.

import { round, type ForecastDay } from "@/lib/wetter/forecast";
import { dayExtras, dayWords, columnTone, type DayPart, type Sky } from "@/lib/wetter/view";
import { WeatherSymbol } from "@/components/wetter/WeatherSymbol";

/** Große Karte oben: Himmel je Lage */
export function SkyCard({ sky, label, temp, state, line, sub, code, night, parts }: { sky: Sky; label: string; temp: number; state: string; line: string; sub?: string; code: number; night: boolean; parts: DayPart[] }) {
  return (
    <section className="wx-sky relative flex flex-col overflow-hidden rounded-[24px] p-5 shadow-card" data-sky={sky} aria-label={`${label}: ${temp}°, ${state}`}>
      <WeatherSymbol code={code} night={night} className="pointer-events-none absolute -right-5 -top-5 h-36 w-36 opacity-95" />
      <div className="wx-text relative flex flex-col">
        <span className="text-[12px] font-extrabold uppercase tracking-wide opacity-90">{label}</span>
        <span className="mt-1 text-[54px] font-extrabold leading-none tabular-nums">{temp}°</span>
        {sub && <span className="mt-1 text-[15px] font-semibold opacity-90">{sub}</span>}
        <span className="mt-2 text-[19px] font-bold">{state}</span>
        <span className="text-[14px] font-semibold opacity-90">{line}</span>
      </div>
      {parts.length > 0 && (
        <div className="relative mt-4 grid grid-cols-3 gap-2">
          {parts.map((p) => (
            <span key={p.id} className="wx-glass wx-text flex flex-col items-center gap-0.5 rounded-field px-1 py-2">
              <span className="text-[12px] font-bold opacity-90">{p.label}</span>
              <WeatherSymbol code={p.code} className="h-7 w-7" />
              <span className="text-[17px] font-extrabold tabular-nums">{p.temp}°</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

/** Oben im Reiter 7 Tage – nur, wenn es einen guten Tag gibt */
export function BestDayCard({ day, name }: { day: ForecastDay; name: string }) {
  const sun = dayExtras(day).sun;
  return (
    <section className="wx-best flex items-center gap-3 rounded-card p-4 shadow-card [@media(max-height:620px)]:py-2.5" aria-label="Bester Tag für draußen">
      <WeatherSymbol code={day.code} className="h-12 w-12 [@media(max-height:620px)]:h-9 [@media(max-height:620px)]:w-9" />
      <span className="flex min-w-0 flex-col">
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Bester Tag für draußen</span>
        <span className="text-[22px] font-extrabold leading-tight [@media(max-height:620px)]:text-[18px]">{name}</span>
        <span className="text-[14px] text-muted">
          {dayWords(day)}
          {sun ? ` · ${sun}` : ""}
        </span>
      </span>
    </section>
  );
}

/** Wochen-Band: 7 Säulen nebeneinander, Regenbalken = Regenrisiko, ☀ = Sonnenstunden */
export function WeekBand({ days, today, best, label, short, onOpen }: { days: ForecastDay[]; today: string; best: string | null; label: (iso: string) => string; short: (iso: string) => string; onOpen: (d: ForecastDay) => void }) {
  return (
    <section className="flex flex-col gap-1.5" aria-label="7 Tage">
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const sun = Math.round(d.sun);
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => onOpen(d)}
              data-tone={columnTone(d)}
              data-best={best === d.date}
              className="wx-col flex min-w-0 flex-col items-center gap-1 rounded-field px-0.5 py-2 [@media(max-height:620px)]:gap-0.5 [@media(max-height:620px)]:py-1.5"
              aria-label={`${label(d.date)}: ${dayWords(d)}, Regenrisiko ${d.rain} %${sun ? `, ${sun} Stunden Sonne` : ""}${best === d.date ? " – bester Tag für draußen" : ""}`}
            >
              <span className={`text-[12px] font-extrabold ${d.date === today ? "text-ink" : "text-muted"}`}>{d.date === today ? "Heute" : short(d.date)}</span>
              <WeatherSymbol code={d.code} className="h-7 w-7" />
              <span className="text-[15px] font-extrabold leading-none tabular-nums">{round(d.max)}°</span>
              <span className="text-[12px] leading-none text-muted tabular-nums">{round(d.min)}°</span>
              <span className="wx-bar-track mt-1 flex h-10 w-2.5 items-end overflow-hidden rounded-full [@media(max-height:620px)]:h-6" aria-hidden>
                <span className="wx-bar w-full rounded-full" style={{ height: `${Math.max(4, Math.min(100, d.rain))}%` }} />
              </span>
              <span className="text-[11px] font-semibold leading-none text-weather-ink tabular-nums">{d.rain}%</span>
              <span className="h-3 text-[11px] font-semibold leading-none text-muted">{sun ? `☀ ${sun}` : ""}</span>
            </button>
          );
        })}
      </div>
      <p className="px-1 text-center text-[11px] text-muted">Balken = Regenrisiko · ☀ = Sonnenstunden</p>
    </section>
  );
}

/** EIN Satz zur Woche bzw. zum Wochenende, als Karte in der Farbe der Lage */
export function WeekNote({ text, tone }: { text: string; tone: string }) {
  return (
    <p className="wx-note rounded-card px-4 py-3 text-[15px] font-semibold leading-snug [@media(max-height:620px)]:py-2" data-tone={tone}>
      {text}
    </p>
  );
}
