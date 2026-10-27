// Einkaufsliste per Sprache/Chat: "Müsli von Rossmann und 2 Packungen
// Windeln auf die Liste" → Artikel mit Menge und Laden. Und Produkt-Wünsche:
// "Wir nehmen immer Alsan statt Butter" → Butter → Alsan.

import { ruleParseLeftovers } from "@/lib/essen/leftovers/ruleParser";
import { SHOP_SUGGESTIONS } from "@/lib/einkauf/shoppingList";

export type ParsedShoppingItem = { name: string; amount: string; shop: string };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Ist das ein "setz … auf die Liste"-Satz? */
export function isShoppingRequest(text: string): boolean {
  if (/\bauf (die|unsere|meine) (einkaufs)?liste\b|\bzur (einkaufs)?liste\b|\bauf den einkaufszettel\b|^einkaufsliste\s*:/i.test(text)) return true;
  // "Wir brauchen Milch und Eier" – aber nicht "Wir brauchen eine Idee …?"
  return /^(?:wir|ich)\s+brauch(?:en|e)\s+(?:noch\s+)?\S/i.test(text.trim()) && !/\?|idee|rezept|vorschlag|hilfe|plan/i.test(text);
}

/** Laden am Ende eines Teils: "von Rossmann", "bei Aldi", "vom Bäcker", "(dm)" */
function splitShop(part: string, shops: string[]): { rest: string; shop: string } {
  const all = [...SHOP_SUGGESTIONS, ...shops];
  const m = part.match(/^(.*?)\s*(?:\b(?:von|vom|bei|beim|aus dem|aus der|im|in der)\s+(?:der\s+|dem\s+)?)([A-Za-zÄÖÜäöüß][\wÄÖÜäöüß-]*(?:\s[A-ZÄÖÜ][\wäöüß]+)?)\s*$/i);
  if (m) {
    const word = m[2].trim();
    const known = all.find((s) => s.toLowerCase() === word.toLowerCase());
    if (known || /^[A-ZÄÖÜ]/.test(word)) return { rest: m[1].trim(), shop: known ?? cap(word) };
  }
  const paren = part.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (paren) return { rest: paren[1].trim(), shop: all.find((s) => s.toLowerCase() === paren[2].trim().toLowerCase()) ?? paren[2].trim() };
  return { rest: part, shop: "" };
}

/**
 * Laden vorne für alles: „Für Lidl: Milch, Eier“, „Bei Lidl Milch und Eier“.
 * Nur bei bekanntem Laden oder mit Doppelpunkt (sonst wäre „Für Oma Kuchen“ ein Laden).
 */
function leadingShop(text: string, shops: string[]): { rest: string; shop: string } | null {
  const m = text.match(/^\s*(?:für|fuer|bei|beim|von|vom)\s+(?:den\s+|dem\s+|der\s+)?([A-Za-zÄÖÜäöüß][\wÄÖÜäöüß-]*)\s*(:)?\s*(.+)$/i);
  if (!m) return null;
  const known = [...SHOP_SUGGESTIONS, ...shops].find((s) => s.toLowerCase() === m[1].toLowerCase());
  if (!known && !m[2]) return null;
  return { rest: m[3], shop: known ?? cap(m[1]) };
}

/** Artikel aus einem Satz (ohne "setz … auf die Liste") */
export function parseShoppingText(text: string, shops: string[] = []): ParsedShoppingItem[] {
  const lead = leadingShop(text.replace(/^\s*(einkaufsliste\s*:|bitte\s+)/i, ""), shops);
  if (lead) return parseShoppingText(lead.rest, shops).map((i) => ({ ...i, shop: i.shop || lead.shop }));
  const core = text
    .replace(/^\s*(einkaufsliste\s*:|bitte\s+)/i, "")
    .replace(/^\s*(wir|ich)\s+brauch(en|e)\b/i, "")
    .replace(/[.!]+\s*$/, "")
    .replace(/\b(setz|setze|pack|packe|schreib|schreibe|tu|tue|füg|füge)\w*\b/gi, "")
    .replace(/\b(noch|bitte|mal|auch|uns)\b/gi, "")
    .replace(/\b(auf|zur|zu der)\s+(die|unsere|meine|der)?\s*(einkaufs)?liste\b.*$/i, "")
    .replace(/\bauf den einkaufszettel\b.*$/i, "")
    .replace(/\b(hinzu|drauf|dazu)\b/gi, "");
  const items: ParsedShoppingItem[] = [];
  for (const raw of core.split(/,|;|\bund\b|\bsowie\b|\bplus\b/i)) {
    const part = raw.trim();
    if (!part) continue;
    const { rest, shop } = splitShop(part, shops);
    const parsed = ruleParseLeftovers(rest)[0];
    // Wie gesagt übernehmen – keine Tippfehler-Korrektur ("Windeln" ≠ "Mandeln")
    const name = cap((parsed?.heard || rest).trim());
    if (!name) continue;
    const amount = parsed && parsed.amount !== null ? `${String(parsed.amount).replace(".", ",")}${parsed.unit ? ` ${parsed.unit}` : ""}` : parsed?.unit ?? "";
    items.push({ name, amount, shop });
  }
  return items;
}

/** "Wir nehmen immer Alsan statt Butter" → { ingredient: "Butter", product: "Alsan" } */
export function parseProductStatement(text: string): { ingredient: string; product: string } | null {
  const t = text.trim().replace(/[.!]+$/, "");
  const a = t.match(/(?:wir\s+)?(?:nehmen|kaufen|holen|nutzen|benutzen)\s+(?:immer|meistens|lieber|nur)?\s*(.+?)\s+(?:statt|anstatt|anstelle von)\s+(.+)$/i);
  if (a) return { product: cap(a[1].trim()), ingredient: cap(a[2].trim()) };
  const b = t.match(/(?:statt|anstatt)\s+(.+?)\s+(?:nehmen|kaufen|holen)\s+wir\s+(?:immer|meistens|lieber)?\s*(.+)$/i);
  if (b) return { ingredient: cap(b[1].trim()), product: cap(b[2].trim()) };
  return null;
}
