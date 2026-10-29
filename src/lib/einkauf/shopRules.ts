// Einkauf: feste Laden-Regeln („Tomaten kaufe ich immer bei Rewe“) und das
// leise Lernen im Einkaufsmodus. Eine Regel gilt überall: Rezept-Zutaten,
// Wochenplan, Stammartikel und eigene Artikel bekommen den Laden von selbst
// (`shopForItem` in buildList.ts). Ähnliche Namen („Cherrytomaten“) folgen
// einer Regel nur, wenn genau ein Laden passt – nie raten.
// Lernen (A-041, `einkauf/merken`): jedes Abhaken auf einer Laden-Seite wird
// gemerkt (Sache → Laden, Zähler, Datum). Eine Sache ohne Regel und ohne
// gewählten Laden landet im gelernten Laden („Rewe · wie immer“).

import { lower } from "@/lib/einkauf/listModel";
import { store, update } from "@/lib/einkauf/listStore";
import { SHOP_SUGGESTIONS } from "@/lib/einkauf/shops";
import { compareText } from "@/lib/core/sort";
import { todayIso } from "@/lib/core/now";
import type { Gelernt } from "@/lib/einkauf/listModel";
import { abgehakt, gelernterLadenFuer, gelerntSchluessel, korrigiert } from "@/lib/einkauf/merken/gelernt";
import { laedenFuerSorte, type LadenPlan } from "@/lib/einkauf/sorten/plan";
import { sorteAusWort, sorteFuer, type SorteId } from "@/lib/einkauf/sorten/sorten";
import { alsSorteRegel, sorteRegelAntwort, sorteRegelAnwenden } from "@/lib/einkauf/sorten/einrichten";
import { laedenAusSatz, planZeile } from "@/lib/einkauf/sorten/plan";
import { parseSorteRegel } from "@/lib/einkauf/sorten/saetze";

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

/**
 * Regel setzen und Rücknahme liefern (stellt Regel und gemerkten Laden wie
 * vorher her). Ist der „Artikel“ eine ganze Sorte („Getränke“, A-067), gilt
 * die Regel für die Sorte (mehrere Läden mit „und“).
 */
