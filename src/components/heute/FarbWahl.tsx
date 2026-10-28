"use client";

// Kachel-Farbe wählen (Tafel 108): im Bearbeiten-Modus unter S · M · L eine
// weiße Reihe – „A“ (automatisch, gestrichelt) und die 8 Pastelltöne. Ein Tipp
// übernimmt sofort, die aktuelle Farbe trägt einen Ring in der Tonfarbe der
// Kachel. Keine freie Farbwahl; Wetter und Essen zeigen die Reihe nicht.

import type { CSSProperties } from "react";
import { KACHEL_FARBEN, type KachelFarbe } from "@/lib/heute/kachelFarben";

const RING = "ring-2 ring-tile-accent ring-offset-2 ring-offset-surface";

export function FarbWahl({ label, farbe, onFarbe }: { label: string; farbe: KachelFarbe | undefined; onFarbe: (f: KachelFarbe | undefined) => void }) {
  return (
    <div className="flex max-w-full flex-wrap justify-center gap-0.5 rounded-card border border-line bg-surface px-1.5 py-1 shadow" role="radiogroup" aria-label={`Farbe ${label}`} data-farbwahl>
      <button type="button" role="radio" aria-checked={!farbe} aria-label={`${label} Farbe automatisch`} onClick={() => onFarbe(undefined)} className="hit flex h-8 w-8 items-center justify-center">
        <span className={`flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-line-strong text-[11px] font-bold text-muted ${!farbe ? RING : ""}`} aria-hidden>
          A
        </span>
      </button>
      {KACHEL_FARBEN.map((f) => (
        <button key={f.id} type="button" role="radio" aria-checked={farbe === f.id} aria-label={`${label} Farbe ${f.label}`} onClick={() => onFarbe(f.id)} className="hit flex h-8 w-8 items-center justify-center">
          <span className={`farb-punkt h-6 w-6 rounded-full border border-line ${farbe === f.id ? RING : ""}`} style={{ "--punkt-bg": `var(--app-tile-${f.kachel})` } as CSSProperties} aria-hidden />
        </button>
      ))}
    </div>
  );
}
