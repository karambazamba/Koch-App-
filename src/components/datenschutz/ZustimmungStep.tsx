"use client";

// „Bevor’s losgeht“: vor der App für alle (neue Nutzer nach „Los geht’s“,
// bestehende einmal beim nächsten Öffnen, wieder bei neuer Textfassung).
// Drei kurze Sätze, Links zu Datenschutz und Nutzungsbedingungen, Häkchen,
// „Weiter“ erst mit Häkchen. Ohne Schließen: ohne Zustimmung geht es nicht
// weiter, die Daten bleiben unberührt. Gespeichert wird Fassung und Zeit
// (`setEinwilligung("bedingungen")`), mit Konto zusätzlich auf dem Server.

import { useState } from "react";
import { Check } from "lucide-react";
import { RechtLinks } from "@/components/datenschutz/RechtstextView";
import { setEinwilligung } from "@/lib/datenschutz/einwilligung";
import { VOR_DEM_START } from "@/lib/datenschutz/rechtstexte";

export function ZustimmungStep({ onDone }: { onDone: () => void }) {
  const [ok, setOk] = useState(false);
  const weiter = () => {
    if (!ok) return;
    setEinwilligung("bedingungen", true);
    onDone();
  };
  return (
    <section className="hello-in fixed inset-0 z-50 overflow-y-auto bg-background" aria-labelledby="zustimmung-titel" data-zustimmung>
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+2.5rem)]">
        <h1 id="zustimmung-titel" className="text-[30px] font-extrabold leading-tight tracking-tight">
          {VOR_DEM_START.titel}
        </h1>
        <div className="mt-5 flex flex-1 flex-col gap-3">
          {VOR_DEM_START.saetze.map((s) => (
            <p key={s} className="text-[17px] leading-snug">
              {s}
            </p>
          ))}
          <RechtLinks nur={["/datenschutz", "/nutzungsbedingungen"]} className="mt-1 !justify-start text-[14px]" />
        </div>
        <div className="mt-6 flex flex-col gap-4">
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-left text-[15px] text-muted">
            <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="peer sr-only" />
            <span
              aria-hidden
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${ok ? "border-accent bg-accent text-on-accent" : "border-line bg-surface"}`}
            >
              {ok && <Check className="h-4 w-4" strokeWidth={3} />}
            </span>
            <span>{VOR_DEM_START.haken}</span>
          </label>
          <button type="button" onClick={weiter} disabled={!ok} className="h-14 w-full rounded-field bg-accent text-[17px] font-bold text-on-accent active:scale-[0.98] disabled:opacity-40">
            Weiter
          </button>
        </div>
      </div>
    </section>
  );
}
