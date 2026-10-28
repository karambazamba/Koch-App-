"use client";

// Erster Start, Bildschirm 2 (nach dem Hallo mit Häkchen): Mia für alle. Mia
// (110 px) oben, zwinkert einmal beim Erscheinen; darunter eine weiße
// Sprechblase (Spitze zu Mia) mit „Kein Stress. Ich sortier deinen Alltag,
// Stück für Stück.“ und der Frage „Für wen soll ich sortieren?“: drei
// gleichwertige Knöpfe, nichts vorausgewählt, ein Tipp = weiter zum
// Beispiel-Tag (passend zur Antwort). Nur beim allerersten Start (Hallo →
// „Los geht’s“), wer über Anmelden oder eine Einladung kommt, sieht ihn nicht.

import { useRef } from "react";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { ERSTER_START } from "@/lib/mia/persona";
import { HAUSHALT_WAHL, type Haushalt } from "@/lib/core/haushalt";
import { helperName } from "@/lib/einstellungen/profile";

/** `onDone(rect, haushalt)`: Mias Platz, damit sie von hier zum Mia-Knopf fliegt */
export function ZeigMalStep({ onDone }: { onDone: (mia: DOMRect | null, haushalt: Haushalt) => void }) {
  const mia = useRef<HTMLSpanElement>(null);
  return (
    <section className="erster-start-in fixed inset-0 z-50 overflow-y-auto bg-background" aria-labelledby="zeigmal-titel" data-zeigmal>
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col items-center px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+2rem)] [@media(max-height:620px)]:pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="flex w-full flex-1 flex-col items-center justify-center">
          <span ref={mia} className="mia-zwinkern-einmal inline-flex rounded-full" role="img" aria-label={helperName()}>
            <BegleitungAvatar size={110} zustand="ruhig" groesse="gross" stabil />
          </span>
          {/* Sprechblase, Spitze nach oben zu Mia */}
          <div className="relative mt-5 w-full rounded-card bg-surface px-5 pb-5 pt-5 shadow-card">
            <span aria-hidden className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-surface" />
            <h1 id="zeigmal-titel" className="relative text-[20px] font-extrabold leading-snug tracking-tight">
              {ERSTER_START.titel}
            </h1>
            <p id="zeigmal-frage" className="relative mt-3 text-[16px] font-semibold text-muted">
              {ERSTER_START.frage}
            </p>
          </div>
        </div>
        <div className="mt-4 flex w-full flex-col items-center gap-2" role="group" aria-labelledby="zeigmal-frage" data-haushalt-wahl>
          {HAUSHALT_WAHL.map((w) => (
            <button key={w.value} type="button" onClick={() => onDone(mia.current?.getBoundingClientRect() ?? null, w.value)} className="h-14 w-full rounded-field border-2 border-accent bg-surface text-[17px] font-bold text-accent-strong active:scale-[0.98]">
              {w.label}
            </button>
          ))}
          <p className="text-center text-[13px] text-muted">{ERSTER_START.leise}</p>
        </div>
      </div>
    </section>
  );
}
