// Einkauf wie Bring (Tafel 35): eine Ansicht mit Kacheln. Reine Logik für
// Chip-Reihe (Alle + Läden, meiste zuerst, „Ohne Laden“ nur wenn nötig),
// Filter, Laufweg-Reihenfolge, kleinere Kacheln ab 24, „Zuletzt gekauft“ und
// den Katalog „Mehr hinzufügen“ („Oft gekauft“ zuerst, schon auf der Liste =
// ausgewählt). Dazu der gemerkte Chip.

import { SHOP_GROUPS, SHOPPING, sortBy } from "@/lib/core/sort";
import type { ListItem, Section, Staple } from "@/lib/einkauf/shoppingList";

/** Gewählter Chip: „alle“, „ohne“ (ohne Laden) oder ein Laden */
export type ShopChip = "alle" | "ohne" | `laden:${string}`;

export type ChipInfo = { id: ShopChip; label: string; count: number; shop?: string };

const lower = (s: string) => s.trim().toLowerCase();

/** Chip-Reihe: „Alle“ + jeder Laden mit offenen Sachen (meiste zuerst), „Ohne Laden“ nur, wenn es Läden UND Sachen ohne Laden gibt */
export function shopChips(open: ListItem[]): ChipInfo[] {
  const counts = new Map<string, { shop: string; count: number }>();
  for (const i of open) if (i.shop) counts.set(lower(i.shop), { shop: counts.get(lower(i.shop))?.shop ?? i.shop, count: (counts.get(lower(i.shop))?.count ?? 0) + 1 });
  const shops = sortBy([...counts.values()], ...SHOP_GROUPS);
  const without = open.filter((i) => !i.shop).length;
  return [
    { id: "alle", label: "Alle", count: open.length },
    ...shops.map((s) => ({ id: `laden:${s.shop}` as ShopChip, label: s.shop, count: s.count, shop: s.shop })),
    ...(shops.length && without ? [{ id: "ohne" as ShopChip, label: "Ohne Laden", count: without }] : []),
  ];
}

/** Nur, was zum gewählten Chip passt */
export function filterByChip(items: ListItem[], chip: ShopChip): ListItem[] {
  if (chip === "alle") return items;
  if (chip === "ohne") return items.filter((i) => !i.shop);
  const shop = lower(chip.slice(6));
  return items.filter((i) => lower(i.shop) === shop);
}

/** Kachel-Reihenfolge = Laufweg (Abteilung), innerhalb wie bisher */
export const walkOrder = (items: ListItem[]) => sortBy(items, ...SHOPPING);

/** Ab so vielen Artikeln „Für die Woche“ werden die Kacheln eine Stufe kleiner @public */
export const COMPACT_FROM = 24;
export const isCompact = (count: number) => count >= COMPACT_FROM;

/** „Zuletzt gekauft“: abgehakte Artikel (neueste Woche zuerst, ohne Doppelte) – ab 8 eingeklappt */
export const RECENT_FOLD = 8;
export function recentBought(weeks: ListItem[][]): ListItem[] {
  const seen = new Set<string>();
  const out: ListItem[] = [];
  for (const items of weeks)
    for (const i of items) {
      if (!i.checked || seen.has(lower(i.name))) continue;
      seen.add(lower(i.name));
      out.push(i);
    }
  return out;
}

export type CatalogEntry = { name: string; section: Section; on: boolean; often: boolean };

/**
 * Katalog „Mehr hinzufügen“: „Oft gekauft“ (Stammliste + häufig Abgehaktes)
 * zuerst, dann der Rest nach Abteilung im Laufweg. Was schon auf der Liste
 * steht, ist ausgewählt; Suche filtert nach Namensteil.
 */
export function catalog(opts: { staples: Staple[]; recent: ListItem[]; open: ListItem[]; basics: { name: string; section: Section }[]; query?: string }): CatalogEntry[] {
  const onList = new Set(opts.open.map((i) => lower(i.name)));
  const often = new Map<string, { name: string; section: Section }>();
  for (const s of opts.staples.filter((st) => st.active)) often.set(lower(s.name), { name: s.name, section: s.section });
  for (const r of opts.recent) if (!often.has(lower(r.name))) often.set(lower(r.name), { name: r.name, section: r.section });
  const rest = new Map<string, { name: string; section: Section }>();
  for (const b of opts.basics) if (!often.has(lower(b.name))) rest.set(lower(b.name), b);
  const q = lower(opts.query ?? "");
  const match = (n: string) => !q || lower(n).includes(q);
  const oftenList = [...often.values()].filter((e) => match(e.name)).map((e) => ({ ...e, often: true, on: onList.has(lower(e.name)) }));
  const restList = sortBy(
    [...rest.values()].filter((e) => match(e.name)).map((e) => ({ ...e, often: false, on: onList.has(lower(e.name)) })),
    ...(SHOPPING as unknown as ((a: CatalogEntry, b: CatalogEntry) => number)[]),
  );
  return [...oftenList, ...restList];
}

/** Gemerkter Chip → angezeigter Chip: „meist“ (alte Ansicht „Nach Laden“) = der Laden mit den meisten Sachen; ein Laden ohne offene Sachen → „Alle“ */
export function resolveChip(stored: ShopChip | "meist", open: ListItem[]): ShopChip {
  const chips = shopChips(open);
  if (stored === "meist") return chips.find((c) => c.shop)?.id ?? "alle";
  const want = lower(stored);
  return chips.find((c) => lower(c.id) === want)?.id ?? "alle";
}
