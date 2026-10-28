// Aussuchen (Tafel 111 + Nachtrag), rein: erst Laden, dann Sachen. Feste
// Abschnitte in fester Reihenfolge – „Für eure Woche“ (Zutaten der geplanten
// Gerichte, mit Tag) → „Oft bei <Laden>“ (höchstens 9; ohne Verlauf
// „Beliebt“) → Obst & Gemüse … Süßes & Snacks → Drogerie & Haushalt (immer
// zuletzt). Im Drogerie-Laden (Rossmann, dm …) Drogerie zuerst und die
// Lebensmittel eingeklappt. Leere Abschnitte fallen weg. Dazu Suche,
// Kennzeichen (steht drauf / noch da), was ein Tipp tut, Menge und die
// Zusammenfassung unten („Rewe 3 · Rossmann 2“).

import { OFT_BEI, ascNum, byName, first, sortBy } from "@/lib/core/sort";
import { sectionFor, type Section } from "@/lib/einkauf/sections";
import { shopType } from "@/lib/einkauf/shopGroups";
import { ingredientStem } from "@/lib/vorrat/pantry";
import { WEEKDAYS } from "@/lib/einstellungen/profile";
import { BELIEBT, BELIEBT_DROGERIE, KATALOG, KATALOG_ALLE, KATALOG_REIHE, abschnittFuer, type KatalogAbschnitt } from "@/lib/einkauf/aussuchen/katalog";
import type { ListItem, ShoppingListStore, Staple } from "@/lib/einkauf/listModel";

export type AbschnittId = "woche" | "oft" | KatalogAbschnitt;
export type Eintrag = { name: string; section: Section; /** „für Mi“ (Für eure Woche) */ tag?: string; /** frei getippt, nicht im Katalog */ frei?: boolean };
export type Abschnitt = { id: AbschnittId; label: string; eintraege: Eintrag[]; /** Drogerie-Laden: Lebensmittel eingeklappt */ eingeklappt?: boolean };

const lower = (s: string) => s.trim().toLowerCase();
const cap = (s: string) => (s ? s.charAt(0).toLocaleUpperCase("de-DE") + s.slice(1) : s);
const eintrag = (name: string, tag?: string): Eintrag => ({ name, section: sectionFor(name), ...(tag ? { tag } : {}) });

/** Drogerie-Laden (Rossmann, dm, Müller …)? */
export const istDrogerieLaden = (shop: string) => shopType(shop) === "drogerie";

type Verlauf = Pick<ShoppingListStore, "itemShops"> & Partial<Pick<ShoppingListStore, "shopRules" | "learned">> & { staples: Staple[]; /** zuletzt Gekauftes (mit Laden) */ gekauft: ListItem[] };

/** „Oft bei Rewe“: was ihr dort kauft (Regel > Gelerntes > Gemerktes > Gekauftes), höchstens 9 */
export function oftBei(shop: string, v: Verlauf): string[] {
  const s = lower(shop);
  if (!s) return [];
  const score = new Map<string, { name: string; score: number }>();
  const add = (name: string, n: number) => {
    const k = lower(name);
    if (!k) return;
    const was = score.get(k);
    score.set(k, { name: was?.name ?? cap(name.trim()), score: (was?.score ?? 0) + n });
  };
  for (const st of v.staples) if (lower(v.itemShops[lower(st.name)] ?? "") === s) add(st.name, 1);
  for (const i of v.gekauft) if (lower(i.shop) === s) add(i.name, 1);
  for (const [k, shop] of Object.entries(v.itemShops)) if (lower(shop) === s) add(k, 1);
  for (const [k, l] of Object.entries(v.learned ?? {})) if (lower(l.shop) === s) add(k, l.n);
  for (const [k, shop] of Object.entries(v.shopRules ?? {})) if (lower(shop) === s) add(k, 3);
  const drog = istDrogerieLaden(shop);
  return sortBy(
    [...score.values()].map((x) => ({ ...x, vorn: drog && abschnittFuer(x.name) === "drogerie" })),
    ...OFT_BEI,
  )
    .slice(0, 9)
    .map((x) => x.name);
}

const KURZ = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** „Für eure Woche“: Zutaten der geplanten Gerichte (noch nicht gekauft), mit Tag, in Tag-Reihenfolge */
export function fuerDieWoche(items: ListItem[]): Eintrag[] {
  const tag = (i: ListItem) => WEEKDAYS.findIndex((d) => i.days.includes(d));
  const list = items.filter((i) => !i.manualId && i.dishes.length > 0 && !i.checked);
  return sortBy(list, ascNum((i) => (tag(i) < 0 ? null : tag(i)))).map((i) => eintrag(i.name, tag(i) >= 0 ? `für ${KURZ[tag(i)]}` : undefined));
}

/** Eigene bekannte Namen (Stammliste, Gemerktes, Gekauftes, Eigenes auf der Liste) je Abschnitt */
function eigene(v: Verlauf, items: ListItem[]): Map<KatalogAbschnitt, string[]> {
  const out = new Map<KatalogAbschnitt, string[]>();
  const names = [...v.staples.map((s) => s.name), ...v.gekauft.map((i) => i.name), ...Object.keys(v.itemShops).map(cap), ...items.filter((i) => i.manualId).map((i) => i.name)];
  for (const n of names) {
    const id = abschnittFuer(n);
    out.set(id, [...(out.get(id) ?? []), n.trim()]);
  }
  return out;
}

