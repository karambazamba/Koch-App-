// Einkauf, rein: Laufweg-Reihenfolge (Abteilung) und „Zuletzt gekauft“. Dazu
// der Typ des gemerkten Ladens (pro Gerät, `einkauf/shopMode`).

import { SHOPPING, sortBy } from "@/lib/core/sort";
import type { ListItem } from "@/lib/einkauf/shoppingList";

/** Gemerkter Laden: „laden:Rewe“ (früher auch „alle“/„ohne“ – bleibt lesbar) */
export type ShopChip = "alle" | "ohne" | `laden:${string}`;


const lower = (s: string) => s.trim().toLowerCase();

/** Kachel-Reihenfolge = Laufweg (Abteilung), innerhalb wie bisher */
export const walkOrder = (items: ListItem[]) => sortBy(items, ...SHOPPING);

/** „Zuletzt gekauft“: abgehakte Artikel (neueste Woche zuerst, ohne Doppelte) */
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
