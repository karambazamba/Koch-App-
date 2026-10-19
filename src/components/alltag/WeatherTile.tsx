"use client";

// WETTER (leicht blau): S = Symbol + Temperatur + kurzer Tipp; M = groß mit
// Beschreibung, Tief/Hoch, rechts 4 Zeitpunkte, darunter EIN Tipp; L = wie M
// + die nächsten 5 Tage. Offline: letzte Werte mit "Stand 8:10". Antippen →
// Fenster mit Stundenverlauf heute und 7-Tage-Vorschau.

import { useState } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { Sheet } from "@/components/plan/Sheet";
import type { TileSize } from "@/lib/core/homeLayout";
import {
  weatherKind,
  hoursToday,
  nextSlots,
  round,
  todayRange,
  weatherTip,
  type Forecast,
  type TipTermin,
  type WeatherKind,
} from "@/lib/wetter/forecast";
import { useForecast } from "@/lib/wetter/client";
import { kladdeClock } from "@/components/notizen/Kladde";

const ICONS: Record<WeatherKind, LucideIcon> = {
  klar: Sun,
  heiter: CloudSun,
  wolkig: Cloud,
  nebel: CloudFog,
  niesel: CloudDrizzle,
  regen: CloudRain,
  schauer: CloudRain,
  schnee: CloudSnow,
  gewitter: CloudLightning,
};

export function WeatherIcon({
  code,
  className = "h-6 w-6",
}: {
  code: number;
  className?: string;
}) {
  const Icon = ICONS[weatherKind(code).kind];
  return (
    <Icon
      className={`${className} text-weather-ink`}
      strokeWidth={2}
      aria-hidden
    />
  );
}

const WEEKDAY = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const dayName = (iso: string, today: string) =>
  iso === today ? "Heute" : WEEKDAY[new Date(`${iso}T12:00:00`).getDay()];

