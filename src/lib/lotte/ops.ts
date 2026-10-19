// Küchenhelfer: Änderungen, die die KI vorschlägt. Die KI ändert nie direkt –
// sie liefert eine Liste solcher Änderungen, die App zeigt sie als Vorschau und
// wendet sie erst nach "Übernehmen" an. Alles hier ist rein (ohne Speicher),
// damit Server (Arbeitskopie) und App (Vorschau, Übernehmen) gleich rechnen.

import { createAiRecipe, type Recipe, type RecipeCategory } from "../essen/cookbook";
import {
  composeWeek,
  entriesWithDouble,
  entriesWithMove,
  entriesWithoutSlot,
  mealPlansWithWeek,
  slotKey,
  type DaySlot,
  type MealEntry,
  type PlanWeek,
  type StoredEntry,
} from "../essen/mealPlan";
import type { PantryItem, PantryPlace } from "../essen/pantry";
import type { HouseholdProfile } from "../einstellungen/profile";
import type { Section, WeekList } from "../einkauf/shoppingList";
import { createWeekPlan, planForWeek, type WeekPlan, type WeekWish } from "../essen/weekPlan";
import { now } from "../core/now";
import { applyHomeChange, DEFAULT_HOME, type HomeChange, type HomeTile } from "../core/homeLayout";
import { buildShoppingList } from "../einkauf/shoppingList";
import { moveItem, removeItem, setDone, upsertEntry, type CalendarEntry } from "../aufgaben/model";

/** Alle Daten, auf die sich Änderungen beziehen */
export type AssistantData = {
  profile: HouseholdProfile;
  weekPlans: Record<string, WeekPlan>;
  mealPlans: Record<string, Record<string, StoredEntry>>;
  recipes: Record<string, Recipe>;
  shopping: Record<string, WeekList>;
  /** Vorrat (nur zum Lesen für die KI; neue Sachen über `add_pantry`) */
  pantry?: PantryItem[];
  /** Termine und Aufgaben */
  entries?: CalendarEntry[];
  /** Startseite: Kacheln (Reihenfolge, Größe, sichtbar) */
  home?: HomeTile[];
};

/** Ein Tag einer Planungswoche – es gibt genau ein Hauptgericht pro Tag */
export type SlotRef = { weekStart: string; weekday: string };

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
  | { id: string; type: "set_meal"; slot: SlotRef; dish: Dish; double?: boolean }
  | { id: string; type: "set_double"; slot: SlotRef; double: boolean }
  | { id: string; type: "clear_slot"; slot: SlotRef }
  | { id: string; type: "move_meal"; from: SlotRef; to: SlotRef }
  | { id: string; type: "update_week"; weekStart: string; changes: WeekChanges }
  | { id: string; type: "add_recipe"; recipe: NewRecipe }
  | { id: string; type: "add_shopping"; weekStart: string; name: string; amount: string; section: Section; day?: string; dish?: string }
  | { id: string; type: "remove_shopping"; weekStart: string; names: string[] }
  | { id: string; type: "clear_shopping"; weekStart: string }
  | { id: string; type: "clear_week"; weekStart: string }
  | { id: string; type: "home"; change: HomeChange }
  // Letzte Änderung zurücknehmen – passiert beim Übernehmen in der App (`commitOps`)
  | { id: string; type: "undo_last" }
  // Nur für diesen Tag auf X Personen umrechnen (Familie und Rezept bleiben)
  | { id: string; type: "set_persons"; slot: SlotRef; persons: number | null }
  // Pause/Urlaub (null = beenden)
  | { id: string; type: "set_pause"; pause: { from: string; until: string | null } | null }
  // App-Bedienung (Ansicht, Vorlesen, Einstellungen …): die App führt den Satz beim Übernehmen mit ihren eigenen Regeln aus
  | { id: string; type: "app_command"; text: string }
  // Vorrat und Wunsch-Ideen liegen in eigenen Speichern – sie werden erst beim
  // Übernehmen dort eingetragen (`commitOps`), hier ändern sie nichts.
  | { id: string; type: "add_pantry"; name: string; amount: number | null; unit: string; place: PantryPlace }
  | { id: string; type: "add_wish"; personId: string | null; who: string; dish: string }
  // Termine und Aufgaben (`entries`): anlegen/ändern, löschen, abhaken, verschieben
  | { id: string; type: "upsert_entry"; entry: CalendarEntry; isNew: boolean }
  | { id: string; type: "remove_entry"; entryId: string; title: string; onlyDate?: string }
  | { id: string; type: "done_entry"; entryId: string; title: string; date: string }
  | { id: string; type: "move_entry"; entryId: string; title: string; date: string; to: string; time?: string };

/** Änderungen an Terminen/Aufgaben */
export const ENTRY_OP_TYPES = new Set(["upsert_entry", "remove_entry", "done_entry", "move_entry"]);

export const slotKeyOf = (slot: Pick<SlotRef, "weekday">) => slotKey(slot.weekday);

/** Woche so, wie der Wochenplan sie zeigt */
export function weekOf(data: AssistantData, weekStart: string): PlanWeek {
  return composeWeek(weekStart, data.profile, data.weekPlans, data.mealPlans, data.recipes);
}

/** Das Hauptgericht eines Tages (Platz) */
export function findSlot(week: PlanWeek, weekday: string): DaySlot | undefined {
  return week.days.find((d) => d.weekday === weekday)?.slot;
}

