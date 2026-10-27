"use client";

import Link from "next/link";
import { useState } from "react";
import { useExternalStore } from "@/lib/core/useExternalStore";

const noSubscribe = () => () => {};
import { BookOpen, Clock, Heart, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PagePlus } from "@/components/ui/QuickButton";
import { CARD, INPUT_BASE, PAGE_MAIN, SECTION_TITLE, chipClass } from "@/components/ui/styles";
import { BUILTIN_BAKING, KID_FRIENDLY } from "@/lib/essen/baking";
import { toggleFavorite, useRecipes, type Recipe } from "@/lib/essen/cookbook";
import { ascNum, byName, RECIPES, searchRank, sortBy } from "@/lib/core/sort";
import { dishTone } from "@/lib/essen/dishLook";
import { demoLook } from "@/lib/essen/demoDish";
import { DishPicture } from "@/components/essen/DishPicture";
import { useMealPlans, type StoredEntry } from "@/lib/essen/mealPlan";
import { helperName, personLabel, type HouseholdProfile } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { NewRecipeSheet } from "@/components/essen/rezepte/NewRecipeSheet";

type Filter = "alle" | "lieblinge" | "schnell" | "backen" | "vegetarisch" | "fleisch" | "fisch" | "cheatday";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "alle", label: "Alle" },
  { value: "lieblinge", label: "Lieblinge" },
  { value: "schnell", label: "Schnell" },
  { value: "backen", label: "Backen" },
  { value: "vegetarisch", label: "Veggie" },
  { value: "fleisch", label: "Fleisch" },
  { value: "fisch", label: "Fisch" },
  { value: "cheatday", label: "Cheat Day" },
];

/** Bis so viele Minuten gilt ein Rezept als schnell */
const QUICK_MINUTES = 25;

const matches = (r: Recipe, f: Filter) =>
  f === "alle" ||
  (f === "lieblinge"
    ? r.favorite
    : f === "schnell"
      ? r.prepMinutes !== null && r.prepMinutes <= QUICK_MINUTES
      : f === "backen"
        ? r.kind === "backen"
        : r.kind !== "backen" && r.category === f);

/** "Mathis' Liebling": Rezept, das sich ein Kind schon gewünscht hat */
function kidFavorites(profile: HouseholdProfile | null | undefined, mealPlans: Record<string, Record<string, StoredEntry>> | undefined): Map<string, string> {
  const result = new Map<string, string>();
  if (!profile || !mealPlans) return result;
  for (const entries of Object.values(mealPlans)) {
    for (const e of Object.values(entries)) {
      if (e.kind !== "wish" || !e.text.trim()) continue;
      const kid = profile.persons.find((p) => p.id === e.kidId);
      if (kid) result.set(e.text.trim().toLowerCase(), personLabel(kid, profile.persons));
    }
  }
  return result;
}

const possessive = (name: string) => (/[sxzß]$/i.test(name) ? `${name}'` : `${name}s`);

