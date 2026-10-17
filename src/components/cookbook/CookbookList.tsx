"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  RECIPE_CATEGORIES,
  categoryInfo,
  sortRecipes,
  toggleFavorite,
  useRecipes,
  type Recipe,
  type RecipeCategory,
  type RecipeSort,
} from "@/lib/cookbook";

type Filter = RecipeCategory | "alle" | "favoriten";

/** Übersicht "Unser Kochbuch": Suche, Filter, Sortierung, Favoriten-Herz. */
export function CookbookList() {
  const recipes = useRecipes();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("alle");
  const [sort, setSort] = useState<RecipeSort>("zuletzt");

  const all = recipes ? Object.values(recipes) : [];
  const q = query.trim().toLowerCase();
  const visible = sortRecipes(
    all.filter(
      (r) =>
        (filter === "alle" ||
          (filter === "favoriten" ? r.favorite : r.category === filter)) &&
        (!q ||
          r.title.toLowerCase().includes(q) ||
          r.ingredients.some((i) => i.name.toLowerCase().includes(q))),
    ),
    sort,
  );

  const filters: { value: Filter; label: string }[] = [
    { value: "alle", label: "Alle" },
    { value: "favoriten", label: "♥ Favoriten" },
    ...RECIPE_CATEGORIES.map((c) => ({ value: c.value, label: `${c.emoji} ${c.label}` })),
  ];

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Unser Kochbuch" />
      <main className="safe-bottom flex flex-1 flex-col gap-4 px-4 pb-8 pt-2">
        <Link
          href="/kochbuch/bearbeiten"
          className="flex h-14 items-center justify-center rounded-2xl bg-orange-500 text-lg font-extrabold text-white shadow-md active:scale-95"
        >
          + Neues Rezept
        </Link>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rezept oder Zutat suchen"
          aria-label="Rezepte durchsuchen"
          enterKeyHint="search"
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="h-14 rounded-2xl border-2 border-stone-200 bg-white px-4 text-lg outline-none focus:border-orange-400"
        />

        <div
          role="group"
          aria-label="Nach Kategorie filtern"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
        >
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`h-11 shrink-0 rounded-full border-2 px-4 text-base font-bold active:scale-95 ${
                filter === f.value
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-stone-200 bg-white text-stone-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div role="group" aria-label="Sortierung" className="grid grid-cols-2 gap-2">
          {(
            [
              ["zuletzt", "Zuletzt gekocht"],
              ["beliebt", "Beliebteste"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={sort === value}
              onClick={() => setSort(value)}
              className={`h-11 rounded-2xl border-2 text-base font-bold active:scale-95 ${
                sort === value
                  ? "border-orange-500 bg-orange-50 text-orange-700"
                  : "border-stone-200 bg-white text-stone-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {recipes === undefined ? (
          <div className="h-40 animate-pulse rounded-3xl bg-white/70" />
        ) : all.length === 0 ? (
          <p className="rounded-3xl bg-white p-6 text-center text-lg text-stone-600 shadow-sm">
            📖 Noch keine Rezepte. Leg euer erstes Lieblingsrezept an!
          </p>
        ) : visible.length === 0 ? (
          <p className="px-1 text-stone-500">Keine Rezepte gefunden.</p>
        ) : (
          <ul className="divide-y divide-stone-100 overflow-hidden rounded-3xl bg-white shadow-sm">
            {visible.map((recipe) => (
              <RecipeRow key={recipe.id} recipe={recipe} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function RecipeRow({ recipe }: { recipe: Recipe }) {
  const cat = categoryInfo(recipe.category);
  return (
    <li className="flex items-center">
      <Link
        href={`/kochbuch/rezept?id=${encodeURIComponent(recipe.id)}`}
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3 pl-4 active:bg-orange-50"
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-50 text-2xl"
          aria-hidden
        >
          {cat.emoji}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-lg font-bold leading-tight">{recipe.title}</span>
          <span className="text-sm text-stone-500">
            <span className="whitespace-nowrap">{cat.label}</span>
            {recipe.prepMinutes !== null && (
              <>
                {" · "}
                <span className="whitespace-nowrap">{recipe.prepMinutes} Min.</span>
              </>
            )}
            {recipe.cookedCount > 0 && (
              <>
                {" · "}
                <span className="whitespace-nowrap">{recipe.cookedCount}× gekocht</span>
              </>
            )}
            {recipe.thumbsUp + recipe.thumbsDown > 0 && (
              <>
                {" · "}
                <span className="whitespace-nowrap">
                  👍 {recipe.thumbsUp} 👎 {recipe.thumbsDown}
                </span>
              </>
            )}
            {recipe.source === "ki" && (
              <>
                {" · "}
                <span className="whitespace-nowrap">✨ KI</span>
              </>
            )}
          </span>
        </span>
      </Link>
      <FavoriteButton recipe={recipe} />
    </li>
  );
}

export function FavoriteButton({ recipe }: { recipe: Recipe }) {
  return (
    <button
      type="button"
      aria-pressed={recipe.favorite}
      aria-label={recipe.favorite ? `${recipe.title}: Favorit entfernen` : `${recipe.title}: als Favorit markieren`}
      onClick={() => toggleFavorite(recipe.id)}
      className={`flex h-14 w-14 shrink-0 items-center justify-center text-3xl active:scale-90 ${
        recipe.favorite ? "text-rose-500" : "text-stone-300"
      }`}
    >
      {recipe.favorite ? "♥" : "♡"}
    </button>
  );
}
