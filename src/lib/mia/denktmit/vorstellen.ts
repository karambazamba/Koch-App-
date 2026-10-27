// Mia stellt vor (Tafel 90, Bild 1) und begleitet beim ersten Mal (Bild 2).
// Ab dem Tag nach dem ersten Start höchstens EINE Kachel am Tag, in fester
// Reihenfolge, nur sichtbare und noch nie benutzte. Nach „Zeig mal“, nach
// Benutzung oder dem 2. „Später“ nie wieder für diese Kachel. Rein.

import { addDays } from "@/lib/core/now";
import { SEITE_FUER, VORSTELLEN, type VorstellTile } from "@/lib/mia/denktmit/seiten";
import type { DenktState } from "@/lib/mia/denktmit/store";

export type Vorstellung = { tile: VorstellTile; text: string; href: string };

/** Benutzt = Seite schon besucht (die Erster-Besuch-Karte stand dort) */
const benutzt = (s: DenktState, tile: VorstellTile) => Object.entries(SEITE_FUER).some(([seite, t]) => t === tile && s.besucht.includes(seite));

/** Welche Kachel stellt Mia heute vor? `since` = erster Tag der App */
export function naechsteVorstellung(s: DenktState, sichtbar: readonly string[], o: { today: string; since: string | null }): Vorstellung | null {
  if (!o.since || o.today < addDays(o.since, 1)) return null;
  for (const v of VORSTELLEN) {
    if (!sichtbar.includes(v.tile)) continue;
    const st = s.vorgestellt[v.tile];
    if (st?.fertig || (st?.spaeter ?? 0) >= 2 || benutzt(s, v.tile)) continue;
    // Heute schon „Später“ gesagt: heute nichts mehr vorstellen
    if (st?.zuletzt === o.today) return null;
    return { tile: v.tile, text: v.kachel, href: v.href };
  }
  return null;
}

/** Erster Besuch: Text für diese Seite, solange die Karte dort noch nie stand */
export function ersterBesuch(s: DenktState, seite: string): string | null {
  const tile = SEITE_FUER[seite];
  if (!tile || s.besucht.includes(seite)) return null;
  return VORSTELLEN.find((v) => v.tile === tile)?.seite ?? null;
}
