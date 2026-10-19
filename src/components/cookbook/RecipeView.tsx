"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Check, ChefHat, Clock, PenLine, Plus, Sparkles, ThumbsDown, ThumbsUp, Trash2, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CategoryChip } from "@/components/ui/Category";
import { CARD, FAB_CLEARANCE, PAGE_MAIN, SECTION_TITLE, buttonClass } from "@/components/ui/styles";
import { FavoriteButton } from "@/components/cookbook/CookbookList";
import { KnownSwitch } from "@/components/plan/PlanSheets";
import {
  deleteRecipe,
  formatAmount,
  recordCooked,
  useRecipes,
} from "@/lib/essen/cookbook";
import { learnFromRecipe, LIKE_WEIGHTS } from "@/lib/essen/likes";
import { adoptBuiltin, findRecipe, isBuiltin } from "@/lib/essen/baking";
import { ovenText } from "@/lib/essen/baking/steps";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { markCookedIfToday } from "@/lib/essen/mealDone";
import { useMealPlans } from "@/lib/essen/mealPlan";
import { useToday, useWeekPlans } from "@/lib/essen/weekPlan";
import { MachineStepView, MachineToggle, useMachineView } from "./MachineSteps";
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
  // "?personen=2": nur für heute umgerechnet ("heute sind wir nur zu zweit")
  const persons = Number(params.get("personen")) || null;
  // Neu mounten bei jedem Aufruf, sonst bliebe "Gespeichert" vom letzten Mal stehen.
  return <RecipeDetails key={`${bfcacheId}|${id}`} id={id} persons={persons} />;
}

