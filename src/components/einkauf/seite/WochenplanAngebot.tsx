"use client";

// Oben auf der Laden-Seite (A-040, Tafel 127, Bild 1): „Für deinen
// Wochenplan“ mit den Gerichten („Lasagne · Fr · Curry · Sa“), einklappbar
// ⌄. Die Zutaten als Chips mit Symbol – einzeln antippen setzt sie drauf,
// „Alle dazu“ (orange) alle außer den Grundsachen; Salz & Co. stehen blass
// da und kommen nie von selbst. Danach verschwindet die Karte von selbst.

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { CARD, buttonClass, chipClass } from "@/components/ui/styles";
import { ItemSymbol } from "@/components/einkauf/kacheln/ItemSymbol";
import { symbolFor } from "@/lib/einkauf/kacheln/symbols";
import type { Angebot } from "@/lib/einkauf/angebot/angebot";
import type { ListItem } from "@/lib/einkauf/listModel";

type Props = {
  angebot: Angebot;
  products: Record<string, string>;
  onDazu: (items: ListItem[]) => void;
  onAlle: () => void;
};

export function WochenplanAngebot({ angebot, products, onDazu, onAlle }: Props) {
  const [zu, setZu] = useState(false);
  if (!angebot.chips.length) return null;
  const alle = angebot.chips.some((c) => !c.blass);
  return (
    <section className={`${CARD} flex flex-col gap-3 px-4 py-3.5`} aria-label="Für deinen Wochenplan" data-wochenplan-angebot>
      <button type="button" onClick={() => setZu((z) => !z)} aria-expanded={!zu} className="hit flex items-start justify-between gap-3 text-left">
        <span className="flex min-w-0 flex-col">
          <span className="text-[17px] font-extrabold leading-tight">Für deinen Wochenplan</span>
          {angebot.kopf && <span className="truncate text-[14px] text-muted">{angebot.kopf}</span>}
        </span>
        <ChevronDown className={`mt-0.5 h-5 w-5 shrink-0 text-muted transition-transform duration-300 ${zu ? "-rotate-90" : ""}`} strokeWidth={2.5} aria-hidden />
      </button>
      {!zu && (
        <>
          <div className="flex flex-wrap gap-2">
            {angebot.chips.map(({ item, blass }) => (
              <button key={item.key} type="button" onClick={() => onDazu([item])} className={`${chipClass(false)} min-h-11 ${blass ? "opacity-50" : ""}`} data-angebot={item.name} data-blass={blass ? "" : undefined} aria-label={`${item.name} dazu`}>
                <ItemSymbol id={symbolFor(item.name, products)} name={item.name} className="h-5 w-5 shrink-0" />
                {item.name}
              </button>
            ))}
          </div>
          {alle && (
            <button type="button" onClick={onAlle} className={`${buttonClass("primary", "lg")} w-full`} data-alle-dazu>
              Alle dazu
            </button>
          )}
        </>
      )}
    </section>
  );
}
