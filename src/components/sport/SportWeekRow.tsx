"use client";

// Woche Mo–So als Kreise: grün gefüllt = trainiert, grüner Rand = geplant,
// leer = frei; heute mit orangem Ring. Ohne Zähler. Jeder Tag öffnet sein
// Fenster (eintragen, ändern, planen).

import { Check } from "lucide-react";
import { clockLabel } from "@/lib/aufgaben/answers";
import type { DayDot } from "@/lib/sport";

export function SportWeekRow({ dots, onDay, big = false }: { dots: DayDot[]; onDay: (date: string) => void; big?: boolean }) {
  const circle = big ? "h-10 w-10" : "h-8 w-8";
  return (
    <ol className="grid grid-cols-7 gap-1" aria-label="Diese Woche">
      {dots.map((d) => (
        <li key={d.date}>
          <button type="button" onClick={() => onDay(d.date)} className="flex min-h-11 w-full flex-col items-center gap-1" aria-label={`${d.label}: ${d.state}${d.time ? ` ${d.time}` : ""}${d.today ? " (heute)" : ""} – öffnen`}>
            <span className={`text-[11px] font-semibold ${d.today ? "text-tile-accent" : "text-muted"}`}>{d.label}</span>
            <span
              className={`flex ${circle} items-center justify-center rounded-full text-[10px] font-bold ${
                d.state === "trainiert" ? "bg-good text-on-accent" : d.state === "geplant" ? "border-2 border-good text-good-ink" : "border-2 border-line"
              } ${d.today ? "ring-2 ring-tile-accent ring-offset-2 ring-offset-tile" : ""}`}
            >
              {d.state === "trainiert" ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> : d.state === "geplant" ? clockLabel(d.time ?? "").replace(/:00$/, "") : ""}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
