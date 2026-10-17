"use client";

import Link from "next/link";
import { ChevronRight, MapPin, Moon, Sun, UtensilsCrossed } from "lucide-react";
import { CategoryChip } from "@/components/ui/Category";
import { CARD, buttonClass } from "@/components/ui/styles";
import { useRecipes } from "@/lib/cookbook";
import { buildWeek, storedForWeek, useMealPlans, type PlanWeek } from "@/lib/mealPlan";
import { useProfile } from "@/lib/useProfile";
import {
  DEFAULT_SHOPPING_DAY,
  planForWeek,
  toIsoDate,
  useToday,
  useWeekPlans,
  weekStartFor,
} from "@/lib/weekPlan";

/** Aktuelle Planungswoche aus dem Wochenplan (`undefined` = lädt, `null` = kein Profil) */
function useCurrentWeek(): { today: Date; week: PlanWeek } | null | undefined {
  const today = useToday();
  const profile = useProfile();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const recipes = useRecipes();

  if (!today || profile === undefined || !weekPlans || !mealPlans || !recipes) return undefined;
  if (profile === null) return null;
  const weekStart = weekStartFor(today, profile.shoppingDay ?? DEFAULT_SHOPPING_DAY);
  const week = buildWeek(
    weekStart,
    profile,
    planForWeek(weekPlans, weekStart),
    storedForWeek(mealPlans, weekStart),
    recipes,
  );
  return { today, week };
}

const FALLBACK = "Eure Woche auf einen Blick";

/** Untertitel der Wochenplan-Kachel: "Diese Woche: X von Y geplant" */
export function WeekSubtitle() {
  const data = useCurrentWeek();
  if (!data || data.week.planned === 0) return <>{FALLBACK}</>;
  return (
    <>
      Diese Woche: {data.week.planned} von {data.week.total} geplant
    </>
  );
}

const DATE_LABEL = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "2-digit", month: "2-digit" });

/** Blickfang auf der Startseite: das heutige Gericht. */
export function TodayCard() {
  const data = useCurrentWeek();

  if (data === undefined) return <div className={`${CARD} h-36 animate-pulse`} />;
  if (data === null) return null;

  const { today, week } = data;
  const day = week.days.find((d) => d.date === toIsoDate(today));
  const entries = day?.slots.flatMap((s) => (s.entry ? [{ meal: s.meal, entry: s.entry }] : [])) ?? [];
  const single = entries.length === 1 ? entries[0].entry : null;
  const href = single?.recipeId ? `/kochbuch/rezept?id=${single.recipeId}` : "/wochenplan";

  const label = (
    <p className="text-xs font-bold uppercase tracking-wider text-accent">Heute · {DATE_LABEL.format(today)}</p>
  );

  if (day?.away) {
    return (
      <section className={`${CARD} flex items-center gap-4 p-5`} aria-label="Heute">
        <MapPin className="h-8 w-8 shrink-0 text-accent" strokeWidth={1.75} aria-hidden />
        <div>
          {label}
          <p className="mt-1 text-2xl font-extrabold tracking-tight">Ausflug – heute wird nicht gekocht</p>
        </div>
      </section>
    );
  }

  if (entries.length === 0) {
    return (
      <section className={`${CARD} p-5`} aria-label="Heute">
        {label}
        <p className="mt-1 text-2xl font-extrabold tracking-tight">Noch nichts geplant</p>
        <p className="mt-1 text-sm text-muted">Tragt ein Gericht ein oder schaut, was noch da ist.</p>
        <Link href="/wochenplan" className={`${buttonClass("primary")} mt-4 w-full`}>
          <UtensilsCrossed className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          Zum Wochenplan
        </Link>
      </section>
    );
  }

  return (
    <Link href={href} aria-label="Heute" className={`${CARD} flex items-center gap-3 p-5 transition active:scale-[0.99]`}>
      <span className="flex min-w-0 flex-1 flex-col gap-3">
        {label}
        {entries.map(({ meal, entry }) => {
          const MealIcon = meal === "mittags" ? Sun : Moon;
          return (
            <span key={meal} className="flex flex-col gap-1.5">
              <span className="text-2xl font-extrabold leading-tight tracking-tight">{entry.title}</span>
              <span className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <span className="inline-flex items-center gap-1">
                  <MealIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
                  {meal === "mittags" ? "Mittags" : "Abends"}
                </span>
                {entry.category && <CategoryChip category={entry.category} short />}
                {entry.origin === "wunsch" && entry.kidName && <span>Wunsch von {entry.kidName} 🎉</span>}
              </span>
            </span>
          );
        })}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-stone-300" strokeWidth={2.25} aria-hidden />
    </Link>
  );
}
