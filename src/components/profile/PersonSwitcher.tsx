"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Check } from "lucide-react";
import { chipClass } from "@/components/ui/styles";
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
              className={`${
                current ? "inline-flex min-h-10 items-center gap-1.5 rounded-full border border-accent bg-accent px-3.5 py-1.5 text-[15px] font-semibold text-on-accent transition active:scale-95" : chipClass(false)
              } h-11 shrink-0`}
            >
              {done && (
                <Check
                  className={`h-4 w-4 ${current ? "" : "text-accent"}`}
                  strokeWidth={2.75}
                  aria-label="erledigt"
                  role="img"
                />
              )}
              {personLabel(person, everyone)}
            </button>
          );
        })}
      </div>

      <div>{children}</div>
    </>
  );
}
