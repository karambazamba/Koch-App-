"use client";

// Seite "Essen" (der einzige Ort für den Plan): groß das Gericht von heute
// (nach dem Essen: morgen) mit Teller-Bild, darunter „Die nächsten 7 Tage“
// ab heute (Tafel 97, `sieben/SiebenTage`): Liste oder Reihe, jeder Tag
// öffnet dasselbe Fenster (`sieben/TagFenster`), Ziehen tauscht Tage. Dazu
// Ideen und Einkauf als Chips. So einfach wie möglich, große Bilder.

import Link from "next/link";
import { useState } from "react";
import { ArrowLeftRight, ChevronRight } from "lucide-react";
import { CARD, SECTION_TITLE, buttonClass, chipClass } from "@/components/ui/styles";
import { QuickAddButton } from "@/components/einkauf/QuickAdd";
import { SiebenTage } from "@/components/essen/sieben/SiebenTage";
import { TagFenster } from "@/components/essen/sieben/TagFenster";
import { naechsteSieben } from "@/lib/essen/sieben";
import { clockLabel } from "@/lib/kalender/answers";
import { addDays } from "@/lib/core/now";
import { helperName, mealClockFor } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { matchStock, stockLine } from "@/lib/essen/dishIdeas";
import { dishTone } from "@/lib/essen/dishLook";
import { mealIsOver, useCookedDays } from "@/lib/essen/mealDone";
import type { PlanDay } from "@/lib/essen/mealPlan";
import { useStock } from "@/lib/essen/useStock";
import { recipeHref as hrefFor } from "@/lib/essen/baking";
import { openHelper } from "@/lib/begleitung/open";
import type { HomeData } from "@/components/heute/useHomeData";
import { dishOf, useMeals } from "@/components/essen/useMeals";
import { BausteinSections } from "@/components/essen/BausteinSections";
import { StockChips } from "@/components/essen/CookFromStock";
import { MoreIdeas } from "@/components/essen/rezepte/MoreIdeas";
import { loadMealPlans, replaceMealPlans } from "@/lib/essen/mealPlan";
import { takeForDay } from "@/lib/essen/spontanTake";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import type { Recipe } from "@/lib/essen/cookbook";
import { demoTiles, useDemo } from "@/lib/core/demo";
import { DishPicture } from "@/components/essen/DishPicture";
import { DemoDishHero } from "@/components/essen/DemoFoodTile";

export function FoodPage({ data, minutes }: { data: HomeData; minutes: number }) {
  const cooked = useCookedDays();
  const over = Boolean(cooked && mealIsOver(data.day, data.profile, minutes, cooked));
  // Rollend ab heute über die Wochengrenze; vergangene Tage fallen raus
  const meals = useMeals(data.todayIso, 7);
  const tage = naechsteSieben(data.todayIso).flatMap((d) => (meals?.get(d) ? [meals.get(d)!] : []));
  const [swap, setSwap] = useState<PlanDay | null>(null);
  const main = over ? data.tomorrow : data.day;
  // Beispiel-Tag: ohne eigenes Gericht steht das Beispielgericht da ("Heute",
  // nach dem Essen das zweite für "Morgen" – auch wenn der Tag schon vorbei ist)
  const demo = useDemo();
  const demoDish = !dishOf(main) && demoTiles(demo, data.todayIso).includes("essen");
  return (
    <div className="flex flex-col gap-4">
      {demoDish ? <DemoDishHero today={data.todayIso} minutes={minutes} /> : <DishHero data={data} day={main} when={over ? "Morgen" : "Heute"} onSwap={() => main && setSwap(main)} />}

      {tage.length > 0 && <SiebenTage data={data} tage={tage} />}

      <StockChips today={data.todayIso} />
      <MoreIdeas
        current={main?.slot.entry?.recipeId ?? ""}
        exclude={dishOf(main)}
        demo={demoDish}
        title={over ? "Ideen für morgen" : dishOf(main) ? "Mehr Ideen" : "Ideen für heute"}
        take={{ label: "Fürs Abendessen", onTake: (r) => takeDinner(data, r, over ? addDays(data.todayIso, 1) : data.todayIso) }}
      />
      <BausteinSections />
      <ShoppingChips />
      {swap && <TagFenster data={data} day={swap} tage={tage} onClose={() => setSwap(null)} />}
    </div>
  );
}

/** „Fürs Abendessen“ aus den Ideen: direkt für heute (nach dem Essen für morgen) eintragen, kurz melden (Mia kann es rückgängig machen) */
function takeDinner(data: HomeData, r: Recipe, date: string) {
  const before = loadMealPlans();
  const result = takeForDay({ profile: data.profile, weekPlans: data.weekPlans, mealPlans: before, recipes: data.recipes }, data.today, { title: r.title, recipeId: r.id, category: r.category }, date, { spontan: data.planStyle === "spontan" });
  if (!result.ok) return showToast({ text: result.text });
  replaceMealPlans(result.weeks);
  pushUndo(result.text, () => replaceMealPlans(before));
  showToast({ text: result.text, small: true });
}

