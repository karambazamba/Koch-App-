"use client";

// Rezeptseite „So geht’s“ (Tafel 122 Nachtrag): rechts der Umschalter „Kurz |
// Ausführlich“ (Standard Kurz, die letzte Wahl merkt sich das Gerät). Kurz =
// Schnellanleitung, jeder Schritt eine Zeile, alle sichtbar. Zeiten stehen
// als Chip daneben und starten denselben Timer wie im Kochmodus. Schritt
// antippen = durchgestrichen (nur heute). Am Ende „Gegessen“ beim Gericht von
// heute – macht dasselbe wie im Kochmodus. `vorschau` (A-038): nur lesen, der
// Umschalter bleibt, kein Durchstreichen, keine Timer.

import { Timer } from "lucide-react";
import { CARD, SECTION_TITLE, buttonClass } from "@/components/ui/styles";
import { Segmented } from "@/components/ui/Segmented";
import { todayIso } from "@/lib/core/now";
import type { Recipe } from "@/lib/essen/cookbook";
import { kurzSchritte, ohneZeit, schrittZeiten } from "@/lib/essen/kurz";
import { setRezeptAnsicht, useRezeptAnsicht, type RezeptAnsicht } from "@/lib/essen/kurz/ansicht";
import { stepTimerName, toggleStep, useCooking } from "@/lib/essen/kochSession";
import { startStepTimer } from "@/lib/timer/actions";

const WAHL: { value: RezeptAnsicht; label: string }[] = [
  { value: "kurz", label: "Kurz" },
  { value: "lang", label: "Ausführlich" },
];

export function RezeptSchritte({ recipe, kids, onGegessen, vorschau = false }: { recipe: Recipe; kids: boolean; onGegessen?: () => void; vorschau?: boolean }) {
  const ansicht = useRezeptAnsicht();
  const session = useCooking(todayIso());
  const struck = session?.steps[recipe.id] ?? [];
  const lines = ansicht === "kurz" ? kurzSchritte(recipe) : recipe.steps;
  return (
    <section className={`${CARD} p-4`} aria-label="So geht’s" data-so-gehts={ansicht}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className={SECTION_TITLE}>So geht’s</h2>
        <div className="w-48 shrink-0">
          <Segmented value={ansicht} options={WAHL} onChange={setRezeptAnsicht} label="Anleitung" />
        </div>
      </div>
      <ol className="divide-y divide-line">
        {lines.map((line, index) => {
          const done = struck.includes(index);
          const full = recipe.steps[index] ?? line;
          if (vorschau)
            return (
              <li key={index} className="flex min-h-10 items-start gap-3 py-2 text-base" data-schritt>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-bold text-accent-strong">{index + 1}</span>
                <span className="min-w-0 pt-px">{line}</span>
              </li>
            );
          return (
            <li key={index} className="flex min-h-11 items-center gap-2" data-schritt>
              <button type="button" role="checkbox" aria-checked={done} onClick={() => toggleStep(recipe.id, index)} className="flex min-h-11 min-w-0 flex-1 items-start gap-3 py-2 text-left text-base">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${done ? "bg-fill text-muted" : "bg-accent-soft text-accent-strong"}`}>{index + 1}</span>
                <span className={`min-w-0 pt-px ${done ? "text-muted line-through" : ""}`}>
                  {kids && recipe.kidSteps.includes(index) && <span className="mr-1 font-semibold text-accent-strong">Kinder:</span>}
                  {ohneZeit(line)}
                </span>
              </button>
              {schrittZeiten(line).map((z) => (
                <button
                  key={z.text}
                  type="button"
                  onClick={() => startStepTimer(full, z.min, stepTimerName(line))}
                  aria-label={`Timer ${z.min} Minuten`}
                  className="hit flex h-8 shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2.5 text-[13px] font-bold text-accent-strong active:scale-95"
                  data-timer-chip
                >
                  <Timer className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                  {z.text}
                </button>
              ))}
            </li>
          );
        })}
      </ol>
      {onGegessen && (
        <button type="button" onClick={onGegessen} className={`${buttonClass("secondary", "lg")} mt-3 w-full`} data-gegessen>
          Gegessen
        </button>
      )}
    </section>
  );
}
