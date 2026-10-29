// Einkauf: Mia lernt dazu (A-067, Tafel 151 Punkt 6), rein. Wird eine Sache
// zweimal hintereinander in einem anderen Laden abgehakt, als sie
// zugeordnet ist, fragt Mia EINMAL unten: „Butter holst du oft bei Lidl. Ab
// jetzt immer dort?“. Steht sie in mehreren Läden (Sorte mit mehreren
// Läden) und wird zweimal im selben abgehakt: „Bananen ab jetzt nur bei
// Rewe?“. Ja = Ausnahme, Nein = für diese Sache nie wieder fragen. Höchstens
// ein Hinweis pro Einkauf (zählt die Laden-Seite).

import type { Gelernt, ListItem } from "@/lib/einkauf/listModel";
import { gelernterLadenFuer, gelerntSchluessel } from "@/lib/einkauf/merken/gelernt";

export type LernFrage = { sache: string; shop: string; text: string };

const lower = (s: string) => s.trim().toLowerCase();

/** Frage nach dem Abhaken; null = nichts zu fragen */
export function lernFrage(
  item: Pick<ListItem, "name" | "shop" | "auch">,
  s: { learned?: Record<string, Gelernt>; learnAsked?: string[]; shopRules?: Record<string, string>; itemShops?: Record<string, string> },
  heute: string,
): LernFrage | null {
  const k = lower(item.name);
  if (!k || !item.shop.trim()) return null;
  if (s.learnAsked?.includes(k) || s.shopRules?.[k] || typeof s.itemShops?.[k] === "string") return null;
  const key = s.learned ? gelerntSchluessel(s.learned, item.name) : null;
  const g = key ? s.learned![key] : undefined;
  const shop = gelernterLadenFuer(s.learned, item.name, heute);
  if (!g || !shop || g.n < 2) return null;
  const mehrere = Boolean(item.auch?.length);
  const drin = [item.shop, ...(item.auch ?? [])].some((x) => lower(x) === lower(shop));
  if (mehrere && drin) return { sache: item.name, shop, text: `${item.name} ab jetzt nur bei ${shop}?` };
  if (!drin) return { sache: item.name, shop, text: `${item.name} holst du oft bei ${shop}. Ab jetzt immer dort?` };
  return null;
}
