"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, Plus, X } from "lucide-react";
import { CategoryDot } from "@/components/ui/Category";
import { CARD, INPUT_BASE, LABEL, buttonClass, tileClass } from "@/components/ui/styles";
import {
  RECIPE_CATEGORIES,
  categoryInfo,
  sortRecipes,
  useRecipes,
  type Recipe,
} from "@/lib/essen/cookbook";
import {
  CATEGORY_COUNT_KEY,
  fixedMealCounts,
  weekDayNames,
  wishIsActive,
  type FixedMeal,
  type WeekPlan,
} from "@/lib/essen/weekPlan";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

/**
 * Festes Gericht eintragen: ersetzt ein vorhandenes am selben Tag (ein
 * Hauptgericht pro Tag), zählt in seine Kategorie (Zähler wird bei Bedarf
 * erhöht) und setzt bei einem Cheat-Day-Rezept den Cheat Day auf diesen Tag.
 */
export function addFixedMeal(plan: WeekPlan, meal: FixedMeal): WeekPlan {
  const fixedMeals = [...plan.fixedMeals.filter((m) => m.weekday !== meal.weekday), meal].sort(
    // Reihenfolge der Planungswoche (ab Einkaufstag)
    (a, b) => weekDayNames(plan.weekStart).indexOf(a.weekday) - weekDayNames(plan.weekStart).indexOf(b.weekday),
  );
  const next: WeekPlan = { ...plan, fixedMeals };
  const counts = fixedMealCounts(next);
  for (const key of ["meatDays", "vegetarianDays", "fishDays"] as const) {
    if (next[key] < counts[key]) next[key] = counts[key];
  }
  if (meal.category === "cheatday") {
    next.cheatDay = true;
    next.cheatDayWeekday = meal.weekday;
  }
  return next;
}

export function FixedMealsSection({
  plan,
  setPlan,
}: {
  plan: WeekPlan;
  setPlan: (update: (plan: WeekPlan) => WeekPlan) => void;
}) {
  const recipes = useRecipes();
  const [adding, setAdding] = useState(false);
  const [weekday, setWeekday] = useState("");
  const [recipeId, setRecipeId] = useState("");

  const list = recipes ? sortRecipes(Object.values(recipes), "beliebt") : [];
  const wishSlot =
    plan.wish && wishIsActive(plan) && weekday === plan.wish.weekday;
  const canAdd = Boolean(weekday && recipeId && recipes?.[recipeId] && !wishSlot);

  const add = () => {
    const recipe = recipes?.[recipeId];
    if (!recipe || !canAdd) return;
    setPlan((p) =>
      addFixedMeal(p, {
        id: newId(),
        weekday,
        recipeId: recipe.id,
        title: recipe.title,
        category: recipe.category,
      }),
    );
    setAdding(false);
    setWeekday("");
    setRecipeId("");
  };

  const remove = (id: string) =>
    setPlan((p) => ({ ...p, fixedMeals: p.fixedMeals.filter((m) => m.id !== id) }));

  return (
    <section className={`${CARD} flex flex-col gap-3 p-4`}>
      <div>
        <h3 className="flex items-center gap-2 text-base font-bold">
          <BookOpen className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
          Feste Gerichte diese Woche
        </h3>
        <p className="text-sm text-muted">
          Aus eurem Kochbuch – zählen in ihre Kategorie (z.&nbsp;B. Gulasch = Fleisch).
        </p>
      </div>

      {plan.fixedMeals.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {plan.fixedMeals.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2 pl-4">
              <CategoryDot category={m.category} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold">{m.title}</span>
                <span className="block text-sm text-muted">
                  <span className="whitespace-nowrap">
                    {m.weekday}
                  </span>
                  {" · "}
                  {categoryInfo(m.category).label}
                </span>
              </span>
              <button
                type="button"
                onClick={() => remove(m.id)}
                aria-label={`${m.title} am ${m.weekday} entfernen`}
                className="flex h-12 w-12 shrink-0 items-center justify-center text-stone-400 active:scale-90"
              >
                <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {recipes !== undefined && list.length === 0 ? (
        <p className="rounded-xl bg-stone-50 px-4 py-3 text-muted">
          Noch keine Rezepte im Kochbuch.{" "}
          <Link href="/kochbuch/bearbeiten" className="font-bold text-accent-strong underline">
            Rezept anlegen
          </Link>
        </p>
      ) : !adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={`${buttonClass("soft")} w-full`}
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          Festes Gericht
        </button>
      ) : (
        <div className="flex flex-col gap-4 rounded-xl border border-line bg-stone-50/60 p-3">
          <fieldset>
            <legend className="mb-2 text-base font-bold">Tag</legend>
            <div className="grid grid-cols-4 gap-2">
              {weekDayNames(plan.weekStart).map((day) => {
                const away = plan.awayDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={weekday === day}
                    aria-label={away ? `${day} (unterwegs)` : `Festes Gericht am ${day}`}
                    disabled={away}
                    onClick={() => setWeekday(day)}
                    className={`${tileClass(weekday === day)} disabled:opacity-30`}
                  >
                    {day.slice(0, 2)}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <label className="flex flex-col gap-2">
            <span className={LABEL}>Rezept</span>
            <select
              value={recipeId}
              onChange={(e) => setRecipeId(e.target.value)}
              className={`${INPUT_BASE} h-12 w-full px-3`}
            >
              <option value="">Rezept wählen …</option>
              {RECIPE_CATEGORIES.map((c) => {
                const inCategory = list.filter((r: Recipe) => r.category === c.value);
                return inCategory.length > 0 ? (
                  <optgroup key={c.value} label={c.label}>
                    {inCategory.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.favorite ? "♥ " : ""}
                        {r.title}
                      </option>
                    ))}
                  </optgroup>
                ) : null;
              })}
            </select>
          </label>
          {wishSlot && (
            <p className="text-sm font-semibold text-red-700">
              Hier ist schon der Wunschtag – bitte anderen Tag oder andere Mahlzeit wählen.
            </p>
          )}
          {recipeId && recipes?.[recipeId] && CATEGORY_COUNT_KEY[recipes[recipeId].category] && (
            <p className="text-sm text-muted">
              Zählt als {categoryInfo(recipes[recipeId].category).label}.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className={buttonClass("secondary")}
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={add}
              disabled={!canAdd}
              className={buttonClass("primary")}
            >
              Hinzufügen
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
