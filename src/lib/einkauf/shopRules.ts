// Einkauf: feste Laden-Regeln („Tomaten kaufe ich immer bei Rewe“) und das
// leise Lernen im Einkaufsmodus. Eine Regel gilt überall: Rezept-Zutaten,
// Wochenplan, Stammartikel und eigene Artikel bekommen den Laden von selbst
// (`shopForItem` in buildList.ts). Ähnliche Namen („Cherrytomaten“) folgen
// einer Regel nur, wenn genau ein Laden passt – nie raten.
// Lernen: wird ein Artikel zweimal hintereinander im selben Laden abgehakt,
// merkt sich die Liste den Laden still und fragt einmal, ob es eine feste
// Regel werden soll.

import { lower } from "@/lib/einkauf/listModel";
import { store, update } from "@/lib/einkauf/listStore";
import { SHOP_SUGGESTIONS } from "@/lib/einkauf/shops";
import { compareText } from "@/lib/core/sort";

const cap = (s: string) => (s ? s[0].toLocaleUpperCase("de-DE") + s.slice(1) : s);
const cleanShop = (shop: string) => shop.trim().slice(0, 30);

/**
 * Feste Regel setzen; leer = „egal wo“ (Regel weg, Artikel bewusst „Egal wo“).
 * Setzt auch den gemerkten Laden, ein neuer Laden kommt zu „Meine Läden“.
 */
export function setShopRule(item: string, shop: string) {
  const key = lower(item);
  if (!key) return;
  const clean = cleanShop(shop);
  update((s) => {
    const shopRules = { ...(s.shopRules ?? {}) };
    const itemShops = { ...s.itemShops, [key]: clean };
    const learned = { ...(s.learned ?? {}) };
    delete learned[key];
    if (!clean) {
      delete shopRules[key];
      return { ...s, shopRules, itemShops, learned };
    }
    shopRules[key] = clean;
    const known = [...SHOP_SUGGESTIONS, ...s.shops].some((x) => lower(x) === lower(clean));
    const mine = s.myShops.some((x) => lower(x) === lower(clean));
    return { ...s, shopRules, itemShops, learned, shops: known ? s.shops : [...s.shops, clean], myShops: mine ? s.myShops : [...s.myShops, clean] };
  });
}

/** Regel entfernen (Einstellungen, „Meine Läden“): Artikel ist wieder „noch ohne Laden“ */
export function removeShopRule(item: string) {
  const key = lower(item);
  if (!key) return;
  update((s) => {
    const shopRules = { ...(s.shopRules ?? {}) };
    const itemShops = { ...s.itemShops };
    delete shopRules[key];
    delete itemShops[key];
    return { ...s, shopRules, itemShops };
  });
}

/** Regel setzen und Rücknahme liefern (stellt Regel und gemerkten Laden wie vorher her) */
export function applyShopRule(item: string, shop: string): () => void {
  const key = lower(item);
  const before = store.load();
  const rule = before?.shopRules?.[key] ?? "";
  const remembered = before?.itemShops[key];
  setShopRule(item, shop);
  return () =>
    update((s) => {
      const shopRules = { ...(s.shopRules ?? {}) };
      const itemShops = { ...s.itemShops };
      if (rule) shopRules[key] = rule;
      else delete shopRules[key];
      if (remembered !== undefined) itemShops[key] = remembered;
      else delete itemShops[key];
      return { ...s, shopRules, itemShops };
    });
}

const words = (s: string) => lower(s).split(/[^a-zäöüß]+/).filter(Boolean);

/** Regel passt zu einem ähnlichen Namen: als Wort oder als Wortende („Cherrytomaten“, „passierte Tomaten“) */
function similar(name: string, rule: string): boolean {
  if (rule.length < 3) return false;
  const r = words(rule);
  const w = words(name);
  if (r.length === 0 || r.length > w.length) return false;
  // Mehrwortige Regel: die letzten Wörter müssen passen, das letzte darf ein Wortende sein
  for (let i = 0; i <= w.length - r.length; i++) {
    const part = w.slice(i, i + r.length);
    if (part.every((x, j) => (j === 0 ? x === r[j] || x.endsWith(r[j]) : x === r[j]))) return true;
  }
  return false;
}

/**
 * Laden für einen Artikel: feste Regel → gemerkter Laden (leer = bewusst
 * „Egal wo“) → Regel für einen ähnlichen Namen (nur, wenn genau ein Laden
 * passt). `null` = noch ohne Laden.
 */
export function shopChoice(name: string, s: { itemShops: Record<string, string>; shopRules?: Record<string, string>; products?: Record<string, string> }): string | null {
  const key = lower(name);
  if (!key) return null;
  const rules = s.shopRules ?? {};
  const product = s.products?.[key] ? lower(s.products[key]) : "";
  for (const k of product ? [key, product] : [key]) {
    if (rules[k]) return rules[k];
    if (typeof s.itemShops[k] === "string") return s.itemShops[k];
  }
  return similarShop(name, rules, product);
}

/** Genau ein Laden passt über ähnliche Namen (sonst `null` – nie raten) */
function similarShop(name: string, map: Record<string, string>, product = ""): string | null {
  const hits = Object.entries(map).filter(([k, shop]) => shop.trim() && (similar(name, k) || (product !== "" && similar(product, k))));
  const shops = new Set(hits.map(([, shop]) => lower(shop)));
  return shops.size === 1 ? hits[0][1] : null;
}

/** Laden für einen Artikel ("" = egal wo oder noch ohne Laden) */
export const shopForItem = (name: string, s: Parameters<typeof shopChoice>[1]): string => shopChoice(name, s) ?? "";

