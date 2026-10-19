"use client";

// Seite "Essen": groß das Gericht von heute (nach dem Essen: morgen), darunter
// "Diese Woche" als Liste (Antippen = tauschen) und die Einkaufsliste als
// Chips. Nutzt die bestehenden Essensdaten (Wochenplan, Rezepte, Vorrat).

import Link from "next/link";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { CARD, buttonClass, chipClass } from "@/components/ui/styles";
import { Sheet } from "@/components/plan/Sheet";
import { QuickAddButton } from "@/components/shopping/QuickAdd";
import { clockLabel } from "@/lib/aufgaben/answers";
import { weekdayLong, weekdayShort } from "@/lib/aufgaben/model";
import { addDays } from "@/lib/core/now";
import { showDeleted, showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { helperName, mealClockFor } from "@/lib/einstellungen/profile";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { matchStock } from "@/lib/essen/dishIdeas";
import { dishEmoji } from "@/lib/essen/dishEmoji";
import { mealIsOver, useCookedDays } from "@/lib/essen/mealDone";
import { entriesWithoutSlot, loadMealPlans, mealPlansWithWeek, replaceMealPlans, type PlanDay } from "@/lib/essen/mealPlan";
import { takeForDay } from "@/lib/essen/spontanTake";
import { useTodayIdeas } from "@/lib/essen/useIdeas";
import { useStock } from "@/lib/essen/useStock";
import { weekStartFor } from "@/lib/essen/weekPlan";
import { openHelper } from "@/lib/lotte/open";
import type { HomeData } from "@/components/home/useHomeData";
import { dishOf, useMeals } from "./useMeals";
import { BausteinSections } from "./BausteinSections";
import { useFeature } from "@/lib/core/features";

export function FoodPage({ data, minutes }: { data: HomeData; minutes: number }) {
  const cooked = useCookedDays();
  const over = Boolean(cooked && mealIsOver(data.day, data.profile, minutes, cooked));
  const meals = useMeals(data.todayIso, 8);
  const [swap, setSwap] = useState<PlanDay | null>(null);
  const planOn = useFeature("wochenplan");
  const main = over ? data.tomorrow : data.day;
  const list = Array.from({ length: 7 }, (_, i) => addDays(data.todayIso, i + (over ? 1 : 0)));
  return (
    <div className="flex flex-col gap-4">
      <DishHero data={data} day={main} when={over ? "Morgen" : "Heute"} onSwap={() => main && setSwap(main)} />

      <section className="flex flex-col gap-2" aria-label="Wochenplan">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Wochenplan</h2>
          {planOn && (
            <Link href="/wochenplan" className="flex h-10 items-center gap-0.5 text-sm font-bold text-accent-strong">
              Ganze Woche planen <ChevronRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </Link>
          )}
        </div>
        <ul className={`${CARD} flex flex-col divide-y divide-line overflow-hidden`}>
          {list.map((date) => {
            const day = meals?.get(date);
            const dish = dishOf(day);
            return (
              <li key={date}>
                <button type="button" onClick={() => day && setSwap(day)} className="flex h-14 w-full items-center gap-3 px-4 text-left active:bg-stone-100">
                  <span className="w-8 shrink-0 text-sm font-bold uppercase text-muted">{weekdayShort(date)}</span>
                  {dish ? (
                    <span className="min-w-0 flex-1 truncate text-base font-semibold">{dish}</span>
                  ) : day?.away ? (
                    <span className="min-w-0 flex-1 truncate text-base text-muted">{day.paused ? "Pause" : "kein Kochtag"}</span>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-base text-muted">
                      noch frei – <span className="font-semibold text-accent-strong">{helperName(data.profile)} fragen</span>
                    </span>
                  )}
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted" strokeWidth={2} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <BausteinSections />
      <ShoppingChips />
      {swap && <SwapSheet data={data} day={swap} onClose={() => setSwap(null)} />}
    </div>
  );
}

/** Großes Gericht mit Uhrzeit, Dauer, "alles im Haus" bzw. "noch: …" */
function DishHero({ data, day, when, onSwap }: { data: HomeData; day: PlanDay | undefined; when: string; onSwap: () => void }) {
  const stock = useStock();
  const entry = day && !day.away ? day.slot.entry : null;
  const recipe = entry?.recipeId ? data.recipes[entry.recipeId] : undefined;
  const needs = recipe && stock ? matchStock(recipe.ingredients.map((i) => i.name), stock).needs : null;
  const todayPersons = entry && entry.stored.kind !== "wish" ? entry.stored.persons : undefined;
  const facts = [todayPersons ? `für ${todayPersons} Personen` : "", recipe?.prepMinutes ? `${recipe.prepMinutes} Min` : "", needs ? (needs.length ? `noch: ${needs.slice(0, 2).join(", ")}${needs.length > 2 ? " …" : ""}` : "alles im Haus") : ""].filter(Boolean);
  return (
    <section className={`${CARD} overflow-hidden`} aria-label={`Essen ${when.toLowerCase()}`}>
      <div className="flex h-36 items-center justify-center bg-linear-to-br from-accent-soft to-accent/30 text-6xl" aria-hidden>
        {entry ? dishEmoji(entry.title, entry.category) : "🍽"}
      </div>
      <div className="flex flex-col gap-1.5 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-accent-strong">
          {when}
          {entry && day ? ` · ${clockLabel(mealClockFor(data.profile, day.weekday))}` : ""}
        </p>
        {entry ? (
          <>
            <h2 className="text-2xl font-extrabold leading-tight tracking-tight">{entry.title}</h2>
            {facts.length > 0 && <p className={`text-sm font-semibold ${needs && !needs.length ? "text-emerald-700" : "text-muted"}`}>{facts.join(" · ")}</p>}
            <div className="mt-2 flex gap-2">
              {entry.recipeId && (
                <Link href={`/kochbuch/rezept?id=${entry.recipeId}${todayPersons ? `&personen=${todayPersons}` : ""}`} className={buttonClass("primary", "md")}>
                  Rezept ansehen
                </Link>
              )}
              <button type="button" onClick={onSwap} className={buttonClass("secondary", "md")}>
                Tauschen
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-extrabold leading-tight tracking-tight">{day?.away ? (day.paused ? "Pause – genießt die Zeit" : "Kein Kochtag") : "Noch frei"}</h2>
            {!day?.away && (
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={onSwap} className={buttonClass("primary", "md")}>
                  Ideen zeigen
                </button>
                <button type="button" onClick={() => openHelper(undefined, `Was gibt's ${when.toLowerCase()}?`)} className={buttonClass("secondary", "md")}>
                  {helperName(data.profile)} fragen
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/** Gericht eines Tages tauschen: 3 Ideen, Lotte fragen oder freimachen */
function SwapSheet({ data, day, onClose }: { data: HomeData; day: PlanDay; onClose: () => void }) {
  const ideas = useTodayIdeas();
  const current = dishOf(day);
  const label = day.date === data.todayIso ? "heute" : `am ${weekdayLong(day.date)}`;
  const choose = (idea: { title: string; recipeId?: string; category: PlanDay["slot"]["hint"] }) => {
    const before = loadMealPlans();
    const result = takeForDay({ profile: data.profile, weekPlans: data.weekPlans, mealPlans: before, recipes: data.recipes }, data.today, idea, day.date, { spontan: data.planStyle === "spontan" });
    onClose();
    if (!result.ok) return showToast({ text: result.text });
    replaceMealPlans(result.weeks);
    pushUndo(result.text, () => replaceMealPlans(before));
  };
  const clear = () => {
    const before = loadMealPlans();
    const weekStart = weekStartFor(new Date(`${day.date}T12:00:00`), data.profile.shoppingDay || "Montag");
    replaceMealPlans(mealPlansWithWeek(before, weekStart, (e) => entriesWithoutSlot(e, day.slot)));
    onClose();
    showDeleted(pushUndo(`das Freimachen von ${label}`, () => replaceMealPlans(before)), "Freigemacht");
  };
  return (
    <Sheet title={current ? `Statt ${current}` : `Was gibt's ${label}?`} onClose={onClose}>
      <div className="flex flex-col gap-2 pb-2">
        {(ideas?.ideas ?? [])
          .filter((i) => i.title !== current)
          .slice(0, 3)
          .map((idea) => (
            <button key={idea.id} type="button" onClick={() => choose(idea)} className={`${CARD} flex items-center gap-3 p-3 text-left active:scale-[0.99]`}>
              <span className="text-2xl" aria-hidden>
                {dishEmoji(idea.title, idea.category)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold">{idea.title}</span>
                <span className="block truncate text-sm text-muted">{[idea.minutes ? `${idea.minutes} Min` : "", idea.reason].filter(Boolean).join(" · ")}</span>
              </span>
              <span className={buttonClass("soft", "sm")}>Nehmen</span>
            </button>
          ))}
        <button type="button" onClick={() => (onClose(), openHelper(undefined, `Was könnten wir ${label} essen?`))} className={buttonClass("secondary")}>
          {helperName(data.profile)} fragen
        </button>
        {current && (
          <button type="button" onClick={clear} className={buttonClass("ghost")}>
            Tag freimachen
          </button>
        )}
      </div>
    </Sheet>
  );
}

/** Einkaufsliste als Chips, Plus zum Ergänzen */
function ShoppingChips() {
  const shopping = useWeekShoppingList("planning");
  if (!shopping) return null;
  const open = shopping.list.items.filter((i) => !i.checked && !i.hidden);
  return (
    <section className="flex flex-col gap-2" aria-label="Einkauf">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Einkauf</h2>
        <QuickAddButton weekStart={shopping.weekStart} settings={shopping.settings} />
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
              + {open.length - 14}
            </Link>
          )}
        </div>
      ) : (
        <Link href="/einkaufsliste" className="text-base text-muted">
          Die Liste ist leer – sag Lotte einfach, was ihr braucht.
        </Link>
      )}
    </section>
  );
}
