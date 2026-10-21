"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";
import { KID_FRIENDLY } from "@/lib/essen/baking";
import type { Recipe } from "@/lib/essen/cookbook";
import { dishTone } from "@/lib/essen/dishLook";
import { DishPicture } from "@/components/alltag/DishPicture";

/** Backwunsch: bis zu drei Rezepte mit "Zusammen backen" und "Rezept" */
export function BakingBoard({ recipes, withKids, onNavigate }: { recipes: Recipe[]; withKids: boolean; onNavigate: () => void }) {
  return (
    <ul className="w-full overflow-hidden rounded-card border border-line bg-surface shadow-card" aria-label="Backideen">
      {recipes.map((r) => (
        <li key={r.id} className="flex flex-col gap-2 border-b border-line px-4 py-3 last:border-b-0">
          <div className="flex items-center gap-3">
            <DishPicture title={r.title} ingredients={r.ingredients.map((i) => i.name)} category={r.category} tone={dishTone(r.title, r.category)} alt="" small className="h-11 w-11 shrink-0 rounded-full" />
            <span className="min-w-0 flex-1">
              <span className="block font-bold leading-snug">{r.title}</span>
              <span className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
                {r.prepMinutes !== null && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    {r.prepMinutes} Min.
                  </span>
                )}
                {withKids && KID_FRIENDLY.has(r.id) && <span>· gut mit Kindern 🧒</span>}
              </span>
            </span>
          </div>
          <div className="flex gap-2">
            <Link href={`/kochbuch/kochen?id=${encodeURIComponent(r.id)}`} onClick={onNavigate} className={buttonClass("soft", "sm")}>
              Zusammen backen
            </Link>
            <Link href={`/kochbuch/rezept?id=${encodeURIComponent(r.id)}`} onClick={onNavigate} className={buttonClass("ghost", "sm")}>
              Rezept
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
