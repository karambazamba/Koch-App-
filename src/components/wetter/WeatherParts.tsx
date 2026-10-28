"use client";

// Bausteine der Wetter-Seite (v0.47, Tafel 16): Himmel-Karte für Heute/Morgen
// (Verlauf je Lage, nachts Nachtblau, weißer Text, großes Symbol oben rechts,
// unten Morgens/Mittags/Abends), „Bester Tag für draußen“, das Wochen-Band
// (7 Säulen mit Regenbalken, Sonnenstunden und Wind) und der eine Satz zur
// Woche. Wind (Tafel 87): Wort + Windsack = Stärke, Buchstaben = Richtung –
// Windsack und Wort nur, wenn der Wind auffällt (`windZeigen`), sonst nur
// klein die Zahl (`WindZahl`).

import { round, type ForecastDay } from "@/lib/wetter/forecast";
import { dayExtras, dayWords, columnTone, type DayPart, type Sky } from "@/lib/wetter/view";
import { WeatherSymbol, Windsock } from "@/components/wetter/WeatherSymbol";
import { dirShort, gustText, windLevel, windLong, windShort, windSpoken, windWord, windZeigen, type Wind } from "@/lib/wetter/wind";

/** Wind als Chip: „[Windsack] Mäßiger Wind · 22 km/h aus West“ (lang, ab 60 mit „· Böen 85“) bzw. „22 km/h · W“ (kurz) */
export function WindChip({ wind, long = false, className = "" }: { wind: Wind; long?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-bold tabular-nums ${className}`} role="img" aria-label={windSpoken(wind)}>
      <Windsock level={windLevel(wind.speed)} className="h-5 w-5" />
      {long ? [windWord(windLevel(wind.speed)), windLong(wind), gustText(wind)].filter(Boolean).join(" · ") : windShort(wind)}
    </span>
  );
}

/** Wind unter „Frischer Wind“: nur klein die Zahl („12 km/h · W“), kein Windsack */
export function WindZahl({ wind, className = "" }: { wind: Wind; className?: string }) {
  return (
    <span className={`whitespace-nowrap text-[12px] font-semibold tabular-nums text-muted ${className}`} aria-label={windSpoken(wind)} data-wind-zahl>
      {windShort(wind)}
    </span>
  );
}

/** Große Karte oben: Himmel je Lage */
export function SkyCard({ sky, label, temp, state, line, sub, code, night, parts, wind = null }: { sky: Sky; label: string; temp: number; state: string; line: string; sub?: string; code: number; night: boolean; parts: DayPart[]; wind?: Wind | null }) {
  return (
    <section className="wx-sky relative flex flex-col overflow-hidden rounded-sky p-5 shadow-card" data-sky={sky} aria-label={`${label}: ${temp}°, ${state}`}>
      <WeatherSymbol code={code} night={night} className="pointer-events-none absolute -right-5 -top-5 h-36 w-36 opacity-95" />
      <div className="wx-text relative flex flex-col">
        <span className="text-[12px] font-extrabold uppercase tracking-wide opacity-90">{label}</span>
        <span className="mt-1 text-[54px] font-extrabold leading-none tabular-nums">{temp}°</span>
        {sub && <span className="mt-1 text-[15px] font-semibold opacity-90">{sub}</span>}
        {windZeigen(wind) && <WindChip wind={wind} long className="wx-glass mt-2 self-start" />}
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
              aria-label={`${label(d.date)}: ${dayWords(d)}, Regenrisiko ${d.rain} %${sun ? `, ${sun} Stunden Sonne` : ""}${d.wind ? `, ${windSpoken(d.wind)}` : ""}${best === d.date ? " – bester Tag für draußen" : ""}`}
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
              {d.wind && (
                <span className="mt-1 flex w-full flex-col items-center gap-0.5 border-t border-line pt-1.5" data-wind>
                  {windZeigen(d.wind) && <Windsock level={windLevel(d.wind.speed)} className="h-5 w-5" />}
                  <span className="text-[12px] font-extrabold leading-none tabular-nums">{d.wind.speed}</span>
                  <span className="h-3 text-[10px] font-bold leading-none text-weather-ink">{d.wind.dir === null ? "" : dirShort(d.wind.dir)}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="px-1 text-center text-[11px] leading-relaxed text-muted">
        Balken = Regenrisiko · ☀ = Sonnenstunden
        {days.some((d) => d.wind) && (
          <span className="flex items-center justify-center gap-1">
            {days.some((d) => windZeigen(d.wind)) ? <Windsock level="frisch" className="h-4 w-4" /> : "Zahl"} = Wind km/h · W = Wind aus Westen
          </span>
        )}
      </p>
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
