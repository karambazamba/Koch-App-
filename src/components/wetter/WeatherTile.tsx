"use client";

// WETTER (Standard S; Tafel „ruhig mit Regentropfen“ und Tafel 87): Look
// „Farbig“ als stiller Himmel je Wetter (nachts dunkler, Muster ohne
// Animation), Look „Schlicht“ weiß mit farbigem Symbol.
// S = Temperatur + Windsack + EINE Zeile („Regen · ab 10 trocken“);
// M = dazu ↑ max / ↓ min, Wind in Worten („Frischer Wind · 32 km/h aus West“,
// ab 60 „· Böen 85“ in Orange). Windsack und Wind-Zeile nur, wenn der Wind
// auffällt (`windZeigen`: ab „Frischer Wind“ oder Böen ≥ 60). Unten die
// nächsten Stunden im 2-Stunden-Abstand; L = dazu die nächsten Tage in Worten. Offline: letzte
// Werte mit „Stand 8:10“. Antippen → Wetter-Seite.

import Link from "next/link";
import { Droplet } from "lucide-react";
import type { TileSize } from "@/lib/core/homeLayout";
import type { AppLook } from "@/lib/einstellungen/profileModel";
import { round, todayRange } from "@/lib/wetter/forecast";
import { dayWords, isNight, weatherGroup } from "@/lib/wetter/view";
import { kachelHimmel, kachelLage, kachelWind, kachelZeile, zweiStunden } from "@/lib/wetter/kachel";
import { windLevel, windLine, windSpoken, windZeigen } from "@/lib/wetter/wind";
import { useForecast } from "@/lib/wetter/client";
import { tomorrowLabel, weekdayShort } from "@/lib/kalender/model";
import { shortClock } from "@/components/notizen/Schnellnotiz";
import { WeatherSymbol, Windsock } from "@/components/wetter/WeatherSymbol";
import { HimmelMuster } from "@/components/wetter/HimmelMuster";
import { TILE, TILE_LABEL } from "@/components/ui/styles";

const BOX = `${TILE} wx-himmel flex w-full flex-col overflow-hidden p-3.5 text-left`;
const LABEL = `relative flex items-center gap-1.5 ${TILE_LABEL}`;

