// Speicher der Rätsel (`wasgibts.raetsel` v1, in der Sicherung; mit Konto
// teilt der Haushalt „gesehen“ und Mias Rätsel über den Abgleich). Beim
// ersten Mal übernimmt er die Rätsel, die die alte Wundertüte schon gezeigt hat.

import { createLocalStore, readRaw } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { RT_LEER, RT_POOL, loesen, migrateRaetsel, naechstesRaetsel, oeffnen, raetselStart, type Raetsel, type RtStand } from "@/lib/raetsel/auswahl";
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

const laden = () => store.load() ?? start();

/** Stand für Fenster und Mini-Kreis (`undefined` = lädt) */
export function useRaetsel(): RtStand | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data ?? start());
}

const nachlegen = () => void nachschub("raetsel", "raetsel", RT_POOL, laden, (s) => store.save(s));

/** Fenster geht auf */
export function raetselOeffnen() {
  const vorher = laden();
  const next = oeffnen(vorher);
  if (next !== vorher || !store.load()) store.save(next);
  nachlegen();
}

/** Antippen: Lösung zeigen */
export const raetselLoesen = () => store.save(loesen(laden()));

/** „Noch eins ›“ (beliebig oft, nie doppelt) */
export function raetselNoch(): Raetsel | null {
  const r = naechstesRaetsel(laden());
  store.save(r.stand);
  nachlegen();
  return r.raetsel;
}
