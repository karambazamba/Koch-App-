// Küchenhelfer: Änderungen, die die KI vorschlägt. Die KI ändert nie direkt –
// sie liefert eine Liste solcher Änderungen, die App zeigt sie als Vorschau und
// wendet sie erst nach "Übernehmen" an. Alles hier ist rein (ohne Speicher),
// damit Server (Arbeitskopie) und App (Vorschau, Übernehmen) gleich rechnen.

import { createAiRecipe, type Recipe, type RecipeCategory } from "../cookbook";
import {
  buildWeek,
  entriesWithMove,
  entriesWithoutSlot,
  mealPlansWithWeek,
  slotKey,
  storedForWeek,
  type DaySlot,
  type PlanWeek,
  type SlotMeal,
  type StoredEntry,
} from "../mealPlan";
import type { HouseholdProfile } from "../profile";
import type { Section, WeekList } from "../shoppingList";
import { createWeekPlan, planForWeek, type WeekPlan, type WeekWish } from "../weekPlan";

/** Alle Daten, auf die sich Änderungen beziehen */
export type AssistantData = {
  profile: HouseholdProfile;
  weekPlans: Record<string, WeekPlan>;
  mealPlans: Record<string, Record<string, StoredEntry>>;
  recipes: Record<string, Recipe>;
  shopping: Record<string, WeekList>;
};

export type SlotRef = { weekStart: string; weekday: string; meal: SlotMeal };

/** Neues (KI-)Rezept – vollständig, wie es ins Kochbuch kommt */
export type NewRecipe = {
  /** Vorläufige Kennung, über die `set_meal` darauf verweist */
  ref: string;
  title: string;
  category: RecipeCategory;
  servings: number;
  prepMinutes: number | null;
  ingredients: { amount: number | null; unit: string; name: string }[];
  steps: string[];
  note: string;
};

export type Dish =
  | { kind: "recipe"; recipeId: string; title: string; category: RecipeCategory }
  | { kind: "new_recipe"; ref: string; title: string; category: RecipeCategory }
  | { kind: "text"; title: string; category: RecipeCategory | null };

export type WeekChanges = Partial<
  Pick<WeekPlan, "meatDays" | "vegetarianDays" | "fishDays" | "cheatDay" | "cheatDayWeekday" | "awayDays">
> & { wish?: WeekWish | null };

export type ChangeOp =
  | { id: string; type: "set_meal"; slot: SlotRef; dish: Dish }
  | { id: string; type: "clear_slot"; slot: SlotRef }
  | { id: string; type: "move_meal"; from: SlotRef; to: SlotRef }
  | { id: string; type: "update_week"; weekStart: string; changes: WeekChanges }
  | { id: string; type: "add_recipe"; recipe: NewRecipe }
  | { id: string; type: "add_shopping"; weekStart: string; name: string; amount: string; section: Section };

export const slotKeyOf = (slot: Pick<SlotRef, "weekday" | "meal">) => slotKey(slot.weekday, slot.meal);

/** Woche so, wie der Wochenplan sie zeigt */
export function weekOf(data: AssistantData, weekStart: string): PlanWeek {
  return buildWeek(
    weekStart,
    data.profile,
    planForWeek(data.weekPlans, weekStart),
    storedForWeek(data.mealPlans, weekStart),
    data.recipes,
  );
}

export function findSlot(week: PlanWeek, weekday: string, meal: SlotMeal): DaySlot | undefined {
  return week.days.find((d) => d.weekday === weekday)?.slots.find((s) => s.meal === meal);
}

function storedFor(dish: Dish, refs: Record<string, string>): Exclude<StoredEntry, { kind: "cleared" }> {
  if (dish.kind === "recipe") return dish;
  if (dish.kind === "new_recipe" && refs[dish.ref]) {
    return { kind: "recipe", recipeId: refs[dish.ref], title: dish.title, category: dish.category };
  }
  // Rezept nicht mit übernommen → als selbst eingetragenes Gericht
  return { kind: "text", title: dish.title, category: dish.category };
}

/**
 * Änderungen der Reihe nach anwenden. `refs` ordnet neuen Rezepten (ref) die
 * angelegte Kochbuch-ID zu. Ungültige Änderungen (Platz gibt es nicht)
 * werden übersprungen.
 */