const ohneDoppelte = (names: string[]) => names.filter((n, i, all) => n && all.findIndex((x) => lower(x) === lower(n)) === i);

/**
 * Die Abschnitte für einen Laden. Normal: Woche → Oft/Beliebt → Lebensmittel
 * → Drogerie & Haushalt (zuletzt). Drogerie-Laden: Oft/Beliebt → Drogerie →
 * Woche und Lebensmittel eingeklappt. Leere fallen weg.
 */
export function aussuchenAbschnitte(o: { shop: string; items: ListItem[]; verlauf: Verlauf }): Abschnitt[] {
  const drog = istDrogerieLaden(o.shop);
  const oft = oftBei(o.shop, o.verlauf);
  const oftAbschnitt: Abschnitt = oft.length
    ? { id: "oft", label: `Oft bei ${o.shop}${drog ? " · Drogerie zuerst" : ""}`, eintraege: oft.map((n) => eintrag(n)) }
    : { id: "oft", label: "Beliebt", eintraege: (drog ? BELIEBT_DROGERIE : BELIEBT).map((n) => eintrag(n)) };
  const woche: Abschnitt = { id: "woche", label: "Für eure Woche", eintraege: fuerDieWoche(o.items) };
  const mehr = eigene(o.verlauf, o.items);
  const kat = KATALOG_REIHE.map((k): Abschnitt => ({ id: k.id, label: k.label, eintraege: ohneDoppelte([...KATALOG[k.id], ...(mehr.get(k.id) ?? [])]).map((n) => eintrag(n)) }));
  const drogerie = kat.filter((a) => a.id === "drogerie");
  const essen = kat.filter((a) => a.id !== "drogerie");
  const reihe = drog ? [oftAbschnitt, ...drogerie, ...[woche, ...essen].map((a) => ({ ...a, eingeklappt: true }))] : [woche, oftAbschnitt, ...essen, ...drogerie];
  return reihe.filter((a) => a.eintraege.length > 0);
}

/** Suche im ganzen Katalog (auch Eigenes); passt nichts genau, gibt’s den getippten Namen dazu */
export function aussuchenSuche(query: string, abschnitte: Abschnitt[]): Eintrag[] {
  const q = lower(query);
  if (!q) return [];
  const names = ohneDoppelte([...KATALOG_ALLE, ...abschnitte.flatMap((a) => a.eintraege.map((e) => e.name))]).filter((n) => lower(n).includes(q));
  const found = sortBy(names, first((n: string) => lower(n).startsWith(q)), byName((n: string) => n)).map((n) => eintrag(n));
  return found.some((e) => lower(e.name) === q) ? found : [...found, { ...eintrag(cap(query.trim().slice(0, 30))), frei: true }];
}

/** Kennzeichen einer Kachel: steht schon auf der Liste (welcher Artikel, welcher Laden) und ob es noch im Haus ist */
export function kennzeichen(name: string, open: ListItem[], imHaus: string[]): { item: ListItem | null; imHaus: boolean } {
  const k = lower(name);
  const item = open.find((i) => lower(i.name) === k || lower(i.originalName) === k) ?? null;
  const stem = ingredientStem(name);
  return { item, imHaus: imHaus.some((n) => lower(n) === k || (stem !== "" && ingredientStem(n) === stem)) };
}

/** Was ein Tipp tut: neu auf die Liste · in den aktiven Laden umziehen · im aktiven Laden = wieder raus */
export function tippAktion(item: Pick<ListItem, "shop"> | null, aktiv: string): "rein" | "umziehen" | "raus" {
  if (!item) return "rein";
  return lower(item.shop) === lower(aktiv) ? "raus" : "umziehen";
}

/** Menge auf der Kachel: „×2“ (1 = Standard, ohne Anzeige) */
export const mengeText = (amount: string) => (/^\d+$/.test(amount.trim()) && Number(amount) > 1 ? `×${Number(amount)}` : "");

/** Menge als Zahl (leer = 1) */
export const mengeZahl = (amount: string) => (/^\d+$/.test(amount.trim()) ? Number(amount) : 1);

/** Menge speichern: 1 bis 99, 1 = leer (Standard) */
export function mengeAus(n: number): string {
  const x = Math.min(99, Math.max(1, Math.round(n)));
  return x === 1 ? "" : String(x);
}

/** Unten „● Rewe 3 · ● Rossmann 2“: heute gewählt je Laden, in der Reihenfolge von „Meine Läden“ */
export function zusammenfassung(gewaehlt: { shop: string }[], myShops: string[]): { shop: string; n: number }[] {
  const map = new Map<string, { shop: string; n: number }>();
  for (const g of gewaehlt) {
    const k = lower(g.shop);
    map.set(k, { shop: map.get(k)?.shop ?? g.shop, n: (map.get(k)?.n ?? 0) + 1 });
  }
  const rank = (shop: string) => {
    const i = myShops.findIndex((m) => lower(m) === lower(shop));
    return i < 0 ? myShops.length : i;
  };
  return sortBy([...map.values()], ascNum((x) => rank(x.shop)));
}

/** „Rewe 3 · Rossmann 2“ (für Vorlesen und Tests) */
export const zusammenfassungText = (z: { shop: string; n: number }[]) => z.map((x) => `${x.shop} ${x.n}`).join(" · ");
