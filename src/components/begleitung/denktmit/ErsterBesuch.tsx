"use client";

// Mia begleitet beim ersten Mal (Tafel 90, Bild 2): beim ersten Besuch einer
// Seite eine kleine Karte über dem Mia-Knopf – 1–2 Sätze, was hier geht und
// was sie sich merkt, ein Knopf „Alles klar“. Der Besuch zählt mit „Alles
// klar“ oder beim Verlassen (auch als „benutzt“ für das Vorstellen); danach
// nie wieder. „Ruhig“ = keine Karte.

import { useEffect } from "react";
import { CARD, UEBER_LEISTE, buttonClass } from "@/components/ui/styles";
import { tidyMiaText } from "@/lib/begleitung/tidy";
import { seiteBesucht, useDenkt } from "@/lib/mia/denktmit/store";
import { ersterBesuch } from "@/lib/mia/denktmit/vorstellen";

export function ErsterBesuch({ seite }: { seite: string }) {
  const s = useDenkt();
  const offen = s ? ersterBesuch(s, seite) : null;
  // Beim Verlassen der Seite zählt der Besuch (auch ohne „Alles klar“ und bei „Ruhig“)
  useEffect(() => {
    if (!offen) return;
    return () => seiteBesucht(seite);
  }, [offen, seite]);
  const text = s?.level === "ruhig" ? null : offen;
  if (!text) return null;
  return (
    <div
      className={`${CARD} fixed right-4 z-30 flex max-w-[300px] flex-col gap-2 px-4 py-3`}
      style={{ bottom: `calc(${UEBER_LEISTE} + 30px)` }}
      role="note"
      aria-label="Kurz erklärt"
      data-erster-besuch={seite}
    >
      <p className="text-[15px] font-semibold leading-snug">{tidyMiaText(text)}</p>
      <button type="button" onClick={() => seiteBesucht(seite)} className={`${buttonClass("primary", "sm")} self-start`}>
        Alles klar
      </button>
    </div>
  );
}
