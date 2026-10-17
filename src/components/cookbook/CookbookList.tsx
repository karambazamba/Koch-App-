"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, Clock, Heart, Plus, Search, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CategoryDot } from "@/components/ui/Category";
import { CARD, CARD_LIST, INPUT_BASE, PAGE_MAIN, buttonClass, chipClass } from "@/components/ui/styles";
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
    { value: "favoriten", label: "Favoriten" },
    ...RECIPE_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
  ];

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Unser Kochbuch" />
      <main className={PAGE_MAIN}>
        <Link href="/kochbuch/bearbeiten" className={`${buttonClass("primary", "lg")} w-full`}>
          <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          Neues Rezept
        </Link>

        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-4 h-5 w-5 text-muted" strokeWidth={2} aria-hidden />
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
          className={`${INPUT_BASE} h-12 w-full pl-12 pr-4`}
          />
        </div>

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
              className={`${chipClass(filter === f.value)} shrink-0`}
            >
              {f.value === "favoriten" && <Heart className="h-4 w-4" strokeWidth={2.25} aria-hidden />}
              {f.value !== "alle" && f.value !== "favoriten" && <CategoryDot category={f.value} />}
              {f.label}
            </button>
          ))}
        </div>

        <div role="group" aria-label="Sortierung" className="flex gap-2">
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
              className={chipClass(sort === value)}
            >
              {label}
            </button>
          ))}
        </div>

        {recipes === undefined ? (
          <div className={`${CARD} h-40 animate-pulse`} />
        ) : all.length === 0 ? (
          <div className={`${CARD} flex flex-col items-center gap-2 p-6 text-center`}>
            <BookOpen className="h-10 w-10 text-accent" strokeWidth={1.75} aria-hidden />
            <p className="text-base text-muted">Noch keine Rezepte. Leg euer erstes Lieblingsrezept an!</p>
          </div>
        ) : visible.length === 0 ? (
          <p className="px-1 text-sm text-muted">Keine Rezepte gefunden.</p>
        ) : (
          <ul className={CARD_LIST}>
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
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3 pl-4 transition active:bg-stone-50"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-base font-bold leading-snug">{recipe.title}</span>
          <span className="flex flex-wrap items-center gap-x-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <CategoryDot category={recipe.category} />
              {cat.label}
            </span>
            {recipe.prepMinutes !== null && (
              <>
                {" · "}
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <Clock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  {recipe.prepMinutes} Min.
                </span>
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
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <ThumbsUp className="h-3.5 w-3.5" strokeWidth={2} aria-label="gut" /> {recipe.thumbsUp}
                  <ThumbsDown className="ml-1 h-3.5 w-3.5" strokeWidth={2} aria-label="nicht so" /> {recipe.thumbsDown}
                </span>
              </>
            )}
            {recipe.source === "ki" && (
              <>
                {" · "}
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  KI
                </span>
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
      className={`flex h-14 w-14 shrink-0 items-center justify-center transition active:scale-90 ${
        recipe.favorite ? "text-accent" : "text-stone-300"
      }`}
    >
      <Heart className={`h-6 w-6 ${recipe.favorite ? "fill-current" : ""}`} strokeWidth={2} aria-hidden />
    </button>
  );
}
