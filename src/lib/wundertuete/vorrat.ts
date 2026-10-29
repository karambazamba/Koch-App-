// „Nie doppelt“ für Wundertüte und Rätsel (A-052) – rein und testbar, für
// beide Bereiche gleich: Karten kommen aus Paketen (`content/<bereich>/
// paket-NNN.json`, ältestes zuerst) und aus Mias Nachschub (`eigene`, per KI,
// nur Witze und Rätsel). Was der Haushalt gesehen hat (`gesehen`, im Haushalt
// geteilt), kommt nie wieder. „Noch eine ›“ geht beliebig oft; reicht der
// Vorrat einer Sorte mit KI-Nachschub nicht mehr für 20 Karten im Voraus,
// legt Mia nach (`nachlegen`, mit Ähnlichkeitsabgleich gegen alles Bekannte).

import { aehnlichkeitsIndex } from "@/lib/wundertuete/aehnlich";
import type { KiAntwort, KiArt } from "@/lib/wundertuete/kiKarte";

/** Anlass: die Karte kommt NUR, wenn er passt (und dann zuerst) */
export type Anlass = {
  wetter?: "regen" | "schnee" | "sonne";
  saison?: "fruehling" | "sommer" | "herbst" | "winter";
  /** 0 = Sonntag … 6 = Samstag */
  wochentag?: number;
  /** Stichwörter im Gericht des Tages (klein, Teilwort genügt) */
  gericht?: string[];
  /** Name des Feiertags (Teilwort) */
  feiertag?: string;
};

/**
 * Eine Karte. `vorne` = Frage, Wort, Witz; `hinten` = Lösung bzw. Bedeutung
 * (genau EIN Wort in **…** = fett) oder Pointe; `quelle` = Pflicht bei
 * Fakten und Platt, nie angezeigt.
 */
export type Karte<S extends string = string> = { id: string; sorte: S; vorne: string; hinten?: string; quelle?: string; anlass?: Anlass };

export type Paket<K> = { paket: number; eintraege: K[] };

/** Was beide Bereiche speichern (dazu je eigene Felder auf dem Gerät) */
export type VorratStand<K> = { gesehen: string[]; eigene: K[] };

/** So viele ungesehene Karten einer Nachschub-Sorte hält Mia im Voraus bereit */
export const VORRAT_ZIEL = 20;

/** Pool aus Paketen: Karten in fester Reihenfolge (Paket, dann Platz) */
export type Pool<K extends Karte> = { karten: K[]; byId: Map<string, K>; paketVon(id: string): number; platzVon(id: string): number };

export function poolAus<K extends Karte>(pakete: Paket<K>[]): Pool<K> {
  const karten = [...pakete].sort((a, b) => a.paket - b.paket).flatMap((p) => p.eintraege);
  const byId = new Map(karten.map((k) => [k.id, k]));
  const paket = new Map(pakete.flatMap((p) => p.eintraege.map((k) => [k.id, p.paket] as const)));
  const platz = new Map(karten.map((k, i) => [k.id, i]));
  return { karten, byId, paketVon: (id) => paket.get(id) ?? Number.MAX_SAFE_INTEGER, platzVon: (id) => platz.get(id) ?? Number.MAX_SAFE_INTEGER };
}

/** Karte zu einer ID: aus den Paketen oder von Mia */
export const karteAus = <K extends Karte>(pool: Pool<K>, stand: VorratStand<K>, id: string | null | undefined): K | undefined =>
  id ? (pool.byId.get(id) ?? stand.eigene.find((k) => k.id === id)) : undefined;

/** Alle ungesehenen Karten (Pakete zuerst, ältestes vorn; dann Mias Nachschub), optional gefiltert */
export function ungesehen<K extends Karte>(pool: Pool<K>, stand: VorratStand<K>, filter: (k: K) => boolean = () => true): K[] {
  const gesehen = new Set(stand.gesehen);
  return [...pool.karten, ...stand.eigene.filter((k) => !pool.byId.has(k.id))].filter((k) => !gesehen.has(k.id) && filter(k));
}

/**
 * Nächste Karte (oder null = nichts Ungesehenes): 1. eine Karte mit
 * passendem Anlass, 2. sonst das älteste Paket mit Ungesehenem (Mias
 * Nachschub zählt als jüngstes), dort nicht dieselbe Sorte wie eben und die
 * Sorte, von der anteilig am meisten übrig ist. Fest statt Zufall: gleicher Stand = gleiche
 * Karte auf jedem Gerät.
 */
export function ziehe<K extends Karte>(pool: Pool<K>, stand: VorratStand<K>, opt: { filter?: (k: K) => boolean; passt?: (k: K) => boolean; vorher?: string | null } = {}): K | null {
  const passt = opt.passt ?? ((k: K) => !k.anlass);
  const frei = ungesehen(pool, stand, (k) => (opt.filter ?? (() => true))(k) && passt(k));
  if (!frei.length) return null;
  const vorn = frei.filter((k) => k.anlass);
  const paket = pool.paketVon(frei[0].id);
  const auswahl = vorn.length ? vorn : frei.filter((k) => pool.paketVon(k.id) === paket);
  const zahl = new Map<string, number>();
  for (const k of auswahl) zahl.set(k.sorte, (zahl.get(k.sorte) ?? 0) + 1);
  // Anteil, der von der Sorte im Paket noch übrig ist: so mischen sich die
  // Sorten im Verhältnis des Pakets (auch die kleine Witz-Sorte kommt regelmäßig)
  const gesamt = new Map<string, number>();
  for (const k of vorn.length ? auswahl : [...pool.karten, ...stand.eigene].filter((x) => pool.paketVon(x.id) === paket)) gesamt.set(k.sorte, (gesamt.get(k.sorte) ?? 0) + 1);
  const anteil = (s: string) => zahl.get(s)! / (gesamt.get(s) ?? zahl.get(s)!);
  const sorten = [...zahl.keys()];
  const vorherSorte = karteAus(pool, stand, opt.vorher)?.sorte;
  const kandidaten = sorten.length > 1 ? sorten.filter((s) => s !== vorherSorte) : sorten;
  const sorte = kandidaten.sort((a, b) => anteil(b) - anteil(a) || zahl.get(b)! - zahl.get(a)!)[0];
  return auswahl.find((k) => k.sorte === sorte)!;
}

