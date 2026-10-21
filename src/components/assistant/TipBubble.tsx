"use client";

import { useEffect, useState } from "react";
import { Sprout } from "lucide-react";
import { chipClass } from "@/components/ui/styles";
import type { Recipe } from "@/lib/essen/cookbook";
import { declineTip, markTipShown, tryTip, undoTip, type HealthTip } from "@/lib/essen/healthTips";
import { useHealthTip } from "./useHealthTip";

const BUBBLE = "max-w-[85%] self-start whitespace-pre-line rounded-card rounded-bl-md border border-line bg-surface px-4 py-2.5 text-base leading-snug text-ink";

/**
 * Sanfter Gesundheits-Tipp im Chat: konkreter Tausch für ein geplantes
 * Rezept mit "Ausprobieren" (ändert nur dieses Rezept) oder "Nein danke".
 */
export function TipBubble({ recipes }: { recipes: Record<string, Recipe> }) {
  const current = useHealthTip();
  const [done, setDone] = useState<{ tip: HealthTip; previous: Recipe | null; how: "tried" | "declined" | "undone" } | null>(null);
  const key = current?.tip.key;
  const weekStart = current?.weekStart;

  // Zählt fürs Wochenlimit, sobald er im Chat steht
  useEffect(() => {
    if (key && weekStart) markTipShown(weekStart, key);
  }, [key, weekStart]);

  if (done) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className={BUBBLE}>
          {done.how === "tried"
            ? `Ausprobiert ✓ Steht jetzt so im Rezept „${done.tip.title}“ – auch auf der Einkaufsliste.`
            : done.how === "undone"
              ? "Okay, wieder wie vorher."
              : "Alles klar – bleibt, wie es ist."}
        </p>
        {done.how === "tried" && done.previous && (
          <button
            type="button"
            onClick={() => {
              undoTip(done.tip, done.previous!);
              setDone({ ...done, how: "undone" });
            }}
            className={chipClass(false, "muted")}
          >
            Rückgängig
          </button>
        )}
      </div>
    );
  }
  if (!current) return null;
  const { tip } = current;
  const recipe = recipes[tip.recipeId];
  if (!recipe) return null;

  return (
    <div className="flex flex-col items-start gap-2" aria-label="Tipp">
      <p className={BUBBLE}>
        <Sprout className="mr-1.5 inline h-4 w-4 align-[-2px] text-accent" strokeWidth={2} aria-hidden />
        Kleiner Tipp für {tip.title} ({tip.weekday}): {tip.text}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setDone({ tip, previous: tryTip(tip, recipe), how: "tried" })}
          className={chipClass(true)}
        >
          Ausprobieren
        </button>
        <button
          type="button"
          onClick={() => {
            declineTip(tip);
            setDone({ tip, previous: null, how: "declined" });
          }}
          className={chipClass(false, "muted")}
        >
          Nein danke
        </button>
      </div>
    </div>
  );
}
