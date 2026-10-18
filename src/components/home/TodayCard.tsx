"use client";

import Link from "next/link";
import { Carrot, ChevronRight, MapPin, Moon, Soup, Sun, UtensilsCrossed } from "lucide-react";
import { CategoryChip } from "@/components/ui/Category";
import { CARD, buttonClass } from "@/components/ui/styles";
import { openHelper } from "@/lib/assistant/open";
import { useRecipes } from "@/lib/cookbook";
import { composeWeek, useMealPlans, type PlanWeek } from "@/lib/mealPlan";
import { useProfile } from "@/lib/useProfile";
import {
  DEFAULT_SHOPPING_DAY,
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
  const week = composeWeek(weekStart, profile, weekPlans, mealPlans, recipes);
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

/** Zweite Mahlzeit: Reste vom Vortag oder eine schnelle Idee aus dem Vorrat */
function SecondMeal({ leftovers }: { leftovers: string | null }) {
  if (leftovers) {
    return (
      <p className="flex items-center gap-2 border-t border-line pt-3 text-sm text-muted">
        <Soup className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} aria-hidden />
        <span>
          Zweite Mahlzeit: <span className="font-semibold text-ink">Reste von {leftovers}</span>
        </span>
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={() => openHelper("reste")}
      className="flex items-center gap-2 border-t border-line pt-3 text-left text-sm text-muted"
    >
      <Carrot className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} aria-hidden />
      <span className="flex-1">
        Zweite Mahlzeit: Schnelle Idee? <span className="font-semibold text-accent-strong">→ Was ist noch da?</span>
      </span>
    </button>
  );
}

/** Blickfang auf der Startseite: das heutige Hauptgericht, darunter klein die zweite Mahlzeit. */
export function TodayCard() {
  const data = useCurrentWeek();

  if (data === undefined) return <div className={`${CARD} h-36 animate-pulse`} />;
  if (data === null) return null;

  const { today, week } = data;
  const day = week.days.find((d) => d.date === toIsoDate(today));
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

  const entry = day?.slot.entry ?? null;
  const MealIcon = day?.mealTime === "mittags" ? Sun : Moon;

  return (
    <section className={`${CARD} flex flex-col gap-3 p-5`} aria-label="Heute">
      {entry ? (
        <Link
          href={entry.recipeId ? `/kochbuch/rezept?id=${encodeURIComponent(entry.recipeId)}` : "/wochenplan"}
          className="flex items-center gap-3 transition active:scale-[0.99]"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            {label}
            <span className="text-2xl font-extrabold leading-tight tracking-tight">{entry.title}</span>
            <span className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className="inline-flex items-center gap-1">
                <MealIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
                {day?.mealTime === "mittags" ? "Mittags" : "Abends"}
                {day?.persons ? ` · ${day.persons} Pers.` : ""}
              </span>
              {entry.category && <CategoryChip category={entry.category} short />}
              {entry.origin === "wunsch" && entry.kidName && <span>Wunsch von {entry.kidName} 🎉</span>}
              {entry.double && <span className="font-semibold text-accent-strong">doppelt – Reste für morgen</span>}
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-stone-300" strokeWidth={2.25} aria-hidden />
        </Link>
      ) : (
        <div>
          {label}
          <p className="mt-1 text-2xl font-extrabold tracking-tight">Noch nichts geplant</p>
          <Link href="/wochenplan" className={`${buttonClass("primary")} mt-4 w-full`}>
            <UtensilsCrossed className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            Zum Wochenplan
          </Link>
        </div>
      )}
      <SecondMeal leftovers={day?.leftovers ?? null} />
    </section>
  );
}
