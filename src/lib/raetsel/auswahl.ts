// Rätsel (A-052, eigener Bereich, Mini-Kreis auf der Startseite) – rein und
// testbar: Das Fenster zeigt ein Rätsel; erst Antippen zeigt die Lösung.
// „Noch eins ›“ bringt beliebig oft das nächste. Nie doppelt: Gezeigtes (im
// Haushalt geteilt) kommt nie wieder, zuerst Ungesehenes aus dem ältesten
// Paket, danach Mias nachgelegte Rätsel. Kein Zähler, keine Punkte.

import type { RaetselRoh } from "@/lib/raetsel/pakete";
import { RAETSEL_PAKETE } from "@/lib/raetsel/pakete";
import { brauchtNachschub, eigeneAus, gesehenAus, karteAus, kiZaehlerAus, merke, poolAus, ungesehen, ziehe, type Karte, type KiZaehler } from "@/lib/wundertuete/vorrat";

export type Raetsel = Karte<"raetsel">;

const alsKarte = (r: RaetselRoh): Raetsel => ({ id: r.id, sorte: "raetsel", vorne: r.frage, hinten: r.loesung });

export const RT_POOL = poolAus<Raetsel>(RAETSEL_PAKETE.map((p) => ({ paket: p.paket, eintraege: p.eintraege.map(alsKarte) })));

/** Gespeicherter Stand (`wasgibts.raetsel` v1; `gesehen` und `eigene` im Haushalt geteilt) */
export type RtStand = {
  version: 1;
  /** Das Rätsel im Fenster und ob die Lösung schon aufgedeckt ist (nur Gerät) */
  aktuell: { id: string; geloest: boolean } | null;
  gesehen: string[];
  /** Rätsel, die Mia nachgelegt hat (ID `ki-…`) */
  eigene: Raetsel[];
  /** Wie oft dieses Gerät heute nachgelegt hat (nur Gerät) */
  ki?: KiZaehler;
};

export const RT_LEER: RtStand = { version: 1, aktuell: null, gesehen: [], eigene: [] };

export const raetselVon = (stand: RtStand, id: string | null | undefined) => karteAus(RT_POOL, stand, id);

/** „Noch eins ›“: das nächste ungesehene Rätsel, ab jetzt gesehen (Lösung zu) – oder null */
export function naechstesRaetsel(stand: RtStand): { stand: RtStand; raetsel: Raetsel | null } {
  const raetsel = ziehe(RT_POOL, stand, { vorher: stand.aktuell?.id });
  if (!raetsel) return { stand: { ...stand, aktuell: null }, raetsel: null };
  return { stand: merke({ ...stand, aktuell: { id: raetsel.id, geloest: false } }, raetsel.id), raetsel };
}

/** Fenster geht auf: ein noch nicht gelöstes Rätsel bleibt, sonst kommt das nächste */
export function oeffnen(stand: RtStand): RtStand {
  if (stand.aktuell && !stand.aktuell.geloest && raetselVon(stand, stand.aktuell.id)) return stand;
  if (!stand.aktuell && !ungesehen(RT_POOL, stand).length) return stand;
  return naechstesRaetsel(stand).stand;
}

/** Antippen: Lösung zeigen */
export const loesen = (stand: RtStand): RtStand => (stand.aktuell ? { ...stand, aktuell: { ...stand.aktuell, geloest: true } } : stand);

/** Gibt es ein ungesehenes Rätsel? (intern; der Mini-Kreis zeigt kein Schild und keine Zahl) */
export const hatUngesehenes = (stand: RtStand) => ungesehen(RT_POOL, stand).length > 0;

/** Weniger als 20 im Voraus: Mia legt nach */
export const brauchtRaetsel = (stand: RtStand) => brauchtNachschub(RT_POOL, stand, "raetsel");

/** Erster Start des Bereichs: Rätsel, die die alte Wundertüte schon gezeigt hat, gelten als gesehen */
export const raetselStart = (wtGesehen: readonly string[]): RtStand => ({ ...RT_LEER, gesehen: gesehenAus(wtGesehen.filter((id) => /^ra-\d+$/.test(id))) });

/** Gespeicherten Stand prüfen (unbekannte IDs bleiben, Kaputtes fällt still weg) */
export function migrateRaetsel(raw: unknown): RtStand | null {
  if (!raw || typeof raw !== "object" || (raw as RtStand).version !== 1) return null;
  const r = raw as Record<string, unknown>;
  const a = r.aktuell as { id?: unknown; geloest?: unknown } | null | undefined;
  const aktuell = a && typeof a.id === "string" ? { id: a.id, geloest: a.geloest === true } : null;
  const ki = kiZaehlerAus(r.ki);
  return { version: 1, aktuell, gesehen: gesehenAus(r.gesehen), eigene: eigeneAus(r.eigene, ["raetsel"] as const).filter((x) => !RT_POOL.byId.has(x.id)), ...(ki ? { ki } : {}) };
}
