// Einkaufsliste: Läden – Vorschläge, selbst angelegte Läden und der gemerkte
// Laden je Artikel.

import { lower, type ShoppingSettings } from "@/lib/einkauf/listModel";
import { update } from "@/lib/einkauf/listStore";
import { SHOPS, sortBy } from "@/lib/core/sort";

/** Läden als Vorschläge – eigene kommen dazu */
export const SHOP_SUGGESTIONS = ["Aldi", "Lidl", "Edeka", "Rewe", "Penny", "Netto", "Kaufland", "Rossmann", "dm", "Wochenmarkt", "Bäcker"];

export function addShop(name: string) {
  const clean = name.trim().slice(0, 30);
  if (!clean) return;
  update((s) =>
    [...SHOP_SUGGESTIONS, ...s.shops].some((x) => lower(x) === lower(clean)) ? s : { ...s, shops: [...s.shops, clean] },
  );
}

export function removeShop(name: string) {
  update((s) => ({
    ...s,
    shops: s.shops.filter((x) => x !== name),
    itemShops: Object.fromEntries(Object.entries(s.itemShops).filter(([, shop]) => shop !== name)),
  }));
}

/**
 * Laden für einen Artikel merken; leer = bewusst „Egal wo“ (gespeichert als
 * leerer Laden – „noch ohne Laden“ heißt: gar kein Eintrag, `clearItemShop`).
 * Ein neuer Laden kommt zu „Meine Läden“.
 */
export function setItemShop(itemName: string, shop: string) {
  const key = lower(itemName);
  if (!key) return;
  update((s) => {
    const itemShops = { ...s.itemShops, [key]: shop.trim() };
    // Von Hand umgestellt: eine feste Regel zieht mit (sonst bliebe der Artikel im alten Laden)
    const shopRules = { ...(s.shopRules ?? {}) };
    if (shopRules[key]) {
      if (shop.trim()) shopRules[key] = shop.trim();
      else delete shopRules[key];
    }
    const known = [...SHOP_SUGGESTIONS, ...s.shops].some((x) => lower(x) === lower(shop));
    const mine = !shop.trim() || s.myShops.some((x) => lower(x) === lower(shop));
    return { ...s, itemShops, shopRules, shops: shop.trim() && !known ? [...s.shops, shop.trim()] : s.shops, myShops: mine ? s.myShops : [...s.myShops, shop.trim()] };
  });
}

/** Laden vergessen: der Artikel ist wieder „noch ohne Laden“ (feste Regel fällt mit) */
export function clearItemShop(itemName: string) {
  const key = lower(itemName);
  if (!key) return;
  update((s) => {
    const itemShops = { ...s.itemShops };
    const shopRules = { ...(s.shopRules ?? {}) };
    delete itemShops[key];
    delete shopRules[key];
    return { ...s, itemShops, shopRules };
  });
}

/** Alle Läden: Vorschläge + eigene – Regel `SHOPS`: meistgenutzt (gemerkte Artikel) → Name */
export function allShops(settings: Pick<ShoppingSettings, "shops"> & Partial<Pick<ShoppingSettings, "itemShops">>): string[] {
  const names = [...SHOP_SUGGESTIONS, ...settings.shops.filter((x) => !SHOP_SUGGESTIONS.some((s) => lower(s) === lower(x)))];
  const used = Object.values(settings.itemShops ?? {});
  return sortBy(
    names.map((name) => ({ name, uses: used.filter((u) => lower(u) === lower(name)).length })),
    ...SHOPS,
  ).map((s) => s.name);
}
