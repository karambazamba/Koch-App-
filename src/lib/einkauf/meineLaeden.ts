// Läden bewusst wählen (Tafel 88): „Meine Läden“ in gewählter Reihenfolge,
// die einmalige Frage „Wo kaufst du meistens ein?“ (Fertig oder Später, nie
// wieder) und die Vorwahl beim Hinzufügen (gemerkter Laden → offener Reiter → nichts =
// „noch ohne Laden“; „Egal wo“ nur, wenn bewusst gewählt).
// Reine Logik + Ändern im Speicher der Einkaufsliste.

import { useExternalStore } from "@/lib/core/useExternalStore";
import { SHOPS, sortBy } from "@/lib/core/sort";
import { lower, type ShoppingListStore } from "@/lib/einkauf/listModel";
import { store, update } from "@/lib/einkauf/listStore";
import { SHOP_SUGGESTIONS } from "@/lib/einkauf/shops";

export type MeineLaeden = { myShops: string[]; shopsAsked: boolean };

const NONE: MeineLaeden = { myShops: [], shopsAsked: false };
let cached: { source: ShoppingListStore | null; value: MeineLaeden } | null = null;

function meineOf(data: ShoppingListStore | null): MeineLaeden {
  if (!data) return NONE;
  if (cached?.source === data) return cached.value;
  const value = { myShops: data.myShops, shopsAsked: data.shopsAsked };
  cached = { source: data, value };
  return value;
}

/** „Meine Läden“ und ob schon gefragt wurde (`undefined` = noch nicht geladen) */
export function useMeineLaeden(): MeineLaeden | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : meineOf(data);
}

const has = (list: string[], name: string) => list.some((x) => lower(x) === lower(name));

/** Läden der Frage (Tafel 91), in dieser Reihenfolge */
export const FRAGE_LAEDEN = ["Edeka", "Rewe", "Lidl", "Aldi", "Penny", "Netto", "Kaufland", "Rossmann", "dm", "Wochenmarkt", "Bäcker"];

/** Ein Vorschlag (kein selbst eingetragener Laden)? */
export const isSuggestion = (name: string) => has([...FRAGE_LAEDEN, ...SHOP_SUGGESTIONS], name);
const known = (s: Pick<ShoppingListStore, "shops">, name: string) => has([...FRAGE_LAEDEN, ...SHOP_SUGGESTIONS, ...s.shops], name);

/** Wer schon Läden an Artikeln hat: diese Läden sind in der Frage vorgewählt (meistgenutzt zuerst) */
export function vorauswahl(itemShops: Record<string, string>): string[] {
  const uses = new Map<string, { name: string; uses: number }>();
  for (const shop of Object.values(itemShops)) {
    const key = lower(shop);
    if (key) uses.set(key, { name: uses.get(key)?.name ?? shop.trim(), uses: (uses.get(key)?.uses ?? 0) + 1 });
  }
  return sortBy([...uses.values()], ...SHOPS).map((s) => s.name);
}

/** Kacheln der Frage: Vorschläge, dann eigene Läden (ohne Doppelte) */
export const shopChoices = (shops: string[], picked: string[]) =>
  [...FRAGE_LAEDEN, ...SHOP_SUGGESTIONS, ...shops, ...picked].filter((s, i, all) => all.findIndex((x) => lower(x) === lower(s)) === i);

/** „Fertig“: genau diese Läden in dieser Reihenfolge – nie wieder fragen */
export function chooseMyShops(names: string[]) {
  const clean = names.map((n) => n.trim().slice(0, 30)).filter((n, i, all) => n && all.findIndex((x) => lower(x) === lower(n)) === i);
  update((s) => ({ ...s, myShops: clean, shopsAsked: true, shops: [...s.shops, ...clean.filter((n) => !known(s, n))] }));
}

/** „Später“: nie wieder fragen, Liste bleibt wie bisher */
export const laterShops = () => update((s) => ({ ...s, shopsAsked: true }));

/** Einen Laden zu „Meine Läden“ (eigener Name wird auch als Laden gemerkt) */
export function addMyShop(name: string) {
  const clean = name.trim().slice(0, 30);
  if (!clean) return;
  update((s) => ({
    ...s,
    shopsAsked: true,
    myShops: has(s.myShops, clean) ? s.myShops : [...s.myShops, clean],
    shops: known(s, clean) ? s.shops : [...s.shops, clean],
  }));
}

/** In „Meine Läden“ eins nach oben (-1) bzw. unten (1) – Reihenfolge der Liste */
export function moveMyShop(name: string, step: -1 | 1) {
  update((s) => {
    const i = s.myShops.findIndex((x) => lower(x) === lower(name));
    const j = i + step;
    if (i < 0 || j < 0 || j >= s.myShops.length) return s;
    const myShops = [...s.myShops];
    [myShops[i], myShops[j]] = [myShops[j], myShops[i]];
    return { ...s, myShops };
  });
}

/** Grundsache trotzdem immer auf die Liste (bzw. wieder in „Hast du bestimmt im Haus“) */
export function setImmerAufDieListe(name: string, on: boolean) {
  const key = lower(name);
  if (!key) return;
  update((s) => ({ ...s, alwaysList: on ? [...s.alwaysList.filter((x) => x !== key), key] : s.alwaysList.filter((x) => x !== key) }));
}

/** Aus „Meine Läden“ nehmen (gemerkte Läden an Artikeln bleiben) */
export const removeMyShop = (name: string) => update((s) => ({ ...s, myShops: s.myShops.filter((x) => lower(x) !== lower(name)) }));

/** Gemerkter Laden eines Artikels (auch über euer Produkt); "" = egal wo oder noch ohne Laden */
export function rememberedShop(name: string, itemShops: Record<string, string>, products: Record<string, string> = {}): string {
  const key = lower(name);
  return itemShops[key] ?? itemShops[lower(products[key] ?? "")] ?? "";
}

/**
 * Beim Hinzufügen den Laden merken? Ein genannter/gewählter Laden, der vom
 * gemerkten abweicht – oder bewusst „Egal wo“ für einen Artikel, der noch
 * ohne Laden ist. Nichts gewählt = bleibt, wie es ist.
 */
export function ladenMerken(o: { name: string; shop: string; picked: boolean; itemShops: Record<string, string>; products?: Record<string, string> }): boolean {
  if (!o.shop && !o.picked) return false;
  const key = lower(o.name);
  const known = key in o.itemShops || lower(o.products?.[key] ?? "") in o.itemShops;
  return o.shop !== rememberedShop(o.name, o.itemShops, o.products) || !known;
}

/** Vorwahl „Kommt auf die Liste für“: gemerkter Laden → offener Reiter → "" (nichts vorgewählt) */
export function ladenVorwahl(o: { name: string; itemShops: Record<string, string>; products?: Record<string, string>; tab?: string }): { shop: string; remembered: boolean } {
  const remembered = o.name.trim() ? rememberedShop(o.name, o.itemShops, o.products) : "";
  if (remembered) return { shop: remembered, remembered: true };
  return { shop: o.tab ?? "", remembered: false };
}

/** Leiser Hinweis, wenn der gemerkte Laden vorgewählt ist */
export const vorwahlHinweis = (name: string, shop: string) => `${name} gibt’s bei dir bei ${shop}. Hab ich vorgewählt.`;
