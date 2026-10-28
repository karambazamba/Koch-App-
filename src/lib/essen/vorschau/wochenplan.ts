// Vorschau in Mias Wochenplan-Vorschlag (A-038): „Nehmen“ wählt die Zeile –
// und hat Mia das Rezept eben geschrieben, hängt es am Vorschlag (neues
// KI-Rezept), damit „Passt“ es mit einträgt und nicht neu fragt. Rein.

import { PLAN_RECIPE_PREFIX, type ChangeOp, type NewRecipe } from "@/lib/begleitung/ops";

/** Gericht als Text → dasselbe Gericht mit dem eben geschriebenen Rezept */
export function rezeptInVorschlag(ops: ChangeOp[], opId: string, neu: NewRecipe): ChangeOp[] {
  const ref = `${PLAN_RECIPE_PREFIX}vorschau-${opId}`;
  return ops.flatMap((op): ChangeOp[] =>
    op.id === opId && op.type === "set_meal" && op.dish.kind === "text"
      ? [
          { id: `${opId}-rezept`, type: "add_recipe", recipe: { ...neu, ref } },
          { ...op, dish: { kind: "new_recipe", ref, title: op.dish.title, category: op.dish.category ?? neu.category } },
        ]
      : [op],
  );
}
