// Einkauf: erst einsortieren, dann einkaufen (Tafel 99). Zu Hause heißt
// Antippen „Wo kaufst du das?“ – ein Laden aus „Meine Läden“, bewusst „Egal
// wo“ oder (Häkchen) eine feste Regel „immer bei“. Abgehakt wird nur im
// Einkaufsmodus oder über „Schon gekauft“.
// Drei Zustände je Artikel: Laden · bewusst „Egal wo“ (gemerkter leerer
// Laden) · noch ohne Laden (nichts bekannt) → Zone „Noch ohne Laden“.
// „Mia sortiert“ ordnet ein, was aus dem Gelernten bekannt ist; Unbekanntes
// bleibt. Alles mit Rückgängig (stellt nur die berührten Artikel wieder her).

import { lower, type ListItem, type ShoppingListStore } from "@/lib/einkauf/listModel";
import { store, update } from "@/lib/einkauf/listStore";
import { setItemShop } from "@/lib/einkauf/shops";
import { gelernterLaden, setShopRule } from "@/lib/einkauf/shopRules";

/** Noch keinem Laden zugeordnet (und nicht bewusst „Egal wo“) */
export const ohneLaden = (i: Pick<ListItem, "shop" | "anywhere">) => !i.shop.trim() && !i.anywhere;

type Vorher = Pick<ShoppingListStore, "itemShops" | "shopRules" | "learned" | "myShops" | "shops">;

/** Rücknahme für die Artikel `keys`: gemerkter Laden, Regel, Gelerntes wie vorher; neu dazugekommene Läden wieder weg */
function restore(before: Vorher | null, keys: string[]): () => void {
  return () =>
    update((s) => {
      const itemShops = { ...s.itemShops };
      const shopRules = { ...(s.shopRules ?? {}) };
      const learned = { ...(s.learned ?? {}) };
      for (const k of keys) {
        const shop = before?.itemShops[k];
        if (shop !== undefined) itemShops[k] = shop;
        else delete itemShops[k];
        const rule = before?.shopRules?.[k];
        if (rule) shopRules[k] = rule;
        else delete shopRules[k];
        const l = before?.learned?.[k];
        if (l) learned[k] = l;
        else delete learned[k];
      }
      const had = (list: string[] | undefined, x: string) => (list ?? []).some((y) => lower(y) === lower(x));
      return {
        ...s,
        itemShops,
        shopRules,
        learned,
        myShops: s.myShops.filter((x) => had(before?.myShops, x)),
        shops: s.shops.filter((x) => had(before?.shops, x)),
      };
    });
}

/** Artikel in einen Laden („" = bewusst Egal wo); `immer` = feste Regel. Liefert Rückgängig. */
export function einsortieren(name: string, shop: string, immer: boolean): () => void {
  const key = lower(name);
  const before = store.load();
  if (immer) setShopRule(name, shop);
  else setItemShop(name, shop);
  return restore(before, key ? [key] : []);
}

/** Kurze Meldung danach: „Spinat → Rewe. Merk ich mir.“ */
export function einsortiertText(name: string, shop: string, immer: boolean): string {
  const ziel = shop.trim() || "Egal wo";
  return `${name.trim()} → ${ziel}.${immer && shop.trim() ? " Merk ich mir." : ""}`;
}

export type Vorschlag = { name: string; shop: string };

/** „Mia sortiert“: was davon ist bekannt (Gelerntes, ähnlicher gemerkter Name)? */
export function sortierVorschlaege(items: ListItem[], s: Pick<ShoppingListStore, "itemShops"> & Partial<Pick<ShoppingListStore, "learned">>): Vorschlag[] {
  const seen = new Set<string>();
  const out: Vorschlag[] = [];
  for (const i of items) {
    if (!ohneLaden(i) || i.checked || i.hidden || seen.has(lower(i.name))) continue;
    seen.add(lower(i.name));
    const shop = gelernterLaden(i.name, s) ?? (lower(i.originalName) !== lower(i.name) ? gelernterLaden(i.originalName, s) : null);
    if (shop) out.push({ name: i.name, shop });
  }
  return out;
}

/** „Mia sortiert“ ausführen: Anzahl und Rückgängig */
export function miaSortiert(items: ListItem[]): { count: number; undo: () => void } {
  const before = store.load();
  const plan = sortierVorschlaege(items, { itemShops: before?.itemShops ?? {}, learned: before?.learned ?? {} });
  for (const v of plan) setItemShop(v.name, v.shop);
  return { count: plan.length, undo: restore(before, plan.map((v) => lower(v.name))) };
}

const sachen = (n: number) => `${n} ${n === 1 ? "Sache" : "Sachen"}`;

/** Mia-Zeile über der Zone: „6 Sachen noch ohne Laden.“ */
export const ohneLadenSatz = (n: number) => `${sachen(n)} noch ohne Laden.`;

/** Meldung nach „Mia sortiert“: „5 einsortiert“ */
export const sortiertText = (n: number) => `${n} einsortiert`;
