// Wasserzeichen der Kacheln (Tafel 124 A/125): EINE Komponente für alle
// Kacheln ohne eigenes Bild. Großes Linien-Symbol (150 px, Strich 1,3) unten
// rechts, rechts/unten 30 px angeschnitten, leicht gedreht (−8°), hinter dem
// Inhalt. Die Kachel braucht `isolate` (eigene Ebene), das Zeichen liegt auf
// z −1: über der Fläche, unter Text und weißen Kärtchen; Fenster der Kachel
// stehen deshalb außerhalb ihrer <section>. Farbe = Kachel-Akzent (folgt der
// gewählten Farbe), Deckkraft nur über Tokens (`--app-wasserzeichen*`); im
// Look „Schlicht“ keins. Seit A-048 (Tafel 135) in ALLEN Größen: in XS kleiner
// (110 px), weiter rechts angeschnitten, 11 % (`--app-wasserzeichen-xs`) –
// die Zeile darunter lässt ihm rechts Platz bzw. stellt sich frei
// (`kachel-frei`), nie liegt es sichtbar über Text. Es richtet sich nach der
// echten Höhe der Kachel (absolut, unten rechts) und macht sie nie höher.
// Still, nie antippbar, für VoiceOver unsichtbar.

import { Calendar, CircleCheck, Gift, Mail, MapPin, Refrigerator, ShoppingCart, StickyNote, Timer, type LucideIcon } from "lucide-react";
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
 * Wundertüte: Geschenk, nur auf der Vorderseite (die Frage steht frei, also
 * leise); die Rückseite ist weiß.
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
  wundertuete: Gift,
};

/**
 * S/M: 150 px, unten/rechts 30 px angeschnitten. Seit A-048 sind Listen-Kacheln
 * so hoch wie ihr Inhalt – das Zeichen passt sich der echten Höhe an (höchstens
 * Kachelhöhe − 10 px, quadratisch), damit es unten rechts bleibt und nicht bis
 * in den Kopf reicht; die Kachel macht es nie höher (absolut).
 */
const WASSERZEICHEN_SM = "-bottom-[30px] -right-[30px] aspect-square h-[min(150px,calc(100%-10px))]";

/** XS (A-048): 110 px, rechts 50 px und unten 34 px angeschnitten – sichtbar bleibt ein Streifen von rund 60 px am rechten Rand */
const WASSERZEICHEN_XS = "-bottom-[34px] -right-[50px] h-[110px] w-[110px]";

/** Strichstärke der Wasserzeichen-Symbole (lucide, relativ zum 24er-Raster) */
export const WASSERZEICHEN_STRICH = 1.3;

/**
 * `frei`: auf der Kachel steht Text ohne weißes Kärtchen (Notizen, Im Haus,
 * leere Liste …) – dann die leise Deckkraft (`--app-wasserzeichen-frei`, 9 %).
 */
export function KachelWasserzeichen({ kachel, size, frei = false }: { kachel: WasserzeichenKachel; size: TileSize; frei?: boolean }) {
  const Symbol = WASSERZEICHEN_SYMBOL[kachel];
  const xs = size === "XS";
  return (
    <span
      className={`kachel-wasserzeichen pointer-events-none absolute -z-10 flex -rotate-[8deg] select-none [&>svg]:h-full [&>svg]:w-full ${xs ? WASSERZEICHEN_XS : WASSERZEICHEN_SM}`}
      data-kachel={kachel}
      data-groesse={xs ? "XS" : undefined}
      data-art={xs ? "xs" : frei ? "frei" : undefined}
      aria-hidden
    >
      <Symbol strokeWidth={WASSERZEICHEN_STRICH} aria-hidden />
    </span>
  );
}