function storedFor(dish: Dish, refs: Record<string, string>, double: boolean): MealEntry {
  const extra = double ? { double: true } : {};
  if (dish.kind === "recipe") return { kind: "recipe", recipeId: dish.recipeId, title: dish.title, category: dish.category, ...extra };
  if (dish.kind === "new_recipe" && refs[dish.ref]) {
    return { kind: "recipe", recipeId: refs[dish.ref], title: dish.title, category: dish.category, ...extra };
  }
  // Rezept nicht mit übernommen → als selbst eingetragenes Gericht
  return { kind: "text", title: dish.title, category: dish.category, ...extra };
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
        const entry = storedFor(op.dish, refs, op.double === true);
        next = {
          ...next,
          mealPlans: mealPlansWithWeek(next.mealPlans, op.slot.weekStart, (e) => ({ ...e, [slotKeyOf(op.slot)]: entry })),
        };
        break;
      }
      case "set_double": {
        const slot = findSlot(weekOf(next, op.slot.weekStart), op.slot.weekday);
        if (!slot?.entry) break;
        next = { ...next, mealPlans: mealPlansWithWeek(next.mealPlans, op.slot.weekStart, (e) => entriesWithDouble(e, slot, op.double)) };
        break;
      }
      case "clear_slot": {
        const slot = findSlot(weekOf(next, op.slot.weekStart), op.slot.weekday);
        if (!slot) break;
        next = { ...next, mealPlans: mealPlansWithWeek(next.mealPlans, op.slot.weekStart, (e) => entriesWithoutSlot(e, slot)) };
        break;
      }
      case "move_meal": {
        const week = weekOf(next, op.from.weekStart);
        const from = findSlot(week, op.from.weekday);
        const to = findSlot(week, op.to.weekday);
        if (!from?.entry || !to) break;
        next = { ...next, mealPlans: mealPlansWithWeek(next.mealPlans, op.from.weekStart, (e) => entriesWithMove(e, from, to)) };
        break;
      }
      case "update_week": {
        const base = planForWeek(next.weekPlans, op.weekStart) ?? createWeekPlan(op.weekStart, next.profile.weekRules);
        const plan: WeekPlan = { ...base, ...op.changes, weekStart: op.weekStart, updatedAt: now().toISOString() };
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
        const item = { id: `${op.id}-item`, name: op.name, amount: op.amount, section: op.section, done: false, ...(op.day ? { day: op.day } : {}), ...(op.dish ? { dish: op.dish } : {}) };
        next = { ...next, shopping: { ...next.shopping, [op.weekStart]: { ...list, manual: [...list.manual, item] } } };
        break;
      }
      case "remove_shopping":
      case "clear_shopping": {
        const list = next.shopping[op.weekStart] ?? { manual: [], checked: [], have: [] };
        const names = op.type === "remove_shopping" ? op.names.map((n) => n.trim().toLowerCase()) : null;
        const hit = (name: string) => !names || names.some((n) => name.toLowerCase() === n || name.toLowerCase().includes(n));
        // Zutaten aus Gerichten: "haben wir" (ausgeblendet), eigene Artikel: entfernen
        const generated = buildShoppingList(weekOf(next, op.weekStart), next.recipes, list).items.filter((i) => !i.manualId && hit(i.originalName));
        next = {
          ...next,
          shopping: {
            ...next.shopping,
            [op.weekStart]: { ...list, manual: list.manual.filter((m) => !hit(m.name)), have: [...new Set([...list.have, ...generated.map((g) => g.key)])] },
          },
        };
        break;
      }
      case "clear_week": {
        const week = weekOf(next, op.weekStart);
        next = {
          ...next,
          mealPlans: mealPlansWithWeek(next.mealPlans, op.weekStart, (e) => week.days.reduce((acc, d) => (d.slot.entry || d.slot.hasDerived ? entriesWithoutSlot(acc, d.slot) : acc), e)),
        };
        break;
      }
      case "home":
        next = { ...next, home: applyHomeChange(next.home ?? DEFAULT_HOME, op.change) };
        break;
      case "set_persons": {
        const slot = findSlot(weekOf(next, op.slot.weekStart), op.slot.weekday);
        const stored = slot?.entry?.stored;
        if (!stored || stored.kind === "wish") break;
        const { persons: _old, ...rest } = stored;
        void _old;
        const entry = op.persons ? { ...rest, persons: op.persons } : rest;
        next = { ...next, mealPlans: mealPlansWithWeek(next.mealPlans, op.slot.weekStart, (e) => ({ ...e, [slotKeyOf(op.slot)]: entry })) };
        break;
      }
      case "set_pause":
        next = { ...next, profile: { ...next.profile, pause: op.pause } };
        break;
      case "undo_last":
      case "app_command":
        break;
      case "upsert_entry":
        next = { ...next, entries: upsertEntry(next.entries ?? [], op.entry) };
        break;
      case "remove_entry":
        next = { ...next, entries: removeItem(next.entries ?? [], op.entryId, now().toISOString(), op.onlyDate) };
        break;
      case "done_entry": {
        const entry = next.entries?.find((e) => e.id === op.entryId);
        if (entry) next = { ...next, entries: setDone(next.entries ?? [], { entry, date: op.date }, true, now().toISOString()) };
        break;
      }
      case "move_entry": {
        const entry = next.entries?.find((e) => e.id === op.entryId);
        if (entry) next = { ...next, entries: moveItem(next.entries ?? [], { entry, date: op.date }, op.to, now().toISOString(), op.time) };
        break;
      }
      case "add_pantry":
      case "add_wish":
        break;
    }
  }
  return { data: next, refs };
}

const slotOps = (op: ChangeOp): SlotRef[] =>
  op.type === "set_meal" || op.type === "clear_slot" || op.type === "set_double"
    ? [op.slot]
    : op.type === "move_meal"
      ? [op.from, op.to]
      : [];
const sameSlot = (a: SlotRef, b: SlotRef) => a.weekStart === b.weekStart && a.weekday === b.weekday;

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
