"use client";

// Rezept (Tafel 122): großes Bild mit „‹ Heute“ (weiße Pille) und „…“, im
// Bild unten „HEUTE · 18:30 · FÜR 5“, Name und „90 Min · alles im Haus bis auf
// Karotte“. Direkt darunter der große Knopf „Los, Schritt für Schritt“, dann
// „Zutaten“ mit Kästchen und „+ Liste“ (Personen-Zähler rechnet um) und „So
// geht’s“ (Kurz | Ausführlich, Timer-Chips, „Gegessen“). Danach Infozeile,
// „Für einen Tag einplanen“, „Kennen wir“, Notiz und Mehr Ideen. Bearbeiten,
// Teilen und Löschen stehen im „…“. Keine Bewertung, keine Zähler.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CalendarPlus, ChefHat, Clock, Minus, PenLine, Plus, Share2, Sparkles, Trash2, Users } from "lucide-react";
import { KochTimerLeiste } from "@/components/timer/KochTimerLeiste";
import { RezeptZutaten } from "@/components/essen/rezepte/RezeptZutaten";
import { RezeptSchritte } from "@/components/essen/rezepte/RezeptSchritte";
import { gegessen, useHeuteGericht } from "@/components/essen/rezepte/heuteGericht";
import { matchStock, realStock } from "@/lib/essen/dishIdeas";
import { useStock } from "@/lib/essen/useStock";
import { rezeptVorratZeile } from "@/lib/heute/essenKachel";
import { BackButton } from "@/components/ui/BackButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { CategoryChip } from "@/components/ui/Category";
import { MoreMenu, type MoreItem } from "@/components/ui/MoreMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Sheet } from "@/components/ui/Sheet";
import { CARD, CARD_LIST, FAB_CLEARANCE, PAGE_MAIN, SECTION_TITLE, buttonClass } from "@/components/ui/styles";
import { DishPicture } from "@/components/essen/DishPicture";
import { FavoriteButton } from "@/components/essen/rezepte/CookbookList";
import { KnownSwitch } from "@/components/essen/plan/PlanSheets";
import { deleteRecipe, formatAmount, personsParam, restoreRecipe, useRecipes, type Recipe } from "@/lib/essen/cookbook";
import { adoptBuiltin, findRecipe, isBuiltin } from "@/lib/essen/baking";
import { ovenText } from "@/lib/essen/baking/steps";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { effectivePlanStyle } from "@/lib/einstellungen/profile";
import { loadMealPlans, replaceMealPlans, useMealPlans } from "@/lib/essen/mealPlan";
import { takeForDay } from "@/lib/essen/spontanTake";
import { addDays, toIsoDate, useToday, useWeekPlans } from "@/lib/essen/weekPlan";
import { dishTone } from "@/lib/essen/dishLook";
import { demoLook, isDemoRecipe } from "@/lib/essen/demoDish";
import { showDeleted, showToast } from "@/lib/core/toast";
import { todayIso } from "@/lib/core/now";
import { pushUndo } from "@/lib/core/undo";
import { weekdayLong } from "@/lib/kalender/model";
import { MachineStepView, MachineToggle, useMachineView } from "@/components/essen/rezepte/MachineSteps";
import { MoreIdeas } from "@/components/essen/rezepte/MoreIdeas";

const ROUND = "flex h-[34px] w-[34px] items-center justify-center rounded-full bg-surface/90 shadow-card";

export function RecipeView() {
  const params = useSearchParams();
  const { bfcacheId } = useRouter();
  const id = params.get("id") ?? "";
  // "?personen=2": nur für heute umgerechnet ("heute sind wir nur zu zweit")
  const persons = personsParam(params.get("personen"));
  return <RecipeDetails key={`${bfcacheId}|${id}`} id={id} persons={persons} />;
}

