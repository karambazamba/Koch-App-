"use client";

// /wetter: Heute · Morgen · 7 Tage (Umschalter, auch wischen, Punkte). Ab 18
// Uhr öffnet die Seite auf "Morgen". Heute/Morgen: farbige Kopfkarte, ein
// Satz mit Bezug auf Termine, drei Karten MORGENS/MITTAGS/ABENDS mit
// Tipp-Chips. 7 Tage: Liste in Worten, bester Tag "☀ draußen" und die Karte
// "Bester Tag für draußen"; Tag antippen = Einzelheiten. Keine Balken, keine
// Stunden-Tabellen.

import Link from "next/link";
import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { CARD, PAGE_MAIN, chipClass } from "@/components/ui/styles";
import { itemsForDay, tomorrowLabel, weekdayLong, weekdayShort } from "@/lib/aufgaben/model";
import { useEntries } from "@/lib/aufgaben/store";
import { addDays, toIsoDate, useMinutes, useToday } from "@/lib/core/now";
import { round, weatherKind, type Forecast, type ForecastDay, type TipTermin } from "@/lib/wetter/forecast";
import { bestOutdoorDay, dayExtras, dayParts, daySentence, dayWords, weatherGroup, weatherStartTab, type DayPart } from "@/lib/wetter/view";
import { useForecast } from "@/lib/wetter/client";
import { WeatherSymbol } from "./WeatherSymbol";

type Tab = "heute" | "morgen" | "woche";
const TABS: { id: Tab; label: string }[] = [
  { id: "heute", label: "Heute" },
  { id: "morgen", label: "Morgen" },
  { id: "woche", label: "7 Tage" },
];

export function WeatherView() {
  const params = useSearchParams();
  const { forecast, failed, place } = useForecast();
  const entries = useEntries();
  const day = useToday();
  const minutes = useMinutes();
  const asked = params.get("tag");
  const [tab, setTab] = useState<Tab | null>(asked === "morgen" || asked === "woche" || asked === "heute" ? asked : null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  if (!day || minutes === undefined) return null;
  const today = toIsoDate(day);
  const shown: Tab = tab ?? weatherStartTab(minutes);
  const termineOf = (date: string): TipTermin[] =>
    (entries ? itemsForDay(entries, date, today) : []).flatMap((i) => (i.entry.typ === "termin" && i.time && !i.done ? [{ title: i.title, time: i.time }] : []));
  const index = TABS.findIndex((t) => t.id === shown);
  const go = (i: number) => setTab(TABS[Math.max(0, Math.min(TABS.length - 1, i))].id);
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title={`Wetter · ${place}`} backHref="/" />
      <main
        className={`${PAGE_MAIN} gap-4`}
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const start = touch.current;
          touch.current = null;
          if (!start) return;
          const dx = e.changedTouches[0].clientX - start.x;
          const dy = e.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1));
        }}
      >
        <div className="flex rounded-full bg-segment p-1" role="tablist" aria-label="Zeitraum">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={shown === t.id} onClick={() => setTab(t.id)} className={`hit h-10 flex-1 rounded-full text-[15px] font-bold ${shown === t.id ? "bg-surface text-ink shadow-card" : "text-muted"}`}>
              {t.label}
            </button>
          ))}
        </div>
        {!forecast ? (
          <p className="px-1 text-base text-muted">{failed ? "Gerade keine Wetterdaten – ich schau gleich nochmal." : "Wetter lädt …"}</p>
        ) : shown === "woche" ? (
          <WeekTab forecast={forecast} today={today} />
        ) : (
          <DayTab forecast={forecast} date={shown === "heute" ? today : addDays(today, 1)} today={today} minutes={minutes} termine={termineOf(shown === "heute" ? today : addDays(today, 1))} />
        )}
        <div className="flex justify-center gap-1.5" aria-hidden>
          {TABS.map((t) => (
            <span key={t.id} className={`h-1.5 w-1.5 rounded-full ${shown === t.id ? "bg-ink" : "bg-line"}`} />
          ))}
        </div>
        <p className="px-1 text-center text-xs text-muted">
          {sourceLine(forecast?.source)} ·{" "}
          <Link href="/profil/wetter" className="font-semibold underline">
            Ort ändern
          </Link>
        </p>
      </main>
    </div>
  );
}

/** Heute bzw. Morgen: Kopfkarte, ein Satz, Morgens/Mittags/Abends */
/** Quellenzeile: DWD über Bright Sky bzw. Open-Meteo (DWD ICON) */
const sourceLine = (source: Forecast["source"]) =>
  source === "icon" ? "Daten: Open-Meteo (DWD ICON)" : source === "mock" ? "Daten: Testmodus" : "Daten: Deutscher Wetterdienst (über Bright Sky)";

