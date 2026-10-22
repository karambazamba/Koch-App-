// Basis eines Gerichts (Kartoffeln, Reis, Nudeln …): Der Küchenhelfer fragt
// bei Reste-Ideen und neuen Rezepten kurz danach. Wie oft eine Basis gewählt
// oder gut bewertet wurde, steht im Profil (`bases`) – danach werden die
// Chips sortiert.

import type { Recipe } from "@/lib/essen/cookbook";

export type BaseId = "kartoffeln" | "reis" | "nudeln" | "quinoa" | "brot" | "salat";

export const BASES: { id: BaseId; label: string; words: RegExp }[] = [
  { id: "kartoffeln", label: "Kartoffeln", words: /kartoffel|pommes|gnocchi|rösti|erdäpfel|kroketten/ },
  { id: "reis", label: "Reis", words: /reis|risotto|paella/ },
  {
    id: "nudeln",
    label: "Nudeln",
    words: /nudel|pasta|spaghetti|penne|fusilli|farfalle|lasagne|tagliatelle|makkaroni|maccaroni|spätzle|tortellini|ravioli|gnocchetti/,
  },
  { id: "quinoa", label: "Quinoa/Couscous", words: /quinoa|couscous|bulgur|hirse/ },
  { id: "brot", label: "Brot", words: /brot|baguette|toast|brötchen|ciabatta|wrap|tortilla|fladen|pita/ },
  { id: "salat", label: "Salat", words: /salat/ },
];

export type BaseCounts = Record<BaseId, number>;

export const EMPTY_BASES: BaseCounts = { kartoffeln: 0, reis: 0, nudeln: 0, quinoa: 0, brot: 0, salat: 0 };

export function baseLabel(id: BaseId): string {
  return BASES.find((b) => b.id === id)!.label;
}

/** Bases nach Beliebtheit (bei Gleichstand in der festen Reihenfolge) */
export function sortedBases(counts: BaseCounts): typeof BASES {
  return [...BASES].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0) || BASES.indexOf(a) - BASES.indexOf(b));
}

/** Text → Basis ("lieber Reis", "Couscous") oder null */
export function baseFromText(text: string): BaseId | null {
  const t = text.toLowerCase();
  return BASES.find((b) => b.words.test(t) || t.includes(b.label.toLowerCase()))?.id ?? null;
}

/** Basis eines Rezepts aus Titel und Zutaten (erste passende), sonst null */
export function recipeBase(recipe: Pick<Recipe, "title" | "ingredients">): BaseId | null {
  const texts = [recipe.title, ...recipe.ingredients.map((i) => i.name)].map((t) => t.toLowerCase());
  for (const base of BASES) if (texts.some((t) => base.words.test(t))) return base.id;
  return null;
}

/** Zähler um eins erhöhen */
export function bumpBase(counts: BaseCounts, id: BaseId | null): BaseCounts {
  return id ? { ...counts, [id]: (counts[id] ?? 0) + 1 } : counts;
}

export function migrateBases(raw: unknown): BaseCounts {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = { ...EMPTY_BASES };
  for (const b of BASES) {
    const v = r[b.id];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[b.id] = Math.min(999, Math.round(v));
  }
  return out;
}
