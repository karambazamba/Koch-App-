"use client";

// Woche Mo–So als Kreise (34 px, Tafel 25): grün gefüllt mit Haken =
// trainiert, gestrichelter grüner Ring mit Sport-Icon = geplant (volle
// Uhrzeit darunter, nie nur „18“), heute frei = oranger Ring mit „+“, sonst
// weiß halbtransparent. Ohne Zähler. Jeder Tag öffnet sein
// Fenster (eintragen, ändern, planen).

import { Check, Plus } from "lucide-react";
import { clockLabel } from "@/lib/kalender/answers";
import type { DayDot } from "@/lib/sport";
import { SportIcon } from "@/components/sport/SportIcon";

export function SportWeekRow({ dots, onDay, big = false, times = false }: { dots: DayDot[]; onDay: (date: string) => void; big?: boolean; times?: boolean }) {
  const circle = big ? "h-10 w-10" : "h-[34px] w-[34px]";
  const icon = big ? "h-[18px] w-[18px]" : "h-4 w-4";
  return (
    <ol className="grid grid-cols-7 gap-1" aria-label="Diese Woche">
      {dots.map((d) => (
        <li key={d.date}>
          <button type="button" onClick={() => onDay(d.date)} className="flex min-h-11 w-full flex-col items-center gap-1" aria-label={`${d.label}: ${d.state}${d.time ? ` ${clockLabel(d.time)}` : ""}${d.today ? " (heute)" : ""} – öffnen`}>
            <span className={`text-[11px] font-bold ${d.today ? "text-accent" : "text-muted"}`}>{d.label}</span>
            <span
              className={`flex ${circle} items-center justify-center rounded-full ${
                d.state === "trainiert"
                  ? "bg-good text-on-accent"
                  : d.state === "geplant"
                    ? "border-2 border-dashed border-good bg-tile-inner text-good-ink"
                    : d.today
                      ? "border-2 border-accent bg-tile-inner text-accent"
                      : "bg-tile-inner opacity-70"
              }`}
            >
              {d.state === "trainiert" ? <Check className={icon} strokeWidth={3} aria-hidden /> : d.state === "geplant" ? <SportIcon sport={d.sport ?? "fitness"} className={icon} /> : d.today ? <Plus className={icon} strokeWidth={2.5} aria-hidden /> : null}
            </span>
            {times && <span className="h-3.5 text-[10px] font-bold leading-none tabular-nums text-good-ink">{d.time ? clockLabel(d.time) : ""}</span>}
          </button>
        </li>
      ))}
    </ol>
  );
}
