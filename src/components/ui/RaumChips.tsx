"use client";

// Die EINE Raum-Wahl (A-034): drei Chips „Familie · Ich · Arbeit“ (allein
// „Privat · Arbeit“), immer in dieser Reihenfolge und in den Raumfarben
// Orange · Grau · Blau. Überall gleich: Schnelleingabe (＋), Mias Bestätigung,
// Detail-Fenster, Bearbeiten. Mia wählt vor – der passende Chip ist schon
// aktiv; beim allerersten Mal steht darunter „Hab Familie gewählt. Tippen zum
// Ändern.“ Logik in `lib/kalender/raum/`.

import { Lock } from "lucide-react";
import type { Room } from "@/lib/core/entries";
import { raumLabel, raumWahl, type Haushalt } from "@/lib/core/haushalt";

/** Farben eines aktiven Raum-Chips (auch für den kleinen Chip unter Mias Bestätigung) */
export const RAUM_AKTIV: Record<Room, string> = {
  familie: "border-accent bg-accent-soft text-accent-strong",
  ich: "border-ich bg-ich-soft text-ich",
  arbeit: "border-work bg-work-soft text-work",
};

/** Tastatur bleibt auf, wenn ein Chip im Eingabe-Fenster angetippt wird */
const halten = (e: { preventDefault: () => void }) => e.preventDefault();

export function RaumChips({ value, haushalt, onChange, hinweis, label = "Wer sieht es?" }: { value: Room; haushalt: Haushalt; onChange: (r: Room) => void; hinweis?: string | null; label?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div role="radiogroup" aria-label={label} className="flex min-w-0 gap-1.5" data-raum-chips>
        {raumWahl(haushalt).map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={value === r}
            onPointerDown={halten}
            onClick={() => onChange(r)}
            data-raum={r}
            className={`hit inline-flex h-9 min-w-0 shrink items-center gap-1 rounded-full border px-2.5 text-[15px] font-bold transition active:scale-95 ${value === r ? RAUM_AKTIV[r] : "border-line bg-surface text-muted"}`}
          >
            {r === "ich" && <Lock className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />}
            <span className="truncate">{raumLabel(r, haushalt)}</span>
          </button>
        ))}
      </div>
      {hinweis && (
        <p className="px-1 text-[13px] text-muted" data-raum-hinweis>
          {hinweis}
        </p>
      )}
    </div>
  );
}
