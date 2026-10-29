// Einkauf: Laden-Plan speichern und ändern (A-067). Gilt für den ganzen
// Haushalt (Einstellungen im Abgleich). Nach der Einrichtung gibt es kein
// „ohne Laden“ mehr: jede Sache kommt über Ausnahme → Sorte → Hauptladen in
// einen Laden (`ladenHerkunft`).

import { store, update } from "@/lib/einkauf/listStore";
import { SHOP_SUGGESTIONS } from "@/lib/einkauf/shops";
import { lower, type ShoppingListStore } from "@/lib/einkauf/listModel";
import { hauptVorschlag, laedenAusSatz, mitSorte, planLaeden, planText, type LadenPlan } from "@/lib/einkauf/sorten/plan";
import { sorteAusWort, sorteLabel, type SorteId } from "@/lib/einkauf/sorten/sorten";

const has = (list: readonly string[], name: string) => list.some((x) => lower(x) === lower(name));

/** Neue Läden zu „Meine Läden“ (und eigene zu den selbst angelegten) */
function mitLaeden(s: ShoppingListStore, laeden: readonly string[]): Pick<ShoppingListStore, "myShops" | "shops"> {
  const myShops = [...s.myShops];
  const shops = [...s.shops];
  for (const l of laeden) {
    if (!has(myShops, l)) myShops.push(l);
    if (!has([...SHOP_SUGGESTIONS, "Getränkemarkt", ...shops], l)) shops.push(l);
  }
  return { myShops, shops };
}

/** Schritt 2 „Speichern“: Läden aus Schritt 1 (Reihenfolge bleibt) und der Plan; nie wieder gefragt */
export function einrichtungSpeichern(laeden: readonly string[], plan: LadenPlan) {
  update((s) => {
    const alle = [...laeden, ...planLaeden(plan).filter((l) => !has(laeden, l))];
    const { shops } = mitLaeden(s, alle);
    return { ...s, myShops: [...alle], shops, shopsAsked: true, ladenPlan: plan };
  });
}

/** Rücknahme für Mia: Plan und Läden wie vorher */
function merkeVorher(): () => void {
  const vorher = store.load();
  return () =>
    update((s) => {
      const next = { ...s, myShops: vorher?.myShops ?? s.myShops, shops: vorher?.shops ?? s.shops };
      if (vorher?.ladenPlan) return { ...next, ladenPlan: vorher.ladenPlan };
      const { ladenPlan: _weg, ...rest } = next;
      void _weg;
      return rest;
    });
}

/**
 * „Getränke kaufe ich bei Edeka“, „Obst auf dem Markt und bei Rewe“: Sorte
 * auf diese Läden setzen (neue Läden kommen dazu). Ohne Plan wird einer
 * angelegt (Hauptladen = erster eigener Laden). Liefert Rücknahme.
 */
export function sorteRegelAnwenden(sorte: SorteId, laeden: readonly string[]): () => void {
  const undo = merkeVorher();
  update((s) => {
    const plan: LadenPlan = s.ladenPlan ?? { haupt: hauptVorschlag(s.myShops.length ? s.myShops : laeden), regeln: {} };
    return { ...s, ...mitLaeden(s, laeden), shopsAsked: true, ladenPlan: mitSorte(plan, sorte, laeden) };
  });
  return undo;
}

/** Laden-Text einer Regel („dem Markt und Rewe“) → Läden; leer = keine */
const laedenAusRegel = (shop: string) => laedenAusSatz(shop, store.load()?.myShops ?? []);

/** Ist der Artikel einer Laden-Regel eigentlich eine Sorte? Dann gilt sie für die ganze Sorte */
export function alsSorteRegel(item: string, shop: string): { sorte: SorteId; laeden: string[] } | null {
  const sorte = sorteAusWort(item);
  if (!sorte) return null;
  const laeden = laedenAusRegel(shop);
  return laeden.length ? { sorte, laeden } : null;
}

/** „Merk ich mir. Obst → Wochenmarkt + Rewe.“ */
export const sorteRegelAntwort = (sorte: SorteId, laeden: readonly string[]) => `Merk ich mir. ${sorteLabel(sorte)} → ${planText(laeden)}.`;

/** Lern-Frage beantwortet (A-067): Ja = Ausnahme dort (macht der Aufrufer), Nein = für diese Sache nie wieder fragen */
export function nieWiederFragen(item: string) {
  const k = lower(item);
  if (!k) return;
  update((s) => (s.learnAsked.includes(k) ? s : { ...s, learnAsked: [...s.learnAsked, k].slice(-300) }));
}
