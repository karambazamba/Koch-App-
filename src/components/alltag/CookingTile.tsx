"use client";

// Essen-Kachel beim Kochen (L, ganz oben): "ESSEN · 18:30 · 4 PERSONEN",
// Gericht groß, Rezept-Schritte zum Abhaken (aktueller fett mit "JETZT",
// erledigte durchgestrichen); Schritte mit Zeitangabe haben einen kleinen
// ⏱-Knopf (startet einen Timer mit Schrittname und Dauer); "Rezept groß öffnen ›"
// (Vollbild-Kochansicht). Ohne Schritte: Gericht + Zutaten-Status. Unten
// "Gegessen" – beendet das Kochen.

import Link from "next/link";
import { Check, Timer as TimerIcon, UtensilsCrossed } from "lucide-react";
import { CARD, buttonClass } from "@/components/ui/styles";
import { clockLabel } from "@/lib/aufgaben/answers";
import type { Recipe } from "@/lib/essen/cookbook";
import { matchStock } from "@/lib/essen/dishIdeas";
import { useStock } from "@/lib/essen/useStock";
import { currentStep, stepMinutes, stepTimerName, toggleStep, useCooking } from "@/lib/kochen/session";
import { startTimer } from "@/lib/timer/actions";
import { buzz } from "./actions";

export function CookingTile({ dish, clock, persons, recipe, today, onEaten }: { dish: string; clock: string | null; persons: number | null; recipe: Recipe | undefined; today: string; onEaten: () => void }) {
  const session = useCooking(today);
  const stock = useStock();
  const steps = recipe?.steps ?? [];
  const key = recipe?.id ?? dish;
  const done = session?.steps[key] ?? [];
  const cur = currentStep(steps.length, done);
  const needs = recipe && stock ? matchStock(recipe.ingredients.map((i) => i.name), stock).needs : null;
  const head = ["Essen", clock ? clockLabel(clock) : "", persons ? `${persons} ${persons === 1 ? "Person" : "Personen"}` : ""].filter(Boolean).join(" · ");
  return (
    <section className={`${CARD} relative flex flex-col gap-2 p-4`} aria-label={`Kochen: ${dish}`}>
      <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted">
        <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} aria-hidden />
        {head}
      </span>
      <h2 className="text-[24px] font-extrabold leading-tight tracking-tight">{dish}</h2>
      {steps.length > 0 ? (
        <ol className="flex flex-col" aria-label="Schritte">
          {steps.map((step, i) => {
            const isDone = done.includes(i);
            const now = i === cur;
            const min = stepMinutes(step);
            return (
              <li key={i} className="flex items-start gap-2 border-t border-line py-1.5 first:border-t-0">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isDone}
                  aria-label={`Schritt ${i + 1} ${isDone ? "wieder öffnen" : "abhaken"}`}
                  onClick={() => {
                    buzz();
                    toggleStep(key, i);
                  }}
                  className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center"
                >
                  <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${isDone ? "border-accent bg-accent text-on-accent" : now ? "border-accent" : "border-line-strong"}`}>
                    {isDone && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}
                  </span>
                </button>
                <span className={`min-w-0 flex-1 pt-0.5 text-[15px] leading-snug ${isDone ? "text-muted line-through" : now ? "font-bold" : ""}`}>
                  {now && <span className="mr-1.5 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-accent-strong no-underline">Jetzt</span>}
                  {step}
                </span>
                {min && !isDone && (
                  <button
                    type="button"
                    onClick={() => {
                      if (startTimer({ minutes: min, name: stepTimerName(step), step })) buzz();
                    }}
                    aria-label={`Timer ${min} Minuten: ${stepTimerName(step)}`}
                    className="-my-1 flex h-9 shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2.5 text-[12px] font-bold text-accent-strong active:scale-95"
                  >
                    <TimerIcon className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                    {min}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-[14px] text-muted">{needs ? (needs.length ? `auf die Liste: ${needs.slice(0, 4).join(", ")}` : "alles im Haus") : "Guten Appetit beim Kochen!"}</p>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {recipe && (
          <Link href={`/kochbuch/kochen?id=${encodeURIComponent(recipe.id)}`} className="text-sm font-bold text-accent-strong">
            Rezept groß öffnen ›
          </Link>
        )}
        <span className="flex-1" />
        <button type="button" onClick={onEaten} className={buttonClass("soft", "sm")}>
          Gegessen
        </button>
      </div>
    </section>
  );
}