function RecipeDetails({ id, persons }: { id: string; persons: number | null }) {
  const router = useRouter();
  const recipes = useRecipes();
  const profile = useProfile();
  const [justCooked, setJustCooked] = useState(false);
  const machine = useMachineView(profile);
  const today = useToday();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();

  if (recipes === undefined) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  // Auch eingebaute Backrezepte ("b:…") lassen sich ansehen
  const recipe = findRecipe(recipes, id);
  const builtin = isBuiltin(id);

  if (!recipe) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <PageHeader title="Rezept" backHref="/kochbuch" />
        <main className={`flex flex-col items-center gap-4 px-6 pt-10 text-center ${FAB_CLEARANCE}`}>
          <p className="text-base">Dieses Rezept gibt es nicht (mehr).</p>
          <Link href="/kochbuch" className={buttonClass("secondary")}>
            Zu den Rezepten
          </Link>
        </main>
      </div>
    );
  }

  const baking = recipe.kind === "backen";
  const scaleTo = persons && !baking && recipe.servings > 0 && persons !== recipe.servings ? persons : null;
  const machineOn = machine.on && recipe.machineSteps.length > 0;
  const kids = profile ? profile.persons.filter((p) => p.role === "kind") : [];

  const cooked = (rating: "up" | "down" | null) => {
    recordCooked(recipe.id, rating);
    // Heutiges Gericht → das Essen ist vorbei (Startseite zeigt schon das nächste)
    if (profile && today && weekPlans && mealPlans) markCookedIfToday({ profile, weekPlans, mealPlans, recipes }, today, recipe.id);
    // Gekocht (und evtl. 👍) → Zutaten zählen als Vorliebe
    if (rating !== "down") learnFromRecipe(recipe, rating === "up" ? LIKE_WEIGHTS.up : LIKE_WEIGHTS.cooked);
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
      <main className={PAGE_MAIN}>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-extrabold leading-tight tracking-tight">{recipe.title}</h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              {baking ? <span className="whitespace-nowrap font-semibold">🧁 Backen</span> : <CategoryChip category={recipe.category} />}
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <Users className="h-4 w-4" strokeWidth={2} aria-hidden />
                {recipe.servings} {baking ? "Stück" : "Personen"}
              </span>
              {recipe.prepMinutes !== null && (
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <Clock className="h-4 w-4" strokeWidth={2} aria-hidden />
                  {recipe.prepMinutes} Min.
                </span>
              )}
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                {builtin ? (
                  <>
                    <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden />
                    Aus unserer Backstube
                  </>
                ) : recipe.source === "ki" ? (
                  <>
                    <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden />
                    von der KI
                  </>
                ) : (
                  <>
                    <PenLine className="h-4 w-4" strokeWidth={2} aria-hidden />
                    Eigenes
                  </>
                )}
              </span>
            </p>
          </div>
          {!builtin && <FavoriteButton recipe={recipe} />}
        </div>

        {recipe.steps.length > 0 && (
          <Link href={`/kochbuch/kochen?id=${encodeURIComponent(recipe.id)}`} className={`${buttonClass("primary", "lg")} w-full`}>
            <ChefHat className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            {baking ? "Zusammen backen" : "Los geht's – Schritt für Schritt"}
          </Link>
        )}
        {builtin ? (
          <button
            type="button"
            onClick={() => router.push(`/kochbuch/rezept?id=${encodeURIComponent(adoptBuiltin(recipe))}`)}
            className={`${buttonClass("soft", "lg")} w-full`}
          >
            <Plus className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            In unsere Rezepte
          </button>
        ) : (
          <KnownSwitch recipe={recipe} />
        )}

        {(recipe.oven || recipe.pan) && (
          <p className={`${CARD} flex flex-wrap gap-x-3 gap-y-1 p-4 text-base`} aria-label="Backofen">
            {recipe.oven && <span className="font-bold">🔥 {ovenText(recipe.oven)}</span>}
            {recipe.pan && <span className="text-muted">{recipe.pan}</span>}
          </p>
        )}
        {recipe.machineSteps.length > 0 && <MachineToggle view={machine} />}

        <section className={`${CARD} p-4`}>
          <h3 className={`${SECTION_TITLE} mb-2`}>
            {scaleTo ? `Zutaten für ${scaleTo} Personen (nur heute)` : `Zutaten für ${recipe.servings} ${baking ? "Stück" : "Personen"}`}
          </h3>
          {recipe.ingredients.length === 0 ? (
            <p className="text-sm text-muted">Keine Zutaten eingetragen.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recipe.ingredients.map((i) => (
                <li key={i.id} className="flex gap-3 py-2 text-base">
                  <span className="w-24 shrink-0 whitespace-nowrap text-right font-semibold text-muted">
                    {formatAmount(i.amount === null || !scaleTo ? i.amount : Math.round((i.amount * scaleTo * 10) / recipe.servings) / 10)} {i.unit}
                  </span>
                  <span>{i.name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {machineOn ? (
          <section className={`${CARD} p-4`} aria-label="Schritte für Thermomix">
            <h3 className={`${SECTION_TITLE} mb-3`}>Schritte für Thermomix</h3>
            <ol className="flex flex-col gap-3">
              {recipe.machineSteps.map((step, index) => (
                <li key={index} className="flex gap-3 text-base">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent-strong">
                    {index + 1}
                  </span>
                  <span className="flex flex-col gap-1.5 pt-0.5">
                    {step.text}
                    <MachineStepView step={step} />
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          recipe.steps.length > 0 && (
            <section className={`${CARD} p-4`}>
              <h3 className={`${SECTION_TITLE} mb-3`}>Zubereitung</h3>
              <ol className="flex flex-col gap-3">
                {recipe.steps.map((step, index) => (
                  <li key={index} className="flex gap-3 text-base">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent-strong">
                      {index + 1}
                    </span>
                    <span className="pt-0.5">
                      {kids.length > 0 && recipe.kidSteps.includes(index) && <span className="mr-1 font-semibold text-accent-strong">🧒</span>}
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )
        )}

        {recipe.note.trim() && (
          <section className={`${CARD} p-4`}>
            <h3 className={`${SECTION_TITLE} mb-1`}>Notiz</h3>
            <p className="whitespace-pre-line text-base text-muted">{recipe.note}</p>
          </section>
        )}

        {/* Eingebaute Rezepte: erst "In unsere Rezepte", dann bewerten/bearbeiten */}
        {!builtin && (
          <>
        <section className={`${CARD} flex flex-col gap-3 p-4`}>
          <h3 className={SECTION_TITLE}>Heute gekocht? Wie war&apos;s?</h3>
          {justCooked ? (
            <p
              className="flex items-center gap-2 rounded-xl bg-accent-soft px-4 py-3 font-semibold text-accent-strong"
              role="status"
            >
              <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
              Gespeichert – danke!
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => cooked("up")} className={buttonClass("soft", "lg")}>
                  <ThumbsUp className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                  Lecker
                </button>
                <button type="button" onClick={() => cooked("down")} className={buttonClass("secondary", "lg")}>
                  <ThumbsDown className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                  Eher nicht
                </button>
              </div>
              <button
                type="button"
                onClick={() => cooked(null)}
                className="self-center text-sm font-semibold text-muted underline"
              >
                Nur als gekocht markieren
              </button>
            </>
          )}
          <p className="flex flex-wrap items-center gap-x-1 text-sm text-muted">
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
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <ThumbsUp className="h-3.5 w-3.5" strokeWidth={2} aria-label="gut" /> {recipe.thumbsUp}
                  <ThumbsDown className="ml-1 h-3.5 w-3.5" strokeWidth={2} aria-label="nicht so" /> {recipe.thumbsDown}
                </span>
              </>
            ) : (
              "Noch nie gekocht."
            )}
          </p>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <Link href={`/kochbuch/bearbeiten?id=${encodeURIComponent(recipe.id)}`} className={buttonClass("soft", "lg")}>
            <PenLine className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            Bearbeiten
          </Link>
          <button type="button" onClick={remove} className={buttonClass("danger", "lg")}>
            <Trash2 className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            Löschen
          </button>
        </div>
          </>
        )}
      </main>
    </div>
  );
}