export function applyOps(
  data: AssistantData,
  ops: ChangeOp[],
  options: { prompt?: string; refs?: Record<string, string> } = {},
): { data: AssistantData; refs: Record<string, string> } {
  const { prompt } = options;
  let next: AssistantData = { ...data };
  const refs: Record<string, string> = { ...options.refs };

  for (const op of ops) {
    switch (op.type) {
      case "add_recipe": {
        const { ref, ...draft } = op.recipe;
        const recipe = createAiRecipe(
          {
            ...draft,
            ingredients: draft.ingredients.map((i, n) => ({ ...i, id: `${ref}-${n}` })),
          },
          prompt,
        );
        refs[ref] = recipe.id;
        next = { ...next, recipes: { ...next.recipes, [recipe.id]: recipe } };
        break;
      }
      case "set_meal": {
        const entry = storedFor(op.dish, refs);
        next = {
          ...next,
          mealPlans: mealPlansWithWeek(next.mealPlans, op.slot.weekStart, (e) => ({ ...e, [slotKeyOf(op.slot)]: entry })),
        };
        break;
      }
      case "clear_slot": {
        const slot = findSlot(weekOf(next, op.slot.weekStart), op.slot.weekday, op.slot.meal);
        if (!slot) break;
        next = { ...next, mealPlans: mealPlansWithWeek(next.mealPlans, op.slot.weekStart, (e) => entriesWithoutSlot(e, slot)) };
        break;
      }
      case "move_meal": {
        const week = weekOf(next, op.from.weekStart);
        const from = findSlot(week, op.from.weekday, op.from.meal);
        // Ziel-Platz gibt es evtl. noch nicht (z. B. mittags) → leer anlegen
        const to = findSlot(week, op.to.weekday, op.to.meal) ?? {
          key: slotKeyOf(op.to),
          meal: op.to.meal,
          entry: null,
          hint: null,
          hasDerived: false,
        };
        if (!from?.entry) break;
        next = { ...next, mealPlans: mealPlansWithWeek(next.mealPlans, op.from.weekStart, (e) => entriesWithMove(e, from, to)) };
        break;
      }
      case "update_week": {
        const base = planForWeek(next.weekPlans, op.weekStart) ?? createWeekPlan(op.weekStart, next.profile.weekRules);
        const plan: WeekPlan = { ...base, ...op.changes, weekStart: op.weekStart, updatedAt: new Date().toISOString() };
        next = { ...next, weekPlans: { ...next.weekPlans, [op.weekStart]: plan } };
        // Ein Wunsch soll sichtbar werden: eigener Eintrag auf dem Platz weicht
        if (op.changes.wish) {
          const key = slotKeyOf(op.changes.wish);
          next = {
            ...next,
            mealPlans: mealPlansWithWeek(next.mealPlans, op.weekStart, (e) => {
              const copy = { ...e };
              delete copy[key];
              return copy;
            }),
          };
        }
        break;
      }
      case "add_shopping": {
        const list = next.shopping[op.weekStart] ?? { manual: [], checked: [], have: [] };
        const item = { id: `${op.id}-item`, name: op.name, amount: op.amount, section: op.section, done: false };
        next = { ...next, shopping: { ...next.shopping, [op.weekStart]: { ...list, manual: [...list.manual, item] } } };
        break;
      }
    }
  }
  return { data: next, refs };
}

const slotOps = (op: ChangeOp): SlotRef[] =>
  op.type === "set_meal" || op.type === "clear_slot" ? [op.slot] : op.type === "move_meal" ? [op.from, op.to] : [];
const sameSlot = (a: SlotRef, b: SlotRef) => a.weekStart === b.weekStart && a.weekday === b.weekday && a.meal === b.meal;

/**
 * Überholte Änderungen entfernen (z. B. nach "Anpassen"): ein späteres
 * Setzen/Leeren desselben Platzes ersetzt ein früheres, mehrere
 * Vorgaben-Änderungen einer Woche werden zusammengefasst. Nicht mehr
 * verwendete neue Rezepte fallen weg.
 */
export function compactOps(ops: ChangeOp[]): ChangeOp[] {
  const keep = ops.map(() => true);
  ops.forEach((op, i) => {
    if (op.type !== "set_meal" && op.type !== "clear_slot") return;
    for (let j = i + 1; j < ops.length; j++) {
      const later = ops[j];
      if (later.type === "move_meal" && slotOps(later).some((s) => sameSlot(s, op.slot))) return;
      if ((later.type === "set_meal" || later.type === "clear_slot") && sameSlot(later.slot, op.slot)) {
        keep[i] = false;
        return;
      }
    }
  });
  const result: ChangeOp[] = [];
  const weekIndex: Record<string, number> = {};
  ops.forEach((op, i) => {
    if (!keep[i]) return;
    if (op.type === "update_week") {
      const at = weekIndex[op.weekStart];
      if (at !== undefined) {
        const prev = result[at] as Extract<ChangeOp, { type: "update_week" }>;
        result[at] = { ...prev, changes: { ...prev.changes, ...op.changes } };
        return;
      }
      weekIndex[op.weekStart] = result.length;
    }
    result.push(op);
  });
  const usedRefs = new Set(
    result.flatMap((op) => (op.type === "set_meal" && op.dish.kind === "new_recipe" ? [op.dish.ref] : [])),
  );
  return result.filter((op) => op.type !== "add_recipe" || usedRefs.has(op.recipe.ref) || !op.recipe.ref.startsWith(PLAN_RECIPE_PREFIX));
}

/** Rezepte, die nur für einen Platz angelegt werden, beginnen mit "plan-" */
export const PLAN_RECIPE_PREFIX = "plan-";

/**
 * Ausgewählte Änderungen plus die neuen Rezepte, die sie brauchen. Ein neues
 * Rezept wird nur mit übernommen, wenn es eigenständig ausgewählt ist oder ein
 * ausgewählter Platz es nutzt.
 */
export function selectedOps(ops: ChangeOp[], selected: Set<string>): ChangeOp[] {
  const usedRefs = new Set(
    ops.flatMap((op) =>
      selected.has(op.id) && op.type === "set_meal" && op.dish.kind === "new_recipe" ? [op.dish.ref] : [],
    ),
  );
  return ops.filter((op) =>
    op.type === "add_recipe"
      ? usedRefs.has(op.recipe.ref) || (selected.has(op.id) && !op.recipe.ref.startsWith(PLAN_RECIPE_PREFIX))
      : selected.has(op.id),
  );
}
