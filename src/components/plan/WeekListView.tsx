"use client";

import { useRef, useState } from "react";
import { ChevronRight, GripVertical } from "lucide-react";
import type { PlanDay } from "@/lib/mealPlan";
import { dayDot, dishTitle } from "./DayView";

type Drag = { from: string; startY: number; y: number; over: string | null };

/**
 * Woche als kompakte Liste: eine Zeile pro Tag. Gerichte am Griff ziehen
 * (Maus oder Finger) und auf einem anderen Tag loslassen = tauschen.
 */
export function WeekListView({
  days,
  todayIso,
  readOnly,
  onOpen,
  onMove,
}: {
  days: PlanDay[];
  todayIso: string;
  readOnly: boolean;
  onOpen: (weekday: string) => void;
  onMove: (from: PlanDay, to: PlanDay) => void;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());

  /** Tag unter dem Finger (nur Tage ohne Ausflug; die gezogene Zeile selbst zählt nicht) */
  const dayAt = (y: number, from: string): string | null => {
    for (const d of days) {
      const el = rows.current.get(d.weekday);
      if (!el || d.away || d.weekday === from) continue;
      const r = el.getBoundingClientRect();
      if (y >= r.top && y <= r.bottom) return d.weekday;
    }
    return null;
  };

  return (
    <ul className="overflow-hidden rounded-card border border-line bg-surface shadow-card" aria-label="Woche">
      {days.map((d) => {
        const dragging = drag?.from === d.weekday;
        const target = drag && drag.over === d.weekday && drag.from !== d.weekday;
        const canDrag = !readOnly && !d.away && Boolean(d.slot.entry);
        return (
          <li
            key={d.weekday}
            ref={(el) => {
              if (el) rows.current.set(d.weekday, el);
              else rows.current.delete(d.weekday);
            }}
            data-weekday={d.weekday}
            className={`relative border-b border-line bg-surface last:border-b-0 ${dragging ? "z-10 shadow-sheet" : ""} ${target ? "bg-accent-soft" : ""}`}
            style={dragging ? { transform: `translateY(${drag.y - drag.startY}px)` } : undefined}
          >
            <div className="flex min-h-14 items-center">
              <button
                type="button"
                onClick={() => onOpen(d.weekday)}
                className="flex min-w-0 flex-1 items-center gap-3 py-2 pl-4 text-left active:bg-stone-50"
              >
                <span className={`w-8 shrink-0 text-sm font-bold ${d.date === todayIso ? "text-accent-strong" : "text-muted"}`}>
                  {d.weekday.slice(0, 2)}
                </span>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dayDot(d)}`} aria-hidden />
                <span className={`min-w-0 flex-1 truncate ${d.slot.entry ? "font-semibold" : "text-muted"}`}>
                  {d.paused ? "Pause ☀️" : d.away ? "Ausflug" : d.slot.entry ? dishTitle(d) : d.weekend === "frei" ? "Wochenende frei 🏖" : d.cheat ? "Cheat Day 🍕" : "frei"}
                </span>
                {readOnly && <ChevronRight className="mr-2 h-5 w-5 shrink-0 text-stone-300" strokeWidth={2.25} aria-hidden />}
              </button>
              {canDrag && (
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`${d.slot.entry!.title} ziehen`}
                  data-drag-handle
                  className="flex h-14 w-12 shrink-0 cursor-grab items-center justify-center text-stone-400 active:cursor-grabbing"
                  style={{ touchAction: "none" }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setDrag({ from: d.weekday, startY: e.clientY, y: e.clientY, over: d.weekday });
                  }}
                  onPointerMove={(e) => {
                    if (!drag) return;
                    setDrag({ ...drag, y: e.clientY, over: dayAt(e.clientY, drag.from) });
                  }}
                  onPointerUp={() => {
                    if (drag?.over && drag.over !== drag.from) {
                      const from = days.find((x) => x.weekday === drag.from);
                      const to = days.find((x) => x.weekday === drag.over);
                      if (from && to) onMove(from, to);
                    }
                    setDrag(null);
                  }}
                  onPointerCancel={() => setDrag(null)}
                >
                  <GripVertical className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
              )}
              {!canDrag && !readOnly && <span className="w-12 shrink-0" aria-hidden />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
