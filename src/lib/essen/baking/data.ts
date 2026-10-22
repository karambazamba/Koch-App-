// Eingebaute Backrezepte der Backstube, nach Gruppen in data/ aufgeteilt und
// hier in fester Reihenfolge zusammengesetzt.

import type { BuiltinBakingRecipe } from "./types";
import { KUCHEN } from "./data/kuchen";
import { KLEINGEBAECK } from "./data/kleingebaeck";
import { BLECH_UND_HEFE } from "./data/blechUndHefe";
import { MEHR_SUESSES } from "./data/mehrSuesses";

export const BAKING_RECIPES: BuiltinBakingRecipe[] = [...KUCHEN, ...KLEINGEBAECK, ...BLECH_UND_HEFE, ...MEHR_SUESSES];
