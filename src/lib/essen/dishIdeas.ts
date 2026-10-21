// Gemeinsame Gerichte-Liste für alle Ideen ohne KI ("Was gibt's heute?",
// Spontan kochen, Testmodus) und der Abgleich mit dem, was da ist. Rein, damit
// Server (Testmodus) und App gleich rechnen.

import type { RecipeCategory } from "./cookbook";
import { sameIngredient, type PantryItem } from "./pantry";

export type Season = "fruehling" | "sommer" | "herbst" | "winter";

type DishIdea = {
  title: string;
  minutes: number;
  category: RecipeCategory;
  /** Hauptzutaten (ohne Salz, Öl, Zwiebel & Co.) */
  needs: string[];
  /** Nur in dieser Jahreszeit bei "Was gibt's heute?" */
  season?: Season;
  /** Geht meistens mit Grundzutaten – für leeren Vorrat */
  usual?: boolean;
};

/** Familien-Klassiker – fast immer machbar, viele mit dem, was oft da ist */
export const DISHES: DishIdea[] = [
  // Grundzutaten (Nudeln, Eier, Reis, Brot …)
  { title: "Rührei mit Brot", minutes: 10, category: "vegetarisch", needs: ["Eier", "Brot"], usual: true },
  { title: "Käsebrot mit Rohkost", minutes: 10, category: "vegetarisch", needs: ["Brot", "Käse"], usual: true },
  { title: "Nudeln mit Pesto", minutes: 15, category: "vegetarisch", needs: ["Nudeln", "Pesto"], usual: true },
  { title: "Nudeln mit Tomatensoße", minutes: 20, category: "vegetarisch", needs: ["Nudeln", "Tomaten"], usual: true },
  { title: "Pfannkuchen", minutes: 20, category: "vegetarisch", needs: ["Eier", "Milch"], usual: true },
  { title: "Reispfanne mit Ei", minutes: 20, category: "vegetarisch", needs: ["Reis", "Eier", "Erbsen"], usual: true },
  { title: "Bratkartoffeln mit Spiegelei", minutes: 25, category: "vegetarisch", needs: ["Kartoffeln", "Eier"], usual: true },
  { title: "Grießbrei", minutes: 10, category: "vegetarisch", needs: ["Grieß", "Milch"] },
  { title: "Omelett mit Gemüse", minutes: 15, category: "vegetarisch", needs: ["Eier", "Paprika"] },
  { title: "Ofen-Baguette", minutes: 15, category: "vegetarisch", needs: ["Baguette", "Käse"] },
  { title: "Tomatensuppe mit Toast", minutes: 15, category: "vegetarisch", needs: ["Tomaten", "Toast"] },
  { title: "Wraps mit Gemüse", minutes: 15, category: "vegetarisch", needs: ["Wraps", "Paprika", "Gurke"] },
  { title: "Nudeln mit Zucchini", minutes: 20, category: "vegetarisch", needs: ["Nudeln", "Zucchini"] },
  { title: "Zucchini-Puffer", minutes: 25, category: "vegetarisch", needs: ["Zucchini", "Eier"] },
  { title: "Gemüsepfanne mit Reis", minutes: 25, category: "vegetarisch", needs: ["Reis", "Möhren"] },
  { title: "Gemüsecurry mit Reis", minutes: 30, category: "vegetarisch", needs: ["Reis", "Kokosmilch", "Paprika", "Zucchini"] },
  { title: "Kartoffel-Gemüse-Pfanne", minutes: 30, category: "vegetarisch", needs: ["Kartoffeln", "Paprika", "Zucchini"] },
  { title: "Pellkartoffeln mit Quark", minutes: 30, category: "vegetarisch", needs: ["Kartoffeln", "Quark"] },
  { title: "Nudelauflauf", minutes: 35, category: "vegetarisch", needs: ["Nudeln", "Käse", "Sahne"] },
  { title: "Ofengemüse mit Feta", minutes: 35, category: "vegetarisch", needs: ["Paprika", "Zucchini", "Feta"] },
  { title: "Flammkuchen", minutes: 25, category: "vegetarisch", needs: ["Flammkuchenteig", "Schmand"] },
  { title: "Milchreis mit Apfelmus", minutes: 30, category: "vegetarisch", needs: ["Milchreis", "Milch", "Apfelmus"] },
  // Mit Fleisch oder Fisch
  { title: "Hack-Paprika-Pfanne mit Reis", minutes: 25, category: "fleisch", needs: ["Hackfleisch", "Paprika", "Reis"] },
  { title: "Gefüllte Paprika", minutes: 45, category: "fleisch", needs: ["Paprika", "Hackfleisch", "Reis"] },
  { title: "Chili con Carne", minutes: 40, category: "fleisch", needs: ["Hackfleisch", "Kidneybohnen", "Tomaten", "Paprika"] },
  { title: "Spaghetti Bolognese", minutes: 30, category: "fleisch", needs: ["Spaghetti", "Hackfleisch", "Tomaten"] },
  { title: "Frikadellen mit Kartoffeln", minutes: 35, category: "fleisch", needs: ["Hackfleisch", "Eier", "Kartoffeln"] },
  { title: "Hähnchenpfanne mit Reis", minutes: 25, category: "fleisch", needs: ["Hähnchenbrust", "Reis", "Paprika"] },
  { title: "Thunfisch-Nudeln", minutes: 20, category: "fisch", needs: ["Nudeln", "Thunfisch", "Tomaten"] },
  { title: "Fischstäbchen mit Kartoffelpüree", minutes: 25, category: "fisch", needs: ["Fischstäbchen", "Kartoffeln", "Milch"] },
  { title: "Lachs mit Ofenkartoffeln", minutes: 35, category: "fisch", needs: ["Lachs", "Kartoffeln"] },
  // Jahreszeit
  { title: "Kartoffelsuppe", minutes: 30, category: "vegetarisch", needs: ["Kartoffeln", "Möhren"], season: "herbst" },
  { title: "Kürbissuppe", minutes: 35, category: "vegetarisch", needs: ["Kürbis", "Kartoffeln"], season: "herbst" },
  { title: "Linsensuppe", minutes: 35, category: "vegetarisch", needs: ["Linsen", "Möhren", "Kartoffeln"], season: "winter" },
  { title: "Chili sin Carne", minutes: 35, category: "vegetarisch", needs: ["Kidneybohnen", "Mais", "Tomaten"], season: "winter" },
  { title: "Spargel mit Kartoffeln", minutes: 35, category: "vegetarisch", needs: ["Spargel", "Kartoffeln"], season: "fruehling" },
  { title: "Nudelsalat", minutes: 20, category: "vegetarisch", needs: ["Nudeln", "Gurke", "Tomaten"], season: "sommer" },
  { title: "Tomaten-Mozzarella mit Brot", minutes: 10, category: "vegetarisch", needs: ["Tomaten", "Mozzarella", "Brot"], season: "sommer" },
];

