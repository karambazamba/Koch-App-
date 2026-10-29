// Auswahl der Wundertüte (A-022; nie doppelt seit A-049, „Noch eine ›“ seit
// A-052) – rein und testbar:
// - Die Kachel zeigt die aktuelle Karte; an einem neuen Tag kommt von selbst
//   die nächste. Auf der Seite bringt „Noch eine ›“ beliebig oft die nächste,
//   auf Wunsch nur einer Sorte (Alles · Witze · Plattdeutsch · Angeberwissen).
// - Nie doppelt: Gezeigtes (im Haushalt geteilt) kommt nie wieder. Immer
//   zuerst Ungesehenes aus dem ältesten Paket, Mias Witze danach.
// - Karten mit Anlass (Wetter, Jahreszeit, Wochentag, Gericht, Feiertag;
//   „Schietwedder“ nur an Regentagen) kommen nur, wenn er passt, dann zuerst.
// - Nichts Ungesehenes mehr: „… kommt bald.“ (Witze legt Mia nach, Platt und
//   Angeberwissen nur aus geprüften Paketen), nie eine Wiederholung.

import type { Haushalt } from "@/lib/core/haushalt";
import { WT_POOL, eintragVon } from "@/lib/wundertuete/pool";
import { SORTE_IDS, type Eintrag, type Filter, type Sorte } from "@/lib/wundertuete/sorten";
import { brauchtNachschub, eigeneAus, gesehenAus, karteAus, kiZaehlerAus, merke, ungesehen, ziehe, type Anlass, type KiZaehler } from "@/lib/wundertuete/vorrat";

/** Gespeicherter Stand (`wasgibts.wundertuete` v2; `gesehen` und `eigene` im Haushalt geteilt) */
export type WtStand = {
  version: 2;
  /** Die Karte auf Kachel und Seite, mit dem Tag, an dem sie kam (nur Gerät); `raetsel` = aus dem Rätsel-Vorrat (A-064) */
  aktuell: { id: string; tag: string; raetsel?: true } | null;
  /** Gesehene IDs, nie wieder zeigen */
  gesehen: string[];
  /** Witze, die Mia nachgelegt hat (ID `ki-…`), gesehen oder noch im Vorrat */
  eigene: Eintrag[];
  /** Wie oft dieses Gerät heute nachgelegt hat (nur Gerät) */
  ki?: KiZaehler;
};

export const LEER: WtStand = { version: 2, aktuell: null, gesehen: [], eigene: [] };

/** Wofür gerade ausgesucht wird */
export type Lage = {
  /** Heute, „YYYY-MM-DD“ */
  heute: string;
  /** Minuten seit Mitternacht */
  minuten: number;
  haushalt: Haushalt;
  wetter?: Anlass["wetter"] | null;
  /** Gericht des Tages (Name) */
  gericht?: string | null;
  /** Feiertag heute (Name) */
  feiertag?: string | null;
};

/** Unter so vielen ungesehenen Platt- bzw. Angeberwissen-Karten braucht es ein neues Paket */
export const PAKET_NOETIG_AB = 50;

const saisonVon = (iso: string): NonNullable<Anlass["saison"]> => {
  const m = Number(iso.slice(5, 7));
  return m >= 3 && m <= 5 ? "fruehling" : m >= 6 && m <= 8 ? "sommer" : m >= 9 && m <= 11 ? "herbst" : "winter";
};

const wochentagVon = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();

/** Passt der Eintrag in diese Lage? (Anlass streng) */
export function passt(x: Eintrag, lage: Pick<Lage, "heute" | "wetter" | "gericht" | "feiertag">): boolean {
  const a = x.anlass;
  if (!a) return true;
  if (a.wetter && a.wetter !== lage.wetter) return false;
  if (a.saison && a.saison !== saisonVon(lage.heute)) return false;
  if (a.wochentag !== undefined && a.wochentag !== wochentagVon(lage.heute)) return false;
  if (a.feiertag && !(lage.feiertag ?? "").includes(a.feiertag)) return false;
  if (a.gericht) {
    const g = (lage.gericht ?? "").toLowerCase();
    if (!g || !a.gericht.some((w) => g.includes(w))) return false;
  }
  return true;
}

