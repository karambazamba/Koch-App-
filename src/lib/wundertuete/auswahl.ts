// Wechsel der Wundertüte (A-022, Tafel 116) – rein und testbar:
// - Tageszeit: tagsüber Angeberwissen, Platt, Rätsel; ab 17 Uhr bei „zu
//   zweit“/„Familie“ Tischrunde, Schätz mal, Wer zuerst (allein abends
//   weiter Wissen, Platt, Rätsel). Heute vor 100 Jahren nur am belegten Tag.
// - Nie zweimal dieselbe Sorte hintereinander.
// - Passendes zuerst: ein Eintrag mit Anlass (Wetter, Jahreszeit, Wochentag,
//   Gericht, Feiertag) kommt NUR, wenn er passt, und dann vor allem anderen;
//   ebenso ein Ereignis von heute vor 100 Jahren.
// - Keine Wiederholung: gezeigte IDs je Sorte; erst wenn alle Einträge der
//   Sorte durch sind, beginnt sie neu gemischt (die letzte Karte nie sofort).
// - Nicht angetippt: nach 3 Anzeigen (Öffnungen mit sichtbarer Kachel, höchstens
//   eine je halbe Stunde) kommt von selbst die nächste. Die Punkte unten zeigen 1–3.

import type { Haushalt } from "@/lib/core/haushalt";
import { eintraegeDer, eintragVon } from "@/lib/wundertuete/pool";
import { SORTE_IDS, sorteMeta, type Anlass, type Eintrag, type Sorte } from "@/lib/wundertuete/sorten";

/** Gespeicherter Stand (pro Gerät, `wasgibts.wundertuete`) */
export type WtStand = {
  version: 1;
  /** Aktuelle Karte (ID) */
  karte: string | null;
  /** Wie oft die aktuelle Karte schon angezeigt wurde (1–3) */
  anzeigen: number;
  /** Zuletzt gezählte Anzeige (ms) */
  zuletzt: number;
  /** Gezeigte IDs je Sorte (seit dem letzten Neu-Mischen) */
  gezeigt: Partial<Record<Sorte, string[]>>;
};

export const LEER: WtStand = { version: 1, karte: null, anzeigen: 0, zuletzt: 0, gezeigt: {} };

/** Nach so vielen Anzeigen kommt von selbst die nächste */
export const ANZEIGEN_MAX = 3;
/** Eine neue Anzeige zählt erst nach dieser Pause (eine Öffnung, nicht jedes Zeichnen) */
export const ANZEIGE_PAUSE_MS = 30 * 60_000;

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

export const istAbends = (minuten: number) => minuten >= 17 * 60;

const saisonVon = (iso: string): NonNullable<Anlass["saison"]> => {
  const m = Number(iso.slice(5, 7));
  return m >= 3 && m <= 5 ? "fruehling" : m >= 6 && m <= 8 ? "sommer" : m >= 9 && m <= 11 ? "herbst" : "winter";
};

const wochentagVon = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();

