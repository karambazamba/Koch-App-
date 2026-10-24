// Mias Karte zu einem Rezept-Link: Zutaten für die eigene Haushaltsgröße,
// „auf die Liste: …“ und grün „im Haus: …“ (ehrlich: nur Sicheres grün,
// Vermutetes extra). Was schon auf der Einkaufsliste steht, kommt nicht
// nochmal drauf. Grundsachen (Salz, Öl …) zählen nie. Rein.

import { AT_HOME, matchStock } from "@/lib/essen/dishIdeas";
import { sameIngredient, type PantryItem } from "@/lib/vorrat/pantry";
import { parseZutat, umrechnen, type LinkRezept, type LinkZutat } from "@/lib/essen/rezeptLink/lesen";

export type LinkKarte = {
  zutaten: LinkZutat[];
  /** Kommt auf die Liste (mit umgerechneter Menge) */
  toList: LinkZutat[];
  /** Sicher im Haus (grün) */
  imHaus: string[];
  /** Nur vermutlich im Haus */
  vermutlich: string[];
  /** Steht schon auf der Einkaufsliste */
  schonDrauf: string[];
};

export function linkKarte(rezept: LinkRezept, persons: number, stock: PantryItem[], listNames: string[], today: string): LinkKarte {
  const zutaten = rezept.ingredients.map((l) => umrechnen(parseZutat(l), rezept.servings, persons));
  const echte = zutaten.filter((z) => !AT_HOME.test(z.name));
  const m = matchStock(
    echte.map((z) => z.name),
    stock,
    today,
  );
  const schonDrauf = echte.filter((z) => listNames.some((n) => sameIngredient(n, z.name))).map((z) => z.name);
  const toList = echte.filter((z) => m.needs.includes(z.name) && !schonDrauf.includes(z.name));
  return { zutaten, toList, imHaus: m.uses.filter((u) => !m.unsure.includes(u)), vermutlich: m.unsure, schonDrauf };
}
