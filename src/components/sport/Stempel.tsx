"use client";

// Ein Feld der Stempelkarte (A-044, Tafel 132): Stempel = doppelter Ring im
// Sport-Akzent (`--tile-ac`, folgt der Kachel-Farbe, geschafft grün), Symbol
// der Sportart, Tag in Großbuchstaben („MO“), fest gedreht je Training.
// Geplant = gestrichelter Kreis mit „Do 8:00“, frei = gestrichelt und leer.
// Ein neuer Stempel (seit dem Öffnen dazugekommen) setzt weich auf.

import { useState, type CSSProperties } from "react";
import type { Feld, Stempel } from "@/lib/sport/stempel";
import { SportIcon } from "@/components/sport/SportIcon";

export type StempelGroesse = "gross" | "m" | "s" | "mini" | "bonus";

const MASS: Record<StempelGroesse, { box: string; rand: string; icon: string; tag: string; plan: string; innen: string }> = {
  gross: { box: "h-24 w-24", rand: "border-[3px]", icon: "h-8 w-8", tag: "text-[15px]", plan: "text-[14px]", innen: "inset-[5px]" },
  m: { box: "h-[68px] w-[68px]", rand: "border-[3px]", icon: "h-6 w-6", tag: "text-[12px]", plan: "text-[11px]", innen: "inset-[4px]" },
  s: { box: "h-[54px] w-[54px]", rand: "border-[2.5px]", icon: "h-5 w-5", tag: "text-[11px]", plan: "text-[10px]", innen: "inset-[3px]" },
  mini: { box: "h-[34px] w-[34px]", rand: "border-2", icon: "h-4 w-4", tag: "hidden", plan: "hidden", innen: "inset-[2px]" },
  bonus: { box: "h-12 w-12", rand: "border-2", icon: "h-4 w-4", tag: "text-[10px]", plan: "hidden", innen: "inset-[3px]" },
};

/** Welche Stempel seit dem Öffnen neu sind (die bekommen die Stempel-Animation) */
export function useNeueStempel(ids: readonly string[]): (id: string) => boolean {
  const [erste] = useState(() => new Set(ids));
  return (id) => !erste.has(id);
}

export function StempelZeichen({ stempel, groesse, neu = false }: { stempel: Stempel; groesse: StempelGroesse; neu?: boolean }) {
  const m = MASS[groesse];
  return (
    <span
      className={`stempel ${neu ? "stempel-neu" : ""} relative flex ${m.box} ${m.rand} shrink-0 flex-col items-center justify-center gap-0.5 rounded-full border-tile-accent bg-tile-inner text-tile-accent`}
      style={{ "--dreh": `${stempel.dreh}deg` } as CSSProperties}
      data-stempel={stempel.sport}
      aria-hidden
    >
      <span className={`pointer-events-none absolute ${m.innen} rounded-full border border-tile-accent`} />
      <SportIcon sport={stempel.sport} className={m.icon} strokeWidth={2} />
      <span className={`${m.tag} font-extrabold leading-none tracking-wide`}>{stempel.tag}</span>
    </span>
  );
}

/** Ein Feld: Stempel, geplant oder frei. `mitZeit` = geplante zeigen „Do 8:00“ (Sport-Seite) */
export function StempelFeld({ feld, groesse, neu = false, mitZeit = true }: { feld: Feld; groesse: StempelGroesse; neu?: boolean; mitZeit?: boolean }) {
  if (feld.art === "stempel") return <StempelZeichen stempel={feld.stempel} groesse={groesse} neu={neu} />;
  const m = MASS[groesse];
  return (
    <span
      className={`flex ${m.box} shrink-0 border-2 items-center justify-center rounded-full border-dashed border-tile-accent/45 bg-tile-inner/70 text-center text-tile-accent`}
      data-feld={feld.art}
      aria-hidden
    >
      {feld.art === "geplant" && mitZeit && <span className={`${m.plan} px-1 font-extrabold leading-tight tabular-nums`}>{feld.label}</span>}
    </span>
  );
}

/** Vorlese-Text eines Feldes */
export function feldText(feld: Feld): string {
  if (feld.art === "stempel") return `${feld.stempel.tag.slice(0, 1)}${feld.stempel.tag.slice(1).toLowerCase()}: ${feld.stempel.label}, gestempelt`;
  if (feld.art === "geplant") return `${feld.label}: ${feld.item.title}, geplant`;
  return "Feld frei";
}
