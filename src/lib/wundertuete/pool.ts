// Der ganze Pool der Wundertüte (A-022): alle Datendateien je Sorte an einer
// Stelle. Zählung je Sorte steht in `docs/bereiche/wundertuete.md`.

import type { Eintrag, Sorte } from "@/lib/wundertuete/sorten";
import { ANGEBERWISSEN } from "@/lib/wundertuete/data/angeberwissen";
import { PLATT } from "@/lib/wundertuete/data/platt";
import { RAETSEL } from "@/lib/wundertuete/data/raetsel";
import { HEUTE100 } from "@/lib/wundertuete/data/heute100";
import { TISCHRUNDE } from "@/lib/wundertuete/data/tischrunde";
import { SCHAETZMAL } from "@/lib/wundertuete/data/schaetzmal";
import { WERZUERST } from "@/lib/wundertuete/data/werzuerst";

export const POOL: Eintrag[] = [...ANGEBERWISSEN, ...PLATT, ...RAETSEL, ...HEUTE100, ...TISCHRUNDE, ...SCHAETZMAL, ...WERZUERST];

const BY_ID = new Map(POOL.map((x) => [x.id, x]));

export const eintragVon = (id: string | null | undefined): Eintrag | undefined => (id ? BY_ID.get(id) : undefined);

export const eintraegeDer = (sorte: Sorte) => POOL.filter((x) => x.sorte === sorte);

/**
 * Beispiel-Tag (erster Start): eine feste Karte Angeberwissen, nie in den
 * echten Speichern (wird nicht als gezeigt gemerkt).
 */
export const BEISPIEL_KARTE: Eintrag = eintragVon("aw-001")!;
