// Einkauf nach Läden (Startseite, Jetzt-Karte): offene Artikel je Laden
// gruppiert – meiste Artikel zuerst, ohne Laden („Egal wo“) zuletzt. Jeder
// Laden hat eine feste Farbe (Punkt) aus einer ruhigen Palette, bis man sie
// selbst wählt (kommt mit „Läden“).

export type ShopGroup = { shop: string | null; names: string[] };

/** Läden mit ihren offenen Artikeln (höchstens `max` Gruppen) */
export function shopGroups(items: { name: string; shop: string }[], max = 3): ShopGroup[] {
  const map = new Map<string, string[]>();
  const loose: string[] = [];
  for (const i of items) {
    const shop = i.shop.trim();
    if (!shop) loose.push(i.name);
    else map.set(shop, [...(map.get(shop) ?? []), i.name]);
  }
  const groups: ShopGroup[] = [...map.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "de")).map(([shop, names]) => ({ shop, names }));
  if (loose.length) groups.push({ shop: null, names: loose });
  return groups.slice(0, max);
}

const TONES = 8;

/** Feste Farbe je Laden (1–8, Token `--color-shop-N`) */
export function shopTone(name: string): number {
  let h = 0;
  for (const c of name.trim().toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % TONES) + 1;
}
