// Einkauf nach Läden (Startseite, Jetzt-Karte): offene Artikel je Laden
// gruppiert – meiste Artikel zuerst, ohne Laden zuletzt. Keine
// Firmenlogos: je Laden ein neutrales Symbol nach Ladentyp, der Name und eine
// feste Farbe (Punkt) aus einer ruhigen Palette, bis man sie selbst wählt
// (kommt mit „Läden“).

import { SHOP_GROUPS, ascNum, sortBy, via } from "@/lib/core/sort";

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

type TileRow = ShopGroup & { count: number };
/** Einkauf-Kachel: Zeilen je Laden, die leise Rest-Zeile („+ Rossmann 3“) und was noch ohne Laden ist */
export type TileRows = { rows: TileRow[]; rest: string | null; ohne: string[] };

/**
 * Einkauf-Kachel (Variante C2, Tafel 99): IMMER eine Zeile je Laden aus
 * „Meine Läden“ in ihrer Reihenfolge (auch mit 0), andere Läden mit Sachen
 * danach (meiste zuerst), bewusst „Egal wo“ zuletzt. Was noch ohne Laden ist,
 * zählt extra („6 noch ohne Laden · Sortieren ›“). S/M: höchstens 3 Zeilen
 * plus Rest-Zeile (nur Läden mit Sachen), L: alle.
 */
export function tileRows(items: { name: string; shop: string; anywhere?: boolean }[], myShops: string[], size: "S" | "M" | "L"): TileRows {
  const map = new Map<string, { shop: string; names: string[] }>();
  for (const s of myShops) if (s.trim() && !map.has(s.trim().toLowerCase())) map.set(s.trim().toLowerCase(), { shop: s.trim(), names: [] });
  const egal: string[] = [];
  const ohne: string[] = [];
  for (const i of items) {
    const shop = i.shop.trim();
    if (!shop) {
      (i.anywhere ? egal : ohne).push(i.name);
      continue;
    }
    const key = shop.toLowerCase();
    const g = map.get(key) ?? { shop, names: [] };
    g.names.push(i.name);
    map.set(key, g);
  }
  const mine = myShops.map((s) => s.trim().toLowerCase());
  const rank = (shop: string) => {
    const i = mine.indexOf(shop.toLowerCase());
    return i < 0 ? mine.length : i;
  };
  const shops: TileRow[] = [...map.values()].map((g) => ({ ...g, count: g.names.length }));
  const ordered = sortBy(shops, ascNum((g) => rank(g.shop ?? "")), ...byCount);
  const all: TileRow[] = egal.length ? [...ordered, { shop: null, names: egal, count: egal.length }] : ordered;
  const max = size === "L" ? all.length : 3;
  const rest = all.slice(max).filter((r) => r.count > 0);
  return { rows: all.slice(0, max), rest: rest.length ? `+ ${rest.map((r) => `${r.shop ?? "Egal wo"} ${r.count}`).join(", ")}` : null, ohne };
}

/** Leise Zeile unter den Läden: „6 noch ohne Laden“ */
/** Zeile unter den Läden der Kachel: „16 ohne Laden“ (vollständig, notfalls zweizeilig) */
export const ohneLadenZeile = (n: number) => `${n} ohne Laden`;

const TONES = 8;
/** Bekannte Läden: passender Farbton (rot, gelb, blau …) – sonst aus dem Namen */
const KNOWN_TONES: Record<string, number> = { rewe: 1, edeka: 2, lidl: 4, aldi: 7, penny: 6, netto: 3, kaufland: 8, biomarkt: 3, dm: 5, rossmann: 6, "bäcker": 8, wochenmarkt: 3 };

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
