// Einkauf, rein: Grundsachen („hat man meist da“: Salz, Pfeffer, Mehl …) aus
// Rezepten stehen nicht auf der Seite „Einkauf“ herum – man findet sie unter
// „Aussuchen · Für eure Woche“ und kann sie dort dazunehmen.

import { AT_HOME } from "@/lib/essen/dishIdeas";
import type { ListItem } from "@/lib/einkauf/shoppingList";

const lower = (s: string) => s.trim().toLowerCase();

/** Hat man meist im Haus (Salz, Pfeffer, Muskat, Mehl, Öl, Zucker, Essig, Brühe …) */
export const istGrundsache = (name: string) => AT_HOME.test(name.trim());

/**
 * Grundsachen aus Rezepten/Plan (nicht selbst Eingetragenes, nicht „immer auf
 * die Liste“) kommen in die Karte, der Rest auf die Liste.
 */
export function grundsachen(items: ListItem[], alwaysList: string[] = []): { liste: ListItem[]; karte: ListItem[] } {
  const always = new Set(alwaysList.map(lower));
  const karte = items.filter((i) => !i.manualId && !i.now && istGrundsache(i.originalName) && !always.has(lower(i.originalName)) && !always.has(lower(i.name)));
  return { liste: items.filter((i) => !karte.includes(i)), karte };
}
