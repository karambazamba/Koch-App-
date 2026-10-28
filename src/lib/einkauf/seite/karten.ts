// Seite „Einkauf“ (Tafel 110, Bild 1), rein: „Meine Läden“ als große Karten
// (immer, auch mit 0), dahinter andere Läden mit Sachen (meiste zuerst) und –
// nur wenn es das gibt – bewusst „Egal wo“; darunter „Noch ohne Laden“.
// Dazu die Zeile unter dem Namen („Milch, Brot, Butter“) und die Woche, die
// alle Einkauf-Seiten gemeinsam zeigen.

import { SHOP_GROUPS, sortBy, via } from "@/lib/core/sort";
import { walkOrder } from "@/lib/einkauf/kacheln/view";
import { ohneLaden } from "@/lib/einkauf/einsortieren";
import { useExternalStore } from "@/lib/core/useExternalStore";
import type { ListItem } from "@/lib/einkauf/listModel";
import type { WeekChoice } from "@/lib/einkauf/useWeekShoppingList";

export type LadenKarte = { shop: string; /** "" = bewusst „Egal wo“ */ items: ListItem[]; mine: boolean };

const lower = (s: string) => s.trim().toLowerCase();

/** Karten: Meine Läden (Reihenfolge, auch leer) → andere mit Sachen → „Egal wo“ (nur mit Sachen) */
export function ladenKarten(open: ListItem[], myShops: string[]): LadenKarte[] {
  const map = new Map<string, LadenKarte>();
  for (const s of myShops) if (s.trim() && !map.has(lower(s))) map.set(lower(s), { shop: s.trim(), items: [], mine: true });
  const egal: ListItem[] = [];
  for (const i of open) {
    if (!i.shop.trim()) {
      if (i.anywhere) egal.push(i);
      continue;
    }
    const k = lower(i.shop);
    const karte = map.get(k) ?? { shop: i.shop.trim(), items: [], mine: false };
    karte.items.push(i);
    map.set(k, karte);
  }
  const mine = [...map.values()].filter((k) => k.mine);
  const rest = sortBy(
    [...map.values()].filter((k) => !k.mine),
    ...via((k: LadenKarte) => ({ shop: k.shop, count: k.items.length }), SHOP_GROUPS),
  );
  const out = [...mine, ...rest].map((k) => ({ ...k, items: walkOrder(k.items) }));
  return egal.length ? [...out, { shop: "", items: walkOrder(egal), mine: false }] : out;
}

/** Was noch keinem Laden zugeordnet ist (Laufweg-Reihenfolge) */
export const ohneLadenListe = (open: ListItem[]) => walkOrder(open.filter(ohneLaden));

/** Leise Zeile unter dem Namen: die ersten Sachen („Milch, Brot, Butter …“), leer = „Noch nichts drauf“ */
export function ersteSachen(items: ListItem[], max = 3): string {
  if (!items.length) return "Noch nichts drauf";
  const names = items.slice(0, max).map((i) => i.name);
  return `${names.join(", ")}${items.length > max ? " …" : ""}`;
}

/** „3 Sachen“ */
export const sachenText = (n: number) => `${n} ${n === 1 ? "Sache" : "Sachen"}`;

/** Link zur Laden-Seite („" = Egal wo) */
export const ladenHref = (shop: string) => `/einkaufsliste/laden?name=${encodeURIComponent(shop)}`;

// --- Woche: alle Einkauf-Seiten zeigen dieselbe (bis zum Neuladen) ------------

let woche: WeekChoice = "planning";
const hoerer = new Set<() => void>();

/** Woche wechseln (Menü „···“) */
export function setEinkaufWoche(w: WeekChoice) {
  woche = w;
  for (const h of hoerer) h();
}

const abo = (h: () => void) => {
  hoerer.add(h);
  return () => {
    hoerer.delete(h);
  };
};

/** Gewählte Woche der Einkauf-Seiten */
export const useEinkaufWoche = (): WeekChoice => useExternalStore(abo, () => woche, () => "planning" as WeekChoice);
