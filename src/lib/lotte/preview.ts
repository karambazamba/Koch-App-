// Küchenhelfer: Vorschau eines Vorschlags – pro Änderung "vorher → nachher",
// gruppiert nach Tag. Gerechnet wird mit denselben Funktionen wie beim
// Übernehmen; abgewählte Änderungen zählen für spätere Zeilen nicht mit.

import type { RecipeCategory } from "../essen/cookbook";
import { MEAL_TIME_LABELS, personLabel } from "../einstellungen/profile";
import { SECTIONS } from "../einkauf/shoppingList";
import { appointmentTime } from "../core/appointments";
import { formatPantryItem, PANTRY_PLACES } from "../essen/pantry";
import { formatWeekRange, planForWeek } from "../essen/weekPlan";
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
  /** Gruppe und Reihenfolge eines Tages */
  const place = (weekStart: string, weekday: string) => {
    const week = weekOf(state, weekStart);
    const index = week.days.findIndex((d) => d.weekday === weekday);
    const day = week.days[index];
    return {
      week,
      day,
      group: `${weekday.slice(0, 2)} ${day ? dayDate(day.date) : ""}`.trim(),
      order: weekIndex(weekStart) * 100 + Math.max(0, index),
      label: day ? `Hauptgericht · ${MEAL_TIME_LABELS[day.mealTime]}` : "Hauptgericht",
    };
  };

  switch (op.type) {
    case "set_meal":
    case "clear_slot": {
      const p = place(op.slot.weekStart, op.slot.weekday);
      const before = findSlot(p.week, op.slot.weekday)?.entry?.title ?? "frei";
      const after = op.type === "set_meal" ? `${op.dish.title}${op.double ? " (doppelt – Reste für morgen)" : ""}` : "frei";
      if (before === after && op.type === "clear_slot") return null;
      return {
        opId: op.id,
        group: p.group,
        order: p.order,
        label: p.label,
        before,
        after,
        category: op.type === "set_meal" ? op.dish.category : null,
        newRecipe: op.type === "set_meal" && op.dish.kind === "new_recipe" ? recipesByRef[op.dish.ref] : undefined,
      };
    }
    case "set_double": {
      const p = place(op.slot.weekStart, op.slot.weekday);
      const entry = findSlot(p.week, op.slot.weekday)?.entry;
      if (!entry || entry.double === op.double) return null;
      return {
        opId: op.id,
        group: p.group,
        order: p.order,
        label: p.label,
        before: null,
        after: op.double ? `${entry.title} doppelt kochen – Reste für morgen` : `${entry.title} nicht mehr doppelt kochen`,
        category: entry.category,
      };
    }
    case "move_meal": {
      const p = place(op.from.weekStart, op.from.weekday);
      const from = findSlot(p.week, op.from.weekday)?.entry;
      const to = findSlot(p.week, op.to.weekday)?.entry;
      if (!from) return null;
      return {
        opId: op.id,
        group: p.group,
        order: p.order,
        label: `verschieben → ${op.to.weekday}`,
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
        const p = place(op.weekStart, wish.weekday);
        const kid = state.profile.persons.find((x) => x.id === wish.kidId);
        return {
          opId: op.id,
          group: p.group,
          order: p.order,
          label: p.label,
          before: findSlot(p.week, wish.weekday)?.entry?.title ?? "frei",
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
        const kid = state.profile.persons.find((x) => x.id === c.wish!.kidId);
        const name = kid ? personLabel(kid, state.profile.persons) : "Kind";
        lines.push(`Wunsch 🎉: ${name} wünscht sich ${c.wish.text || "etwas"} (${c.wish.weekday})`);
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
    case "add_pantry": {
      const place = PANTRY_PLACES.find((p) => p.value === op.place);
      return { opId: op.id, group: "Vorrat", order: 21_000, label: place?.label ?? "Vorrat", before: null, after: formatPantryItem(op) };
    }
    case "add_wish":
      return { opId: op.id, group: "Wünsche", order: 22_000, label: `Wunsch von ${op.who}`, before: null, after: `${op.dish} 🎉 – ganz oben bei den Ideen` };
    case "add_appointment": {
      const day = new Intl.DateTimeFormat("de-DE", { weekday: "long", timeZone: "UTC" }).format(new Date(`${op.date}T00:00:00Z`));
      return { opId: op.id, group: "Termine", order: 23_000, label: `${day} ${dayDate(op.date)}`, before: null, after: [op.title, appointmentTime(op)].filter(Boolean).join(" ") };
    }
  }
}
