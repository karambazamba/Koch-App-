// Speicher der Wundertüte (`wasgibts.wundertuete` v1, pro Gerät, in der
// Sicherung): aktuelle Karte, wie oft sie schon da war, gezeigte IDs je
// Sorte. Beispiel-Karten (Beispiel-Tag) landen hier nie.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { LEER, anzeigen, migrateWt, naechste, type Lage, type WtStand } from "@/lib/wundertuete/auswahl";

const store = createLocalStore("wasgibts.wundertuete", migrateWt);

const laden = () => store.load() ?? LEER;

/** Stand für die Kachel (`undefined` = lädt) */
export function useWundertuete(): WtStand | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data ?? LEER);
}

/** Kachel ist zu sehen: Anzeige zählen bzw. nächste Karte */
export function wtAnzeigen(lage: Lage, jetzt: number) {
  const vorher = laden();
  const next = anzeigen(vorher, lage, jetzt);
  if (next !== vorher) store.save(next);
}

/** Antippen auf der letzten Seite: nächste Karte */
export function wtWeiter(lage: Lage, jetzt: number) {
  store.save(naechste(laden(), lage, jetzt));
}
