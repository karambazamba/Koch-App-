// Speicher der Rätsel (`wasgibts.raetsel` v1, in der Sicherung; mit Konto
// teilt der Haushalt „gesehen“ und Mias Rätsel über den Abgleich). Beim
// ersten Mal übernimmt er die Rätsel, die die alte Wundertüte schon gezeigt hat.
// Seit A-064 zeigt die Wundertüte die Rätsel als vierte Sorte
// (`wundertuete/mischung.ts`); dieser Vorrat bleibt ihre Quelle.

import { createLocalStore, readRaw } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { RT_LEER, RT_POOL, migrateRaetsel, raetselStart, type RtStand } from "@/lib/raetsel/auswahl";
import { migrateWt } from "@/lib/wundertuete/auswahl";
import { nachschub } from "@/lib/wundertuete/nachschub";

const store = createLocalStore("wasgibts.raetsel", migrateRaetsel);

/** Noch nichts gespeichert: aus der alten Wundertüte starten (dort gezeigte Rätsel = gesehen) */
function start(): RtStand {
  try {
    const wt = migrateWt(JSON.parse(readRaw("wasgibts.wundertuete") ?? "null"));
    return wt ? raetselStart(wt.gesehen) : RT_LEER;
  } catch {
    return RT_LEER;
  }
}

/** Rätsel-Vorrat lesen (noch nichts gespeichert: aus der alten Wundertüte starten) */
export const rtLaden = () => store.load() ?? start();
/** Rätsel-Vorrat speichern */
export const rtSpeichern = (s: RtStand) => store.save(s);

/** Stand für die Wundertüte (`undefined` = lädt) */
export function useRaetsel(): RtStand | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data ?? start());
}

/** Weniger als 20 Rätsel im Voraus: Mia legt im Hintergrund nach */
export const raetselNachlegen = () => void nachschub("raetsel", "raetsel", RT_POOL, rtLaden, rtSpeichern);
