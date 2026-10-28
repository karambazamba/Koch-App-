// Wasserzeichen einer Kachel (Tafel 124 A): großes Linien-Symbol (150 px,
// Strich 1,3) unten rechts, rechts/unten 30 px angeschnitten, hinter dem
// Inhalt. Die Kachel braucht `isolate` (eigene Ebene), das Zeichen liegt auf
// z −1: über der Fläche, unter Text und Kärtchen. Farbe/Deckkraft nur über
// CSS (`.kachel-wasserzeichen`, Tokens `--app-wasserzeichen*`), still, nie
// antippbar, für VoiceOver unsichtbar.

import type { ReactNode } from "react";

export function KachelWasserzeichen({ art = "sport", children }: { art?: "sport" | "haus"; children: ReactNode }) {
  return (
    <span className="kachel-wasserzeichen pointer-events-none absolute -bottom-[30px] -right-[30px] -z-10 flex h-[150px] w-[150px] select-none [&>svg]:h-full [&>svg]:w-full" data-art={art} aria-hidden>
      {children}
    </span>
  );
}

/** Strichstärke der Wasserzeichen-Symbole (lucide, relativ zum 24er-Raster) */
export const WASSERZEICHEN_STRICH = 1.3;
