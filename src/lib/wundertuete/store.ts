// Speicher der Wundertüte (`wasgibts.wundertuete` v2, in der Sicherung; mit
// Konto teilt der Haushalt „gesehen“ und Mias Witze über den Abgleich,
// `konten/sync/docs.ts`). Beispiel-Karten (Beispiel-Tag) landen hier nie.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { LEER, migrateWt, naechste, tageskarte, type Lage, type WtStand } from "@/lib/wundertuete/auswahl";
import { nachschub } from "@/lib/wundertuete/nachschub";
import { WT_POOL } from "@/lib/wundertuete/pool";
import type { Eintrag, Filter } from "@/lib/wundertuete/sorten";

const store = createLocalStore("wasgibts.wundertuete", migrateWt);

const laden = () => store.load() ?? LEER;

/** Stand für Kachel und Seite (`undefined` = lädt) */
export function useWundertuete(): WtStand | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data ?? LEER);
}

/** Witze im Voraus (unter 20 ungesehene: Mia legt im Hintergrund nach) */
const witze = () => void nachschub("wundertuete", "witz", WT_POOL, laden, (s) => store.save(s));

/** Kachel ist zu sehen: Karte des Tages (an einem neuen Tag die nächste) */
export function wtZeigen(lage: Lage) {
  const vorher = laden();
  const next = tageskarte(vorher, lage);
  if (next !== vorher) store.save(next);
  witze();
}

/** „Noch eine ›“ auf der Seite (beliebig oft, nie doppelt) */
export function wtNoch(lage: Lage, filter: Filter = "alles"): Eintrag | null {
  const r = naechste(laden(), lage, filter);
  store.save(r.stand);
  witze();
  return r.karte;
}
