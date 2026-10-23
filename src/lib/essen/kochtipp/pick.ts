// Kochidee – die Gerichte, aus denen Mia wählt: eigene Rezepte, eingebaute
// Rezepte und die Gerichte-Liste (`DISHES`), ohne doppelte Titel; dazu die
// Karte eines Vorschlags und das Umrechnen auf die Personenzahl. Die Auswahl
// selbst steht in `idee.ts`. Rein, damit es testbar ist.

import type { Recipe, RecipeCategory } from "@/lib/essen/cookbook";
import { DISHES } from "@/lib/essen/dishIdeas";

/** Frühere Kochtipp-Wahl (nur noch im Speicher, `store.ts` liest sie weiter) */
export type CookSource = "vorrat" | "reste" | "einkauf";
type CookCategory = Exclude<RecipeCategory, "cheatday">;

/** Ein Vorschlag: Bild aus Titel + Zutaten, „alles im Haus“ bzw. „auf die Liste: …“ */
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
  badge: "alles" | "fast" | "einkauf";
};

export type CookCandidate = { title: string; minutes: number; category: CookCategory; needs: string[]; recipeId?: string };

/** Eigene Rezepte (Kochen) + Gerichte-Liste, ohne doppelte Titel */
export function cookCandidates(recipes: Recipe[]): CookCandidate[] {
  const seen = new Set<string>();
  const own = recipes
    .filter((r) => r.kind !== "backen" && r.ingredients.length)
    .filter((r) => !seen.has(r.title.toLowerCase()) && Boolean(seen.add(r.title.toLowerCase())))
    .map((r) => ({ title: r.title, minutes: r.prepMinutes || 30, category: (r.category === "cheatday" ? "vegetarisch" : r.category) as CookCategory, needs: r.ingredients.map((i) => i.name), recipeId: r.id }));
  return [...own, ...DISHES.filter((d) => !seen.has(d.title.toLowerCase())).map((d) => ({ title: d.title, minutes: d.minutes, category: d.category as CookCategory, needs: d.needs }))];
}

/** Menge für eine andere Personenzahl (auf sinnvolle Schritte gerundet) */
export function scaleAmount(amount: number | null, servings: number, persons: number): number | null {
  if (amount === null || !servings || !persons) return amount;
  const v = (amount * persons) / servings;
  if (v >= 100) return Math.round(v / 10) * 10;
  if (v >= 10) return Math.round(v);
  return Math.round(v * 2) / 2 || 0.5;
}
