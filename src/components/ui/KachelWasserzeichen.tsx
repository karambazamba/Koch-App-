// Wasserzeichen der Kacheln (Tafel 124 A/125): EINE Komponente für alle
// Kacheln ohne eigenes Bild. Großes Linien-Symbol (150 px, Strich 1,3) unten
// rechts, rechts/unten 30 px angeschnitten, leicht gedreht (−8°), hinter dem
// Inhalt. Die Kachel braucht `isolate` (eigene Ebene), das Zeichen liegt auf
// z −1: über der Fläche, unter Text und weißen Kärtchen; Fenster der Kachel
// stehen deshalb außerhalb ihrer <section>. Farbe = Kachel-Akzent (folgt der
// gewählten Farbe), Deckkraft nur über Tokens (`--app-wasserzeichen*`); im
// Look „Schlicht“ keins. XS (eine Zeile) bleibt ohne. Still, nie antippbar,
// für VoiceOver unsichtbar.

import { Calendar, CircleCheck, Mail, MapPin, Refrigerator, ShoppingCart, StickyNote, Timer, type LucideIcon } from "lucide-react";
import type { HomeTileId, TileSize } from "@/lib/core/homeLayout";

/** Kacheln mit eigenem Bild: kein Wasserzeichen, mit Grund (die Jetzt-Karte ist keine Kachel und hat auch keins) */
export const OHNE_WASSERZEICHEN = {
  wetter: "Himmel",
  essen: "Foto des Gerichts",
  pinnwand: "Zettel",
  spendentopf: "eigenes Bild (Topf)",
  sport: "Stempel sind das Bild",
} as const satisfies Partial<Record<HomeTileId, string>>;

export type WasserzeichenKachel = Exclude<HomeTileId, keyof typeof OHNE_WASSERZEICHEN>;

/**
 * Symbol je Kachel. Neue Kachel = neuer Eintrag hier (sonst meckert
 * TypeScript und `tests/app/wasserzeichen.test.ts`) oder ein Grund oben.
 * Sport hat keins: die Stempel der Woche sind das Bild (A-044).
 */
export const WASSERZEICHEN_SYMBOL: Record<WasserzeichenKachel, LucideIcon> = {
  termine: Calendar,
  aufgaben: CircleCheck,
  einkauf: ShoppingCart,
  vorrat: Refrigerator,
  notizen: StickyNote,
  timer: Timer,
  tipps: MapPin,
  post: Mail,
};

/** Strichstärke der Wasserzeichen-Symbole (lucide, relativ zum 24er-Raster) */
export const WASSERZEICHEN_STRICH = 1.3;

/**
 * `frei`: auf der Kachel steht Text ohne weißes Kärtchen (Notizen, Im Haus,
 * leere Liste …) – dann die leise Deckkraft (`--app-wasserzeichen-frei`, 9 %).
 */
export function KachelWasserzeichen({ kachel, size, frei = false }: { kachel: WasserzeichenKachel; size: TileSize; frei?: boolean }) {
  if (size === "XS") return null;
  const Symbol = WASSERZEICHEN_SYMBOL[kachel];
  return (
    <span
      className="kachel-wasserzeichen pointer-events-none absolute -bottom-[30px] -right-[30px] -z-10 flex h-[150px] w-[150px] -rotate-[8deg] select-none [&>svg]:h-full [&>svg]:w-full"
      data-kachel={kachel}
      data-art={frei ? "frei" : undefined}
      aria-hidden
    >
      <Symbol strokeWidth={WASSERZEICHEN_STRICH} aria-hidden />
    </span>
  );
}
