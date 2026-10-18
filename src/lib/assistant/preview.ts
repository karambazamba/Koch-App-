// Küchenhelfer: Vorschau eines Vorschlags – pro Änderung "vorher → nachher",
// gruppiert nach Tag. Gerechnet wird mit denselben Funktionen wie beim
// Übernehmen; abgewählte Änderungen zählen für spätere Zeilen nicht mit.

import type { RecipeCategory } from "../cookbook";
import { personLabel } from "../profile";
import { SECTIONS } from "../shoppingList";
import { formatWeekRange, planForWeek } from "../weekPlan";
import {
  applyOps,
  findSlot,
  selectedOps,
  weekOf,
  PLAN_RECIPE_PREFIX,
  type AssistantData,
  type ChangeOp,
  type NewRecipe,
} from "./ops";

export type PreviewRow = {
  /** Kennung der Änderung (zum An-/Abwählen) */
  opId: string;
  /** Gruppe, z. B. "Do 22.10.", "Vorgaben 19.10. – 25.10.", "Einkaufsliste" */
  group: string;
  order: number;
  label: string;
  before: string | null;
  after: string;
  category?: RecipeCategory | null;
  newRecipe?: NewRecipe;
  /** Mehrere Zeilen (Vorgaben) */
  lines?: string[];
};