export function applyShopRule(item: string, shop: string): () => void {
  const sorte = alsSorteRegel(item, shop);
  if (sorte) return sorteRegelAnwenden(sorte.sorte, sorte.laeden);
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

type LadenWissen = { itemShops: Record<string, string>; shopRules?: Record<string, string>; products?: Record<string, string>; learned?: Record<string, Gelernt>; ladenPlan?: LadenPlan; sortenKi?: Record<string, SorteId> };

/** Woher der Laden einer Sache kommt: Regel, selbst gewählt, gelernt (Abhaken), ähnlicher Name, Sorte bzw. Hauptladen (A-067) */
export type LadenHerkunft = { shop: string; von: "regel" | "gewaehlt" | "gelernt" | "aehnlich" | "sorte" | "haupt"; /** Weitere Läden derselben Sorte (A-067 Nachtrag) */ auch?: string[] };

/**
 * Laden für einen Artikel samt Herkunft: feste Regel → gewählter Laden (leer =
 * bewusst „Egal wo“) → gelernt beim Abhaken (A-041, 90-Tage-Regel) → Regel für
 * einen ähnlichen Namen (nur, wenn genau ein Laden passt). `null` = noch ohne Laden.
 * Mit Laden-Plan (A-067): Ausnahme (Regel, gewählt, ähnlicher Name) → Regel
 * der Sorte (alle ihre Läden, der erste vorn) → Hauptladen; nie „ohne Laden“.
 */
export function ladenHerkunft(name: string, s: LadenWissen, heute: string = todayIso()): LadenHerkunft | null {
  const key = lower(name);
  if (!key) return null;
  const rules = s.shopRules ?? {};
  const product = s.products?.[key] ? lower(s.products[key]) : "";
  const keys = product ? [key, product] : [key];
  for (const k of keys) {
    if (rules[k]) return { shop: rules[k], von: "regel" };
    if (typeof s.itemShops[k] === "string") return { shop: s.itemShops[k], von: "gewaehlt" };
  }
  const plan = s.ladenPlan;
  if (plan) {
    const aehnlich = similarShop(name, rules, product);
    if (aehnlich !== null) return { shop: aehnlich, von: "aehnlich" };
    const sorte = sorteFuer(product || name, s.sortenKi) ?? (product ? sorteFuer(name, s.sortenKi) : null);
    const [shop, ...auch] = laedenFuerSorte(plan, sorte);
    return sorte && plan.regeln[sorte]?.length ? { shop, von: "sorte", ...(auch.length ? { auch } : {}) } : { shop, von: "haupt" };
  }
  for (const k of keys) {
    const g = gelernterLadenFuer(s.learned, k, heute);
    if (g) return { shop: g, von: "gelernt" };
  }
  const aehnlich = similarShop(name, rules, product);
  return aehnlich === null ? null : { shop: aehnlich, von: "aehnlich" };
}

/** Laden für einen Artikel (siehe `ladenHerkunft`); `null` = noch ohne Laden */
export const shopChoice = (name: string, s: LadenWissen, heute?: string): string | null => ladenHerkunft(name, s, heute)?.shop ?? null;

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
export function gelernterLaden(name: string, s: { itemShops: Record<string, string>; learned?: Record<string, Gelernt> }): string | null {
  if (!lower(name)) return null;
  return gelernterLadenFuer(s.learned, name, todayIso()) ?? similarShop(name, s.itemShops);
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
 * Auf der Laden-Seite von `shop` abgehakt (A-041): gemerkt mit Zähler und
 * Datum – auch neben einer festen Regel (zählt für „Oft bei“). Still.
 * Liefert Rücknahme (nochmal tippen in der Sekunde = doch nicht).
 */
export function noteShopCheck(item: string, shop: string): () => void {
  if (!lower(item) || !cleanShop(shop)) return () => {};
  const vorher = store.load()?.learned ?? {};
  const k = gelerntSchluessel(vorher, item) ?? lower(item);
  const alt = vorher[k];
  update((s) => ({ ...s, learned: abgehakt(s.learned ?? {}, item, shop, todayIso()) }));
  return () =>
    update((s) => {
      const learned = { ...(s.learned ?? {}) };
      if (alt) learned[k] = alt;
      else delete learned[k];
      return { ...s, learned };
    });
}

/**
 * Laden selbst geändert (Ergebnis-Karte „Rewe · wie immer ⌄“, Zeilen-Fenster):
 * gilt ab sofort für diese Sache und wird gemerkt – das nächste Mal kommt sie
 * gleich in den neuen Laden. Eine feste Regel für einen anderen Laden zieht
 * mit um. Liefert Rücknahme (alles wie vorher).
 */
export function ladenKorrigieren(item: string, shop: string): () => void {
  const key = lower(item);
  const before = store.load();
  if (!key || !before) return () => {};
  const clean = cleanShop(shop);
  update((s) => {
    const shopRules = { ...(s.shopRules ?? {}) };
    if (shopRules[key] && lower(shopRules[key]) !== lower(clean)) {
      if (clean) shopRules[key] = clean;
      else delete shopRules[key];
    }
    // Gewählter Laden weicht dem Gelernten (sonst gewinnt er beim nächsten Mal); „Egal wo“ bleibt bewusst
    const itemShops = { ...s.itemShops };
    if (clean) delete itemShops[key];
    else itemShops[key] = "";
    return { ...s, shopRules, itemShops, learned: korrigiert(s.learned ?? {}, item, clean, todayIso()) };
  });
  return () => update((s) => ({ ...s, shopRules: before.shopRules, itemShops: before.itemShops, learned: before.learned }));
}

/** Einstellungen → Mia → „Was ich mir gemerkt hab“: Gelerntes vergessen (die Sache sortiert sich wieder neu) */
export function gelerntVergessen(item: string) {
  update((s) => {
    const learned = { ...(s.learned ?? {}) };
    const k = gelerntSchluessel(learned, item);
    if (k) delete learned[k];
    return { ...s, learned };
  });
}

/** Ohne KI: „Tomaten kaufe ich immer bei Rewe“, „Butter nur bei Lidl“ → Regel; „… nicht mehr bei Rewe“, „Milch egal wo“ → weg */
export function parseShopRule(text: string): { item: string; shop: string } | null {
  const t = text.trim().replace(/[.!]+$/, "");
  // A-067: ganze Sorte („Obst kaufe ich auf dem Markt und bei Rewe“)
  const sorte = parseSorteRegel(t);
  if (sorte) return { item: cap(t.match(/^(?:(?:ich|wir)\s+\S+\s+)?(\S+)/i)?.[1] ?? ""), shop: sorte.laeden.join(" und ") };
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
export const shopRuleReply = (item: string, shop: string) => {
  const sorte = shop.trim() ? sorteAusWort(item) : null;
  const laeden = sorte ? laedenAusSatz(shop) : [];
  if (sorte && laeden.length) return sorteRegelAntwort(sorte, laeden);
  return shop.trim() ? `Merk ich mir. ${cap(item.trim())} → ${shop.trim()}.` : `Gut, ${cap(item.trim())} egal wo.`;
};

/** Für Mia (nur zum Lesen): feste Regeln, „Meine Läden“ und „Was holst du wo?“ (A-067) */
export function shopRulesForMia(): { regeln: Record<string, string>; meine: string[]; wasWo?: string } {
  const s = store.load();
  const wasWo = s?.ladenPlan ? planZeile(s.ladenPlan) : "";
  return { regeln: { ...(s?.shopRules ?? {}) }, meine: [...(s?.myShops ?? [])], ...(wasWo ? { wasWo } : {}) };
}