/** Hat man meistens im Haus – zählt nicht als Einkauf und nicht als "nutzt" */
export const AT_HOME = /^(salz|pfeffer|öl|olivenöl|rapsöl|wasser|zucker|mehl|essig|butter|brühe|gemüsebrühe|gewürze?|zwiebeln?|knoblauch|knoblauchzehen?|tomatenmark|senf|ketchup|kräuter|petersilie|schnittlauch|paprikapulver|currypulver|curry|muskat|oregano|basilikum|thymian|zimt|backpulver|honig|sojasoße|sojasauce|lorbeer\w*)$/i;

/** Was davon da ist (`uses`, Namen wie im Vorrat) und was noch fehlt (`needs`) */
export function matchStock(names: string[], stock: PantryItem[]): { uses: string[]; needs: string[] } {
  const needed = names.map((n) => n.trim()).filter((n) => n && !AT_HOME.test(n));
  return {
    uses: [...new Set(stock.filter((p) => needed.some((n) => sameIngredient(n, p.name))).map((p) => p.name))],
    needs: needed.filter((n) => !stock.some((p) => sameIngredient(n, p.name))),
  };
}

/** Echte Zutaten im Vorrat (ohne Salz, Öl & Co.) */
export const realStock = (stock: PantryItem[]) => stock.filter((p) => !AT_HOME.test(p.name.trim()));

/** Vorrat leer oder fast leer (weniger als 3 echte Zutaten) */
export const stockNearlyEmpty = (stock: PantryItem[]) => realStock(stock).length < 3;

/** Hinweis bei (fast) leerem Vorrat */
export const EMPTY_STOCK_HINT = "Sag mir, was da ist, dann passe ich die Ideen an.";

