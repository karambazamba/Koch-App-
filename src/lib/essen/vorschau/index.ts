// Vorschläge erst anschauen, dann nehmen (A-038, Tafel 122): EIN Vorschlag-Typ
// für alle Auswahl-Stellen (Kochidee, „Was koche ich?“, Spontan kochen,
// Wochenplan-Vorschläge, Wochenkarte), das Rezept dazu (eigenes, eingebautes
// oder von Mia nachgeladen) und „Nehmen“ – gleich für Karte und Vorschau.
// Rein, damit es testbar ist; das Fenster steht in `components/essen/vorschau`.

import type { Recipe, RecipeCategory } from "@/lib/essen/cookbook";
import { findRecipe } from "@/lib/essen/baking";
import { rezeptIdFuer } from "@/lib/essen/kochen";
import { geladenFuer, type GeladenesRezept } from "@/lib/essen/vorschau/laden";

/** Ein Gericht zur Auswahl, wie es überall angetippt werden kann */
export type Vorschlag = {
  title: string;
  category: RecipeCategory | null;
  minutes: number | null;
  recipeId?: string;
  /** Was auf die Liste müsste (leer = alles im Haus) */
  needs?: string[];
  /** Nur vermutlich im Haus */
  unsure?: string[];
  /** Hauptzutaten fürs Bild */
  ingredients?: string[];
  /** Für so viele umrechnen (sonst der Haushalt) */
  persons?: number | null;
  /** Kleine Statuszeile über dem Namen, wie auf der Essen-Kachel („Kochidee · Morgen Do“, Tafel 134) */
  kopf?: string;
  /** Schon fertig mitgeliefert (z. B. neues KI-Rezept in Mias Vorschlag) */
  rezept?: Recipe;
};

/** Das Rezept, das es schon gibt: mitgeliefert, eigenes/eingebautes über die ID oder den Titel */
export function bekanntesRezept(v: Vorschlag, recipes: Record<string, Recipe>): Recipe | undefined {
  if (v.rezept) return v.rezept;
  const id = v.recipeId ?? rezeptIdFuer(v.title);
  return id ? findRecipe(recipes, id) : undefined;
}

/** Was die Vorschau zeigt: das bekannte Rezept, sonst das schon von Mia geschriebene */
export function vorschauRezept(v: Vorschlag, recipes: Record<string, Recipe>): Recipe | undefined {
  return bekanntesRezept(v, recipes) ?? geladenFuer(v.title)?.rezept;
}

/** Ladezustand der Vorschau */
export type LadeStand = "fertig" | "laeuft" | "fehler";
type LadeAktion = "start" | "geschafft" | "fehlgeschlagen";

/** Übergänge: „Mia schreibt das Rezept …“ → Rezept bzw. „Hat grad nicht geklappt. Nochmal?“ → nochmal */
export function ladeReducer(stand: LadeStand, aktion: LadeAktion): LadeStand {
  if (aktion === "start") return "laeuft";
  if (aktion === "geschafft") return "fertig";
  return stand === "laeuft" ? "fehler" : stand;
}

/**
 * „Nehmen“ – auf der Karte und in der Vorschau derselbe Weg: das Rezept, das
 * Mia eben geschrieben hat, kommt mit (ins Kochbuch, damit der Plan darauf
 * zeigt), dann trägt die Stelle wie immer ein. Gibt es das Rezept schon, geht
 * `nehmen` unverändert ohne ID raus.
 */
export function nehmenMitRezept(
  v: Vorschlag,
  recipes: Record<string, Recipe>,
  nehmen: (rezeptId?: string, geladen?: GeladenesRezept) => void,
  speichern: ((r: Recipe) => void) | null,
): void {
  const geladen = bekanntesRezept(v, recipes) ? undefined : geladenFuer(v.title);
  if (geladen && speichern && !recipes[geladen.rezept.id]) speichern(geladen.rezept);
  nehmen(geladen?.rezept.id, geladen);
}

/** „Antippen zum Reinschauen.“ – nur unter der ersten Karte, nur solange noch nie gezeigt */
export const zeigeHinweis = (schonGezeigt: boolean | undefined, index: number) => schonGezeigt === false && index === 0;

export const HINWEIS_TEXT = "Antippen zum Reinschauen.";
