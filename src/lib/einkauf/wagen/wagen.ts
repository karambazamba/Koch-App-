// Laden-Seite: Abhaken im Laden (Nachtrag A-018, Punkt 1 und 2).
// - Laden leer: „Für Edeka steht nichts drauf.“ + Vorschläge „Oft bei Edeka“
//   (was hier gekauft bzw. gemerkt wurde), sonst „Zuletzt gekauft“, sonst „Beliebt“.
// - Abgehakt = Häkchen orange, 1 s sichtbar (nochmal tippen = doch nicht),
//   dann gleitet die Zeile nach unten in „Schon im Wagen“ (zugeklappt).
// - „Einkauf fertig“: alles aus „Schon im Wagen“ nach „Im Haus“ (nur mit
//   Baustein), Meldung „Fertig. Liegt jetzt bei Im Haus.“ bzw. „Fertig.“, mit
//   Rückgängig (wieder im Wagen, wieder raus aus Im Haus).

import { BELIEBT, BELIEBT_DROGERIE } from "@/lib/einkauf/aussuchen/katalog";
import { istDrogerieLaden, oftBei, type Verlauf } from "@/lib/einkauf/aussuchen/abschnitte";
import { alleSchluessel, markFertig } from "@/lib/einkauf/listEdits";
import type { ListItem } from "@/lib/einkauf/listModel";
import { isFood, isGrundsache } from "@/lib/vorrat/haltbar";
import { addPantryItems, loadPantryAll, replacePantry } from "@/lib/vorrat/pantry";

/** Zeile bleibt nach dem Abhaken 1 s stehen, gleitet dann 0,8 s nach unten (überall gleich, `core/abhaken`) */
export { GLEITEN_MS, STEHEN_MS } from "@/lib/core/abhaken";

const lower = (s: string) => s.trim().toLowerCase();

/** Laden-Seite aufteilen: oben noch zu holen (und gerade Abgehaktes), unten „Schon im Wagen“ */
export function wagenTeilen(items: ListItem[], bleibt: string[]): { hier: ListItem[]; wagen: ListItem[] } {
  return {
    hier: items.filter((i) => !i.checked || bleibt.includes(i.key)),
    wagen: items.filter((i) => i.checked && !i.fertig && !bleibt.includes(i.key)),
  };
}

/** Vorschläge für einen leeren Laden: „Oft bei Edeka“, sonst „Zuletzt gekauft“, sonst „Beliebt“ */
export function leerVorschlaege(shop: string, v: Verlauf, schonDrauf: string[] = []): { titel: string; namen: string[] } {
  const drauf = new Set(schonDrauf.map(lower));
  const frei = (namen: string[]) => [...new Map(namen.map((n) => [lower(n), n.trim()])).values()].filter((n) => n && !drauf.has(lower(n))).slice(0, 9);
  const oft = frei(oftBei(shop, v));
  if (shop && oft.length) return { titel: `Oft bei ${shop}`, namen: oft };
  const zuletzt = frei(v.gekauft.map((i) => i.name));
  if (zuletzt.length) return { titel: "Zuletzt gekauft", namen: zuletzt };
  return { titel: "Beliebt", namen: frei(istDrogerieLaden(shop) ? BELIEBT_DROGERIE : BELIEBT) };
}

/**
 * „Einkauf fertig“: alles aus dem Wagen verlässt die Laden-Seite; mit Baustein
 * „Im Haus“ kommen die Lebensmittel dorthin. Liefert Meldung und Rückgängig.
 */
export function einkaufFertig(weekStart: string, wagen: ListItem[], today: string, imHausAn: boolean): { text: string; undo: () => void } {
  const zurueck = markFertig(weekStart, wagen.flatMap(alleSchluessel));
  const before = loadPantryAll();
  const essen = imHausAn ? wagen.filter((i) => isFood(i.name) && !isGrundsache(i.name)) : [];
  const rein = essen.length ? addPantryItems(essen.map((i) => ({ name: i.name })), today) : [];
  return {
    text: essen.length ? "Fertig. Liegt jetzt bei Im Haus." : "Fertig.",
    undo: () => {
      zurueck();
      if (rein.length) replacePantry(before);
    },
  };
}
