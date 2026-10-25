"use client";

// Mehreres auf einmal erledigt: kompakte Übersicht unter Mias „Erledigt.“
// (Vorlage mia-uebersicht.png). Je Bereich Symbol + Überschrift + Einträge in
// einer Zeile („Mo 10:00 Zahnarzt · Fr 16:00 Turnen“), Zeile antippen = Seite
// öffnen. Unten „Alles rückgängig“ (10 s, dann bleibt alles in „Mia hat
// schon …“). Keine Zahlen.

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, CircleCheck, Heart, House, Pin, ShoppingBasket, StickyNote, Utensils, type LucideIcon } from "lucide-react";
import { CARD, chipClass } from "@/components/ui/styles";
import type { DoneGroup, DoneGroupId } from "@/lib/begleitung/uebersicht";

const ICONS: Record<DoneGroupId, LucideIcon> = {
  termine: CalendarDays,
  aufgaben: CircleCheck,
  einkauf: ShoppingBasket,
  pinnwand: Pin,
  notizen: StickyNote,
  essen: Utensils,
  haus: House,
  familie: Heart,
};

/** „Alles rückgängig“ so lange wie das einfache „Rückgängig“ */
const UNDO_MS = 10_000;

export function MiaDoneCard({ groups, undo, onOpen }: { groups: DoneGroup[]; undo?: () => void; onOpen?: () => void }) {
  const [undoShown, setUndoShown] = useState(Boolean(undo));
  const [undone, setUndone] = useState(false);
  useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => setUndoShown(false), UNDO_MS);
    return () => window.clearTimeout(t);
  }, [undo]);
  return (
    <section className={`${CARD} flex w-full max-w-[85%] flex-col gap-1 px-3 py-2 ${undone ? "opacity-50" : ""}`} aria-label="Erledigt" data-mia-uebersicht>
      <ul className="flex flex-col">
        {groups.map((g) => {
          const Icon = ICONS[g.id];
          const row = (
            <>
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-[13px] font-bold text-muted">{g.label}</span>
                <span className={`text-[15px] font-semibold leading-snug ${undone ? "line-through" : ""}`}>{g.items.join(" · ")}</span>
              </span>
            </>
          );
          return (
            <li key={g.id} data-gruppe={g.id}>
              {g.href && !undone ? (
                <Link href={g.href} onClick={onOpen} className="flex min-h-11 items-start gap-2.5 py-1.5">
                  {row}
                </Link>
              ) : (
                <div className="flex min-h-11 items-start gap-2.5 py-1.5">{row}</div>
              )}
            </li>
          );
        })}
      </ul>
      {undo && undoShown && !undone && (
        <button
          type="button"
          onClick={() => {
            undo();
            setUndone(true);
          }}
          className={`${chipClass(false, "muted")} mb-1 self-start`}
        >
          Alles rückgängig
        </button>
      )}
    </section>
  );
}
