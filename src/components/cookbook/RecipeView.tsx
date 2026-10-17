"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { FavoriteButton } from "@/components/cookbook/CookbookList";
import {
  categoryInfo,
  deleteRecipe,
  formatAmount,
  recordCooked,
  useRecipes,
} from "@/lib/cookbook";
/** Datum (lokale Zeit) aus Zeitstempel oder "YYYY-MM-DD", z. B. "23.10.2026" */
function formatDate(iso: string): string {
  const date = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return date.toLocaleDateString("de-DE", { day: "numeric", month: "numeric", year: "numeric" });
}

/** Rezept ansehen, nach dem Kochen bewerten, bearbeiten oder löschen. */
export function RecipeView() {
  const params = useSearchParams();
  const { bfcacheId } = useRouter();
  const id = params.get("id") ?? "";
  // Neu mounten bei jedem Aufruf, sonst bliebe "Gespeichert" vom letzten Mal stehen.
  return <RecipeDetails key={`${bfcacheId}|${id}`} id={id} />;
}

function RecipeDetails({ id }: { id: string }) {
  const router = useRouter();
  const recipes = useRecipes();
  const [justCooked, setJustCooked] = useState(false);

  if (recipes === undefined) return <div className="m-4 h-64 animate-pulse rounded-3xl bg-white/70" />;
  const recipe = recipes[id];

  if (!recipe) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <PageHeader title="Rezept" backHref="/kochbuch" />
        <main className="flex flex-col items-center gap-4 px-6 pt-10 text-center">
          <p className="text-lg">Dieses Rezept gibt es nicht (mehr).</p>
          <Link href="/kochbuch" className="font-bold text-orange-700 underline">
            Zum Kochbuch
          </Link>
        </main>
      </div>
    );
  }

  const cat = categoryInfo(recipe.category);
  const cooked = (rating: "up" | "down" | null) => {
    recordCooked(recipe.id, rating);
    setJustCooked(true);
  };
  const remove = () => {
    if (!window.confirm(`„${recipe.title}“ wirklich aus dem Kochbuch löschen?`)) return;
    router.push("/kochbuch");
    deleteRecipe(recipe.id);
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Rezept" backHref="/kochbuch" />
      <main className="safe-bottom flex flex-1 flex-col gap-4 px-4 pb-8 pt-2">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-extrabold leading-tight">{recipe.title}</h2>
            <p className="mt-1 text-stone-600">
              <span className="whitespace-nowrap">
                {cat.emoji} {cat.label}
              </span>
              {" · "}
              <span className="whitespace-nowrap">{recipe.servings} Personen</span>
              {recipe.prepMinutes !== null && (
                <>
                  {" · "}
                  <span className="whitespace-nowrap">⏱ {recipe.prepMinutes} Min.</span>
                </>
              )}
              {" · "}
              <span className="whitespace-nowrap">
                {recipe.source === "ki" ? "✨ von der KI" : "✍️ Eigenes"}
              </span>
            </p>
          </div>
          <FavoriteButton recipe={recipe} />
        </div>

        <section className="rounded-3xl bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-lg font-bold">Zutaten für {recipe.servings} Personen</h3>
          {recipe.ingredients.length === 0 ? (
            <p className="text-stone-500">Keine Zutaten eingetragen.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {recipe.ingredients.map((i) => (
                <li key={i.id} className="flex gap-3 py-2 text-lg">
                  <span className="w-24 shrink-0 whitespace-nowrap text-right font-semibold text-stone-700">
                    {formatAmount(i.amount)} {i.unit}
                  </span>
                  <span>{i.name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {recipe.steps.length > 0 && (
          <section className="rounded-3xl bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-lg font-bold">Zubereitung</h3>
            <ol className="flex flex-col gap-3">
              {recipe.steps.map((step, index) => (
                <li key={index} className="flex gap-3 text-lg">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-700">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {recipe.note.trim() && (
          <section className="rounded-3xl bg-amber-50 p-4 text-lg text-amber-900 shadow-sm">
            <h3 className="mb-1 font-bold">Notiz</h3>
            <p className="whitespace-pre-line">{recipe.note}</p>
          </section>
        )}

        <section className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm">
          <h3 className="text-lg font-bold">Heute gekocht? Wie war&apos;s?</h3>
          {justCooked ? (
            <p className="rounded-2xl bg-emerald-100 px-4 py-3 font-semibold text-emerald-800" role="status">
              Gespeichert – danke! ✓
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => cooked("up")}
                  className="h-16 rounded-2xl border-2 border-emerald-300 bg-emerald-50 text-lg font-bold text-emerald-800 active:scale-95"
                >
                  👍 Lecker
                </button>
                <button
                  type="button"
                  onClick={() => cooked("down")}
                  className="h-16 rounded-2xl border-2 border-stone-200 bg-white text-lg font-bold text-stone-700 active:scale-95"
                >
                  👎 Eher nicht
                </button>
              </div>
              <button
                type="button"
                onClick={() => cooked(null)}
                className="self-center text-sm font-semibold text-stone-500 underline"
              >
                Nur als gekocht markieren
              </button>
            </>
          )}
          <p className="text-sm text-stone-500">
            {recipe.cookedCount > 0 ? (
              <>
                <span className="whitespace-nowrap">{recipe.cookedCount}× gekocht</span>
                {recipe.lastCookedAt && (
                  <>
                    {" · "}
                    <span className="whitespace-nowrap">zuletzt am {formatDate(recipe.lastCookedAt)}</span>
                  </>
                )}
                {" · "}
                <span className="whitespace-nowrap">
                  👍 {recipe.thumbsUp} 👎 {recipe.thumbsDown}
                </span>
              </>
            ) : (
              "Noch nie gekocht."
            )}
          </p>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href={`/kochbuch/bearbeiten?id=${encodeURIComponent(recipe.id)}`}
            className="flex h-14 items-center justify-center rounded-2xl bg-orange-100 text-lg font-bold text-orange-700 active:scale-95"
          >
            ✏️ Bearbeiten
          </Link>
          <button
            type="button"
            onClick={remove}
            className="h-14 rounded-2xl bg-white text-lg font-bold text-rose-700 shadow-sm active:scale-95"
          >
            Löschen
          </button>
        </div>
      </main>
    </div>
  );
}
