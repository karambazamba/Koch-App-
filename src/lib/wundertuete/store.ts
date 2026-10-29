// Speicher der Wundertüte (`wasgibts.wundertuete` v2, in der Sicherung; mit
// Konto teilt der Haushalt „gesehen“ und Mias Witze über den Abgleich,
// `konten/sync/docs.ts`). Beispiel-Karten (Beispiel-Tag) landen hier nie.
// Rätsel (A-064) kommen aus ihrem eigenen Vorrat (`raetsel/store.ts`).

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { LEER, migrateWt, type Lage, type WtStand } from "@/lib/wundertuete/auswahl";
import { naechsteMix, tageskarteMix, type Beide } from "@/lib/wundertuete/mischung";
import { raetselNachlegen, rtLaden, rtSpeichern } from "@/lib/raetsel/store";
import { nachschub } from "@/lib/wundertuete/nachschub";
import { WT_POOL } from "@/lib/wundertuete/pool";
import type { Eintrag, Filter } from "@/lib/wundertuete/sorten";

const store = createLocalStore("wasgibts.wundertuete", migrateWt);

const laden = () => store.load() ?? LEER;

/** Stand jetzt (ohne Hook) */
export const loadWt = laden;

/** Stand für Kachel und Seite (`undefined` = lädt) */
export function useWundertuete(): WtStand | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data ?? LEER);
}

/** Witze und Rätsel im Voraus (unter 20 ungesehene: Mia legt im Hintergrund nach) */
const nachlegen = () => {
  void nachschub("wundertuete", "witz", WT_POOL, laden, (s) => store.save(s));
  raetselNachlegen();
};

const beide = (): Beide => ({ wt: laden(), rt: rtLaden() });

/** Beide Vorräte speichern, was sich geändert hat */
function speichern(vorher: Beide, next: Beide) {
  if (next.wt !== vorher.wt) store.save(next.wt);
  if (next.rt !== vorher.rt) rtSpeichern(next.rt);
}

/** Kachel ist zu sehen: Karte des Tages (an einem neuen Tag die nächste) */
export function wtZeigen(lage: Lage) {
  const vorher = beide();
  speichern(vorher, tageskarteMix(vorher, lage));
  nachlegen();
}

/** „Noch eine ›“ auf der Seite (beliebig oft, nie doppelt; Filter „Rätsel“ = nur Rätsel) */
export function wtNoch(lage: Lage, filter: Filter = "alles"): Eintrag | null {
  const vorher = beide();
  const r = naechsteMix(vorher, lage, filter);
  speichern(vorher, r.beide);
  nachlegen();
  return r.karte;
}
