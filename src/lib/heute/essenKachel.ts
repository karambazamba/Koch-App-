// Essen-Kachel (Auftrag „Essen-Kachel – immer Bild, gezeigtes Gericht immer
// wählbar“), rein: Was zeigt die Kachel? Jedes gezeigte Gericht (heute
// geplant, morgen geplant, Vorschlag) ist eine Bild-Kachel; „Ideen ansehen“
// gibt es nur, wenn gar kein Gericht gezeigt wird. Ein Vorschlag lässt sich
// nehmen – tagsüber für heute, nach dem Essen für morgen.

import type { RecipeCategory } from "@/lib/essen/cookbook";
import { currentStep } from "@/lib/essen/kochSession";

export type FoodView =
  /** Geplantes Gericht: „Essen · 18:30“ bzw. „Morgen · Mo“, kein Zusatz */
  | { kind: "geplant"; title: string; when: "heute" | "morgen" }
  /** Nur Vorschlag (⇄ bzw. Idee): leise „Vorschlag“ unter dem Namen */
  | { kind: "vorschlag"; title: string; takeFor: "heute" | "morgen" }
  /** Kein Gericht: „Noch frei“ (bzw. „Kein Kochtag“), „Ideen ansehen“ nur mit Ideen */
  | { kind: "frei"; title: string; ideen: boolean };

export function foodTileView(o: {
  /** Nach dem Abendessen: die Kachel zeigt morgen */
  over: boolean;
  /** Heute geplantes Gericht */
  today: string | null;
  /** Morgen geplantes Gericht */
  tomorrow: string | null;
  /** Mit ⇄ gewählte Idee */
  idea: string | null;
  /** Kein Kochtag / Pause (Text statt Gericht) */
  away: string | null;
  /** Wie viele Ideen es gibt */
  ideas: number;
}): FoodView {
  if (o.idea) return { kind: "vorschlag", title: o.idea, takeFor: o.over ? "morgen" : "heute" };
  const planned = o.over ? o.tomorrow : o.today;
  if (planned) return { kind: "geplant", title: planned, when: o.over ? "morgen" : "heute" };
  return { kind: "frei", title: o.away ?? "Noch frei", ideen: o.ideas > 0 };
}

/** Knopf im Gericht-Fenster */
export const takeLabel = (takeFor: "heute" | "morgen") => (takeFor === "morgen" ? "Für morgen nehmen" : "Für heute nehmen");

/**
 * ⇄ „Andere Idee“: die nächste Idee, die nicht das gerade Gezeigte ist – nie
 * zweimal dieselbe hintereinander. `null` = keine andere da.
 */
export function naechsteIdee(titles: string[], alt: number | null, shown: string | null): number | null {
  const now = shown?.trim().toLowerCase() ?? "";
  for (let step = 1; step <= titles.length; step++) {
    const i = ((alt ?? -1) + step) % titles.length;
    if (titles[i].trim().toLowerCase() !== now) return i;
  }
  return null;
}

/** Kocht gerade (eigene Kachel `CookingTile`): dasselbe Bild wie das geplante Gericht */
type KochView = { kind: "kocht"; title: string };

/**
 * Bild der Essen-Kachel – für JEDEN Zustand eins (Auftrag „Sofort-Kachel“):
 * gezeigtes Gericht = Bild des Gerichts (mit Zutaten/Art, wenn bekannt),
 * „Noch frei“ und „Kein Kochtag“ = gezeichneter leerer Teller. Nie ohne Bild.
 */
export type KachelBild = { title: string; ingredients?: string[]; category?: RecipeCategory | null; leer?: true };

export function kachelBild(view: FoodView | KochView, dish?: { ingredients?: string[]; category?: RecipeCategory | null }): KachelBild {
  if (view.kind === "frei") return { title: view.title, leer: true };
  return { title: view.title, ingredients: dish?.ingredients, category: dish?.category ?? null };
}

/**
 * Kopfzeile der Essen-Kachel, immer einzeilig: „Essen · 18:30“. Personen nur
 * ab Größe M und dann kurz („für 4“), bei S nie.
 */
export function essenKopf(base: string, persons: number | null, size: "S" | "M" | "L"): string {
  return size !== "S" && persons ? `${base} · für ${persons}` : base;
}

/** Kochmodus-Schritt als kleine Zeile – nur, wenn schon Schritte abgehakt sind und noch einer kommt */
export function kochSchrittZeile(total: number, done: number[]): string | null {
  const cur = done.length ? currentStep(total, done) : null;
  return cur === null ? null : `Schritt ${cur + 1} von ${total}`;
}