/** Karte zu einer ID: aus den Paketen oder von Mia */
export const karteVon = (stand: WtStand, id: string | null | undefined) => karteAus(WT_POOL, stand, id);

const imFilter = (f: Filter) => (x: Eintrag) => f === "alles" || x.sorte === f;

/**
 * „Noch eine ›“: die nächste ungesehene Karte (im Filter) wird die aktuelle
 * und gilt ab jetzt als gesehen. Nichts mehr da: `karte` null, die bisherige
 * Karte bleibt nicht stehen (sie wäre eine Wiederholung).
 */
export function naechste(stand: WtStand, lage: Lage, filter: Filter = "alles"): { stand: WtStand; karte: Eintrag | null } {
  const karte = ziehe(WT_POOL, stand, { filter: imFilter(filter), passt: (x) => passt(x, lage), vorher: stand.aktuell?.id });
  if (!karte) return { stand: { ...stand, aktuell: null }, karte: null };
  return { stand: merke({ ...stand, aktuell: { id: karte.id, tag: lage.heute } }, karte.id), karte };
}

/** Kachel wird gezeigt: am selben Tag bleibt die aktuelle Karte, an einem neuen Tag kommt die nächste */
export function tageskarte(stand: WtStand, lage: Lage): WtStand {
  if (stand.aktuell?.tag === lage.heute && karteVon(stand, stand.aktuell.id)) return stand;
  // Alles gesehen und schon „kommt bald“: so lassen (gleicher Stand, nichts zu speichern)
  if (!stand.aktuell && stand.gesehen.length && !ungesehen(WT_POOL, stand, (x) => passt(x, lage)).length) return stand;
  return naechste(stand, lage).stand;
}

/** Ungesehene Karten einer Sorte aus den Paketen (für „Paket nötig“) */
export const uebrigAusPaketen = (stand: Pick<WtStand, "gesehen">, sorte: Sorte) => ungesehen(WT_POOL, { gesehen: stand.gesehen, eigene: [] }, (x) => x.sorte === sorte).length;

/** Braucht es neue Witze von Mia (weniger als 20 im Voraus)? */
export const brauchtWitze = (stand: WtStand) => brauchtNachschub(WT_POOL, stand, "witz");

/** v1 (bis v0.156): aktuelle Karte, Anzeigen, gezeigte IDs je Sorte → alles Gezeigte gilt als gesehen (auch Rätsel, Tischrunde …) */
function ausV1(r: Record<string, unknown>): WtStand {
  const gezeigt = r.gezeigt && typeof r.gezeigt === "object" ? Object.values(r.gezeigt as Record<string, unknown>).flat() : [];
  return { version: 2, aktuell: null, gesehen: gesehenAus([...gezeigt, r.karte]), eigene: [] };
}

/** Gespeicherten Stand prüfen und heben (v1 → v2). Unbekannte IDs bleiben (neueres Paket eines anderen Geräts). */
export function migrateWt(raw: unknown): WtStand | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.version === 1) return ausV1(r);
  if (r.version !== 2) return null;
  const a = r.aktuell as { id?: unknown; tag?: unknown; raetsel?: unknown } | null | undefined;
  const aktuell = a && typeof a.id === "string" && typeof a.tag === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.tag) ? { id: a.id, tag: a.tag, ...(a.raetsel === true ? { raetsel: true as const } : {}) } : null;
  const eigene = eigeneAus(r.eigene, SORTE_IDS).filter((x) => x.sorte === "witz" && !eintragVon(x.id));
  const ki = kiZaehlerAus(r.ki);
  return { version: 2, aktuell, gesehen: gesehenAus(r.gesehen), eigene, ...(ki ? { ki } : {}) };
}
