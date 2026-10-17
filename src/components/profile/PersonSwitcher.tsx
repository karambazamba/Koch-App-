"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { personLabel, type Person } from "@/lib/profile";

/** Mindestweg in Pixeln, ab dem eine waagrechte Wischbewegung zählt */
const SWIPE_DISTANCE = 60;

type Props = {
  persons: Person[];
  index: number;
  /** IDs der Personen, die in diesem Schritt schon erledigt sind */
  doneIds: string[];
  onSelect: (index: number) => void;
  children: ReactNode;
};

/**
 * Eine Person pro Ansicht: oben eine Leiste mit allen Personen als Chips,
 * darunter nur die Karte der aktuellen Person. Wischen nach links/rechts
 * wechselt zur nächsten/vorherigen Person.
 */
export function PersonSwitcher({ persons, index, doneIds, onSelect, children }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Aktuellen Chip in der waagrecht scrollbaren Leiste mittig halten. Nur die
  // Leiste scrollen – scrollIntoView würde auch die Seite verschieben und das
  // Hochscrollen beim Personenwechsel unterbrechen.
  useEffect(() => {
    const bar = barRef.current;
    const chip = bar?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!bar || !chip) return;
    const left = chip.offsetLeft - (bar.clientWidth - chip.offsetWidth) / 2;
    bar.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [index]);

  return (
    <>
      <div
        ref={barRef}
        role="tablist"
        aria-label="Personen"
        className="relative -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
      >
        {persons.map((person, i) => {
          const current = i === index;
          const done = doneIds.includes(person.id);
          return (
            <button
              key={person.id}
              type="button"
              role="tab"
              aria-selected={current}
              aria-current={current ? "step" : undefined}
              onClick={() => onSelect(i)}
              className={`flex h-12 shrink-0 items-center gap-1.5 rounded-full border-2 px-4 text-base font-bold transition active:scale-95 ${
                current
                  ? "border-orange-500 bg-orange-500 text-white"
                  : done
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-stone-200 bg-white text-stone-700"
              }`}
            >
              {done && <span aria-label="erledigt">✓</span>}
              {personLabel(person, persons)}
            </button>
          );
        })}
      </div>

      <div
        onTouchStart={(e) => {
          const t = e.touches[0];
          touchStart.current = t ? { x: t.clientX, y: t.clientY } : null;
        }}
        onTouchEnd={(e) => {
          const start = touchStart.current;
          const t = e.changedTouches[0];
          touchStart.current = null;
          if (!start || !t) return;
          // In Textfeldern verschiebt Wischen den Cursor – nicht die Person.
          if ((e.target as HTMLElement).closest("input, textarea")) return;
          const dx = t.clientX - start.x;
          const dy = t.clientY - start.y;
          if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
          if (dx < 0 && index < persons.length - 1) onSelect(index + 1);
          if (dx > 0 && index > 0) onSelect(index - 1);
        }}
      >
        {children}
      </div>
    </>
  );
}
