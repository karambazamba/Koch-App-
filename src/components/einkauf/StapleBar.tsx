"use client";

// Fällige Stammartikel auf der Einkaufsliste (Tafel 89): EINE schmale Zeile
// „Bald wieder fällig: Milch, Brot“ mit „Dazu“ (alle übernehmen); einzelne
// gibt es über „Stammliste“.

import { Repeat } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";
import type { Staple } from "@/lib/einkauf/shoppingList";

export function StapleBar({ staples, onTake }: { staples: Staple[]; onTake: (staple: Staple) => void }) {
  if (!staples.length) return null;
  const names = staples.map((s) => s.name);
  const text = names.length > 3 ? `${names.slice(0, 3).join(", ")} …` : names.join(", ");
  return (
    <section className="flex min-h-12 items-center gap-2 rounded-field bg-fill px-3" aria-label="Bald wieder fällig" data-bald-faellig>
      <Repeat className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} aria-hidden />
      <p className="min-w-0 flex-1 truncate text-[14px]">
        <span className="font-semibold text-muted">Bald wieder fällig:</span> {text}
      </p>
      <button type="button" onClick={() => staples.forEach(onTake)} className={buttonClass("soft", "sm")}>
        Dazu
      </button>
    </section>
  );
}
