"use client";

// Fenster „Durchatmen“ (A-051, Tafel 138/1): Kopf „Durchatmen“ / „Kurz raus,
// wieder bei dir. Ganz ohne Muss.“, grüne Karte „Passt gerade“ mit EINER Übung
// und „Los“ (nach Tageszeit, Lieblinge öfter), darunter Sorten-Chips und alle
// Übungen (Symbol, Titel, Dauer · Kurz, Herz = Liebling, Lieblinge oben).
// Antippen startet sofort, jede Übung beliebig oft. Paket A öffnet es vom
// Kreis auf der Startseite: `<DurchatmenFenster onClose={…} />` oder
// `oeffneDurchatmen()` (lib/durchatmen/oeffnen).

import { useState } from "react";
import { Anchor, Eye, Heart, PersonStanding, Play, Target, Wind, X, type LucideIcon } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { ICON_BUTTON, chipClass } from "@/components/ui/styles";
import { now, useMinutes } from "@/lib/core/now";
import { unlockSpeech } from "@/lib/begleitung/speech";
import { klangFreischalten } from "@/lib/durchatmen/klang";
import { starteDurchatmen } from "@/lib/durchatmen/oeffnen";
import { lieblingUmschalten, useDurchatmen } from "@/lib/durchatmen/store";
import { SORTEN, listenZeile, sortiert, type Sorte, type Uebung } from "@/lib/durchatmen/uebungen";
import { vorschlag } from "@/lib/durchatmen/vorschlag";

/** Symbol und Kachelfarbe je Sorte */
export const SORTE_STIL: Record<Sorte, { icon: LucideIcon; tile: string }> = {
  atmen: { icon: Wind, tile: "aufgaben" },
  augen: { icon: Eye, tile: "termine" },
  koerper: { icon: PersonStanding, tile: "sport" },
  ankommen: { icon: Anchor, tile: "einkauf" },
  fokus: { icon: Target, tile: "essen" },
};

export function SorteSymbol({ sorte, size = 40 }: { sorte: Sorte; size?: number }) {
  const { icon: Icon, tile } = SORTE_STIL[sorte];
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size, background: `var(--app-tile-${tile})`, color: `var(--app-tile-${tile}-ac)` }} aria-hidden>
      <Icon style={{ width: Math.round(size / 2), height: Math.round(size / 2) }} strokeWidth={size > 60 ? 1.5 : 2} />
    </span>
  );
}

/** Im Tipp: Ton und Stimme freischalten (iPhone), dann los */
export function losMit(id: string) {
  klangFreischalten();
  unlockSpeech();
  starteDurchatmen(id);
}

export function DurchatmenFenster({ onClose }: { onClose: () => void }) {
  const stand = useDurchatmen();
  // Uhrzeit erst im Browser (beim Vorrendern keine)
  const minuten = useMinutes();
  const [sorte, setSorte] = useState<Sorte | "alle">("alle");
  const lieblinge = stand?.lieblinge ?? [];
  const passt = minuten === undefined ? null : vorschlag(now(), lieblinge);
  const liste = sortiert(lieblinge, sorte);
  return (
    <Sheet
      title="Durchatmen"
      onClose={onClose}
      tall
      header={
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-atem-soft text-atem-ink" aria-hidden>
            <Wind className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-extrabold tracking-tight">Durchatmen</h2>
            <p className="text-[15px] text-muted">Kurz raus, wieder bei dir. Ganz ohne Muss.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Schließen" className={ICON_BUTTON}>
            <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 pb-4" data-durchatmen-fenster>
        {passt && (
          <section className="flex items-center gap-3 rounded-card bg-atem-tief p-4 text-atem-on" aria-label="Passt gerade" data-passt={passt.id}>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-extrabold uppercase tracking-wider opacity-90">Passt gerade</p>
              <p className="text-[22px] font-extrabold leading-tight">{passt.titel}</p>
              <p className="text-sm opacity-90">{listenZeile(passt)}</p>
            </div>
            <button type="button" onClick={() => losMit(passt.id)} className="hit inline-flex h-11 shrink-0 items-center gap-1.5 rounded-field bg-atem-on px-4 text-base font-extrabold text-atem-ink active:scale-95">
              <Play className="h-4 w-4" strokeWidth={2.5} fill="currentColor" aria-hidden />
              Los
            </button>
          </section>
        )}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Sorten">
          {SORTEN.map((s) => (
            <button key={s.id} type="button" aria-pressed={sorte === s.id} onClick={() => setSorte(s.id)} className={chipClass(sorte === s.id)}>
              {s.label}
            </button>
          ))}
        </div>
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-card border border-line bg-surface" aria-label="Übungen">
          {liste.map((u) => (
            <Zeile key={u.id} u={u} liebling={lieblinge.includes(u.id)} />
          ))}
        </ul>
      </div>
    </Sheet>
  );
}

function Zeile({ u, liebling }: { u: Uebung; liebling: boolean }) {
  return (
    <li className="flex items-center gap-1 pr-1" data-uebung={u.id}>
      <button type="button" onClick={() => losMit(u.id)} className="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-left active:bg-fill">
        <SorteSymbol sorte={u.sorte} />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold">{u.titel}</span>
          <span className="block text-sm text-muted">{listenZeile(u)}</span>
        </span>
      </button>
      <button type="button" onClick={() => lieblingUmschalten(u.id)} aria-pressed={liebling} aria-label={liebling ? `${u.titel}: kein Liebling mehr` : `${u.titel} als Liebling`} className="hit flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-accent">
        <Heart className="h-5 w-5" strokeWidth={2} fill={liebling ? "currentColor" : "none"} aria-hidden />
      </button>
    </li>
  );
}