function RecipeDetails({ id, persons }: { id: string; persons: number | null }) {
  const router = useRouter();
  const recipes = useRecipes();
  const profile = useProfile();
  const machine = useMachineView(profile);
  const today = useToday();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const [people, setPeople] = useState<number | null>(persons);
  const [planning, setPlanning] = useState(false);
  const [asking, setAsking] = useState(false);
  const heute = useHeuteGericht();
  const stock = useStock();

  if (recipes === undefined) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  // Auch eingebaute Backrezepte ("b:…") und Beispiel-Rezepte ("d:…") lassen sich ansehen
  const recipe = findRecipe(recipes, id);
  const demo = isDemoRecipe(id);
  const builtin = isBuiltin(id) || demo;

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
  // Gericht von heute (Tafel 122): „HEUTE · 18:30 · FÜR 5“, Mengen für den Haushalt
  const isToday = Boolean(heute && heute.recipeId === recipe.id && !heute.over);
  const servings = people ?? (isToday && !baking ? heute?.persons : null) ?? recipe.servings;
  const scaleTo = !baking && recipe.servings > 0 && servings !== recipe.servings ? servings : null;
  const machineOn = machine.on && recipe.machineSteps.length > 0;
  const kids = profile ? profile.persons.filter((p) => p.role === "kind") : [];
  const look = demoLook(recipe.id);
  const kopf = [isToday && heute ? `Heute · ${heute.clock}` : "", baking ? "" : `für ${servings}`].filter(Boolean).join(" · ");
  const needs = stock && realStock(stock).length ? matchStock(recipe.ingredients.map((i) => i.name), stock, todayIso()).needs : null;
  const vorrat = rezeptVorratZeile(recipe.prepMinutes, baking ? null : needs);

  const share = async () => {
    const text = [recipe.title, "", ...recipe.ingredients.map((i) => `• ${[formatAmount(i.amount), i.unit, i.name].filter(Boolean).join(" ")}`), "", ...recipe.steps.map((s, n) => `${n + 1}. ${s}`)].join("\n");
    try {
      if (navigator.share) return void (await navigator.share({ title: recipe.title, text }));
      await navigator.clipboard.writeText(text);
      showToast({ text: "Rezept kopiert", small: true });
    } catch {
      // Abbrechen im Teilen-Menü ist kein Fehler
    }
  };
  // Echtes Löschen: erst kurz fragen, danach „Gelöscht · Rückgängig“
  const remove = () => {
    setAsking(false);
    const gone = recipe;
    router.push("/kochbuch");
    deleteRecipe(gone.id);
    showDeleted(pushUndo(`das Löschen von ${gone.title}`, () => void restoreRecipe(gone)));
  };
  const menu: MoreItem[] = builtin
    ? [
        { label: "In unsere Rezepte", icon: Plus, href: () => `/kochbuch/rezept?id=${encodeURIComponent(adoptBuiltin(recipe))}` },
        { label: "Teilen", icon: Share2, onClick: () => void share() },
      ]
    : [
        { label: "Bearbeiten", icon: PenLine, href: `/kochbuch/bearbeiten?id=${encodeURIComponent(recipe.id)}` },
        { label: "Teilen", icon: Share2, onClick: () => void share() },
        { label: "Löschen", icon: Trash2, onClick: () => setAsking(true), danger: true },
      ];

  const zutatenKopf = baking ? (
    <span className="text-sm text-muted">für {recipe.servings} Stück</span>
  ) : (
    <span className="flex items-center gap-1" role="group" aria-label="Personen">
      <button type="button" onClick={() => setPeople(Math.max(1, servings - 1))} disabled={servings <= 1} aria-label="Eine Person weniger" className={`hit ${ROUND} bg-fill`}>
        <Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
      </button>
      <span className="flex min-w-24 items-center justify-center gap-1 text-[15px] font-bold" aria-live="polite">
        <Users className="h-4 w-4 text-muted" strokeWidth={2} aria-hidden />
        {servings} {servings === 1 ? "Person" : "Personen"}
      </span>
      <button type="button" onClick={() => setPeople(Math.min(20, servings + 1))} aria-label="Eine Person mehr" className={`hit ${ROUND} bg-fill`}>
        <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
      </button>
    </span>
  );

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      {/* Großes Bild, darin unten Zeit, Name und was im Haus ist (Tafel 122) */}
      <div className="relative">
        <DishPicture photo={look?.photo} title={recipe.title} ingredients={recipe.ingredients.map((i) => i.name)} category={recipe.category} tone={look?.tone ?? dishTone(recipe.title, recipe.category)} alt={recipe.title} className="aspect-[4/3] w-full" />
        <span className="dish-tile-shade absolute inset-0" aria-hidden />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <BackButton fallback="/kochbuch" pill />
          <MoreMenu title={recipe.title} items={menu} light />
        </div>
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 px-4 pb-3 text-on-color">
          {kopf && (
            <span className="text-[11px] font-extrabold uppercase tracking-wider" data-rezept-kopf>
              {kopf}
            </span>
          )}
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">{recipe.title}</h1>
          {vorrat && <p className="text-[13px] font-semibold">{vorrat}</p>}
        </div>
      </div>
      <main className={`${PAGE_MAIN} pt-4`}>
        <KochTimerLeiste />
        {recipe.steps.length > 0 && (
          <Link href={`/kochbuch/kochen?id=${encodeURIComponent(recipe.id)}${baking ? "" : `&personen=${servings}`}`} className={`${buttonClass("primary", "lg")} h-[50px] w-full`} data-los>
            <ChefHat className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            {baking ? "Zusammen backen" : "Los, Schritt für Schritt"}
          </Link>
        )}

        {(recipe.oven || recipe.pan) && (
          <p className={`${CARD} flex flex-wrap gap-x-3 gap-y-1 p-4 text-base`} aria-label="Backofen">
            {recipe.oven && <span className="font-bold">{ovenText(recipe.oven)}</span>}
            {recipe.pan && <span className="text-muted">{recipe.pan}</span>}
          </p>
        )}

        <RezeptZutaten recipe={recipe} scaleTo={scaleTo} kopfRechts={zutatenKopf} />

        {recipe.machineSteps.length > 0 && <MachineToggle view={machine} />}
        {machineOn ? (
          <section className={`${CARD} p-4`} aria-label="Schritte für Thermomix">
            <h2 className={`${SECTION_TITLE} mb-3`}>So geht’s mit Thermomix</h2>
            <ol className="flex flex-col gap-3">
              {recipe.machineSteps.map((step, index) => (
                <li key={index} className="flex gap-3 text-base">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent-strong">{index + 1}</span>
                  <span className="flex flex-col gap-1.5 pt-0.5">
                    {step.text}
                    <MachineStepView step={step} />
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          recipe.steps.length > 0 && <RezeptSchritte recipe={recipe} kids={kids.length > 0} onGegessen={isToday && heute && recipes ? () => gegessen(heute, recipes) : undefined} />
        )}

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          {baking ? <span className="whitespace-nowrap font-semibold">Backen</span> : <CategoryChip category={recipe.category} />}
          {recipe.prepMinutes !== null && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <Clock className="h-4 w-4" strokeWidth={2} aria-hidden />
              {recipe.prepMinutes} Min.
            </span>
          )}
          {(builtin || recipe.source === "ki") && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden />
              {demo ? "Beispiel-Rezept" : builtin ? (baking ? "Aus unserer Backstube" : "Aus unserer Küche") : "Vorschlag"}
            </span>
          )}
          {!builtin && (
            <span className="ml-auto">
              <FavoriteButton recipe={recipe} />
            </span>
          )}
        </p>
        {!demo && profile && (
          <button type="button" onClick={() => setPlanning(true)} className={`${buttonClass("secondary", "lg")} w-full`}>
            <CalendarPlus className="h-5 w-5 text-accent" strokeWidth={2.25} aria-hidden />
            Für einen Tag einplanen
          </button>
        )}
        {!builtin && <KnownSwitch recipe={recipe} />}

        {recipe.note.trim() && (
          <section className={`${CARD} p-4`}>
            <h3 className={`${SECTION_TITLE} mb-1`}>Notiz</h3>
            <p className="whitespace-pre-line text-base text-muted">{recipe.note}</p>
          </section>
        )}

        {!baking && <MoreIdeas current={recipe.id} demo={demo} />}
      </main>
      {asking && (
        <ConfirmDialog
          title={`„${recipe.title}“ löschen?`}
          text="Dann ist es aus euren Rezepten raus."
          confirmLabel="Löschen"
          danger
          onConfirm={remove}
          onCancel={() => setAsking(false)}
        />
      )}
      {planning && profile && today && weekPlans && mealPlans && (
        <PlanDaySheet
          recipe={recipe}
          onClose={() => setPlanning(false)}
          onPick={(date) => {
            const before = loadMealPlans();
            const result = takeForDay({ profile, weekPlans, mealPlans: before, recipes }, today, { title: recipe.title, recipeId: recipe.id, category: recipe.category }, date, {
              spontan: effectivePlanStyle(profile) === "spontan",
            });
            setPlanning(false);
            if (!result.ok) return showToast({ text: result.text });
            replaceMealPlans(result.weeks);
            pushUndo(result.text, () => replaceMealPlans(before));
            showToast({ text: result.text, small: true });
          }}
          today={toIsoDate(today)}
        />
      )}
    </div>
  );
}

/** Für einen Tag einplanen: die nächsten 7 Tage */
function PlanDaySheet({ recipe, today, onPick, onClose }: { recipe: Recipe; today: string; onPick: (date: string) => void; onClose: () => void }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  return (
    <Sheet title={`${recipe.title} einplanen`} onClose={onClose}>
      <div className={`${CARD_LIST} mb-3`}>
        {days.map((d, i) => (
          <button key={d} type="button" onClick={() => onPick(d)} className="flex h-14 w-full items-center justify-between px-4 text-left text-base font-semibold active:bg-fill">
            {i === 0 ? "Heute" : i === 1 ? "Morgen" : weekdayLong(d)}
            <span className="text-sm font-normal text-muted">
              {Number(d.slice(8))}.{Number(d.slice(5, 7))}.
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
