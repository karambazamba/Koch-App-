// Einkaufsliste aufgeräumt (Tafel 89), rein: „Alle“ gruppiert nach Laden in
// der Reihenfolge von „Meine Läden“ („Egal wo“ zuletzt), ein gewählter Laden
// (oder ohne eigene Läden) gruppiert nach Abteilung im Laufweg, und die
// Grundsachen („hat man meist da“: Salz, Pfeffer, Mehl …) aus Rezepten
// kommen nicht auf die Liste, sondern in die Karte „Hast du bestimmt im Haus“.

import { AT_HOME } from "@/lib/essen/dishIdeas";
import { SHOP_GROUPS, sortBy, via } from "@/lib/core/sort";
import type { ListItem, Section } from "@/lib/einkauf/shoppingList";
import { walkOrder } from "@/lib/einkauf/kacheln/view";

const lower = (s: string) => s.trim().toLowerCase();

/** Laufweg durch den Laden */
const LAUF: { section: Section; label: string }[] = [
  { section: "obst-gemuese", label: "Obst & Gemüse" },
  { section: "brot", label: "Brot" },
  { section: "kuehlregal", label: "Kühlregal" },
  { section: "fleisch-fisch", label: "Fleisch" },
  { section: "vorrat", label: "Vorrat" },
  { section: "tiefkuehl", label: "Tiefkühl" },
  { section: "getraenke", label: "Getränke" },
  { section: "sonstiges", label: "Drogerie" },
];

export type Gruppe = { key: string; label: string; shop?: string; items: ListItem[] };

/** Nach Abteilung im Laufweg (leere Abteilungen fallen weg) */
export function abteilungsGruppen(items: ListItem[]): Gruppe[] {
  return LAUF.map((l) => ({ key: l.section, label: l.label, items: walkOrder(items.filter((i) => i.section === l.section)) })).filter((g) => g.items.length);
}

/** „Alle“ nach Laden: Meine Läden in ihrer Reihenfolge, dann andere (meiste zuerst), „Egal wo“ zuletzt */
export function ladenGruppen(items: ListItem[], myShops: string[]): Gruppe[] {
  const byShop = new Map<string, { shop: string; items: ListItem[] }>();
  const loose: ListItem[] = [];
  for (const i of items) {
    if (!i.shop.trim()) {
      loose.push(i);
      continue;
    }
    const k = lower(i.shop);
    const g = byShop.get(k) ?? { shop: myShops.find((m) => lower(m) === k) ?? i.shop.trim(), items: [] };
    g.items.push(i);
    byShop.set(k, g);
  }
  const mine = myShops.map((m) => byShop.get(lower(m))).filter((g): g is { shop: string; items: ListItem[] } => Boolean(g));
  const rest = sortBy(
    [...byShop.values()].filter((g) => !mine.includes(g)),
    ...via((g: { shop: string; items: ListItem[] }) => ({ shop: g.shop, count: g.items.length }), SHOP_GROUPS),
  );
  const out: Gruppe[] = [...mine, ...rest].map((g) => ({ key: `laden:${g.shop}`, label: g.shop, shop: g.shop, items: walkOrder(g.items) }));
  if (loose.length) out.push({ key: "ohne", label: "Egal wo", items: walkOrder(loose) });
  return out;
}

/** Hat man meist im Haus (Salz, Pfeffer, Muskat, Mehl, Öl, Zucker, Essig, Brühe …) */
export const istGrundsache = (name: string) => AT_HOME.test(name.trim());

/**
 * Grundsachen aus Rezepten/Plan (nicht selbst Eingetragenes, nicht „immer auf
 * die Liste“) kommen in die Karte, der Rest auf die Liste.
 */
export function grundsachen(items: ListItem[], alwaysList: string[] = []): { liste: ListItem[]; karte: ListItem[] } {
  const always = new Set(alwaysList.map(lower));
  const karte = items.filter((i) => !i.manualId && !i.now && istGrundsache(i.originalName) && !always.has(lower(i.originalName)) && !always.has(lower(i.name)));
  return { liste: items.filter((i) => !karte.includes(i)), karte };
}
