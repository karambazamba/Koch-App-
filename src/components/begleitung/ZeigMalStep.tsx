"use client";

// Erster Start, Bildschirm 3 (nach „Bevor’s losgeht“): Mia sagt kurz, wie’s
// losgeht. Mia (110 px) oben, zwinkert einmal beim Erscheinen; darunter eine
// weiße Sprechblase (Spitze zu Mia) mit Überschrift und drei Zeilen (Linien-
// Icons in runden hellorangen Kreisen), unten „Zeig mal“ und leise der Satz
// zu den Beispielen. Nur beim allerersten Start (Hallo → „Los geht’s“), wer
// über Anmelden oder eine Einladung kommt, sieht ihn nicht.

import { useRef } from "react";
import { Eye, MessageCircle, Plus, type LucideIcon } from "lucide-react";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { ERSTER_START } from "@/lib/mia/persona";
import { helperName } from "@/lib/einstellungen/profile";

const ICONS: Record<(typeof ERSTER_START.zeilen)[number]["id"], LucideIcon> = { ansehen: Eye, eintragen: Plus, erzaehlen: MessageCircle };

/** `onDone(rect)`: Mias Platz, damit sie von hier zum Mia-Knopf fliegt */
export function ZeigMalStep({ onDone }: { onDone: (mia: DOMRect | null) => void }) {
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
            <ul className="relative mt-4 flex flex-col gap-3">
              {ERSTER_START.zeilen.map((z) => {
                const Icon = ICONS[z.id];
                return (
                  <li key={z.id} className="flex items-center gap-3 text-[16px] font-semibold leading-snug">
                    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                      <Icon className="h-5 w-5" strokeWidth={2.2} />
                    </span>
                    <span>
                      {z.vor}
                      {z.hervor && <span className="whitespace-nowrap text-accent-strong">{z.hervor}</span>}
                      {z.nach}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <div className="mt-6 flex w-full flex-col items-center gap-2">
          <button type="button" onClick={() => onDone(mia.current?.getBoundingClientRect() ?? null)} className="h-14 w-full rounded-field bg-accent text-[17px] font-bold text-on-accent active:scale-[0.98]">
            {ERSTER_START.knopf}
          </button>
          <p className="text-center text-[13px] text-muted">{ERSTER_START.leise}</p>
        </div>
      </div>
    </section>
  );
}
