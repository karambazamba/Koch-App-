// Seitenwechsel per Wischen (Kalender · Heute · Essen) nur bei einer klaren,
// gewollten Geste (A-059): Beim iPhone ohne Home-Button schließt man die App
// mit einem Wisch vom unteren Rand nach oben – der darf nie die Seite
// wechseln. Deshalb zählt ein Wisch nur, wenn er
//   · nicht in den untersten 48 px (+ Safe-Area unten) beginnt,
//   · nicht am linken Rand beginnt (der ist für Zurück, `core/leiste`),
//   · klar waagerecht ist (|dx| ≥ 2 · |dy|) und mindestens 60 px lang.
// Geht die App binnen 500 ms nach einem Wisch-Wechsel in den Hintergrund,
// war es das Schließen: zurück zur vorherigen Seite (sie bleibt „die
// letzte“). Rein, ohne Oberfläche.

import { RAND_PX } from "@/lib/core/leiste";

/** Unterer Streifen ohne Seitenwechsel (dazu die Safe-Area unten) */
export const UNTEN_FREI_PX = 48;
/** Mindestweg eines Seitenwischs */
export const WISCH_MIN_PX = 60;
/** Waagerecht = |dx| mindestens so oft |dy| */
const WISCH_VERHAELTNIS = 2;
/** Hintergrund so kurz nach dem Wischen = App geschlossen, Wechsel zurücknehmen */
export const WEG_NACH_WISCH_MS = 500;

/** Darf eine Geste, die hier beginnt, die Seite wechseln? (nicht unten, nicht am linken Rand) */
export function wischStartErlaubt(x: number, y: number, hoehe: number, safeUnten: number): boolean {
  return x > RAND_PX && y < hoehe - UNTEN_FREI_PX - Math.max(0, safeUnten);
}

/** Ist die Bewegung klar waagerecht und lang genug? */
export function wischKlar(dx: number, dy: number): boolean {
  return Math.abs(dx) >= WISCH_MIN_PX && Math.abs(dx) >= WISCH_VERHAELTNIS * Math.abs(dy);
}

/** Die ganze Entscheidung: wechselt diese Geste die Seite (sofern weit oder schnell genug)? */
export function seitenWisch(g: { x: number; y: number; dx: number; dy: number; hoehe: number; safeUnten: number }): boolean {
  return wischStartErlaubt(g.x, g.y, g.hoehe, g.safeUnten) && wischKlar(g.dx, g.dy);
}

/** Ging die App direkt nach dem Wisch in den Hintergrund? (beides Zeitstempel derselben Uhr, ms) */
export function wischZuruecknehmen(wischAm: number | null, wegAm: number): boolean {
  return wischAm !== null && wegAm >= wischAm && wegAm - wischAm <= WEG_NACH_WISCH_MS;
}
