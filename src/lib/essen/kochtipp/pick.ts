// Kochtipp – spontan mit Mia: die freie Antwort verstehen („Ich hab noch
// Hähnchen, Reis und Paprika“, „was mit Fisch“, „was Schnelles für 4“) und
// EIN passendes Gericht wählen. Quelle wie bei „Was gibt’s heute?“: eigene
// Rezepte + die Gerichte-Liste (`DISHES`). Rein, damit es testbar ist.

import type { Recipe, RecipeCategory } from "@/lib/essen/cookbook";
import { AT_HOME, DISHES, realStock } from "@/lib/essen/dishIdeas";
import { germanNumber } from "@/lib/essen/leftovers/ruleParser";
import { sameIngredient, type PantryItem } from "@/lib/vorrat/pantry";

/** Woher die Zutaten kommen: Vorrat, Reste zuerst, oder neu einkaufen */
export type CookSource = "vorrat" | "reste" | "einkauf";
type CookCategory = Exclude<RecipeCategory, "cheatday">;

export type CookWish = {
  source: CookSource | null;
  /** Eben genannte Zutaten – zählen als vorhanden */
  have: string[];
  without: string[];
  category: CookCategory | null;
  quick: boolean;
  persons: number | null;
};


const SOURCE_WORDS: { source: CookSource; re: RegExp }[] = [
  { source: "reste", re: /reste|übrig|verwert|weg\s*muss|bald\s+schlecht/i },
  { source: "einkauf", re: /neu\s+einkauf|einkaufen|kaufen\s+(?:wir\s+)?(?:neu|was)|egal,?\s+was\s+fehlt/i },
  { source: "vorrat", re: /vorrat|was\s+(?:noch\s+)?da\s+ist|kühlschrank|im\s+haus/i },
];

const FILLER = /^(?:noch|auch|etwas|bisschen|ein|eine|einen|einem|einer|der|die|das|den|dem|ne|n|paar|ein\s+paar|reste?n?(?:\s+von)?|rest)\s+/i;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function splitItems(list: string): string[] {
  return list
    .replace(/[.!?]+$/, "")
    .split(/,|\s+und\s+|\s+sowie\s+|\s+oder\s+/i)
    .map((s) => {
      let t = s.trim();
      for (let prev = ""; prev !== t; ) {
        prev = t;
        t = t.replace(FILLER, "").trim();
      }
      return t.replace(/\s+(?:da|übrig|im\s+kühlschrank|zu\s+hause)$/i, "").trim();
    })
    .filter((s) => s.length > 1 && !/^(?:was|nichts|alles|hunger|lust)$/i.test(s))
    .map(cap);
}