export function WeatherTile({
  size = "S",
  half = false,
  today,
  minutes,
  look = "farbig",
  tomorrow = false,
}: {
  size?: TileSize;
  half?: boolean;
  today: string;
  minutes: number;
  /** Look der Startseite: „Farbig“ = Himmel, „Schlicht“ = weiß mit farbigem Symbol */
  look?: AppLook;
  /** Feierabend: das Wetter von morgen (klein) */
  tomorrow?: boolean;
}) {
  const { forecast, stale, failed, place } = useForecast();
  const label = `Wetter · ${place}`;
  if (!forecast)
    return (
      <Link href="/wetter" className={`${BOX} min-h-[92px]`} data-himmel={look === "schlicht" ? "schlicht" : "bewoelkt"} aria-label={label}>
        <span className={LABEL}>{label}</span>
        <span className="relative mt-1 text-[14px] text-muted">{failed ? "Gerade keine Wetterdaten – ich schau gleich nochmal." : "Wetter lädt …"}</span>
      </Link>
    );
  const next = forecast.days.find((d) => d.date > today);
  if (tomorrow && next) {
    const sky = kachelHimmel(weatherGroup(next.code), false, look, next.wind ?? null);
    return (
      <Link href="/wetter?tag=morgen" className={BOX} data-himmel={sky.key} data-ton={sky.ton ?? undefined} aria-label={`Wetter ${tomorrowLabel(next.date)} · ${place} – öffnen`}>
        {sky.muster && <HimmelMuster muster={sky.muster} />}
        <span className={LABEL}>
          <span className="truncate">
            {tomorrowLabel(next.date)} · {place}
          </span>
        </span>
        <span className="relative mt-1 flex items-center gap-2">
          <WeatherSymbol code={next.code} className="h-9 w-9" />
          <span className="text-[22px] font-extrabold tabular-nums leading-none">
            {round(next.max)}°<span className="wx-soft text-[15px] font-semibold"> / {round(next.min)}°</span>
          </span>
        </span>
        <span className="relative mt-1 line-clamp-2 text-[13px] font-semibold leading-snug">{next.wet > 0 ? `${next.text}. Schirm einpacken` : next.text}</span>
      </Link>
    );
  }
  const nowHour = Math.floor(minutes / 60);
  const small = size === "S";
  const night = isNight(today, minutes);
  const wind = kachelWind(forecast, today, nowHour);
  const sky = kachelHimmel(kachelLage(forecast, today, nowHour), night, look, wind);
  const line = kachelZeile(forecast, today, nowHour, small);
  const shown = windZeigen(wind) ? wind : null;
  const words = shown ? windLine(shown) : null;
  const range = todayRange(forecast, today);
  const hours = small ? [] : zweiStunden(forecast, today, nowHour);
  const temp = round(forecast.current.temp);
  const spoken = [`${temp}°`, `${line.wort}${line.rest ? `, ${line.rest}` : ""}`, shown ? windSpoken(shown) : null].filter(Boolean).join(", ");
  return (
    <Link href="/wetter" className={BOX} data-himmel={sky.key} data-ton={sky.ton ?? undefined} data-groesse={size} aria-label={`${label}: ${spoken} – öffnen`}>
      {sky.muster && <HimmelMuster muster={sky.muster} />}
      <span className={LABEL}>
        <span className="truncate">{label}</span>
        {stale && <span className="ml-auto shrink-0 font-semibold normal-case tracking-normal">Stand {shortClock(forecast.fetchedAt)}</span>}
      </span>
      <span className={`relative flex items-center ${small ? "mt-1 gap-1.5" : "mt-2 gap-2.5"}`}>
        {sky.symbol && <WeatherSymbol code={forecast.current.code} night={night} className={small ? "h-8 w-8" : "h-11 w-11"} />}
        <span className={`${small ? "text-[30px]" : "text-[46px]"} font-extrabold tabular-nums leading-none`}>{temp}°</span>
        {shown && <Windsock level={windLevel(shown.speed)} className={small ? "h-8 w-8" : "h-12 w-12"} />}
        {!small && range && (
          <span className="wx-soft ml-auto flex flex-col items-end text-[15px] font-semibold leading-tight tabular-nums" aria-label={`Höchstens ${range.max}°, mindestens ${range.min}°`}>
            <span>↑ {range.max}°</span>
            <span>↓ {range.min}°</span>
          </span>
        )}
      </span>
      <span className={`relative ${small ? (half ? "mt-1 line-clamp-2 text-[13px]" : "mt-1 truncate text-[13px]") : "mt-2 truncate text-[17px]"} leading-snug`} data-wetter-zeile>
        <span className="font-semibold">{line.wort}</span>
        {line.rest && <span className="wx-soft"> · {line.rest}</span>}
      </span>
      {!small && words && (
        <span className="relative mt-0.5 truncate text-[15px] leading-snug" data-wind-zeile>
          <span className="font-extrabold">{words.wort}</span>
          <span className="wx-soft font-semibold"> · {words.zahl}</span>
          {words.boeen && (
            <>
              <span className="wx-soft font-semibold"> · </span>
              <span className="wx-boeen rounded-full px-1.5 py-px font-extrabold tabular-nums">{words.boeen}</span>
            </>
          )}
        </span>
      )}
      {hours.length > 0 && (
        <span className="wx-linie relative mt-3 grid grid-cols-4 border-t pt-2.5" aria-label="Nächste Stunden" data-stunden>
          {hours.map((h) => (
            <span key={h.key} className="flex flex-col items-center gap-0.5">
              <span className="wx-soft text-[13px] font-semibold tabular-nums">{h.hour}</span>
              <WeatherSymbol code={h.code} night={h.night} className="h-7 w-7" />
              <span className="text-[16px] font-extrabold tabular-nums leading-none">{h.temp}°</span>
              <span className="wx-soft flex items-center gap-0.5 text-[12px] font-semibold tabular-nums">
                <Droplet className="h-3 w-3" strokeWidth={2} aria-hidden />
                {h.rain} %
              </span>
            </span>
          ))}
        </span>
      )}
      {size === "L" && (
        <span className="wx-linie relative mt-2.5 flex flex-col gap-0.5 border-t pt-2" aria-label="Nächste Tage">
          {forecast.days.filter((d) => d.date > today).slice(0, 5).map((d) => (
            <span key={d.date} className="flex items-center gap-2 text-[13px]">
              <span className="w-7 font-bold">{weekdayShort(d.date)}</span>
              <WeatherSymbol code={d.code} className="h-5 w-5" />
              <span className="min-w-0 flex-1 truncate">{dayWords(d)}</span>
            </span>
          ))}
        </span>
      )}
    </Link>
  );
}
