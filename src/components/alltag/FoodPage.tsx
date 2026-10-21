"use client";

// Seite "Essen" (der einzige Ort für den Plan): groß das Gericht von heute
// (nach dem Essen: morgen) mit Teller-Bild, darunter die Woche Mo–So als
// Reihe mit Bildern (frei = gestrichelt mit Plus, feste Tage hellorange,
// Antippen = das eine Tausch-Fenster), "Plan öffnen" und Einkauf als Chips.

import Link from "next/link";
import { useState } from "react";
import { ArrowLeftRight, ChevronRight, Plus } from "lucide-react";
import { CARD, SECTION_TITLE, buttonClass, chipClass } from "@/components/ui/styles";
import { QuickAddButton } from "@/components/shopping/QuickAdd";
import { SwapSheet } from "@/components/essen/SwapSheet";
import { clockLabel } from "@/lib/aufgaben/answers";
import { weekdayShort } from "@/lib/aufgaben/model";
import { addDays } from "@/lib/core/now";
import { helperName, mealClockFor } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { matchStock } from "@/lib/essen/dishIdeas";
import { dishTone } from "@/lib/essen/dishLook";
import { mealIsOver, useCookedDays } from "@/lib/essen/mealDone";
import type { PlanDay } from "@/lib/essen/mealPlan";
import { useStock } from "@/lib/essen/useStock";
import { openHelper } from "@/lib/lotte/open";
import type { HomeData } from "@/components/home/useHomeData";
import { mondayOf } from "@/components/kalender/CalendarPage";
import { dishOf, useMeals } from "./useMeals";
import { BausteinSections } from "./BausteinSections";
import { CookIdeas, StockChips } from "./CookFromStock";
import { useFeature } from "@/lib/core/features";
import { demoTiles, useDemo } from "@/lib/core/demo";
import { DishPicture } from "./DishPicture";
import { DemoDishHero } from "./DemoFoodTile";

export function FoodPage({ data, minutes }: { data: HomeData; minutes: number }) {
  const cooked = useCookedDays();
  const over = Boolean(cooked && mealIsOver(data.day, data.profile, minutes, cooked));
  const monday = mondayOf(data.todayIso);
  const meals = useMeals(monday, 7);
  const [swap, setSwap] = useState<PlanDay | null>(null);
  const planOn = useFeature("wochenplan");
  const main = over ? data.tomorrow : data.day;
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  // Beispiel-Tag: ohne eigenes Gericht steht das Beispielgericht da ("Heute",
  // nach dem Essen das zweite für "Morgen" – auch wenn der Tag schon vorbei ist)
  const demo = useDemo();
  const demoDish = !dishOf(main) && demoTiles(demo, data.todayIso).includes("essen");
  return (
    <div className="flex flex-col gap-4">
      {demoDish ? <DemoDishHero today={data.todayIso} minutes={minutes} /> : <DishHero data={data} day={main} when={over ? "Morgen" : "Heute"} onSwap={() => main && setSwap(main)} />}

      <section className="flex flex-col gap-2" aria-label="Diese Woche">
        <div className="flex items-center justify-between px-1">
          <h2 className={SECTION_TITLE}>Diese Woche</h2>
          {planOn && (
            <Link href="/wochenplan" className="flex h-10 items-center gap-0.5 text-[15px] font-bold text-accent-strong">
              Plan öffnen <ChevronRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </Link>
          )}
        </div>
        <ol className={`${CARD} grid grid-cols-7 gap-1 p-2`}>
          {week.map((date) => {
            const day = meals?.get(date);
            const dish = dishOf(day);
            const fixed = day?.slot.entry?.origin === "fest";
            const past = date < data.todayIso;
            const isToday = date === data.todayIso;
            return (
              <li key={date}>
                <button
                  type="button"
                  onClick={() => day && !past && setSwap(day)}
                  disabled={past || !day}
                  aria-label={`${weekdayShort(date)}: ${dish ?? (day?.away ? (day.paused ? "Pause" : "kein Kochtag") : "noch frei")}`}
                  className={`flex w-full flex-col items-center gap-1 rounded-field py-1.5 ${fixed ? "bg-accent-soft" : ""} ${past ? "opacity-45" : ""}`}
                  aria-current={isToday ? "date" : undefined}
                >
                  <span className={`text-[12px] font-bold ${isToday ? "text-accent-strong" : "text-muted"}`}>{weekdayShort(date)}</span>
                  {dish ? (
                    <DishPicture title={dish} category={day?.slot.entry?.category} tone={dishTone(dish, day?.slot.entry?.category)} alt="" small className={`h-10 w-10 rounded-full ${isToday ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`} />
                  ) : day?.away ? (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-fill text-[11px] text-muted">{day.paused ? "Pause" : "–"}</span>
                  ) : (
                    <span className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed text-faint ${isToday ? "border-accent" : "border-line-strong"}`}>
                      <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <StockChips today={data.todayIso} />
      <CookIdeas data={data} over={over} planned={dishOf(main)} />
      <BausteinSections />
      <ShoppingChips />
      {swap && <SwapSheet data={data} day={swap} onClose={() => setSwap(null)} />}
    </div>
  );
}

/** Großes Gericht mit Uhrzeit, Dauer, „Alles im Haus“ (grüner Punkt) bzw. „auf die Liste: …“ */
function DishHero({ data, day, when, onSwap }: { data: HomeData; day: PlanDay | undefined; when: string; onSwap: () => void }) {
  const stock = useStock();
  const entry = day && !day.away ? day.slot.entry : null;
  const recipe = entry?.recipeId ? data.recipes[entry.recipeId] : undefined;
  const needs = recipe && stock ? matchStock(recipe.ingredients.map((i) => i.name), stock).needs : null;
  const todayPersons = entry && entry.stored.kind !== "wish" ? entry.stored.persons : undefined;
  const facts = [todayPersons ? `für ${todayPersons} Personen` : "", recipe?.prepMinutes ? `${recipe.prepMinutes} Min` : ""].filter(Boolean);
  const clock = entry && day ? clockLabel(mealClockFor(data.profile, day.weekday)) : "";
  if (entry) {
    const recipeHref = entry.recipeId ? `/kochbuch/rezept?id=${entry.recipeId}${todayPersons ? `&personen=${todayPersons}` : ""}` : null;
    const cookHref = entry.recipeId ? `/kochbuch/kochen?id=${entry.recipeId}` : null;
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
            {needs && (
              <span className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-bold ${needs.length ? "bg-surface/90 text-accent-strong" : "bg-good-soft text-good-ink"}`}>
                {!needs.length && <span className="h-2 w-2 rounded-full bg-good" aria-hidden />}
                {needs.length ? `auf die Liste: ${needs.slice(0, 2).join(", ")}${needs.length > 2 ? " …" : ""}` : "alles im Haus"}
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
        <Link href="/einkaufsliste" className="text-base text-muted">
          Die Liste ist leer – sag {helperName(profile)} einfach, was ihr braucht.
        </Link>
      )}
    </section>
  );
}
