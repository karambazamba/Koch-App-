"use client";

// Fällige Stammartikel auf der Einkaufsliste (`ShoppingListView`): eine
// waagerechte Reihe „Bald wieder fällig“ zum Übernehmen oder Weglassen.

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { chipClass } from "@/components/ui/styles";
import type { Staple } from "@/lib/einkauf/shoppingList";

/**
 * Fällige Stammartikel als Vorschläge: antippen = übernehmen, zur Seite
 * wischen (oder ×) = diesmal nicht.
 */
export function StapleBar({
  staples,
  onTake,
  onSkip,
  onManage,
}: {
  staples: Staple[];
  onTake: (staple: Staple) => void;
  onSkip: (staple: Staple) => void;
  onManage: () => void;
}) {
  return (
    <section className="flex flex-col gap-1.5" aria-label="Stammartikel">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[15px] font-extrabold text-muted">Bald wieder fällig</h2>
        <button type="button" onClick={onManage} className="hit text-xs font-semibold text-muted underline">
          Stammliste
        </button>
      </div>
      {/* eine waagerechte Reihe (wischen), keine Box */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" data-no-swipe>
        {staples.map((st) => (
          <StapleChip key={st.id} staple={st} onTake={() => onTake(st)} onSkip={() => onSkip(st)} />
        ))}
      </div>
    </section>
  );
}

function StapleChip({ staple, onTake, onSkip }: { staple: Staple; onTake: () => void; onSkip: () => void }) {
  const [start, setStart] = useState<number | null>(null);
  return (
    <span
      // Knöpfe über der vergrößerten Tippfläche des Chips (`hit`), sonst fängt der Chip den Tipp ab
      className={`${chipClass(false)} shrink-0 gap-1 pr-1 [&>button]:relative`}
      style={{ touchAction: "pan-y" }}
      onPointerDown={(e) => setStart(e.clientX)}
      onPointerUp={(e) => {
        if (start !== null && Math.abs(e.clientX - start) > 40) onSkip();
        setStart(null);
      }}
    >
      <button type="button" onClick={onTake} aria-label={`${staple.name} übernehmen`} className="flex items-center gap-1">
        <Plus className="h-4 w-4 text-accent" strokeWidth={2.5} aria-hidden />
        {staple.name}
      </button>
      <button type="button" onClick={onSkip} aria-label={`${staple.name} diesmal nicht`} className="flex h-8 w-8 items-center justify-center text-faint">
        <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
      </button>
    </span>
  );
}
