"use client";

// WETTER (Standard S, Hintergrund-Verlauf je Wetterlage, eigenes Symbol-Set):
// S = Symbol + Temperatur + EIN Satz; M = + Morgens/Mittags/Abends; L = + die
// nächsten 5 Tage in Worten. Offline: letzte Werte mit "Stand 8:10". Antippen
// → Wetter-Seite (Heute · Morgen · 7 Tage).

import Link from "next/link";
import type { TileSize } from "@/lib/core/homeLayout";
import { round, todayRange, weatherKind, weatherTip, type TipTermin } from "@/lib/wetter/forecast";
import { dayParts, dayWords, weatherGroup } from "@/lib/wetter/view";
import { useForecast } from "@/lib/wetter/client";
import { tomorrowLabel, weekdayShort } from "@/lib/aufgaben/model";
import { shortClock } from "@/components/notizen/Schnellnotiz";
import { WeatherSymbol } from "@/components/wetter/WeatherSymbol";

const BOX = "wx-card relative flex w-full flex-col rounded-card border border-line p-3.5 text-left shadow-card";
const LABEL = "flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted";

export function WeatherTile({
  size = "S",
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
  const label = `Wetter · ${place}`;
  if (!forecast)
    return (
      <Link href="/wetter" className={`${BOX} min-h-[92px]`} aria-label={label}>
        <span className={LABEL}>{label}</span>
        <span className="mt-1 text-[14px] text-muted">{failed ? "Gerade keine Wetterdaten – ich schau gleich nochmal." : "Wetter lädt …"}</span>
      </Link>
    );
  const next = forecast.days.find((d) => d.date > today);
  if (tomorrow && next) {
    return (
      <Link href="/wetter?tag=morgen" className={BOX} data-wx={weatherGroup(next.code)} aria-label={`Wetter ${tomorrowLabel(next.date)} · ${place} – öffnen`}>
        <span className={LABEL}>
          <span className="truncate">
            {tomorrowLabel(next.date)} · {place}
          </span>
        </span>
        <span className="mt-1 flex items-center gap-2">
          <WeatherSymbol code={next.code} className="h-9 w-9" />
          <span className="text-[22px] font-extrabold tabular-nums leading-none">
            {round(next.max)}°<span className="text-[15px] font-semibold text-muted"> / {round(next.min)}°</span>
          </span>
        </span>
        <span className="mt-1 line-clamp-2 text-[13px] font-semibold leading-snug">{next.rain >= 50 ? `☂️ ${weatherKind(next.code).text} – Schirm einpacken` : weatherKind(next.code).text}</span>
      </Link>
    );
  }
  const tip = weatherTip(forecast, today, minutes, termine);
  const range = todayRange(forecast, today);
  const kind = weatherKind(forecast.current.code);
  const sentence = tip ?? `${kind.text}${range ? `, bis ${range.max}°` : ""}`;
  const parts = size === "S" ? [] : dayParts(forecast, today);
  return (
    <Link href="/wetter" className={BOX} data-wx={weatherGroup(forecast.current.code)} aria-label={`${label} – öffnen`}>
      <span className={LABEL}>
        <span className="truncate">{label}</span>
        {stale && <span className="ml-auto shrink-0 font-semibold normal-case tracking-normal">Stand {shortClock(forecast.fetchedAt)}</span>}
      </span>
      <span className="mt-1 flex items-center gap-2.5">
        <WeatherSymbol code={forecast.current.code} className={size === "S" ? "h-9 w-9" : "h-11 w-11"} />
        <span className="text-[26px] font-extrabold tabular-nums leading-none">{round(forecast.current.temp)}°</span>
        {!half && <span className="min-w-0 truncate text-[14px] text-muted">{kind.text}{range ? ` · ${range.min}° / ${range.max}°` : ""}</span>}
      </span>
      <span className={`mt-1 ${half ? "line-clamp-2" : "truncate"} text-[13px] font-semibold leading-snug`}>{sentence}</span>
      {parts.length > 0 && (
        <span className="mt-2 grid grid-cols-3 gap-2" aria-label="Morgens, mittags, abends">
          {parts.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5 rounded-xl bg-surface/60 px-2 py-1.5">
              <WeatherSymbol code={p.code} className="h-6 w-6" />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="text-[10.5px] font-bold uppercase tracking-wide text-muted">{p.label}</span>
                <span className="text-[13px] font-bold tabular-nums">{p.temp}°</span>
              </span>
            </span>
          ))}
        </span>
      )}
      {size === "L" && (
        <span className="mt-2 flex flex-col gap-0.5 border-t border-line pt-2" aria-label="Nächste Tage">
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