/** Rezepte: Bilder-Raster, Suche, Text-Filter-Chips, Plus im Kopf */
export function CookbookList() {
  const recipes = useRecipes();
  const profile = useProfile();
  const mealPlans = useMealPlans();
  const [query, setQuery] = useState("");
  const [chosen, setFilter] = useState<Filter | null>(null);
  const [adding, setAdding] = useState(false);
  // "/kochbuch?filter=backen" (von der Essen-Seite) gilt, bis man selbst einen Filter wählt
  const fromUrl = useExternalStore(noSubscribe, () => new URLSearchParams(window.location.search).get("filter"), () => null);
  const filter: Filter = chosen ?? (fromUrl === "backen" ? "backen" : "alle");

  const all = recipes ? Object.values(recipes) : [];
  const q = query.trim();
  // Mit Suche: wie gut es passt (Titel vor Zutaten), sonst Regel `RECIPES`; Backstube nach Name
  const rank = (r: Recipe) => searchRank(q, r.title, r.ingredients.map((i) => i.name));
  const visible = sortBy(
    all.filter((r) => matches(r, filter) && rank(r) >= 0),
    ascNum(rank),
    ...RECIPES,
  );
  const favorites = kidFavorites(profile, mealPlans);
  // Backen: dazu die eingebaute Sammlung (ohne schon übernommene)
  const own = new Set(all.map((r) => r.title.trim().toLowerCase()));
  const bakery =
    filter === "backen"
      ? sortBy(
          BUILTIN_BAKING.filter((r) => !own.has(r.title.trim().toLowerCase()) && rank(r) >= 0),
          ascNum(rank),
          byName((r) => r.title),
        )
      : [];

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Unsere Rezepte" action={<PagePlus label="Neues Rezept" onClick={() => setAdding(true)} />} />
      <main className={PAGE_MAIN}>
        <div className="flex items-center gap-3">
          <div className="relative flex min-w-0 flex-1 items-center">
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
        </div>

        <div role="group" aria-label="Filtern" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`${chipClass(filter === f.value)} shrink-0`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {recipes === undefined ? (
          <div className={`${CARD} h-40 animate-pulse`} />
        ) : all.length === 0 && filter !== "backen" ? (
          <div className={`${CARD} flex flex-col items-center gap-3 p-6 text-center`}>
            <BookOpen className="h-10 w-10 text-accent" strokeWidth={1.75} aria-hidden />
            <p className="text-base text-muted">Noch keine Rezepte – erzähl {helperName(profile)} euer erstes Lieblingsrezept!</p>
          </div>
        ) : visible.length === 0 && bakery.length === 0 ? (
          <p className="px-1 text-sm text-muted">Dazu finde ich kein Rezept.</p>
        ) : (
          <>
            {visible.length > 0 && (
              <ul className="grid grid-cols-2 gap-3" aria-label="Rezepte">
                {visible.map((recipe) => (
                  <RecipeTile key={recipe.id} recipe={recipe} kid={favorites.get(recipe.title.trim().toLowerCase())} />
                ))}
              </ul>
            )}
            {bakery.length > 0 && (
              <>
                <h2 className={`${SECTION_TITLE} mt-1`}>Aus unserer Backstube</h2>
                <ul className="grid grid-cols-2 gap-3" aria-label="Backstube">
                  {bakery.map((recipe) => (
                    <RecipeTile key={recipe.id} recipe={recipe} builtin kidFriendly={KID_FRIENDLY.has(recipe.id)} />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </main>
      {adding && <NewRecipeSheet onClose={() => setAdding(false)} />}
    </div>
  );
}

function RecipeTile({ recipe, kid, builtin = false, kidFriendly = false }: { recipe: Recipe; kid?: string; builtin?: boolean; kidFriendly?: boolean }) {
  const extra = builtin
    ? kidFriendly
      ? "mit Kindern"
      : ""
    : kid
      ? `${possessive(kid)} Liebling`
      : recipe.source === "ki" && recipe.cookedCount === 0
        ? "Neu"
        : "";
  const look = demoLook(recipe.id);
  return (
    <li className={`${CARD} relative overflow-hidden`}>
      <Link href={`/kochbuch/rezept?id=${encodeURIComponent(recipe.id)}`} className="flex h-full flex-col active:opacity-90">
        <DishPicture photo={look?.photo} title={recipe.title} ingredients={recipe.ingredients.map((i) => i.name)} category={recipe.category} tone={look?.tone ?? dishTone(recipe.title, recipe.category)} alt="" className="aspect-[4/3] w-full" />
        <span className="flex flex-1 flex-col gap-0.5 p-3">
          <span className="line-clamp-2 text-[15px] font-bold leading-snug">{recipe.title}</span>
          <span className="mt-auto flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
            {recipe.prepMinutes !== null && (
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <Clock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                {recipe.prepMinutes} Min.
              </span>
            )}
            {extra && <span className="whitespace-nowrap">{extra}</span>}
          </span>
        </span>
      </Link>
      {!builtin && (
        <span className="absolute right-1.5 top-1.5">
          <FavoriteButton recipe={recipe} small />
        </span>
      )}
    </li>
  );
}

export function FavoriteButton({ recipe, small = false }: { recipe: Recipe; small?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={recipe.favorite}
      aria-label={recipe.favorite ? `${recipe.title}: Favorit entfernen` : `${recipe.title}: als Favorit markieren`}
      onClick={() => toggleFavorite(recipe.id)}
      className={`hit flex shrink-0 items-center justify-center rounded-full bg-surface/90 shadow-card transition active:scale-90 ${small ? "h-8 w-8" : "h-[34px] w-[34px]"} ${recipe.favorite ? "text-accent" : "text-muted"}`}
    >
      <Heart className={`${small ? "h-4 w-4" : "h-5 w-5"} ${recipe.favorite ? "fill-current" : ""}`} strokeWidth={2.25} aria-hidden />
    </button>
  );
}
