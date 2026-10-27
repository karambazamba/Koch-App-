"use client";

// Mia denkt mit: eine Karte mit 1–2 Sätzen und 1–3 Knöpfen (Vorstellen,
// Muster-Frage, Mitdenken, Erster Besuch). Ohne Mia-Gesicht – auf der
// Startseite gibt es genau zwei Mias (Logo und Knopf).

import { CARD, buttonClass } from "@/components/ui/styles";
import { tidyMiaText } from "@/lib/begleitung/tidy";

export type KartenKnopf = { label: string; onClick: () => void };

export function MiaKarte({ satz, knoepfe, label }: { satz: string; knoepfe: KartenKnopf[]; label: string }) {
  return (
    <div className={`${CARD} flex flex-col gap-2 px-4 py-3`} role="note" aria-label={label} data-mia-denkt>
      <p className="text-[15px] font-bold leading-snug">{tidyMiaText(satz)}</p>
      <div className="flex flex-wrap gap-2">
        {knoepfe.map((k, i) => (
          <button key={k.label} type="button" onClick={k.onClick} className={i === 0 ? buttonClass("primary", "sm") : `${buttonClass("ghost", "sm")} text-muted`}>
            {k.label}
          </button>
        ))}
      </div>
    </div>
  );
}
