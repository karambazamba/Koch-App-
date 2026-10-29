"use client";

// Beispiel-Tag auf der Seite „Einkauf“: dieselben Läden wie in der Einkauf-
// Kachel (Edeka, Rewe, Lidl – DEMO_SHOPS, Tafel 140) als Karten und zwei
// Chips „Noch ohne Laden“ (DEMO_OHNE), leise „Beispiel“. Nichts davon steht in
// echten Speichern; die erste echte Eingabe ersetzt es (die Liste ist dann
// nicht mehr leer).

import { DEMO_OHNE, DEMO_SHOPS, demoTiles, useDemo } from "@/lib/core/demo";
import { todayIso } from "@/lib/core/now";
import { ladenKarten, type LadenKarte } from "@/lib/einkauf/seite/karten";
import { sectionFor, type ListItem } from "@/lib/einkauf/shoppingList";

const beispiel = (name: string, shop: string): ListItem => ({ key: `beispiel:${name}`, name, originalName: name, amount: "", section: sectionFor(name), dishes: [], days: [], shop, checked: false, hidden: false });

/** Beispiel-Artikel als Listen-Einträge @public für Tests */
export const beispielItems = (): ListItem[] => [...DEMO_SHOPS.flatMap((g) => g.names.map((name) => beispiel(name, g.shop))), ...DEMO_OHNE.map((name) => beispiel(name, ""))];

/** Das Beispiel als Karten und Chips (oder null, wenn kein Beispiel-Tag ist) @public für Tests */
export function einkaufBeispiel(): { karten: LadenKarte[]; ohne: ListItem[] } {
  const items = beispielItems();
  return { karten: ladenKarten(items, DEMO_SHOPS.map((g) => g.shop)), ohne: items.filter((i) => !i.shop) };
}

/** Beispiel-Tag mit Einkauf? Dann das Beispiel */
export function useEinkaufBeispiel() {
  const demo = useDemo();
  // Ohne Beispiel (auch beim Vorrendern auf dem Server) gar nicht erst nach „heute“ fragen
  if (!demo || !demoTiles(demo, todayIso()).includes("einkauf")) return null;
  return einkaufBeispiel();
}
