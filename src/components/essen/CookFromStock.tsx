"use client";

// Essen-Reiter „Das ist da“: Vorrat als Chips (Bald-aufbrauchen zuerst, nur
// mit Baustein Vorrat). Die Ideen darunter sind seit v0.75 die 8 Karten zum
// Durchschieben (`essen/rezepte/MoreIdeas`) statt „Daraus kannst du kochen“.

import Link from "next/link";
import { ChevronRight, Hourglass } from "lucide-react";
import { SECTION_TITLE, chipClass } from "@/components/ui/styles";
import { useFeature } from "@/lib/core/features";
import { usePantry } from "@/lib/vorrat/pantry";
import { soonToUse } from "@/lib/essen/dishIdeas";

const HEAD = "flex items-center justify-between px-1";
const MORE = "flex h-10 items-center gap-0.5 text-[15px] font-bold text-accent-strong";
const CHIPS_SHOWN = 8;

/** „Das ist da“: Im Haus als Chips (nur mit Baustein und wenn etwas da ist) */
export function StockChips({ today }: { today: string }) {
  const pantryOn = useFeature("vorrat");
  const pantry = usePantry();
  if (!pantryOn || !pantry?.length) return null;
  const soon = soonToUse(pantry, today);
  const rest = pantry.filter((p) => !soon.includes(p));
  const shown = [...soon, ...rest].slice(0, CHIPS_SHOWN);
  const more = pantry.length - shown.length;
  return (
    <section className="flex flex-col gap-2" aria-label="Das ist da">
      <div className={HEAD}>
        <h2 className={SECTION_TITLE}>Das ist da</h2>
        <Link href="/vorrat" className={MORE}>
          Im Haus <ChevronRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {shown.map((p) => (
          <span key={p.id} className={`${soon.includes(p) ? chipClass(true).replace("border-accent", "border-accent-soft") : chipClass(false)} pointer-events-none`}>
            {soon.includes(p) && <Hourglass className="h-3.5 w-3.5" strokeWidth={2.25} aria-label="bald aufbrauchen" />}
            {p.name}
          </span>
        ))}
        {more > 0 && (
          <Link href="/vorrat" className={chipClass(false, "muted")}>
            + {more}
          </Link>
        )}
      </div>
    </section>
  );
}

/** „Daraus kannst du kochen“: drei Ideen aus dem Bestand */
