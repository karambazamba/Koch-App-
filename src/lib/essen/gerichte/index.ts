// Die 150 Alltagsgerichte zusammen (Reihenfolge: Gruppen wie unten) und ihre
// eingebauten Rezepte für die Küche („k:<slug>“, siehe kochen/index.ts).

import { dishSlug } from "@/lib/essen/dishSlug";
import type { BuiltinCookRecipe } from "@/lib/essen/kochen/types";
import type { Gericht, GerichtEintrag, Gruppe } from "@/lib/essen/gerichte/types";
import { DEUTSCH } from "@/lib/essen/gerichte/deutsch";
import { NUDELN } from "@/lib/essen/gerichte/nudeln";
import { ASIATISCH } from "@/lib/essen/gerichte/asiatisch";
import { VEGETARISCH } from "@/lib/essen/gerichte/vegetarisch";
import { FISCH } from "@/lib/essen/gerichte/fisch";
import { FLEISCH } from "@/lib/essen/gerichte/fleisch";
import { SUPPEN } from "@/lib/essen/gerichte/suppen";
import { INTERNATIONAL } from "@/lib/essen/gerichte/international";
import { SUESS } from "@/lib/essen/gerichte/suess";

const GRUPPEN: Record<Gruppe, GerichtEintrag[]> = {
  vegetarisch: VEGETARISCH,
  deutsch: DEUTSCH,
  nudeln: NUDELN,
  asiatisch: ASIATISCH,
  fisch: FISCH,
  fleisch: FLEISCH,
  suppen: SUPPEN,
  international: INTERNATIONAL,
  suess: SUESS,
};

/** Alle Gerichte mit ihrer Gruppe */
export const GERICHTE: Gericht[] = (Object.entries(GRUPPEN) as [Gruppe, GerichtEintrag[]][]).flatMap(([gruppe, list]) => list.map((g) => ({ ...g, gruppe })));

/** einfach: bis 25 Min mit wenigen Zutaten · aufwendig: ab 50 Min · sonst normal */
const aufwandFor = (g: GerichtEintrag, zutaten: number): BuiltinCookRecipe["aufwand"] => (g.minutes >= 50 ? "aufwendig" : g.minutes <= 25 && zutaten <= 6 ? "einfach" : "normal");

/** Rezepte der Gerichte, die noch keins in kochen/data*.ts haben */
export const GERICHT_REZEPTE: BuiltinCookRecipe[] = GERICHTE.filter((g) => g.zutaten && g.schritte).map((g) => ({
  id: dishSlug(g.title),
  title: g.title,
  minutes: g.minutes,
  category: g.category,
  aufwand: aufwandFor(g, g.zutaten!.length),
  art: g.besonders ? "besonders" : "klassisch",
  ingredients: g.zutaten!,
  steps: g.schritte!,
}));