/** Freie Antwort verstehen – leere Felder, wenn nichts erkannt wurde */
export function parseCookWish(text: string): CookWish {
  const t = text.trim();
  const source = SOURCE_WORDS.find((s) => s.re.test(t))?.source ?? null;
  const category: CookCategory | null = /vegetarisch|vegan|ohne\s+fleisch|veggie/i.test(t)
    ? "vegetarisch"
    : /(?:was|etwas|irgendwas)\s+mit\s+fisch|fischig|lust\s+auf\s+fisch/i.test(t)
      ? "fisch"
      : /(?:was|etwas|irgendwas)\s+mit\s+fleisch|lust\s+auf\s+fleisch/i.test(t)
        ? "fleisch"
        : null;
  const quick = /schnell|fix(?![a-zäöüß])|zügig|nicht\s+lang/i.test(t);
  const num = t.match(/für\s+(\d{1,2}|[a-zäöü]+)(?:\s+(?:personen|leute|leuten))?(?![a-zäöüß])/i);
  const n = num ? (/^\d+$/.test(num[1]) ? Number(num[1]) : germanNumber(num[1])) : null;
  const persons = n && n >= 1 && n <= 20 ? n : null;
  const without = [...t.matchAll(/(?:ohne|kein(?:e|en)?)\s+([a-zäöüß]+)/gi)].map((m) => cap(m[1])).filter((w) => !/^fleisch$/i.test(w));
  const listed = t.match(/(?:hab(?:e|en)?|habt|gibt\s+es|gibt['’]s|ist|sind)\s+(?:wir\s+|ich\s+)?(?:noch\s+)?(.+?)(?:\s+da)?$/i);
  const plain = !listed && !source && !category && /^[\wäöüß\s,-]+$/i.test(t) && /,|\s+und\s+/i.test(t) ? t : null;
  const have = (listed ? splitItems(listed[1].replace(/\s+für\s+\S+.*$/i, "")) : plain ? splitItems(plain) : []).filter((h) => !without.some((w) => sameIngredient(w, h)));
  return { source, have, without, category, quick, persons };
}

/** Hat die Antwort etwas, womit der Kochtipp weiterkommt? */
export const understood = (w: CookWish) => Boolean(w.source || w.have.length || w.category || w.quick || w.persons || w.without.length);

// --- Gericht wählen ----------------------------------------------------------------

export type CookBadge = "alles" | "fast" | "reste" | "einkauf";

export type CookCard = {
  title: string;
  minutes: number;
  category: CookCategory;
  recipeId?: string;
  /** Hauptzutaten (für das Bild) */
  ingredients: string[];
  /** Genutzt (Namen wie gesagt bzw. im Vorrat) */
  uses: string[];
  /** Für die Einkaufsliste */
  needs: string[];
  badge: CookBadge;
};

export const BADGE_LABEL: Record<CookBadge, string> = {
  alles: "alles im Haus",
  fast: "fast alles im Haus",
  reste: "Resteessen",
  einkauf: "Einkauf nötig",
};

type Candidate = { title: string; minutes: number; category: CookCategory; needs: string[]; recipeId?: string };

/** Eigene Rezepte (Kochen) + Gerichte-Liste, ohne doppelte Titel */
export function cookCandidates(recipes: Recipe[]): Candidate[] {
  const own = recipes
    .filter((r) => r.kind !== "backen" && r.ingredients.length)
    .map((r) => ({ title: r.title, minutes: r.prepMinutes || 30, category: (r.category === "cheatday" ? "vegetarisch" : r.category) as CookCategory, needs: r.ingredients.map((i) => i.name), recipeId: r.id }));
  return [...own, ...DISHES.filter((d) => !own.some((o) => o.title.toLowerCase() === d.title.toLowerCase())).map((d) => ({ title: d.title, minutes: d.minutes, category: d.category as CookCategory, needs: d.needs }))];
}

export type PickInput = {
  candidates: Candidate[];
  stock: PantryItem[];
  wish: CookWish;
  /** Bald verbrauchen (Reste, Kühlschrank seit Tagen) */
  soon: string[];
  /** Nicht nochmal: zuletzt gezeigte Gerichte und die der letzten 3 Tage */
  exclude: string[];
  /** Allergien und „mag nicht“ (strikt) */
  avoid: string[];
};

const main = (needs: string[]) => needs.map((n) => n.trim()).filter((n) => n && !AT_HOME.test(n));

/** EIN Gericht – oder null („Dafür habe ich gerade nichts“) */
export function pickCookDish({ candidates, stock, wish, soon, exclude, avoid }: PickInput): CookCard | null {
  const source = wish.source ?? (wish.have.length ? "vorrat" : null);
  // Neu einkaufen: nur das eben Gesagte zählt als da; sonst Vorrat + Gesagtes
  const there = [...(source === "einkauf" ? [] : realStock(stock).map((p) => p.name)), ...wish.have];
  const has = (n: string) => there.some((h) => sameIngredient(h, n));
  const banned = [...wish.without, ...avoid];
  const scored = candidates
    .filter((c) => !exclude.some((e) => e.toLowerCase() === c.title.toLowerCase()))
    .filter((c) => !wish.category || c.category === wish.category)
    .filter((c) => !wish.quick || c.minutes <= 20)
    .filter((c) => !c.needs.some((n) => banned.some((b) => sameIngredient(b, n))))
    .map((c) => {
      const needs = main(c.needs);
      const uses = needs.filter(has);
      const missing = needs.filter((n) => !has(n));
      const fromSoon = needs.filter((n) => soon.some((s) => sameIngredient(s, n))).length;
      const fromSaid = needs.filter((n) => wish.have.some((h) => sameIngredient(h, n))).length;
      return { c, needs, uses, missing, fromSoon, fromSaid };
    })
    .filter((x) => x.needs.length > 0)
    // Vorrat: höchstens eine Zutat auf die Liste; Reste: nutzt etwas Bald-Verbrauchtes
    .filter((x) => (source === "vorrat" ? x.missing.length <= 1 && x.uses.length > 0 : true))
    .filter((x) => (source === "reste" ? x.fromSoon + x.fromSaid > 0 && x.missing.length <= 2 : true))
    .filter((x) => (wish.have.length ? x.fromSaid > 0 : true))
    .map((x) => ({ ...x, score: x.fromSaid * 20 + x.fromSoon * (source === "reste" ? 15 : 3) + x.uses.length * 6 - x.missing.length * (source === "einkauf" ? 0 : 5) - x.c.minutes / 15 }))
    .sort((a, b) => b.score - a.score || a.c.minutes - b.c.minutes);
  const best = scored[0];
  if (!best) return null;
  const badge: CookBadge = best.missing.length === 0 ? (source === "reste" && best.fromSoon > 0 ? "reste" : "alles") : best.missing.length === 1 && source !== "einkauf" ? "fast" : "einkauf";
  // Namen wie gesagt bzw. wie im Vorrat zeigen („nimmt dein Hähnchen“)
  const shown = best.uses.map((n) => there.find((h) => sameIngredient(h, n)) ?? n);
  return {
    title: best.c.title,
    minutes: best.c.minutes,
    category: best.c.category,
    ...(best.c.recipeId ? { recipeId: best.c.recipeId } : {}),
    ingredients: best.needs,
    uses: [...new Set(shown)],
    needs: best.missing,
    badge,
  };
}

/** Menge für eine andere Personenzahl (auf sinnvolle Schritte gerundet) */
export function scaleAmount(amount: number | null, servings: number, persons: number): number | null {
  if (amount === null || !servings || !persons) return amount;
  const v = (amount * persons) / servings;
  if (v >= 100) return Math.round(v / 10) * 10;
  if (v >= 10) return Math.round(v);
  return Math.round(v * 2) / 2 || 0.5;
}

const list = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`);

/** „nimmt dein Hähnchen, Reis und Paprika“ */
export const usesText = (uses: string[]) => (uses.length ? `nimmt dein${uses.length === 1 ? "" : "e"} ${list(uses.slice(0, 3))}` : "");