const MEAL = { mittags: "mittags", abends: "abends" } as const;
const dayDate = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.`;
};

export function previewRows(data: AssistantData, ops: ChangeOp[], selected: Set<string>): PreviewRow[] {
  const effective = new Set(selectedOps(ops, selected).map((op) => op.id));
  const recipesByRef = Object.fromEntries(
    ops.flatMap((op) => (op.type === "add_recipe" ? [[op.recipe.ref, op.recipe] as const] : [])),
  );
  const weekStarts = [...new Set(ops.flatMap((op) => ("slot" in op ? [op.slot.weekStart] : "from" in op ? [op.from.weekStart] : "weekStart" in op ? [op.weekStart] : [])))].sort();
  const weekIndex = (ws: string) => Math.max(0, weekStarts.indexOf(ws));

  let state = data;
  let refs: Record<string, string> = {};
  const rows: PreviewRow[] = [];

  for (const op of ops) {
    const row = describe(state, op, recipesByRef, weekIndex);
    if (row) rows.push(row);
    if (effective.has(op.id)) {
      const next = applyOps(state, [op], { refs });
      state = next.data;
      refs = next.refs;
    }
  }
  return rows.sort((a, b) => a.order - b.order);
}

function describe(
  state: AssistantData,
  op: ChangeOp,
  recipesByRef: Record<string, NewRecipe>,
  weekIndex: (ws: string) => number,
): PreviewRow | null {
  switch (op.type) {
    case "set_meal":
    case "clear_slot": {
      const week = weekOf(state, op.slot.weekStart);
      const index = week.days.findIndex((d) => d.weekday === op.slot.weekday);
      const day = week.days[index];
      const before = findSlot(week, op.slot.weekday, op.slot.meal)?.entry?.title ?? "frei";
      const after = op.type === "set_meal" ? op.dish.title : "frei";
      if (before === after && op.type === "clear_slot") return null;
      return {
        opId: op.id,
        group: `${op.slot.weekday.slice(0, 2)} ${day ? dayDate(day.date) : ""}`.trim(),
        order: weekIndex(op.slot.weekStart) * 100 + index * 2 + (op.slot.meal === "abends" ? 1 : 0),
        label: MEAL[op.slot.meal],
        before,
        after,
        category: op.type === "set_meal" ? op.dish.category : null,
        newRecipe: op.type === "set_meal" && op.dish.kind === "new_recipe" ? recipesByRef[op.dish.ref] : undefined,
      };
    }
    case "move_meal": {
      const week = weekOf(state, op.from.weekStart);
      const index = week.days.findIndex((d) => d.weekday === op.from.weekday);
      const from = findSlot(week, op.from.weekday, op.from.meal)?.entry;
      const to = findSlot(week, op.to.weekday, op.to.meal)?.entry;
      if (!from) return null;
      return {
        opId: op.id,
        group: `${op.from.weekday.slice(0, 2)} ${dayDate(week.days[index].date)}`,
        order: weekIndex(op.from.weekStart) * 100 + index * 2 + (op.from.meal === "abends" ? 1 : 0),
        label: `${MEAL[op.from.meal]} → ${op.to.weekday.slice(0, 2)} ${MEAL[op.to.meal]}`,
        before: from.title,
        after: to ? `getauscht mit ${to.title}` : "verschoben",
        category: from.category,
      };
    }
    case "update_week": {
      const plan = planForWeek(state.weekPlans, op.weekStart);
      const keys = Object.keys(op.changes);
      // Nur ein Wunsch → beim Tag des Wunsches zeigen
      if (keys.length === 1 && op.changes.wish) {
        const wish = op.changes.wish;
        const week = weekOf(state, op.weekStart);
        const index = week.days.findIndex((d) => d.weekday === wish.weekday);
        const kid = state.profile.persons.find((p) => p.id === wish.kidId);
        return {
          opId: op.id,
          group: `${wish.weekday.slice(0, 2)} ${index >= 0 ? dayDate(week.days[index].date) : ""}`.trim(),
          order: weekIndex(op.weekStart) * 100 + Math.max(0, index) * 2 + (wish.meal === "abends" ? 1 : 0),
          label: MEAL[wish.meal],
          before: findSlot(week, wish.weekday, wish.meal)?.entry?.title ?? "frei",
          after: `${wish.text || "Wunsch"} – Wunsch von ${kid ? personLabel(kid, state.profile.persons) : "Kind"} 🎉`,
        };
      }
      const counts = weekOf(state, op.weekStart).counts;
      const c = op.changes;
      const lines: string[] = [];
      const num = (label: string, before: number, after?: number) => {
        if (after !== undefined && after !== before) lines.push(`${label}: ${before} → ${after}`);
      };
      num("Fleisch-Tage", counts.fleisch.target, c.meatDays);
      num("Veggie-Tage", counts.vegetarisch.target, c.vegetarianDays);
      num("Fisch-Tage", counts.fisch.target, c.fishDays);
      if (c.awayDays) lines.push(`Ausflugstage: ${(plan?.awayDays ?? []).join(", ") || "keine"} → ${c.awayDays.join(", ") || "keine"}`);
      if (c.cheatDay !== undefined || c.cheatDayWeekday !== undefined) {
        const on = c.cheatDay ?? plan?.cheatDay ?? state.profile.weekRules.cheatDay;
        const dayName = c.cheatDayWeekday ?? plan?.cheatDayWeekday ?? "";
        lines.push(`Cheat Day 🍕: ${on ? dayName || "an" : "aus"}`);
      }
      if (c.wish === null) lines.push("Wunsch entfernt");
      if (c.wish) {
        const kid = state.profile.persons.find((p) => p.id === c.wish!.kidId);
        const name = kid ? personLabel(kid, state.profile.persons) : "Kind";
        lines.push(`Wunsch 🎉: ${name} wünscht sich ${c.wish.text || "etwas"} (${c.wish.weekday.slice(0, 2)} ${MEAL[c.wish.meal]})`);
      }
      if (lines.length === 0) return null;
      return {
        opId: op.id,
        group: `Vorgaben ${formatWeekRange(op.weekStart)}`,
        order: weekIndex(op.weekStart) * 100 - 1,
        label: "Wochen-Check",
        before: null,
        after: lines[0],
        lines,
      };
    }
    case "add_recipe":
      if (op.recipe.ref.startsWith(PLAN_RECIPE_PREFIX)) return null;
      return { opId: op.id, group: "Kochbuch", order: 10_000, label: "neues Rezept", before: null, after: op.recipe.title, category: op.recipe.category, newRecipe: op.recipe };
    case "add_shopping": {
      const section = SECTIONS.find((s) => s.value === op.section)?.label ?? "";
      return { opId: op.id, group: "Einkaufsliste", order: 20_000, label: section, before: null, after: [op.amount, op.name].filter(Boolean).join(" ") };
    }
  }
}