/** Kühlschrank-Sachen, die seit 2+ Tagen da sind – bald verbrauchen */
export function soonToUse(stock: PantryItem[], today: string): PantryItem[] {
  const limit = new Date(`${today}T12:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() - 2);
  const cutoff = limit.toISOString().slice(0, 10);
  return stock.filter((p) => p.place === "kuehlschrank" && p.addedAt && p.addedAt <= cutoff && !p.id.startsWith("b:") && !p.id.startsWith("s:"));
}

/** Einfacher Vorrats-Eintrag für Gekauftes ("b:") bzw. eben Gesagtes ("s:") */
export function stockItem(name: string, kind: "b" | "s", today: string): PantryItem {
  return { id: `${kind}:${name}`, name, amount: null, unit: "", addedAt: today, place: "schrank" };
}

/** Vorrat + Gekauftes + Gesagtes, ohne doppelte Zutaten */
export function mergeStock(pantry: PantryItem[], extra: PantryItem[]): PantryItem[] {
  return [...pantry, ...extra.filter((e) => !pantry.some((p) => sameIngredient(p.name, e.name)))];
}

/** Stabile Kennung des Bestands – ändert sie sich, sind alte Ideen hinfällig */
export function stockKey(stock: PantryItem[]): string {
  return stock
    .map((p) => `${p.name.trim().toLowerCase()}:${p.amount ?? ""}`)
    .sort()
    .join("|");
}

type StockIdea = { title: string; minutes: number; category: RecipeCategory; uses: string[]; needs: string[] };

/**
 * Drei Ideen nur aus der Gerichte-Liste (z. B. Testmodus): die mit den
 * meisten vorhandenen Hauptzutaten zuerst, dann wenig Fehlendes, dann schnell.
 * Leerer Vorrat → Gerichte mit Grundzutaten.
 */
export function stockIdeas(stock: PantryItem[], count = 3): StockIdea[] {
  const real = realStock(stock);
  const pool = real.length === 0 ? DISHES.filter((d) => d.usual) : DISHES.filter((d) => !d.season);
  return pool
    .map((d) => ({ title: d.title, minutes: d.minutes, category: d.category, ...matchStock(d.needs, real) }))
    .filter((d) => real.length === 0 || d.uses.length > 0)
    .sort((a, b) => b.uses.length - a.uses.length || a.needs.length - b.needs.length || a.minutes - b.minutes)
    .slice(0, count);
}

const list = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`);

/** "nutzt: Hack, Paprika, Reis · auf die Liste: Sahne" */
export function usesLine(uses: string[], needs: string[], max = 3): string {
  return [uses.length ? `nutzt: ${uses.slice(0, max).join(", ")}` : "", needs.length && needs.length <= 2 ? `auf die Liste: ${list(needs)}` : ""].filter(Boolean).join(" · ");
}

// --- Fragen im Chat (ohne KI) -------------------------------------------------------

/** "Was kann ich heute kochen?", "Was koche ich heute?", "Hast du eine Idee fürs Abendessen?" */
export function isCookIdeasRequest(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (/\b(mit|aus)\b/.test(t)) return false;
  return /^(was|wat)\s+(kann|könnte|soll|sollen|können|mach|mache|machen)\s+(ich|wir|man)\s+(denn\s+)?(heute|jetzt|heut|gleich|später|zu mittag|zu abend|zum abendessen)?\s*(noch\s+)?(kochen|essen|machen)\b|^was\s+koch(e)?\s+(ich|wir)\b|^hast du\s+(eine\s+|ne\s+)?idee\b.*(essen|kochen|abend|mittag)|^was\s+essen\s+wir\b|^was\s+gibt['’]?s\s+(denn\s+)?(heute|jetzt|gleich)\b/.test(t);
}

/** "Was mach ich mit Hack und Paprika?" → ["Hack", "Paprika"] (sonst null) */
export function ingredientsFromQuestion(text: string): string[] | null {
  const m = text
    .trim()
    .replace(/[?!.]+$/, "")
    .match(/^(?:und\s+)?(?:was|wie)\s+(?:kann|könnte|soll|mach|mache|machen|koche|koch)\s+(?:ich|wir|man)\s+(?:denn\s+)?(?:heute\s+|jetzt\s+)?(?:mit|aus)\s+(.+?)(?:\s+(?:machen|kochen|zaubern|anfangen))?$/i);
  if (!m) return null;
  const items = m[1]
    .split(/,|\bund\b|\bsowie\b|\boder\b/i)
    .map((s) => {
      // Füllwörter vorn entfernen ("dem Rest Reis" → "Reis")
      let t = s.trim();
      for (let prev = ""; prev !== t; ) {
        prev = t;
        t = t.replace(/^(dem|der|den|des|meinem|meiner|meinen|unserem|unserer|unseren|etwas|noch|ein|einer|einem|bisschen|resten von|rest)\s+/i, "").trim();
      }
      return t;
    })
    .filter((s) => s && s.length > 1 && !/^(dem|was|da ist|übrig|reste[n]?)$/i.test(s))
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  return items.length ? items : null;
}