/** Passt der Eintrag in diese Lage? (Anlass streng, Heute vor 100 Jahren nur am Tag) */
export function passt(x: Eintrag, lage: Lage): boolean {
  if (x.sorte === "heute100") return Boolean(x.tag && x.jahr) && lage.heute.slice(5) === x.tag && Number(lage.heute.slice(0, 4)) === x.jahr! + 100;
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

/** Ein Anlass, der heute passt (oder ein Ereignis von heute) – kommt zuerst */
const besonders = (x: Eintrag, lage: Lage) => (x.sorte === "heute100" || Boolean(x.anlass)) && passt(x, lage);

/** Sorten, die jetzt dran sein dürfen */
export function erlaubteSorten(lage: Lage): Sorte[] {
  const abends = istAbends(lage.minuten) && lage.haushalt !== "allein";
  const base: Sorte[] = abends ? ["tischrunde", "schaetzmal", "werzuerst"] : ["angeberwissen", "platt", "raetsel"];
  return eintraegeDer("heute100").some((x) => passt(x, lage)) ? [...base, "heute100"] : base;
}

/** Darf die aktuelle Karte stehen bleiben? (Tageszeit, Haushalt, Anlass) */
export function karteGilt(id: string | null, lage: Lage): boolean {
  const x = eintragVon(id);
  return Boolean(x && erlaubteSorten(lage).includes(x.sorte) && passt(x, lage));
}

type Zufall = () => number;
const pick = <T>(list: T[], rng: Zufall): T => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

/**
 * Nächste Karte: andere Sorte als die aktuelle, Passendes zuerst, nichts
 * doppelt, bis die Sorte durch ist. Liefert den neuen Stand (Anzeige 1).
 */
export function naechste(stand: WtStand, lage: Lage, jetzt: number, rng: Zufall = Math.random): WtStand {
  const vorher = eintragVon(stand.karte);
  const erlaubt = erlaubteSorten(lage);
  const sorten = erlaubt.filter((s) => s !== vorher?.sorte);
  const kandidaten = sorten.length ? sorten : erlaubt;
  const gezeigt = { ...stand.gezeigt };
  // Je Sorte: noch nicht Gezeigtes, das passt; ist die Sorte durch, neu mischen
  const frei = (s: Sorte) => {
    const passend = eintraegeDer(s).filter((x) => passt(x, lage) && x.id !== stand.karte);
    const neu = passend.filter((x) => !(gezeigt[s] ?? []).includes(x.id));
    if (neu.length || !passend.length) return neu;
    gezeigt[s] = [];
    return passend;
  };
  const alle = kandidaten.flatMap(frei);
  if (!alle.length) return stand;
  const vorn = alle.filter((x) => besonders(x, lage));
  // Heute vor 100 Jahren zuerst, dann anderer Anlass, sonst per Zufall – die Sorte nach dem, was in ihr
  // noch übrig ist (alle Sorten sind etwa gleichzeitig durch: am längsten ohne Wiederholung)
  const wahl = vorn.find((x) => x.sorte === "heute100") ?? (vorn.length ? pick(vorn, rng) : pick(alle, rng));
  gezeigt[wahl.sorte] = [...(gezeigt[wahl.sorte] ?? []), wahl.id];
  return { version: 1, karte: wahl.id, anzeigen: 1, zuletzt: jetzt, gezeigt };
}

/**
 * Kachel wird angezeigt (Öffnen der Startseite): höchstens einmal je halbe
 * Stunde gezählt; nach 3 Anzeigen bzw. wenn die Karte jetzt nicht mehr gilt,
 * kommt die nächste.
 */
export function anzeigen(stand: WtStand, lage: Lage, jetzt: number, rng: Zufall = Math.random): WtStand {
  if (!karteGilt(stand.karte, lage)) return naechste(stand, lage, jetzt, rng);
  if (jetzt - stand.zuletzt < ANZEIGE_PAUSE_MS) return stand;
  if (stand.anzeigen >= ANZEIGEN_MAX) return naechste(stand, lage, jetzt, rng);
  return { ...stand, anzeigen: stand.anzeigen + 1, zuletzt: jetzt };
}

/** Gespeicherten Stand prüfen (unbekannte IDs und Sorten fallen still weg) */
export function migrateWt(raw: unknown): WtStand | null {
  if (!raw || typeof raw !== "object" || (raw as WtStand).version !== 1) return null;
  const r = raw as Partial<WtStand>;
  const gezeigt: WtStand["gezeigt"] = {};
  for (const s of SORTE_IDS) {
    const ids = (r.gezeigt as Record<string, unknown> | undefined)?.[s];
    if (Array.isArray(ids)) gezeigt[s] = ids.filter((id): id is string => typeof id === "string" && eintragVon(id)?.sorte === s);
  }
  const karte = typeof r.karte === "string" && eintragVon(r.karte) ? r.karte : null;
  const anzeigen = typeof r.anzeigen === "number" ? Math.max(0, Math.min(ANZEIGEN_MAX, Math.round(r.anzeigen))) : 0;
  return { version: 1, karte, anzeigen: karte ? anzeigen : 0, zuletzt: typeof r.zuletzt === "number" ? r.zuletzt : 0, gezeigt };
}

/** Hat die Karte eine Rückseite? */
export const hatRueckseite = (x: Eintrag) => sorteMeta(x.sorte).rueckseite && Boolean(x.hinten);

/** Antippen: vorne mit Rückseite = umdrehen, sonst (hinten oder ohne Rückseite) = nächste Karte */
export const tippAktion = (seite: "vorne" | "hinten", x: Eintrag): "umdrehen" | "weiter" => (seite === "vorne" && hatRueckseite(x) ? "umdrehen" : "weiter");
