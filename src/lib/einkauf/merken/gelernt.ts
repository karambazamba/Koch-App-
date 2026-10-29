// Mia merkt sich den Laden (A-041, Tafel 128), rein. Jedes Abhaken auf einer
// Laden-Seite wird gemerkt: Sache (gefunden über die Normalform, „Tomate“ =
// „Tomaten“) → Laden, wie oft hintereinander dort, wann zuletzt. Eine neue
// Sache ohne Laden landet dann im gelernten Laden (`shopChoice`), „Oft bei
// Rewe“ zeigt, was dort am häufigsten abgehakt wurde. Nie gemerkt: was nur
// einmal vor über 90 Tagen gekauft wurde – es verblasst still. Nur lokal
// bzw. im Haushalt über den vorhandenen Abgleich, keine Server-Statistik.

import { addDays } from "@/lib/core/now";
import { OFT_GELERNT, compareText, sortBy } from "@/lib/core/sort";
import type { Gelernt } from "@/lib/einkauf/listModel";
import { normalform } from "@/lib/einkauf/zusammen/zusammen";

/** Einmal gekauft und länger her: verblasst still */
const GELERNT_TAGE = 90;
/** „Oft bei Rewe“: höchstens so viele */
export const OFT_MAX = 8;

const lower = (s: string) => s.trim().toLowerCase();
const cap = (s: string) => (s ? s.charAt(0).toLocaleUpperCase("de-DE") + s.slice(1) : s);

/** Gilt das Gelernte noch? (einmal vor über 90 Tagen = nein; ohne Datum = ja) */
export const gilt = (g: Gelernt, heute: string) => g.n > 1 || !g.am || g.am >= addDays(heute, -GELERNT_TAGE);

/** Schlüssel einer Sache im Gelernten: genau so oder in der Normalform */
export function gelerntSchluessel(learned: Record<string, Gelernt>, name: string): string | null {
  const k = lower(name);
  if (!k) return null;
  if (learned[k]) return k;
  const nf = normalform(name);
  return Object.keys(learned).find((x) => normalform(x) === nf) ?? null;
}

/** Gelernter Laden einer Sache (null = nichts gelernt bzw. verblasst) */
export function gelernterLadenFuer(learned: Record<string, Gelernt> | undefined, name: string, heute: string): string | null {
  if (!learned) return null;
  const k = gelerntSchluessel(learned, name);
  const g = k ? learned[k] : undefined;
  return g && g.shop.trim() && gilt(g, heute) ? g.shop.trim() : null;
}

/** Verblasstes fällt weg (still, beim nächsten Merken) */
const aufraeumen = (learned: Record<string, Gelernt>, heute: string) => Object.fromEntries(Object.entries(learned).filter(([, g]) => gilt(g, heute)));

/**
 * Auf der Laden-Seite von `shop` abgehakt: gleicher Laden +1, sonst neu (der
 * zuletzt genutzte Laden gilt), Datum heute.
 */
export function abgehakt(learned: Record<string, Gelernt>, name: string, shop: string, heute: string): Record<string, Gelernt> {
  const clean = shop.trim().slice(0, 30);
  const k = gelerntSchluessel(learned, name) ?? lower(name);
  if (!k || !clean) return learned;
  const prev = learned[k];
  const n = prev && lower(prev.shop) === lower(clean) && gilt(prev, heute) ? Math.min(99, prev.n + 1) : 1;
  return { ...aufraeumen(learned, heute), [k]: { shop: clean, n, am: heute } };
}

/**
 * Laden selbst geändert („Rewe · wie immer ⌄“ → Edeka, Zeilen-Fenster): das
 * nächste Mal kommt die Sache in den neuen Laden. Zählt wie ein Abhaken dort,
 * mindestens zweimal, damit es nicht verblasst.
 */
export function korrigiert(learned: Record<string, Gelernt>, name: string, shop: string, heute: string): Record<string, Gelernt> {
  const k = gelerntSchluessel(learned, name) ?? lower(name);
  const clean = shop.trim().slice(0, 30);
  if (!k) return learned;
  if (!clean) {
    const rest = { ...learned };
    delete rest[k];
    return rest;
  }
  return { ...aufraeumen(learned, heute), [k]: { shop: clean, n: 2, am: heute } };
}

/**
 * „Oft bei Rewe“: am häufigsten dort Abgehaktes, das gerade nicht auf der
 * Liste steht – höchstens 8, bei Gleichstand das zuletzt Gekaufte zuerst.
 */
export function oftBeiGelernt(learned: Record<string, Gelernt> | undefined, shop: string, schonDrauf: readonly string[], heute: string): string[] {
  const s = lower(shop);
  if (!s || !learned) return [];
  const drauf = new Set(schonDrauf.map(normalform));
  const hier = Object.entries(learned)
    .filter(([k, g]) => lower(g.shop) === s && gilt(g, heute) && !drauf.has(normalform(k)))
    .map(([k, g]) => ({ name: cap(k), n: g.n, am: g.am }));
  return sortBy(hier, ...OFT_GELERNT)
    .slice(0, OFT_MAX)
    .map((x) => x.name);
}

/** Einstellungen → Mia → „Was ich mir gemerkt hab“: „Tomaten → Rewe“ (deutsch sortiert, Verblasstes nicht) */
export function gelerntListe(learned: Record<string, Gelernt> | undefined, heute: string): { key: string; sache: string; shop: string }[] {
  const liste = Object.entries(learned ?? {})
    .filter(([, g]) => g.shop.trim() && gilt(g, heute))
    .map(([key, g]) => ({ key, sache: cap(key), shop: g.shop.trim() }));
  return sortBy(liste, (a, b) => compareText(a.sache, b.sache));
}
