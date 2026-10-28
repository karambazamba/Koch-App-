// Sofort-Weg, Einkauf (rein): „Milch auf die Liste“, „Wir brauchen Brot und
// Butter“, „Shampoo bei Rossmann“, „Milch, Eier und Brot“. Nur Lebensmittel
// und Verbrauchsartikel aus dem Katalog (Abteilungen der Einkaufsliste plus
// Drogerie/Haushalt), höchstens drei Wörter je Artikel, nichts doppelt –
// sonst entscheidet die KI („für die Soße am Samstag“, „Luftballons“ …).

import type { ChangeOp } from "@/lib/begleitung/ops";
import { SHOP_SUGGESTIONS, sectionFor } from "@/lib/einkauf/shoppingList";
import { isShoppingRequest, parseShoppingText } from "@/lib/einkauf/shoppingParse";
import { sameIngredient } from "@/lib/vorrat/pantry";

/** Verbrauchsartikel ohne eigene Abteilung (Drogerie, Haushalt, Tier) */
const VERBRAUCH = /^(klopapier|toilettenpapier|küchenrolle|küchenpapier|taschentücher|spülmittel|spültabs|geschirrtabs|waschmittel|weichspüler|zahnpasta|zahnbürsten?|shampoo|duschgel|seife|deo|rasierer|windeln|feuchttücher|müllbeutel|mülltüten|alufolie|backpapier|frischhaltefolie|gefrierbeutel|kaffeefilter|batterien(?: aa| aaa)?|glühbirnen?|kerzen|katzenfutter|hundefutter|katzenstreu|schwämme|spülschwämme|putzmittel|creme|sonnencreme|pflaster|tampons|binden|watte|wattestäbchen)$/i;

/** Ist das ein Katalog-Artikel? (kurz, bekannt) */
function imKatalog(name: string): boolean {
  const n = name.trim().toLowerCase();
  if (!n || n.split(/\s+/).length > 3 || /\d{3,}|[!?:]/.test(n)) return false;
  // Zeitangaben, Zwecke und Mengenwörter gehören nicht in den Namen
  if (/(?<![a-zäöüß])(für|zum|zur|am|morgen|heute|samstag|sonntag|montag|dienstag|mittwoch|donnerstag|freitag|was|sachen|zeug|etwas|irgendwas)(?![a-zäöüß])/.test(n)) return false;
  return sectionFor(n) !== "sonstiges" || VERBRAUCH.test(n.replace(/^\d+\s*(?:x\s*)?/, ""));
}

const LADEN_AM_ENDE = (shops: string[]) => new RegExp(`\\s(?:bei|beim|von|vom|aus dem|im)\\s+(${shops.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*$`, "i");
const LADEN_VORN = (shops: string[]) => new RegExp(`^(?:für|bei|beim)\\s+(${shops.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*:?\\s+`, "i");

export function einkaufErkennen(t: string, ctx: { laeden: string[]; weekStart: string; aufDerListe: string[] }): ChangeOp[] | null {
  // Uhrzeit oder etwas nach „auf die Liste“: da steckt mehr drin (Termin dazu?) – die KI
  if (/\d{1,2}\s*uhr|\d{1,2}:\d{2}/i.test(t) || /(?:auf (?:die|unsere|meine) (?:einkaufs)?liste|auf den einkaufszettel)\s+(?!bitte)\S/i.test(t)) return null;
  const shops = [...new Set([...SHOP_SUGGESTIONS, ...ctx.laeden])].filter(Boolean);
  const explizit = isShoppingRequest(t) || /(?<![a-zäöüß])(drauf|einkaufszettel)(?![a-zäöüß])/i.test(t);
  const mitLaden = shops.length > 0 && (LADEN_AM_ENDE(shops).test(t) || LADEN_VORN(shops).test(t));
  // Ohne „auf die Liste“ / Laden: nur eine reine Aufzählung von Katalog-Artikeln („Milch, Eier und Brot“)
  const satz = t.replace(/^(?:pack|setz|schreib|tu)\w*\s+/i, "").replace(/\s+(?:noch\s+)?(?:mit\s+)?drauf[.!]*$/i, " auf die Liste");
  const items = parseShoppingText(satz, ctx.laeden);
  if (!items.length || items.length > 8) return null;
  if (!explizit && !mitLaden && (items.length < 2 || !items.every((i) => !i.shop && /^[\p{L} -]+$/u.test(i.name)))) return null;
  if (!items.every((i) => imKatalog(i.name))) return null;
  // Steht schon drauf: die KI sagt es (nicht doppelt eintragen)
  if (items.some((i) => ctx.aufDerListe.some((l) => sameIngredient(l.replace(/\s*\(.*\)$/, ""), i.name)))) return null;
  return items.map((i, n) => ({ id: `sofort-${n + 1}`, type: "add_shopping" as const, weekStart: ctx.weekStart, name: i.name, amount: i.amount, section: sectionFor(i.name), ...(i.shop ? { shop: i.shop } : {}) }));
}