/** Großes Gericht mit Uhrzeit, Dauer, „Alles im Haus“ (grüner Punkt) bzw. „auf die Liste: …“ */
function DishHero({ data, day, when, onSwap }: { data: HomeData; day: PlanDay | undefined; when: string; onSwap: () => void }) {
  const stock = useStock();
  const entry = day && !day.away ? day.slot.entry : null;
  const recipe = entry?.recipeId ? data.recipes[entry.recipeId] : undefined;
  const match = recipe && stock ? matchStock(recipe.ingredients.map((i) => i.name), stock, data.todayIso) : null;
  const line = match ? stockLine(match) : null;
  const todayPersons = entry && entry.stored.kind !== "wish" ? entry.stored.persons : undefined;
  const facts = [todayPersons ? `für ${todayPersons} Personen` : "", recipe?.prepMinutes ? `${recipe.prepMinutes} Min` : ""].filter(Boolean);
  const clock = entry && day ? clockLabel(mealClockFor(data.profile, day.weekday)) : "";
  if (entry) {
    // Links nur, wenn es das Rezept (noch) gibt
    const recipeHref = hrefFor(data.recipes, entry.recipeId, todayPersons);
    const cookHref = recipeHref && entry.recipeId ? `/kochbuch/kochen?id=${encodeURIComponent(entry.recipeId)}${todayPersons ? `&personen=${todayPersons}` : ""}` : null;
    return (
      <section className="relative overflow-hidden rounded-card shadow-card" aria-label={`Essen ${when.toLowerCase()} · ${entry.title}`}>
        <DishPicture title={entry.title} category={entry.category} tone={dishTone(entry.title, entry.category)} alt="" className="absolute inset-0" />
        <span className="dish-shade absolute inset-0" aria-hidden />
        <button type="button" onClick={onSwap} className="hit absolute left-3 top-3 flex h-8 items-center gap-1 rounded-full bg-surface/90 px-3 text-[13px] font-bold text-ink shadow-card">
          <ArrowLeftRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
          Tauschen
        </button>
        {recipeHref ? <Link href={recipeHref} className="absolute inset-0" aria-label={`Rezept: ${entry.title}`} /> : null}
        <div className="pointer-events-none relative flex min-h-[190px] flex-col justify-end gap-1.5 p-4 pt-14 text-on-color">
          <span className="text-[11px] font-extrabold uppercase tracking-wider opacity-90">
            {when}
            {clock ? ` · ${clock}` : ""}
          </span>
          <h2 className="text-[24px] font-extrabold leading-tight tracking-tight">{entry.title}</h2>
          <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
            {line && (
              <span className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-bold ${line.tone === "liste" ? "bg-surface/90 text-accent-strong" : line.tone === "grau" ? "bg-surface/90 text-muted" : "bg-good-soft text-good-ink"}`}>
                {line.tone === "gut" && <span className="h-2 w-2 rounded-full bg-good" aria-hidden />}
                {line.text}
              </span>
            )}
            {facts.map((f) => (
              <span key={f} className="inline-flex h-7 items-center rounded-full bg-surface/90 px-2.5 text-[12px] font-bold text-ink">
                {f}
              </span>
            ))}
            {cookHref && (
              <Link href={cookHref} className="hit inline-flex h-7 items-center gap-0.5 rounded-full bg-accent px-3 text-[12px] font-bold text-on-accent">
                Kochen <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className={`${CARD} overflow-hidden`} aria-label={`Essen ${when.toLowerCase()}`}>
      <DishPicture alt="" className="h-28 w-full" />
      <div className="flex flex-col gap-1.5 p-4">
        <p className="text-[15px] font-extrabold text-accent-strong">{when}</p>
        <h2 className="text-2xl font-extrabold leading-tight tracking-tight">{day?.away ? (day.paused ? "Pause – genießt die Zeit" : "Kein Kochtag") : "Noch frei"}</h2>
        {!day?.away && (
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={onSwap} className={buttonClass("primary", "md")}>
              Ideen zeigen
            </button>
            <button type="button" onClick={() => openHelper(undefined, `Was gibt’s ${when.toLowerCase()}?`)} className={buttonClass("secondary", "md")}>
              {helperName(data.profile)} fragen
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/** Einkaufsliste als Chips, Plus zum Ergänzen */
function ShoppingChips() {
  const profile = useProfile();
  const shopping = useWeekShoppingList("planning");
  if (!shopping) return null;
  const open = shopping.list.items.filter((i) => !i.checked && !i.hidden);
  return (
    <section className="flex flex-col gap-2" aria-label="Einkauf">
      <div className="flex items-center justify-between">
        <h2 className={SECTION_TITLE}>Einkauf</h2>
        <QuickAddButton weekStart={shopping.weekStart} settings={shopping.settings} small />
      </div>
      {open.length ? (
        <div className="flex flex-wrap gap-2">
          {open.slice(0, 14).map((i) => (
            <Link key={i.key} href="/einkaufsliste" className={chipClass(false)}>
              {i.name}
            </Link>
          ))}
          {open.length > 14 && (
            <Link href="/einkaufsliste" className={chipClass(false, "muted")}>
              Alle ansehen
            </Link>
          )}
        </div>
      ) : (
        <Link href="/einkaufsliste" className="hit text-base text-muted">
          Die Liste ist leer – sag {helperName(profile)} einfach, was ihr braucht.
        </Link>
      )}
    </section>
  );
}
