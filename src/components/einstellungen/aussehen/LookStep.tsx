"use client";

// Erster Start (Tafel 51): nach „Los geht’s“ EIN Bildschirm – „Wie magst
// du’s?“, zwei große Mini-Vorschauen (Farbig vorausgewählt, Schlicht),
// „Weiter“ und leise „Überspringen“. Antippen zeigt die Wahl sofort.

import { useEffect, useState } from "react";
import { LookChoice } from "@/components/einstellungen/aussehen/LookChoice";
import { applyLook } from "@/lib/core/theme";
import type { AppLook } from "@/lib/einstellungen/profile";

export function LookStep({ onDone }: { onDone: (look: AppLook) => void }) {
  const [look, setLook] = useState<AppLook>("farbig");
  useEffect(() => applyLook(look), [look]);
  return (
    <section className="hello-in fixed inset-0 z-50 overflow-y-auto bg-background" aria-labelledby="look-titel">
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+2.5rem)]">
        <h1 id="look-titel" className="text-[30px] font-extrabold leading-tight tracking-tight">
          Wie magst du’s?
        </h1>
        <p className="mt-1 text-[15.5px] text-muted">Jederzeit änderbar.</p>
        <div className="mt-6 flex-1">
          <LookChoice value={look} onChange={setLook} size="gross" />
        </div>
        <div className="mt-6 flex flex-col items-center gap-1">
          <button type="button" onClick={() => onDone(look)} className="h-14 w-full rounded-field bg-accent text-[17px] font-bold text-on-accent active:scale-[0.98]">
            Weiter
          </button>
          <button type="button" onClick={() => onDone("farbig")} className="hit h-11 px-4 text-[15px] font-semibold text-muted">
            Überspringen
          </button>
        </div>
      </div>
    </section>
  );
}
