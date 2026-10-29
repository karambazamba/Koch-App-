// Der Pool der Wundertüte (A-052): alle Karten aus den Paketen, in fester
// Reihenfolge. Zählung je Sorte steht in `docs/bereiche/wundertuete.md`.

import { poolAus } from "@/lib/wundertuete/vorrat";
import { PAKETE } from "@/lib/wundertuete/pakete";
import type { Eintrag, Sorte } from "@/lib/wundertuete/sorten";

export const WT_POOL = poolAus<Eintrag>(PAKETE);

export const POOL: Eintrag[] = WT_POOL.karten;

export const eintragVon = (id: string | null | undefined): Eintrag | undefined => (id ? WT_POOL.byId.get(id) : undefined);

export const eintraegeDer = (sorte: Sorte) => POOL.filter((x) => x.sorte === sorte);

/**
 * Beispiel-Tag (erster Start, Tafel 140): „Was heißt ‚Kiek mol an‘?“ – nie
 * in den echten Speichern (wird nicht als gesehen gemerkt).
 */
export const BEISPIEL_KARTE: Eintrag = eintragVon("pl-090")!;
