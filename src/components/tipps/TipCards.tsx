"use client";

// Bis zu 3 Tipps als Karten im Gespräch (Antwort auf „Was ist am Wochenende
// los?“) – antippen öffnet das Detail mit „In unseren Kalender“.

import { useState } from "react";
import { CARD } from "@/components/ui/styles";
import type { TipView } from "@/lib/tipps/model";
import { TipRow } from "@/components/tipps/TipBits";
import { TipSheet } from "@/components/tipps/TipSheet";

export function TipCards({ tips }: { tips: TipView[] }) {
  const [open, setOpen] = useState<TipView | null>(null);
  return (
    <>
      <ul className={`${CARD} flex flex-col divide-y divide-line overflow-hidden`} aria-label="Tipps">
        {tips.map((t) => (
          <li key={t.id}>
            <TipRow tip={t} onOpen={() => setOpen(t)} withDay />
          </li>
        ))}
      </ul>
      {open && <TipSheet tip={open} onClose={() => setOpen(null)} />}
    </>
  );
}
