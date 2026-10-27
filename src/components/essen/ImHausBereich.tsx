"use client";

// Essen-Seite: EIN Bereich „Im Haus“ (statt „Spontan kochen“ und „Das ist
// da“ getrennt). Überschrift mit ＋ (Schnelleingabe, mehrere auf einmal:
// „Eier, Milch, Hack“) und „Alle ›“ (Seite /vorrat); Chips der Sachen,
// „bald aufbrauchen“ zuerst und leicht orange, höchstens 8 – antippen öffnet
// die Sache (`vorrat/SacheSheet`). Darunter groß „Was koch ich daraus?“ =
// Spontan kochen mit genau diesen Sachen (`imHausReihe`, dieselbe Reihe im
// Gespräch). Leer: ein Satz und „Eintragen“. Nur mit Baustein „Im Haus“.

import Link from "next/link";
import { useState } from "react";
import { ChefHat, ChevronRight, Hourglass, Plus } from "lucide-react";
import { QuickButton } from "@/components/ui/QuickButton";
import { CARD, SECTION_TITLE, buttonClass, chipClass } from "@/components/ui/styles";
import { SacheSheet } from "@/components/vorrat/SacheSheet";
import { openHelper } from "@/lib/begleitung/open";
import { useFeature } from "@/lib/core/features";
import { openQuick } from "@/lib/core/schnelleingabe";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { IM_HAUS_CHIPS, imHausReihe } from "@/lib/vorrat/imHaus";
import { usePantry, type PantryItem } from "@/lib/vorrat/pantry";

const HEAD = "flex items-center justify-between gap-2 px-1";
const MORE = "flex h-10 items-center gap-0.5 text-[15px] font-bold text-accent-strong";
/** „bald aufbrauchen“: leicht orange (Fläche hell, Rand ebenso) */
const SOON_CHIP = chipClass(true).replace("border-accent ", "border-accent-soft ");

export function ImHausBereich({ today }: { today: string }) {
  const on = useFeature("vorrat");
  const pantry = usePantry();
  const shopping = useWeekShoppingList("current");
  const [open, setOpen] = useState<PantryItem | null>(null);
  if (!on || !pantry) return null;
  const reihe = imHausReihe(pantry, today).slice(0, IM_HAUS_CHIPS);
  const add = () => openQuick({ kind: "imhaus" });
  return (
    <section className="flex flex-col gap-2" aria-label="Im Haus" data-im-haus>
      <div className={HEAD}>
        <h2 className={`${SECTION_TITLE} flex-1`}>Im Haus</h2>
        {reihe.length > 0 && <QuickButton icon={Plus} label="Ins Haus eintragen" onClick={add} />}
        <Link href="/vorrat" className={MORE}>
          Alle <ChevronRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        </Link>
      </div>
      {reihe.length ? (
        <>
          <div className="flex flex-wrap gap-2">
            {reihe.map(({ item, soon }) => (
              <button key={item.id} type="button" onClick={() => setOpen(item)} className={soon ? SOON_CHIP : chipClass(false)} aria-label={soon ? `${item.name}, bald aufbrauchen` : item.name}>
                {soon && <Hourglass className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />}
                {item.name}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => openHelper("spontan")} className={`${buttonClass("primary", "lg")} w-full`}>
            <ChefHat className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            Was koch ich daraus?
          </button>
        </>
      ) : (
        <div className={`${CARD} flex flex-col items-start gap-3 p-4`}>
          <p className="text-base">Sag mir, was da ist, dann schlag ich was vor.</p>
          <button type="button" onClick={add} className={buttonClass("primary", "md")}>
            Eintragen
          </button>
        </div>
      )}
      {open && <SacheSheet item={open} today={today} weekStart={shopping?.weekStart ?? null} onClose={() => setOpen(null)} />}
    </section>
  );
}