/**
 * „Mia sortiert“: Laden für einen Artikel, der noch ohne Laden ist – aus dem
 * Gelernten (zuletzt dort abgehakt) oder einem gemerkten ähnlichen Namen
 * („Cherrytomaten“ ← „Tomaten“ bei Rewe), nur wenn genau ein Laden passt.
 */
export function gelernterLaden(name: string, s: { itemShops: Record<string, string>; learned?: Record<string, { shop: string; n: number }> }): string | null {
  const key = lower(name);
  if (!key) return null;
  const learned = s.learned?.[key]?.shop.trim();
  if (learned) return learned;
  return similarShop(name, s.itemShops);
}

/** Regeln nach Laden: Laden → Artikel (deutsch sortiert) */
export function rulesByShop(rules: Record<string, string>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [item, shop] of Object.entries(rules)) {
    if (!shop.trim()) continue;
    const known = Object.keys(out).find((x) => lower(x) === lower(shop)) ?? shop.trim();
    out[known] = [...(out[known] ?? []), cap(item)];
  }
  for (const shop of Object.keys(out)) out[shop].sort(compareText);
  return out;
}

/**
 * Im Einkaufsmodus von `shop` abgehakt: ohne feste Regel zählt die Liste mit
 * (gleicher Laden +1, sonst neu). Ab zweimal hintereinander merkt sie sich
 * den Laden still; "frage" = einmal je Artikel fragen, ob es eine Regel wird.
 */
export function noteShopCheck(item: string, shop: string): "frage" | null {
  const key = lower(item);
  const clean = cleanShop(shop);
  if (!key || !clean) return null;
  let ask = false;
  update((s) => {
    if (s.shopRules?.[key]) return s;
    const prev = s.learned?.[key];
    const entry = prev && lower(prev.shop) === lower(clean) ? { shop: clean, n: prev.n + 1 } : { shop: clean, n: 1 };
    const learned = { ...(s.learned ?? {}), [key]: entry };
    if (entry.n < 2) return { ...s, learned };
    const asked = s.learnAsked ?? [];
    ask = !asked.includes(key);
    return { ...s, learned, itemShops: { ...s.itemShops, [key]: clean }, learnAsked: ask ? [...asked, key] : asked };
  });
  return ask ? "frage" : null;
}

/** Ohne KI: „Tomaten kaufe ich immer bei Rewe“, „Butter nur bei Lidl“ → Regel; „… nicht mehr bei Rewe“, „Milch egal wo“ → weg */
export function parseShopRule(text: string): { item: string; shop: string } | null {
  const t = text.trim().replace(/[.!]+$/, "");
  const set =
    t.match(/^(?:ich|wir)\s+kauf\w*\s+(.+?)\s+(?:immer|nur|ab jetzt)\s+(?:bei|beim|im|in der)\s+(.+)$/i) ??
    t.match(/^(.+?)\s+(?:kauf\w*\s+(?:ich|wir)\s+|gibt'?s\s+|gibt es\s+|hol\w*\s+(?:ich|wir)\s+)?(?:immer|nur|ab jetzt)\s+(?:bei|beim|im|in der)\s+(.+)$/i);
  const off = t.match(/^(?:(?:ich|wir)\s+kauf\w*\s+)?(.+?)\s+(?:kauf\w*\s+(?:ich|wir)\s+)?(?:nicht mehr\s+(?:bei|beim|im|in der)\s+.+|(?:ist\s+|sind\s+)?egal wo)$/i);
  const pick = off ? { item: off[1], shop: "" } : set ? { item: set[1], shop: set[2] } : null;
  if (!pick) return null;
  const item = pick.item.trim();
  const shop = pick.shop.trim();
  // „Mathis ist immer bei Oma“ ist keine Laden-Regel
  const notItem = /(?<![a-zäöüß])(ich|wir|du|er|sie|es|man|das|ist|sind|bin|war|hat|haben|bleibt|schläft|spielt|wohnt|arbeitet)(?![a-zäöüß])/i;
  if (!item || item.split(/\s+/).length > 3 || shop.split(/\s+/).length > 3 || notItem.test(item)) return null;
  return { item: cap(item), shop };
}

/** „Was kauf ich wo?“, „Welche Läden hab ich?“ */
export const isShopOverviewQuestion = (text: string) => /^(?:und\s+)?(?:was\s+kauf\w*\s+(?:ich|wir)\s+wo|wo\s+kauf\w*\s+(?:ich|wir)\s+was|welche\s+läden\s+(?:hab|habe|haben)\s+(?:ich|wir))\s*\??$/i.test(text.trim());

/** Ohne KI: „Was kauf ich wo?“ → je Laden eine Zeile (nur feste Regeln) */
export function shopOverview(rules: Record<string, string>, mine: string[]): string {
  const byShop = Object.entries(rulesByShop(rules));
  if (!byShop.length) return mine.length ? `Deine Läden: ${mine.join(", ")}. Feste Regeln hast du noch keine.` : "Noch keine Läden und Regeln. Sag einfach: „Tomaten kaufe ich immer bei Rewe.“";
  return byShop.map(([shop, items]) => `${shop}: ${items.join(", ")}`).join("\n");
}

/** Kurze Antwort: „Merk ich mir. Tomaten → Rewe.“ bzw. „Gut, Tomaten egal wo.“ */
export const shopRuleReply = (item: string, shop: string) => (shop.trim() ? `Merk ich mir. ${cap(item.trim())} → ${shop.trim()}.` : `Gut, ${cap(item.trim())} egal wo.`);

/** Für Mia (nur zum Lesen): feste Regeln und „Meine Läden“ */
export function shopRulesForMia(): { regeln: Record<string, string>; meine: string[] } {
  const s = store.load();
  return { regeln: { ...(s?.shopRules ?? {}) }, meine: [...(s?.myShops ?? [])] };
}