/** Als gesehen merken (einmal) */
export const merke = <S extends VorratStand<Karte>>(stand: S, id: string): S => (stand.gesehen.includes(id) ? stand : { ...stand, gesehen: [...stand.gesehen, id] });

/** Braucht diese Sorte Nachschub (weniger als 20 ungesehene)? */
export const brauchtNachschub = <K extends Karte>(pool: Pool<K>, stand: VorratStand<K>, sorte: string) => ungesehen(pool, stand, (k) => k.sorte === sorte).length < VORRAT_ZIEL;

/** Alle bekannten Texte (gesehen und ungesehen) – nichts Neues darf ihnen ähneln */
export function bekannteTexte<K extends Karte>(pool: Pool<K>, stand: VorratStand<K>): string[] {
  return [...pool.karten, ...stand.eigene].flatMap((k) => [k.vorne, `${k.vorne} ${k.hinten ?? ""}`]);
}

/** Fragt die KI nach einigen neuen Karten (leer/null = nichts bekommen) */
export type KiHolen = (anfrage: { art: KiArt; versuch: 1 | 2; nr: number }) => Promise<KiAntwort[] | null>;

/**
 * Mia legt nach: eine Anfrage an die KI (einige Karten auf einmal); was einer
 * bekannten Karte oder einer anderen neuen ähnelt, fällt weg. Kommt dabei
 * nichts Brauchbares, genau ein zweiter Versuch. Liefert die neuen Karten.
 */
export async function nachlegen<S extends string>(pool: Pool<Karte<S>>, stand: VorratStand<Karte<S>>, art: KiArt & S, holen: KiHolen, neueId: () => string): Promise<Karte<S>[]> {
  const index = aehnlichkeitsIndex(bekannteTexte(pool, stand));
  for (const versuch of [1, 2] as const) {
    const antworten = (await holen({ art, versuch, nr: stand.eigene.filter((k) => k.sorte === art).length }).catch(() => null)) ?? [];
    const neu: Karte<S>[] = [];
    for (const a of antworten) {
      const vorne = a.vorne.trim();
      const voll = `${vorne} ${a.hinten ?? ""}`;
      if (!vorne || index.zuAehnlich(vorne) || index.zuAehnlich(voll)) continue;
      neu.push({ id: neueId(), sorte: art, vorne, ...(a.hinten ? { hinten: a.hinten } : {}) });
      index.merke(vorne);
      index.merke(voll);
    }
    if (neu.length) return neu;
  }
  return [];
}

/** Neue, feste ID für eine Karte von Mia (`ki-` + Zeit + Zufall) */
export const neueKiId = (jetzt: number, zufall: () => number = Math.random) => `ki-${jetzt.toString(36)}-${Math.floor(zufall() * 36 ** 4).toString(36).padStart(4, "0")}`;

const ID = /^[a-z0-9-]{1,40}$/;
const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() && v.length <= max ? v : undefined);

/** Gespeicherte Liste gesehener IDs prüfen (unbekannte bleiben: können aus einem neueren Paket stammen) */
export const gesehenAus = (raw: unknown): string[] => [...new Set((Array.isArray(raw) ? raw : []).filter((id): id is string => typeof id === "string" && ID.test(id)))];

/** Gespeicherte eigene Karten prüfen (nur erlaubte Sorten, keine Dubletten) */
export function eigeneAus<S extends string>(raw: unknown, sorten: readonly S[]): Karte<S>[] {
  const out: Karte<S>[] = [];
  for (const r of Array.isArray(raw) ? raw : []) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const id = typeof o.id === "string" && ID.test(o.id) ? o.id : undefined;
    const sorte = sorten.includes(o.sorte as S) ? (o.sorte as S) : undefined;
    const vorne = str(o.vorne, 300);
    if (!id || !sorte || !vorne || out.some((k) => k.id === id)) continue;
    const hinten = str(o.hinten, 300);
    out.push({ id, sorte, vorne, ...(hinten ? { hinten } : {}) });
  }
  return out;
}

/** Wie oft dieses Gerät heute schon nachgelegt hat (nur Gerät, höchstens `KI_JE_TAG`) */
export type KiZaehler = { tag: string; n: number };
export const KI_JE_TAG = 6;
export const kiZaehlerAus = (raw: unknown): KiZaehler | undefined => {
  const r = raw as Partial<KiZaehler> | null | undefined;
  return r && typeof r.tag === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.tag) && typeof r.n === "number" ? { tag: r.tag, n: Math.max(0, Math.round(r.n)) } : undefined;
};
export const darfNachlegen = (ki: KiZaehler | undefined, tag: string) => !ki || ki.tag !== tag || ki.n < KI_JE_TAG;
export const kiGezaehlt = (ki: KiZaehler | undefined, tag: string): KiZaehler => (ki?.tag === tag ? { tag, n: ki.n + 1 } : { tag, n: 1 });
