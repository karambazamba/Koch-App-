// Gemeinsame Gerichte-Liste für alle Ideen ohne KI ("Was gibt's heute?",
// Spontan kochen, Testmodus) und der Abgleich mit dem, was da ist. Rein, damit
// Server (Testmodus) und App gleich rechnen.

import type { RecipeCategory } from "@/lib/essen/cookbook";
import { DISHES } from "@/lib/essen/dishList";
import { sameIngredient, type PantryItem } from "@/lib/vorrat/pantry";
import { isSoon, isUnsure } from "@/lib/vorrat/haltbar";

export type { Season } from "@/lib/essen/dishList";
export { DISHES } from "@/lib/essen/dishList";

/** Hat man meistens im Haus – zählt nicht als Einkauf und nicht als "nutzt" */
export const AT_HOME = /^(salz|pfeffer|öl|olivenöl|rapsöl|wasser|zucker|mehl|essig|butter|brühe|gemüsebrühe|gewürze?|zwiebeln?|knoblauch|knoblauchzehen?|tomatenmark|senf|ketchup|kräuter|petersilie|schnittlauch|paprikapulver|currypulver|curry|muskat|oregano|basilikum|thymian|zimt|backpulver|honig|sojasoße|sojasauce|lorbeer\w*)$/i;

/**
 * Was davon da ist (`uses`, Namen wie im Haus), was auf die Liste muss
 * (`needs`) und – mit `today` – was nur noch vermutlich da ist (`unsure`:
 * zweite Hälfte seiner Zeit, siehe vorrat/haltbar.ts).
 */
export function matchStock(names: string[], stock: PantryItem[], today?: string): { uses: string[]; needs: string[]; unsure: string[] } {
  const needed = names.map((n) => n.trim()).filter((n) => n && !AT_HOME.test(n));
  const used = stock.filter((p) => needed.some((n) => sameIngredient(n, p.name)));
  return {
    uses: [...new Set(used.map((p) => p.name))],
    needs: needed.filter((n) => !stock.some((p) => sameIngredient(n, p.name))),
    unsure: today ? [...new Set(used.filter((p) => !/^[bs]:/.test(p.id) && isUnsure(p, today)).map((p) => p.name))] : [],
  };
}

/** Ehrliche Zutaten-Zeile: „alles im Haus“ (sicher), „vermutlich im Haus: …“ oder „auf die Liste: …“ */
export function stockLine(m: { needs: string[]; unsure?: string[] }, max = 2): { text: string; tone: "gut" | "grau" | "liste" } {
  const list = (xs: string[]) => `${xs.slice(0, max).join(", ")}${xs.length > max ? " …" : ""}`;
  if (m.needs.length) return { text: `auf die Liste: ${list(m.needs)}`, tone: "liste" };
  if (m.unsure?.length) return { text: `vermutlich im Haus: ${list(m.unsure)}`, tone: "grau" };
  return { text: "alles im Haus", tone: "gut" };
}

/** Echte Zutaten im Vorrat (ohne Salz, Öl & Co.) */
export const realStock = (stock: PantryItem[]) => stock.filter((p) => !AT_HOME.test(p.name.trim()));

/** Vorrat leer oder fast leer (weniger als 3 echte Zutaten) */
export const stockNearlyEmpty = (stock: PantryItem[]) => realStock(stock).length < 3;

/** Hinweis bei (fast) leerem Vorrat */
export const EMPTY_STOCK_HINT = "Sag mir, was da ist, dann passe ich die Ideen an.";

/** „Bald aufbrauchen“: Frisches im letzten Drittel seiner Zeit (vorrat/haltbar.ts) */
export function soonToUse(stock: PantryItem[], today: string): PantryItem[] {
  return stock.filter((p) => p.addedAt && !p.usedAt && !p.id.startsWith("b:") && !p.id.startsWith("s:") && isSoon(p, today));
}

/** Einfacher Vorrats-Eintrag für Gekauftes ("b:") bzw. eben Gesagtes ("s:") */
export function stockItem(name: string, kind: "b" | "s", today: string): PantryItem {
  return { id: `${kind}:${name}`, name, addedAt: today, place: "schrank" };
}

/** Vorrat + Gekauftes + Gesagtes, ohne doppelte Zutaten */
export function mergeStock(pantry: PantryItem[], extra: PantryItem[]): PantryItem[] {
  return [...pantry, ...extra.filter((e) => !pantry.some((p) => sameIngredient(p.name, e.name)))];
}

/** Stabile Kennung des Bestands – ändert sie sich, sind alte Ideen hinfällig */
export function stockKey(stock: PantryItem[]): string {
  return stock
    .map((p) => p.name.trim().toLowerCase())
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
  // Auch Mias eigene Fragen („Was könnten wir am Freitag essen?“, „Was gibt’s morgen?“) – nie „nicht verstanden“
  const day = "(?:heute|heut|jetzt|gleich|später|morgen|übermorgen|zu mittag|zu abend|zum abendessen|am wochenende|am [a-zäöüß]+tag|am [a-zäöüß]+woch|diese woche)";
  return new RegExp(`^(was|wat)\\s+(kann|könnte|könnten|soll|sollen|können|mach|mache|machen)\\s+(ich|wir|man)\\s+(denn\\s+)?(${day}\\s+)?(noch\\s+)?(kochen|essen|machen)(?![a-zäöüß])`).test(t) || /^was\s+koch(e)?\s+(ich|wir)\b|^hast du\s+(eine\s+|ne\s+)?idee\b.*(essen|kochen|abend|mittag)|^was\s+essen\s+wir\b/.test(t) || new RegExp(`^was\\s+gibt['’]?s\\s+(denn\\s+)?${day}(?![a-zäöüß])`).test(t);
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
    .filter((s) => s && s.length > 1 && !/^(dem|was|(was )?(noch )?da ist|übrig|reste[n]?)$/i.test(s))
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  return items.length ? items : null;
}
