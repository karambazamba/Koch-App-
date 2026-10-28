// Vorschau (A-038): Rezept für einen Vorschlag nur mit Name/Zeit bei Mia
// nachladen – über den normalen Server-Weg (Zugangscode, Tageslimit, Testmodus).
// Genau einmal je Gericht: läuft es schon, wird gewartet; fertig wird es für
// die Sitzung gemerkt (auch für „Nehmen“). Fehler: einmal still nochmal, dann
// meldet die Vorschau „Hat grad nicht geklappt. Nochmal?“.

import { createAiRecipe, type Recipe } from "@/lib/essen/cookbook";
import type { ChangeOp, NewRecipe } from "@/lib/begleitung/ops";

/** Die Bitte an Mia – nur das Rezept, ohne Tag (Prüfstand-Satz in `pruefstand/saetze.ts`) */
export const vorschauBitte = (title: string) => `Schreib mir ein Rezept für ${title.trim()}. Nur das Rezept, ohne Tag.`;

/** Titel aus der Bitte (Testmodus) */
export function vorschauTitel(text: string): string | null {
  return text.match(/^Schreib mir ein Rezept für (.+)\. Nur das Rezept, ohne Tag\.$/)?.[1]?.trim() || null;
}

export type GeladenesRezept = { neu: NewRecipe; rezept: Recipe };

const schluessel = (title: string) => title.trim().toLowerCase();
const geladen = new Map<string, GeladenesRezept>();
const laufend = new Map<string, Promise<GeladenesRezept | null>>();

/** Schon geschrieben (in dieser Sitzung)? */
export const geladenFuer = (title: string): GeladenesRezept | undefined => geladen.get(schluessel(title));

/** Das neue Rezept aus Mias Antwort (am liebsten mit genau dem Titel) */
export function rezeptAusOps(ops: ChangeOp[], title: string): NewRecipe | null {
  const neue = ops.flatMap((op) => (op.type === "add_recipe" ? [op.recipe] : []));
  return neue.find((r) => schluessel(r.title) === schluessel(title)) ?? neue[0] ?? null;
}

/** Mias Rezept als Kochbuch-Rezept (noch nicht gespeichert; auch zum Anzeigen in Mias Vorschlag) */
export function alsRezept(neu: NewRecipe, title = neu.title): Recipe {
  const { ref, ...draft } = neu;
  return createAiRecipe({ ...draft, title: title.trim() || draft.title, ingredients: draft.ingredients.map((i, n) => ({ ...i, id: `${ref}-${n}` })) }, vorschauBitte(title));
}

/**
 * Rezept zu `title` holen; `frage` schickt die Bitte an Mia und liefert das
 * neue Rezept (oder null). null = auch nach einem stillen zweiten Versuch nichts.
 */
export function ladeRezept(title: string, frage: (bitte: string) => Promise<NewRecipe | null>): Promise<GeladenesRezept | null> {
  const k = schluessel(title);
  const da = geladen.get(k);
  if (da) return Promise.resolve(da);
  const schon = laufend.get(k);
  if (schon) return schon;
  const weg = (async () => {
    for (let versuch = 0; versuch < 2; versuch++) {
      try {
        const neu = await frage(vorschauBitte(title));
        if (neu) {
          const fertig = { neu, rezept: alsRezept(neu, title) };
          geladen.set(k, fertig);
          return fertig;
        }
      } catch {
        // einmal still nochmal
      }
    }
    return null;
  })().finally(() => laufend.delete(k));
  laufend.set(k, weg);
  return weg;
}

/** Gemerktes vergessen @public (Tests) */
export function vergissGeladene() {
  geladen.clear();
  laufend.clear();
}
