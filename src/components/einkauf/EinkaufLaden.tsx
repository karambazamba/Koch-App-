"use client";

// „Kommt auf die Liste für“ in der Schnelleingabe des Einkaufs: Vorwahl =
// gemerkter Laden des ersten Artikels → offener Reiter → nichts; von Hand
// gewählt geht vor. Nur mit „Meine Läden“.

import { LadenWahl } from "@/components/einkauf/MeineLaeden";
import { useShoppingSettings } from "@/lib/einkauf/shoppingList";
import { parseShoppingText } from "@/lib/einkauf/shoppingParse";
import { ladenVorwahl, useMeineLaeden, vorwahlHinweis } from "@/lib/einkauf/meineLaeden";

export type LadenChoice = { shop: string; picked: boolean };

export function EinkaufLaden({ text, tab, choice, onChoice }: { text: string; tab?: string; choice: LadenChoice; onChoice: (c: LadenChoice) => void }) {
  const meine = useMeineLaeden();
  const settings = useShoppingSettings();
  if (!meine?.myShops.length || !settings) return null;
  const first = parseShoppingText(text, settings.shops)[0];
  const said = first?.shop ?? "";
  const pre = ladenVorwahl({ name: first?.name ?? "", itemShops: settings.itemShops, products: settings.products, tab });
  // Nichts gewählt = kein Knopf an (Neues landet in „Noch ohne Laden“)
  const value = said || (choice.picked ? choice.shop : pre.shop || null);
  const hint = !said && !choice.picked && pre.remembered && first ? vorwahlHinweis(first.name, pre.shop) : undefined;
  return <LadenWahl myShops={meine.myShops} value={value} onChange={(shop) => onChoice({ shop, picked: true })} hint={hint} />;
}
