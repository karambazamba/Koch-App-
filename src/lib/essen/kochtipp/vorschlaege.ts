// Kochidee: Vorschlags-Knöpfe unter den Ideen („Oder worauf hast du Lust?“)
// statt einer zweiten Mia in der Karte. Drei bis vier Sätze passend zu
// Vorrat („Im Haus“), Jahreszeit und Tageszeit – ein Tipp schickt den Satz
// als eigene Nachricht ab. Dazu Mias kurzer Satz über den drei neuen Karten
// („Kürbis geht immer im Herbst:“). Rein, damit es testbar ist.

import { realStock } from "@/lib/essen/dishIdeas";
import { mergeTalk, parseIdeaTalk, type IdeaTalk } from "@/lib/essen/kochtipp/idee";
import type { CookCard } from "@/lib/essen/kochtipp/pick";
import { sameIngredient, type PantryItem } from "@/lib/vorrat/pantry";

export type Season = "Frühling" | "Sommer" | "Herbst" | "Winter";

/** Monat 0–11 → Jahreszeit (März–Mai Frühling, Juni–August Sommer …) */
export const seasonOf = (month: number): Season => (month >= 2 && month <= 4 ? "Frühling" : month >= 5 && month <= 7 ? "Sommer" : month >= 8 && month <= 10 ? "Herbst" : "Winter");

/** Was gerade Saison hat – das erste, wozu es Gerichte gibt, wird vorgeschlagen */
const SEASONAL: Record<Season, string[]> = {
  Frühling: ["Spargel", "Bärlauch", "Spinat"],
  Sommer: ["Zucchini", "Tomaten", "Paprika"],
  Herbst: ["Kürbis", "Pilze", "Champignons"],
  Winter: ["Grünkohl", "Rotkohl", "Linsen"],
};

/** Ohne passenden Vorrat: der Satz aus dem Clip */
const FALLBACK_HAVE = "Ich hab Hähnchen gekauft";

export type SuggestInput = {
  hour: number;
  /** 0–11 */
  month: number;
  /** Vorrat „Im Haus“; `soon` (bald verbrauchen) kommt zuerst */
  stock: PantryItem[];
  soon?: string[];
  /** Bisher Erzähltes – ein Vorschlag muss etwas Neues bringen */
  talk: IdeaTalk;
  /** Gibt es zu diesem (schon zusammengeführten) Wunsch drei Gerichte? */
  fits?: (talk: IdeaTalk) => boolean;
  count?: number;
};

/**
 * 3–4 Vorschläge: Vorrat („Was mit Hähnchen“, ohne passenden Vorrat
 * „Ich hab Hähnchen gekauft“), Jahreszeit („Was mit Kürbis“), Tageszeit
 * (mittags/abends „Was Schnelles“, sonst je Jahreszeit deftig bzw. leicht)
 * und „Ohne Fleisch“ – nur, was etwas Neues bringt und Gerichte findet.
 */
export function ideaSuggestions({ hour, month, stock, soon = [], talk, fits = () => true, count = 4 }: SuggestInput): string[] {
  const season = seasonOf(month);
  const newest = [...realStock(stock)].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).map((p) => p.name);
  const quickTime = (hour >= 11 && hour < 14) || hour >= 17 || hour < 5;
  const moodLine = season === "Herbst" || season === "Winter" ? "Was Deftiges" : "Was Leichtes";
  const pool: string[][] = [
    [...[...soon, ...newest].map((n) => `Was mit ${n}`), FALLBACK_HAVE],
    SEASONAL[season].map((n) => `Was mit ${n}`),
    quickTime ? ["Was Schnelles", moodLine] : [moodLine, "Was Schnelles"],
    ["Ohne Fleisch"],
    ["Was Cremiges"],
  ];
  const key = (t: IdeaTalk) => JSON.stringify(t);
  const out: string[] = [];
  const said: string[] = [];
  for (const group of pool) {
    for (const s of group) {
      if (out.length >= count) return out;
      const parsed = parseIdeaTalk(s);
      const merged = mergeTalk(talk, parsed);
      const thing = [...parsed.have, ...parsed.want][0];
      // Nichts Neues, schon ein Vorschlag mit derselben Zutat, oder keine Gerichte dazu
      if (key(merged) === key(talk) || (thing && said.some((x) => sameIngredient(x, thing))) || !fits(merged)) continue;
      out.push(s);
      if (thing) said.push(thing);
      break;
    }
  }
  return out;
}

const MOOD_LINE: Record<IdeaTalk["moods"][number], string> = { cremig: "Schön cremig:", leicht: "Schön leicht:", deftig: "Schön deftig:", scharf: "Mit ordentlich Wumms:" };

/**
 * Mias kurzer Satz über den drei neuen Karten – zum eben Gesagten:
 * „Kürbis geht immer im Herbst:“, „Geht fix:“, „Ganz ohne Fleisch:“;
 * wer erzählt, was da ist, bekommt „Dann mach doch …!“.
 */
export function ideaReply(said: IdeaTalk, first: CookCard | undefined, month: number): string {
  if (!first) return "Dafür hab ich grad nichts Passendes. Was anderes?";
  if (said.have.length) return `Dann mach doch ${first.title}!`;
  const want = said.want[0];
  if (want) {
    const season = seasonOf(month);
    return SEASONAL[season].some((s) => sameIngredient(s, want)) ? `${want} geht immer im ${season}:` : `Mit ${want} geht das hier:`;
  }
  if (said.category === "vegetarisch") return "Ganz ohne Fleisch:";
  if (said.category === "fisch") return "Mit Fisch geht das hier:";
  if (said.quick) return "Geht fix:";
  if (said.moods.length) return MOOD_LINE[said.moods[0]];
  return `Dann mach doch ${first.title}!`;
}