function DayTab({ forecast, date, today, minutes, termine }: { forecast: Forecast; date: string; today: string; minutes: number; termine: TipTermin[] }) {
  const d = forecast.days.find((x) => x.date === date);
  const isToday = date === today;
  const code = isToday ? forecast.current.code : (d?.code ?? 3);
  const sentence = daySentence(forecast, date, termine, isToday ? Math.floor(minutes / 60) : 0);
  const parts = dayParts(forecast, date);
  return (
    <>
      <section className="wx-card flex flex-col gap-2 rounded-card border border-line p-5 shadow-card" data-wx={weatherGroup(code)} aria-label={isToday ? "Heute" : tomorrowLabel(date)}>
        <span className="text-[15px] font-extrabold text-muted">{isToday ? "Heute" : tomorrowLabel(date)}</span>
        <span className="flex items-center gap-4">
          <WeatherSymbol code={code} className="h-16 w-16" />
          <span className="flex flex-col">
            <span className="text-[40px] font-extrabold tabular-nums leading-none">{round(isToday ? forecast.current.temp : (d?.max ?? 0))}°</span>
            <span className="text-[15px] text-muted">
              {isToday ? (forecast.current.raining ? "Gerade Regen" : d?.text ?? weatherKind(code).text) : (d?.text ?? weatherKind(code).text)}
              {d ? ` · ${round(d.min)}° / ${round(d.max)}°` : ""}
            </span>
          </span>
        </span>
        {sentence && <p className="text-[16px] font-semibold leading-snug">{sentence}</p>}
      </section>
      <div className="flex flex-col gap-2">
        {parts.map((p) => (
          <PartCard key={p.id} part={p} />
        ))}
      </div>
    </>
  );
}

function PartCard({ part }: { part: DayPart }) {
  return (
    <section className={`${CARD} flex items-center gap-3 p-4`} aria-label={part.label}>
      <WeatherSymbol code={part.code} className="h-10 w-10" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px] font-extrabold text-muted">{part.label}</span>
        <span className="text-[17px] font-bold">
          {part.temp}° <span className="text-[15px] font-medium text-muted">{part.text}</span>
        </span>
      </span>
      {part.tips.length > 0 && (
        <span className="flex flex-col items-end gap-1">
          {part.tips.map((t) => (
            <span key={t} className={`${chipClass(false)} pointer-events-none whitespace-nowrap`}>
              {t}
            </span>
          ))}
        </span>
      )}
    </section>
  );
}

/** 7 Tage in Worten, bester Tag für draußen */
function WeekTab({ forecast, today }: { forecast: Forecast; today: string }) {
  const [open, setOpen] = useState<ForecastDay | null>(null);
  const best = bestOutdoorDay(forecast, today);
  const name = (iso: string) => (iso === today ? "Heute" : iso === addDays(today, 1) ? tomorrowLabel(iso) : weekdayLong(iso));
  return (
    <>
      {best && (
        <section className="wx-card flex items-center gap-3 rounded-card border border-line p-4 shadow-card" data-wx={weatherGroup(best.code)} aria-label="Bester Tag für draußen">
          <WeatherSymbol code={best.code} className="h-11 w-11" />
          <span className="flex flex-col">
            <span className="text-[15px] font-extrabold text-muted">Bester Tag für draußen</span>
            <span className="text-[17px] font-bold">{name(best.date)}</span>
            <span className="text-[14px] text-muted">{dayWords(best)}</span>
          </span>
        </section>
      )}
      <ul className={`${CARD} divide-y divide-line overflow-hidden`}>
        {forecast.days.filter((d) => d.date >= today).map((d) => (
          <li key={d.date}>
            <button type="button" onClick={() => setOpen(d)} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left" aria-label={`${name(d.date)}: ${dayWords(d)} – Einzelheiten`}>
              <span className="w-10 text-[15px] font-bold">{d.date === today ? "Heute" : weekdayShort(d.date)}</span>
              <WeatherSymbol code={d.code} className="h-8 w-8" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px]">{dayWords(d)}</span>
                {dayExtras(d).sun && <span className="text-xs text-muted">{dayExtras(d).sun}</span>}
              </span>
              {dayExtras(d).rain && <span className="shrink-0 text-[13px] font-semibold text-weather-ink">{dayExtras(d).rain}</span>}
              {best?.date === d.date && <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent-strong">☀ draußen</span>}
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <Sheet title={name(open.date)} onClose={() => setOpen(null)}>
          <div className="flex flex-col gap-2 pb-3">
            <p className="text-base">
              {dayWords(open)}
              {open.rain >= 30 ? ` · Regenrisiko ${open.rain} %` : ""}
              {open.sun >= 0.5 ? ` · etwa ${Math.round(open.sun)} Std. Sonne` : ""}
            </p>
            {dayParts(forecast, open.date).map((p) => (
              <PartCard key={p.id} part={p} />
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}
