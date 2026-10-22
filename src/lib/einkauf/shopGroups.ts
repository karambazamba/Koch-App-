// Einkauf nach Läden (Startseite, Jetzt-Karte): offene Artikel je Laden
// gruppiert – meiste Artikel zuerst, ohne Laden („Egal wo“) zuletzt. Keine
// Firmenlogos: je Laden ein neutrales Symbol nach Ladentyp, der Name und eine
// feste Farbe (Punkt) aus einer ruhigen Palette, bis man sie selbst wählt
// (kommt mit „Läden“).

import { SHOP_GROUPS, sortBy, via } from "@/lib/core/sort";

export type ShopGroup = { shop: string | null; names: string[] };

const byCount = via((g: ShopGroup) => ({ shop: g.shop, count: g.names.length }), SHOP_GROUPS);

/** Läden mit ihren offenen Artikeln (höchstens `max` Gruppen) */
export function shopGroups(items: { name: string; shop: string }[], max = 3): ShopGroup[] {
  const map = new Map<string, string[]>();
  const loose: string[] = [];
  for (const i of items) {
    const shop = i.shop.trim();
    if (!shop) loose.push(i.name);
    else map.set(shop, [...(map.get(shop) ?? []), i.name]);
  }
  const groups: ShopGroup[] = [...map.entries()].map(([shop, names]) => ({ shop, names }));
  if (loose.length) groups.push({ shop: null, names: loose });
  return sortBy(groups, ...byCount).slice(0, max);
}

const TONES = 8;
/** Bekannte Läden: passender Farbton (rot, gelb, blau …) – sonst aus dem Namen */
const KNOWN_TONES: Record<string, number> = { rewe: 1, edeka: 2, lidl: 4, aldi: 4, penny: 1, netto: 2, kaufland: 1, biomarkt: 3, dm: 5, rossmann: 6, "bäcker": 8, wochenmarkt: 3 };

/** Feste Farbe je Laden (1–8, Token `--app-shop-N`) */
export function shopTone(name: string): number {
  const known = KNOWN_TONES[name.trim().toLowerCase()];
  if (known) return known;
  let h = 0;
  for (const c of name.trim().toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % TONES) + 1;
}

export type ShopType = "supermarkt" | "bio" | "drogerie" | "baecker" | "markt" | "sonst";

/** Neutrales Symbol je Ladentyp (keine Logos) */
export const SHOP_TYPE_ICON: Record<ShopType, string> = { supermarkt: "🛒", bio: "🌿", drogerie: "🧴", baecker: "🥖", markt: "🥕", sonst: "🏪" };

/** Ladentyp aus dem Namen erraten (bis man ihn selbst wählt) */
export function shopType(name: string): ShopType {
  const n = name.trim().toLowerCase();
  if (/\bbio|alnatura|denns/.test(n)) return "bio";
  if (/^(dm|rossmann|müller|drogerie)/.test(n)) return "drogerie";
  if (/bäcker|baecker|backshop/.test(n)) return "baecker";
  if (/markt$|wochenmarkt|hofladen/.test(n) && !/supermarkt/.test(n)) return "markt";
  if (/rewe|edeka|aldi|lidl|penny|netto|kaufland|real|globus|norma|supermarkt|spar/.test(n)) return "supermarkt";
  return "sonst";
}
