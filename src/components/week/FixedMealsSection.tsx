"use client";

import Link from "next/link";
import { useState } from "react";
import { ChoiceGroup } from "@/components/form/ChoiceGroup";
import {
  RECIPE_CATEGORIES,
  categoryInfo,
  sortRecipes,
  useRecipes,
  type Recipe,
} from "@/lib/cookbook";
import { WISH_MEAL_LABELS, type WishMeal } from "@/lib/profile";
import {
  CATEGORY_COUNT_KEY,
  fixedMealCounts,
  weekDayNames,
  wishIsActive,
  type FixedMeal,
  type WeekPlan,
} from "@/lib/weekPlan";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

/**
 * Festes Gericht eintragen: ersetzt ein vorhandenes am selben Tag und zur
 * selben Mahlzeit, zählt in seine Kategorie (Zähler wird bei Bedarf erhöht)
 * und setzt bei einem Cheat-Day-Rezept den Cheat Day auf diesen Tag.
 */
export function addFixedMeal(plan: WeekPlan, meal: FixedMeal): WeekPlan {
  const fixedMeals = [
    ...plan.fixedMeals.filter((m) => !(m.weekday === meal.weekday && m.meal === meal.meal)),
    meal,
  ].sort(
    (a, b) =>
      // Reihenfolge der Planungswoche (ab Einkaufstag)
      weekDayNames(plan.weekStart).indexOf(a.weekday) -
        weekDayNames(plan.weekStart).indexOf(b.weekday) ||
      (a.meal === b.meal ? 0 : a.meal === "mittags" ? -1 : 1),
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
  const [meal, setMeal] = useState<WishMeal>("abends");
  const [recipeId, setRecipeId] = useState("");

  const list = recipes ? sortRecipes(Object.values(recipes), "beliebt") : [];
  const wishSlot =
    plan.wish && wishIsActive(plan) && weekday === plan.wish.weekday && meal === plan.wish.meal;
  const canAdd = Boolean(weekday && recipeId && recipes?.[recipeId] && !wishSlot);

  const add = () => {
    const recipe = recipes?.[recipeId];
    if (!recipe || !canAdd) return;
    setPlan((p) =>
      addFixedMeal(p, {
        id: newId(),
        weekday,
        meal,
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
    <section className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-lg font-bold">📖 Feste Gerichte diese Woche</h3>
        <p className="text-sm text-stone-500">
          Aus eurem Kochbuch – zählen in ihre Kategorie (z.&nbsp;B. Gulasch = Fleisch).
        </p>
      </div>

      {plan.fixedMeals.length > 0 && (
        <ul className="divide-y divide-stone-100 rounded-2xl border-2 border-stone-100">
          {plan.fixedMeals.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2 pl-3">
              <span className="text-2xl" aria-hidden>
                {categoryInfo(m.category).emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-bold">{m.title}</span>
                <span className="block text-sm text-stone-500">
                  <span className="whitespace-nowrap">
                    {m.weekday} {WISH_MEAL_LABELS[m.meal]}
                  </span>
                  {" · "}
                  {categoryInfo(m.category).label}
                </span>
              </span>
              <button
                type="button"
                onClick={() => remove(m.id)}
                aria-label={`${m.title} am ${m.weekday} entfernen`}
                className="h-12 w-12 shrink-0 text-2xl text-stone-400 active:scale-90"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {recipes !== undefined && list.length === 0 ? (
        <p className="rounded-2xl bg-stone-50 px-4 py-3 text-stone-600">
          Noch keine Rezepte im Kochbuch.{" "}
          <Link href="/kochbuch/bearbeiten" className="font-bold text-orange-700 underline">
            Rezept anlegen
          </Link>
        </p>
      ) : !adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="h-12 rounded-2xl border-2 border-dashed border-orange-300 font-bold text-orange-700 active:scale-95"
        >
          + Festes Gericht
        </button>
      ) : (
        <div className="flex flex-col gap-4 rounded-2xl bg-orange-50/60 p-3">
          <fieldset>
            <legend className="mb-2 font-bold">Tag</legend>
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
                    className={`h-12 rounded-2xl border-2 text-base font-bold active:scale-95 disabled:opacity-30 ${
                      weekday === day
                        ? "border-orange-500 bg-white text-orange-700"
                        : "border-stone-200 bg-white text-stone-700"
                    }`}
                  >
                    {day.slice(0, 2)}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <ChoiceGroup<WishMeal>
            label="Mahlzeit"
            value={meal}
            onChange={setMeal}
            columns={2}
            options={[
              { value: "mittags", label: "Mittag", emoji: "☀️" },
              { value: "abends", label: "Abend", emoji: "🌙" },
            ]}
            variant="plain"
          />
          <label className="flex flex-col gap-2">
            <span className="font-bold">Rezept</span>
            <select
              value={recipeId}
              onChange={(e) => setRecipeId(e.target.value)}
              className="h-14 rounded-2xl border-2 border-stone-200 bg-white px-3 text-lg outline-none focus:border-orange-400"
            >
              <option value="">Rezept wählen …</option>
              {RECIPE_CATEGORIES.map((c) => {
                const inCategory = list.filter((r: Recipe) => r.category === c.value);
                return inCategory.length > 0 ? (
                  <optgroup key={c.value} label={`${c.emoji} ${c.label}`}>
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
            <p className="text-sm font-semibold text-amber-800">
              Hier ist schon der Wunschtag – bitte anderen Tag oder andere Mahlzeit wählen.
            </p>
          )}
          {recipeId && recipes?.[recipeId] && CATEGORY_COUNT_KEY[recipes[recipeId].category] && (
            <p className="text-sm text-stone-500">
              Zählt als {categoryInfo(recipes[recipeId].category).label}.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="h-12 rounded-2xl bg-white font-bold text-stone-700 shadow-sm active:scale-95"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={add}
              disabled={!canAdd}
              className="h-12 rounded-2xl bg-orange-500 font-extrabold text-white shadow-sm active:scale-95 disabled:opacity-40"
            >
              Hinzufügen
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
