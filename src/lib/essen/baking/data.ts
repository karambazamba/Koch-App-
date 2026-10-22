// Eingebaute Backrezepte der Backstube, nach Gruppen in data/ aufgeteilt und
// hier in fester Reihenfolge zusammengesetzt.

import type { BuiltinBakingRecipe } from "@/lib/essen/baking/types";
import { KUCHEN } from "@/lib/essen/baking/data/kuchen";
import { KLEINGEBAECK } from "@/lib/essen/baking/data/kleingebaeck";
import { BLECH_UND_HEFE } from "@/lib/essen/baking/data/blechUndHefe";
import { MEHR_SUESSES } from "@/lib/essen/baking/data/mehrSuesses";

export const BAKING_RECIPES: BuiltinBakingRecipe[] = [...KUCHEN, ...KLEINGEBAECK, ...BLECH_UND_HEFE, ...MEHR_SUESSES];
