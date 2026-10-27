"use client";

// Essen-Kachel beim Kochen: dasselbe Gerichtsbild wie die Essen-Kachel
// (`DishTile`, Bild vollflächig, Name unten weiß auf Verlauf). Darüber klein
// „Koche gerade“, darunter – wenn im Kochmodus schon Schritte abgehakt sind –
// „Schritt 3 von 6“. Unten links „Kochmodus ›“, unten rechts der weiße Knopf
// „Gegessen“ (beendet das Kochen). Antippen öffnet den Kochmodus.

import type { Recipe } from "@/lib/essen/cookbook";
import { useCooking } from "@/lib/essen/kochSession";
import { kachelBild, kochSchrittZeile } from "@/lib/heute/essenKachel";
import { DishTile } from "@/components/essen/DishTile";

export function CookingTile({ dish, recipe, today, half, onOpen, onEaten }: { dish: string; recipe: Recipe | undefined; today: string; half: boolean; onOpen: () => void; onEaten: () => void }) {
  const session = useCooking(today);
  const steps = recipe?.steps ?? [];
  const step = kochSchrittZeile(steps.length, session?.steps[recipe?.id ?? dish] ?? []);
  const href = recipe ? `/kochbuch/kochen?id=${encodeURIComponent(recipe.id)}` : undefined;
  const picture = kachelBild({ kind: "kocht", title: dish }, recipe && { ingredients: recipe.ingredients.map((i) => i.name), category: recipe.category });
  return (
    <DishTile
      when="Koche gerade"
      title={dish}
      sub={step ?? undefined}
      picture={picture}
      open={href ?? onOpen}
      cook={href}
      cookLabel="Kochmodus ›"
      half={half}
      label={`Koche gerade · ${dish}${step ? ` · ${step}` : ""}`}
      action={
        <button type="button" onClick={onEaten} className="absolute bottom-0 right-0 flex h-11 items-center px-2.5 active:scale-95">
          <span className="flex h-8 items-center rounded-full bg-on-color px-3.5 text-[13px] font-extrabold text-on-photo-ink shadow-card">Gegessen</span>
        </button>
      }
    />
  );
}