export function WeatherTile({
  size = "M",
  half = false,
  today,
  minutes,
  termine,
  tomorrow = false,
}: {
  size?: TileSize;
  half?: boolean;
  today: string;
  minutes: number;
  termine: TipTermin[];
  /** Feierabend: das Wetter von morgen (klein) */
  tomorrow?: boolean;
}) {
  const { forecast, stale, failed, place } = useForecast();
  const [open, setOpen] = useState(false);
  const label = `Wetter · ${place}`;
  const box =
    "relative flex w-full flex-col rounded-card border border-weather-line bg-linear-to-br from-weather to-weather-2 p-3.5 text-left";
  if (!forecast)
    return (
      <section className={`${box} min-h-[92px]`} aria-label={label}>
        <span className="text-[11px] font-bold uppercase tracking-wider text-weather-ink">
          {label}
        </span>
        <span className="mt-1 text-[14px] text-muted">
          {failed
            ? "Gerade keine Wetterdaten – ich schau gleich nochmal."
            : "Wetter lädt …"}
        </span>
      </section>
    );
  if (tomorrow) {
    const day = forecast.days.find((d) => d.date > today);
    if (day)
      return (
        <>
          <section className={box} aria-label={`Wetter morgen · ${place}`}>
            <button type="button" onClick={() => setOpen(true)} className="flex w-full flex-col text-left" aria-label={`Wetter morgen · ${place} – Vorschau öffnen`}>
              <span className="text-[11px] font-bold uppercase tracking-wider text-weather-ink">Morgen · {place}</span>
              <span className="mt-1 flex items-center gap-2">
                <WeatherIcon code={day.code} className="h-7 w-7" />
                <span className="text-[22px] font-extrabold tabular-nums leading-none">
                  {round(day.max)}°<span className="text-[15px] font-semibold text-muted"> / {round(day.min)}°</span>
                </span>
                <span className="truncate text-[14px] text-muted">{weatherKind(day.code).text}</span>
              </span>
              {day.rain >= 50 && <span className="mt-0.5 text-[13px] font-semibold">☂️ Regen wahrscheinlich ({day.rain} %)</span>}
            </button>
          </section>
          {open && <WeatherSheet forecast={forecast} today={today} minutes={minutes} onClose={() => setOpen(false)} />}
        </>
      );
  }
  const tip = weatherTip(forecast, today, minutes, termine);
  const range = todayRange(forecast, today);
  const kind = weatherKind(forecast.current.code);
  const slots = nextSlots(forecast, today, minutes);
  const standLine = stale ? `Stand ${kladdeClock(forecast.fetchedAt)}` : "";
  return (
    <>
      <section className={box} aria-label={label}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full flex-col text-left"
          aria-label={`${label} – Vorschau öffnen`}
        >
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-weather-ink">
            <span className="truncate">{label}</span>
            {standLine && (
              <span className="ml-auto shrink-0 font-semibold normal-case tracking-normal text-muted">
                {standLine}
              </span>
            )}
          </span>
          {size === "S" ? (
            <span className="mt-1 flex flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <WeatherIcon code={forecast.current.code} className="h-7 w-7" />
                <span className="text-[24px] font-extrabold tabular-nums leading-none">
                  {round(forecast.current.temp)}°
                </span>
                {!half && (
                  <span className="text-[14px] text-muted">{kind.text}</span>
                )}
              </span>
              {tip && (
                <span
                  className={`${half ? "line-clamp-2" : "truncate"} text-[13px] font-semibold leading-snug`}
                >
                  {tip}
                </span>
              )}
            </span>
          ) : (
            <>
              <span className="mt-1.5 flex items-center gap-3">
                <span className="flex shrink-0 items-center gap-2">
                  <WeatherIcon
                    code={forecast.current.code}
                    className="h-10 w-10"
                  />
                  <span className="flex flex-col">
                    <span className="text-[30px] font-extrabold tabular-nums leading-none">
                      {round(forecast.current.temp)}°
                    </span>
                    <span className="text-[12.5px] text-muted">
                      {kind.text}
                      {range ? ` · ${range.min}° / ${range.max}°` : ""}
                    </span>
                  </span>
                </span>
                <span
                  className="ml-auto grid grid-cols-4 gap-1.5"
                  aria-label="Nächste Stunden"
                >
                  {slots.map((h) => (
                    <span
                      key={`${h.date}-${h.hour}`}
                      className="flex flex-col items-center gap-0.5"
                    >
                      <span className="text-[11px] font-semibold text-muted">
                        {h.hour}
                      </span>
                      <WeatherIcon code={h.code} className="h-4 w-4" />
                      <span className="text-[12.5px] font-bold tabular-nums">
                        {round(h.temp)}°
                      </span>
                    </span>
                  ))}
                </span>
              </span>
              {tip && (
                <span className="mt-2 text-[13.5px] font-semibold leading-snug">
                  {tip}
                </span>
              )}
              {size === "L" && (
                <span
                  className="mt-2 grid grid-cols-5 gap-1 border-t border-weather-line pt-2"
                  aria-label="Nächste Tage"
                >
                  {forecast.days.slice(1, 6).map((d) => (
                    <span
                      key={d.date}
                      className="flex flex-col items-center gap-0.5"
                    >
                      <span className="text-[11px] font-semibold text-muted">
                        {dayName(d.date, today)}
                      </span>
                      <WeatherIcon code={d.code} className="h-4 w-4" />
                      <span className="text-[12.5px] font-bold tabular-nums">
                        {round(d.max)}°
                      </span>
                    </span>
                  ))}
                </span>
              )}
            </>
          )}
        </button>
      </section>
      {open && (
        <WeatherSheet
          forecast={forecast}
          today={today}
          minutes={minutes}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/** Fenster: Stundenverlauf heute und 7 Tage */
function WeatherSheet({
  forecast,
  today,
  minutes,
  onClose,
}: {
  forecast: Forecast;
  today: string;
  minutes: number;
  onClose: () => void;
}) {
  const from = Math.floor(minutes / 60);
  const hours = hoursToday(forecast, today).filter((h) => h.hour >= from);
  return (
    <Sheet title={`Wetter · ${forecast.place}`} onClose={onClose}>
      <div className="flex flex-col gap-4 pb-3">
        <section aria-label="Heute stündlich">
          <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">
            Heute
          </h3>
          <div
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
            data-no-swipe
          >
            {hours.map((h) => (
              <span
                key={h.hour}
                className="flex w-12 shrink-0 flex-col items-center gap-1 rounded-2xl bg-weather py-2"
              >
                <span className="text-xs font-semibold text-muted">
                  {h.hour} Uhr
                </span>
                <WeatherIcon code={h.code} className="h-5 w-5" />
                <span className="text-sm font-bold tabular-nums">
                  {round(h.temp)}°
                </span>
                {h.rain >= 30 && (
                  <span className="text-[11px] text-weather-ink">
                    {h.rain} %
                  </span>
                )}
              </span>
            ))}
            {!hours.length && (
              <span className="text-sm text-muted">
                Für heute keine Stunden mehr.
              </span>
            )}
          </div>
        </section>
        <section aria-label="7 Tage">
          <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">
            7 Tage
          </h3>
          <ul className="flex flex-col divide-y divide-line rounded-2xl bg-surface">
            {forecast.days.map((d) => (
              <li key={d.date} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-12 text-sm font-bold">
                  {dayName(d.date, today)}
                </span>
                <WeatherIcon code={d.code} className="h-5 w-5" />
                <span className="flex-1 text-sm text-muted">
                  {weatherKind(d.code).text}
                  {d.rain >= 30 ? ` · ${d.rain} %` : ""}
                </span>
                <span className="text-sm tabular-nums">
                  <span className="text-muted">{round(d.min)}°</span>{" "}
                  <span className="font-bold">{round(d.max)}°</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <p className="text-xs text-muted">
          Daten: Open-Meteo (u. a. Deutscher Wetterdienst)
        </p>
      </div>
    </Sheet>
  );
}
