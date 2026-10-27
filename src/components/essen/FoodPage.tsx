"use client";

// Seite "Essen" (der einzige Ort für den Plan): groß das Gericht von heute
// (nach dem Essen: morgen) mit Teller-Bild, darunter die Wochenkarte Mo–So
// („Diese Woche“ / „Nächste Woche“ mit ‹ ›, jeder Tag mit Gericht-Bild,
// feste Tage hellorange): Antippen = das Gericht (Rezept bzw. das eine
// Tausch-Fenster), freier Tag = „Was gibt’s?“ mit Vorschlägen. Dazu "Plan
// öffnen" und Einkauf als Chips.

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { CARD, ICON_BUTTON, SECTION_TITLE, buttonClass, chipClass } from "@/components/ui/styles";
import { formatWeekRange } from "@/lib/essen/weekPlan";
import { QuickAddButton } from "@/components/einkauf/QuickAdd";
import { SwapSheet } from "@/components/essen/SwapSheet";
import { clockLabel } from "@/lib/kalender/answers";
import { weekdayShort } from "@/lib/kalender/model";
import { addDays } from "@/lib/core/now";
import { helperName, mealClockFor } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { matchStock, stockLine } from "@/lib/essen/dishIdeas";
import { dishTone } from "@/lib/essen/dishLook";
import { mealIsOver, useCookedDays } from "@/lib/essen/mealDone";
import type { PlanDay } from "@/lib/essen/mealPlan";
import { useStock } from "@/lib/essen/useStock";
import { openHelper } from "@/lib/begleitung/open";
import type { HomeData } from "@/components/heute/useHomeData";
import { mondayOf } from "@/components/kalender/CalendarPage";
import { dishOf, useMeals } from "@/components/essen/useMeals";
import { BausteinSections } from "@/components/essen/BausteinSections";
import { StockChips } from "@/components/essen/CookFromStock";
import { MoreIdeas } from "@/components/essen/rezepte/MoreIdeas";
import { loadMealPlans, replaceMealPlans } from "@/lib/essen/mealPlan";
import { takeForDay } from "@/lib/essen/spontanTake";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import type { Recipe } from "@/lib/essen/cookbook";
import { useFeature } from "@/lib/core/features";
import { demoTiles, useDemo } from "@/lib/core/demo";
import { DishPicture } from "@/components/essen/DishPicture";
import { DemoDishHero } from "@/components/essen/DemoFoodTile";

export function FoodPage({ data, minutes }: { data: HomeData; minutes: number }) {
  const cooked = useCookedDays();
  const over = Boolean(cooked && mealIsOver(data.day, data.profile, minutes, cooked));
  const router = useRouter();
  const [next, setNext] = useState(false);
  const monday = addDays(mondayOf(data.todayIso), next ? 7 : 0);
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

      <section className="flex flex-col gap-2" aria-label={next ? "Nächste Woche" : "Diese Woche"} id="woche" data-wochenkarte>
        <div className="flex items-center justify-between gap-1 px-1">
          <button type="button" onClick={() => setNext(false)} disabled={!next} aria-label="Diese Woche" className={`${ICON_BUTTON} h-11 w-11 border-0 disabled:opacity-30`}>
            <ChevronLeft className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h2 className={SECTION_TITLE}>{next ? "Nächste Woche" : "Diese Woche"}</h2>
            <p className="text-[13px] text-muted">{formatWeekRange(monday)}</p>
          </div>
          <button type="button" onClick={() => setNext(true)} disabled={next} aria-label="Nächste Woche" className={`${ICON_BUTTON} h-11 w-11 border-0 disabled:opacity-30`}>
            <ChevronRight className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
        {planOn && (
          <Link href="/wochenplan" className="-mt-1 flex h-10 items-center gap-0.5 self-end px-1 text-[15px] font-bold text-accent-strong">
            Plan öffnen <ChevronRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          </Link>
        )}
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
                  onClick={() => {
                    if (!day || past) return;
                    // Antippen = das Gericht: mit Rezept die Rezeptseite, sonst das eine Fenster (frei: „Was gibt’s?“)
                    const recipeId = day.slot.entry?.recipeId;
                    if (dish && recipeId) router.push(`/kochbuch/rezept?id=${encodeURIComponent(recipeId)}`);
                    else setSwap(day);
                  }}
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
      <MoreIdeas
        current={main?.slot.entry?.recipeId ?? ""}
        exclude={dishOf(main)}
        demo={demoDish}
        title={over ? "Ideen für morgen" : dishOf(main) ? "Mehr Ideen" : "Ideen für heute"}
        take={{ label: "Fürs Abendessen", onTake: (r) => takeDinner(data, r, over ? addDays(data.todayIso, 1) : data.todayIso) }}
      />
      <BausteinSections />
      <ShoppingChips />
      {swap && <SwapSheet data={data} day={swap} onClose={() => setSwap(null)} />}
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
