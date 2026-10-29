// Laden-Seite mit Laden-Plan (A-067, Tafel 151 Bild 5), rein: Sachen nach
// Sorten in Laufweg-Reihenfolge (Obst & Gemüse zuerst, Tiefkühl und
// Getränke zuletzt, Unbekanntes ganz unten), oben Reiter für die anderen
// Läden mit Anzahl, unter einer Sache mehrerer Läden „auch Markt“.

import { inLaden, type ListItem } from "@/lib/einkauf/listModel";
import { LAUFWEG, sorteFuer, sorteLabel, type SorteId } from "@/lib/einkauf/sorten/sorten";
import { auchText } from "@/lib/einkauf/sorten/plan";

export type SortenGruppe = { sorte: SorteId | null; label: string; items: ListItem[] };

const lower = (s: string) => s.trim().toLowerCase();

/** Sachen nach Sorte im Laufweg; Reihenfolge innerhalb bleibt */
export function nachSorten(items: readonly ListItem[], sortenKi: Record<string, SorteId> = {}): SortenGruppe[] {
  const map = new Map<SorteId | null, ListItem[]>();
  for (const i of items) {
    const s = sorteFuer(i.originalName || i.name, sortenKi) ?? sorteFuer(i.name, sortenKi);
    map.set(s, [...(map.get(s) ?? []), i]);
  }
  const out: SortenGruppe[] = LAUFWEG.filter((s) => map.has(s)).map((s) => ({ sorte: s, label: sorteLabel(s), items: map.get(s)! }));
  if (map.has(null)) out.push({ sorte: null, label: "Sonst noch", items: map.get(null)! });
  return out;
}

/** „auch Markt“ (bzw. „auch Markt, Lidl“) für eine Sache, die auch in anderen Läden steht; "" = nur hier */
export function auchZeile(item: Pick<ListItem, "shop" | "auch">, shop: string): string {
  if (!item.auch?.length) return "";
  const andere = [item.shop, ...item.auch].filter((x) => lower(x) !== lower(shop));
  if (!andere.length) return "";
  return [auchText(andere[0]), ...andere.slice(1)].join(", ");
}

/** Reiter: Meine Läden mit Anzahl offener Sachen (jede Sache in jedem ihrer Läden) */
export function ladenReiter(open: readonly ListItem[], myShops: readonly string[]): { shop: string; n: number }[] {
  return myShops.map((shop) => ({ shop, n: open.filter((i) => inLaden(i, shop)).length }));
}
