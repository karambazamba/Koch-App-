// Schnell etwas auf die Einkaufsliste ("+"): "Milch, Windeln und Müsli von
// Rossmann" → Artikel mit Menge und Laden. Was nicht sicher erkannt wird,
// kommt als grauer Chip zum Bestätigen zurück (nie automatisch "korrigiert" –
// "Windeln" sind keine "Mandeln").

import { findFood, recognizeFood } from "../essen/leftovers/foods";
import { sectionFor, type ShoppingSettings } from "./shoppingList";
import { parseShoppingText, type ParsedShoppingItem } from "./shoppingParse";

/** Drogerie, Haushalt, Baby – und Lebensmittel, die nicht in der Lebensmittel-Liste stehen */
const MORE_PRODUCTS =
  /(windel|feuchttücher|klopapier|toilettenpapier|küchenrolle|taschentücher|servietten|spülmittel|spültabs|tabs|klarspüler|waschmittel|weichspüler|putzmittel|schwamm|schwämme|müllbeutel|mülltüten|alufolie|frischhaltefolie|backpapier|gefrierbeutel|batterie|zahnpasta|zahnbürste|zahnseide|shampoo|spülung|duschgel|seife|deo|creme|sonnencreme|pflaster|wattepads|rasierer|binden|tampons|babybrei|gläschen|babynahrung|pre-?milch|katzenfutter|hundefutter|katzenstreu|kerzen|blumen|müsli|cornflakes|granola|chips|kekse|schokolade|gummibärchen|knäckebrot|zwieback|aufstrich|nutella|pesto|brühe|tomatenmark|passata|kokosmilch|tortellini|gnocchi|pizza|fischstäbchen|eis\b)/i;

export type QuickAddItem = ParsedShoppingItem & { section: ReturnType<typeof sectionFor> };
export type QuickAddUnsure = ParsedShoppingItem & { suggestion: string | null };

/** Kennt der Haushalt den Artikel schon (eigene Produkte, Läden, Stammliste)? */
function knownInHousehold(name: string, settings: Pick<ShoppingSettings, "products" | "itemShops" | "staples">): boolean {
  const n = name.trim().toLowerCase();
  return (
    n in settings.products ||
    Object.values(settings.products).some((p) => p.toLowerCase() === n) ||
    n in settings.itemShops ||
    settings.staples.some((s) => s.name.toLowerCase() === n)
  );
}

/** Text zerlegen: sicher erkannte Artikel und unsichere (mit Vorschlag) */
export function parseQuickAdd(
  text: string,
  settings: Pick<ShoppingSettings, "products" | "itemShops" | "staples" | "shops">,
): { items: QuickAddItem[]; unsure: QuickAddUnsure[] } {
  const items: QuickAddItem[] = [];
  const unsure: QuickAddUnsure[] = [];
  for (const parsed of parseShoppingText(text, settings.shops)) {
    const name = parsed.name;
    const section = sectionFor(name);
    if (MORE_PRODUCTS.test(name) || findFood(name) || section !== "sonstiges" || knownInHousehold(name, settings)) {
      items.push({ ...parsed, section });
      continue;
    }
    const recognized = recognizeFood(name);
    // Zusammengesetzt mit bekanntem Ende ("Kirschtomaten") → so übernehmen
    if (recognized.known && recognized.match === null) {
      items.push({ ...parsed, section });
      continue;
    }
    const suggestion = recognized.known ? recognized.match!.food.singular : recognized.suggestion?.singular ?? null;
    unsure.push({ ...parsed, suggestion: suggestion && suggestion.toLowerCase() !== name.toLowerCase() ? suggestion : null });
  }
  return { items, unsure };
}
