"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { personLabel, type Person } from "@/lib/profile";

type Props = {
  /** Personen in der Leiste (z. B. nur die ausgewählten) */
  persons: Person[];
  /** Alle Personen – für Bezeichnungen wie "Kind 2", falls kein Name */
  everyone?: Person[];
  index: number;
  /** IDs der Personen, die in diesem Schritt schon erledigt sind */
  doneIds: string[];
  onSelect: (index: number) => void;
  children: ReactNode;
};

/**
 * Eine Person pro Ansicht: oben eine Leiste mit allen Personen als Chips,
 * darunter nur die Karte der aktuellen Person. (Wischen übernimmt der
 * Assistent: links = Weiter, also zur nächsten Person.)
 */
export function PersonSwitcher({
  persons,
  everyone = persons,
  index,
  doneIds,
  onSelect,
  children,
}: Props) {
  const barRef = useRef<HTMLDivElement>(null);

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
        data-no-swipe
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
              {personLabel(person, everyone)}
            </button>
          );
        })}
      </div>

      <div>{children}</div>
    </>
  );
}
