"use client";

// Wetter-Seite: Stundenleiste unter der großen Karte – die nächsten 12
// Stunden (Uhrzeit, Symbol, Grad, Regen-%), waagerecht wischbar. Das Wischen
// hier blättert nicht Heute/Morgen/7 Tage um.

import { CARD } from "@/components/ui/styles";
import { WeatherSymbol } from "@/components/wetter/WeatherSymbol";
import type { Stunde } from "@/lib/wetter/view";

export function HourStrip({ hours }: { hours: Stunde[] }) {
  if (!hours.length) return null;
  const stop = (e: React.TouchEvent) => e.stopPropagation();
  return (
    <section className={`${CARD} overflow-hidden`} aria-label="Die nächsten Stunden" data-stunden>
      <ol className="flex snap-x gap-1 overflow-x-auto overscroll-x-contain px-2 py-3 [scrollbar-width:none]" onTouchStart={stop} onTouchEnd={stop}>
        {hours.map((h) => (
          <li key={h.key} className="flex w-14 shrink-0 snap-start flex-col items-center gap-1" aria-label={`${h.label}: ${h.temp} Grad, Regen ${h.rain} Prozent`}>
            <span className="text-[13px] font-semibold text-muted">{h.label}</span>
            <WeatherSymbol code={h.code} className="h-8 w-8" />
            <span className="text-[16px] font-bold tabular-nums">{h.temp}°</span>
            <span className="text-[12px] font-semibold tabular-nums text-weather-ink">{h.rain} %</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
