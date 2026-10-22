// Eingebaute Kochrezepte („Mehr Ideen“): Familiengerichte für 4 Personen mit
// Aufwand und Art – siehe data*.ts.

import type { RecipeCategory } from "@/lib/essen/cookbook";

/** einfach: bis ca. 25 Min, wenige Zutaten · normal · aufwendig: ab ca. 50 Min oder mit Ofen/Teig */
export type Aufwand = "einfach" | "normal" | "aufwendig";
/** klassisch: Alltag · besonders: exotisch oder kreativ, trotzdem familientauglich */
export type Art = "klassisch" | "besonders";

export type BuiltinCookRecipe = {
  /** Eindeutig, a–z, 0–9, "-" (wird zu "k:<id>") */
  id: string;
  title: string;
  minutes: number;
  category: Exclude<RecipeCategory, "cheatday">;
  aufwand: Aufwand;
  art: Art;
  /** [Menge, Einheit, Zutat] für 4 Personen */
  ingredients: [number | null, string, string][];
  steps: string[];
};
