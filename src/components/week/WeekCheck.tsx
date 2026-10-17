"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PRIMARY_BUTTON, SECONDARY_BUTTON, StickyActions } from "@/components/StickyActions";
import { WeekRulesEditor, tooManyDays } from "@/components/profile/editors";
import { FixedMealsSection } from "@/components/week/FixedMealsSection";
import {
  WEEKDAYS,
  WISH_MEAL_LABELS,
  createEmptyProfile,
  personLabel,
  wishDayKids,
  type HouseholdProfile,
  type WeekRules,
} from "@/lib/profile";
import { useProfile } from "@/lib/useProfile";
import {
  availableDays,
  createWeekPlan,
  formatWeekRange,
  nextMonday,
  CATEGORY_COUNT_KEY,
  currentMonday,
  isMondayIso,
  nextWishKid,
  saveWeekPlan,
  useToday,
  useWeekPlans,
  wishIsActive,
  wishKidForWeek,
  type WeekPlan,
} from "@/lib/weekPlan";

const SKELETON = <div className="m-4 h-64 animate-pulse rounded-3xl bg-white/70" />;

/**
 * Wochen-Check: Vorgaben für die Woche ab nächstem Montag. Vorausgefüllt aus
 * bereits gespeicherten Vorgaben dieser Woche, sonst aus der Standardwoche.
 */
export function WeekCheck() {
  const today = useToday();
  // ?woche=YYYY-MM-DD (Montag, nicht in der Vergangenheit), z. B. vom Wochenplan;
  // sonst die Woche ab nächstem Montag.
  const requested = useSearchParams().get("woche");
  const weekStart = today
    ? isMondayIso(requested) && requested >= currentMonday(today)
      ? requested
      : nextMonday(today)
    : undefined;
  const fromPlan = Boolean(requested);
  const profile = useProfile();
  const weeks = useWeekPlans();
  // Jede neue Navigation startet mit dem gespeicherten Stand (Next.js hält
  // besuchte Seiten sonst mit altem Entwurf am Leben).
  const { bfcacheId } = useRouter();

  if (!weekStart || profile === undefined || weeks === undefined) return SKELETON;

  const saved = weeks[weekStart] ?? null;
  const base = saved ?? createWeekPlan(weekStart, (profile ?? createEmptyProfile()).weekRules);
  const initial = { ...base, wish: initialWish(base, profile, weeks) };
  return (
    <WeekCheckForm
      key={`${bfcacheId}|${weekStart}`}
      initial={initial}
      profile={profile}
      isCurrentWeek={weekStart === currentMonday(today!)}
      backHref={fromPlan ? "/wochenplan" : "/"}
    />
  );
}

/**
 * Wunsch für das Formular: gespeicherter Wunsch, falls das Kind noch dabei ist,
 * sonst das Kind, das reihum dran ist. Ohne Wunschtag im Profil: keiner.
 */
function initialWish(
  plan: WeekPlan,
  profile: HouseholdProfile | null,
  weeks: Record<string, WeekPlan>,
): WeekPlan["wish"] {
  if (!profile?.wishDay.enabled) return null;
  const { weekday, meal } = profile.wishDay;
  const kids = wishDayKids(profile);
  if (plan.wish && kids.some((k) => k.id === plan.wish!.kidId)) {
    return { ...plan.wish, weekday, meal };
  }
  const kidId = wishKidForWeek(profile, weeks, plan.weekStart);
  return kidId ? { kidId, text: "", weekday, meal } : null;
}

function WeekCheckForm({
  initial,
  profile,
  isCurrentWeek,
  backHref,
}: {
  initial: WeekPlan;
  profile: HouseholdProfile | null;
  isCurrentWeek: boolean;
  /** Wohin Speichern/Abbrechen führen (zurück zum Wochenplan, falls von dort) */
  backHref: string;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState(initial);
  const hasProfile = Boolean(profile);
  const available = availableDays(plan);
  const wishKid = plan.wish ? profile?.persons.find((p) => p.id === plan.wish!.kidId) : undefined;
  const canSwapKid = profile ? wishDayKids(profile).length > 1 : false;
  // Cheat Day nicht auf Ausflugs- oder Wunschtag
  const blockedWeekdays =
    plan.wish && wishIsActive(plan) ? [...plan.awayDays, plan.wish.weekday] : plan.awayDays;
  const invalid = tooManyDays(plan, available);

  const update = (changes: Partial<WeekPlan>) => setPlan((p) => ({ ...p, ...changes }));

  // Feste Gerichte je Kategorie für Untergrenze und Hinweis an den Zählern
  const fixedByCategory: Partial<Record<"meatDays" | "vegetarianDays" | "fishDays", string[]>> = {};
  for (const m of plan.fixedMeals) {
    const key = CATEGORY_COUNT_KEY[m.category];
    if (key) (fixedByCategory[key] ??= []).push(`${m.title} (${m.weekday.slice(0, 2)})`);
  }

  const toggleAway = (day: string) => {
    const becomesAway = !plan.awayDays.includes(day);
    const fixedThatDay = plan.fixedMeals.filter((m) => m.weekday === day);
    if (
      becomesAway &&
      fixedThatDay.length > 0 &&
      !window.confirm(
        `Am ${day} ist schon ${fixedThatDay.map((m) => `„${m.title}“`).join(" und ")} geplant. Trotzdem als Ausflugstag markieren? Das Gericht wird dann entfernt.`,
      )
    ) {
      return;
    }
    setPlan((p) => {
      const away = p.awayDays.includes(day)
        ? p.awayDays.filter((d) => d !== day)
        : WEEKDAYS.filter((d) => d === day || p.awayDays.includes(d));
      const fixedMeals = becomesAway ? p.fixedMeals.filter((m) => m.weekday !== day) : p.fixedMeals;
      // Cheat Day an einem Ausflugs- oder Wunschtag ergibt keinen Sinn → auf "egal" zurück.
      const blocked = p.wish ? [...away, p.wish.weekday] : away;
      const cheatDayWeekday = blocked.includes(p.cheatDayWeekday) ? "" : p.cheatDayWeekday;
      return { ...p, awayDays: away, cheatDayWeekday, fixedMeals };
    });
  };

  const save = () => {
    saveWeekPlan(plan);
    router.push(backHref);
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Wochen-Check" />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-2">
        <div>
          <h2 className="text-2xl font-extrabold">
            {isCurrentWeek ? "Wie sieht eure Woche aus?" : "Wie sieht eure nächste Woche aus?"}
          </h2>
          <p className="text-stone-600">
            Woche vom <span className="whitespace-nowrap">{formatWeekRange(plan.weekStart)}</span>
            {" – "}
            {hasProfile
              ? "vorausgefüllt aus eurer Standardwoche."
              : "noch ohne Haushaltsprofil, mit Standardwerten."}
          </p>
        </div>

        <fieldset className="rounded-3xl bg-white p-4 shadow-sm">
          <legend className="sr-only">Ausflug / auswärts</legend>
          <div className="mb-3" aria-hidden>
            <p className="text-lg font-bold">🚗 Ausflug / auswärts</p>
            <p className="text-sm text-stone-500">An diesen Tagen planen wir kein Gericht.</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {WEEKDAYS.map((day) => {
              const away = plan.awayDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={away}
                  aria-label={`${day}: Ausflug / auswärts`}
                  onClick={() => toggleAway(day)}
                  className={`flex h-16 flex-col items-center justify-center rounded-2xl border-2 text-base font-bold active:scale-95 ${
                    away
                      ? "border-sky-500 bg-sky-50 text-sky-800"
                      : "border-stone-200 bg-white text-stone-700"
                  }`}
                >
                  {day.slice(0, 2)}
                  <span className="text-xs font-semibold">{away ? "unterwegs" : "zu Hause"}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {plan.wish && wishKid && profile && (
          <section className="flex flex-col gap-3 rounded-3xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm">
            <div>
              <h3 className="text-xl font-extrabold text-amber-900">
                Diese Woche wünscht sich {personLabel(wishKid, profile.persons)} was 🎉
              </h3>
              <p className="text-sm text-amber-900">
                <span className="whitespace-nowrap">
                  {plan.wish.weekday} {WISH_MEAL_LABELS[plan.wish.meal]}
                </span>
                {" · "}zählt nicht bei Fleisch/Veggie/Fisch
              </p>
            </div>
            {!wishIsActive(plan) && (
              <p className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-rose-700">
                Am {plan.wish.weekday} seid ihr unterwegs – der Wunsch wird diese Woche
                nicht eingeplant.
              </p>
            )}
            <label className="flex flex-col gap-1">
              <span className="font-bold text-amber-900">
                Was wünschst du dir, {personLabel(wishKid, profile.persons)}?
              </span>
              <input
                type="text"
                value={plan.wish.text}
                onChange={(e) => {
                  const text = e.target.value;
                  setPlan((p) => (p.wish ? { ...p, wish: { ...p.wish, text } } : p));
                }}
                placeholder="z. B. Pfannkuchen mit Apfelmus"
                enterKeyHint="done"
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                className="h-14 rounded-2xl border-2 border-amber-300 bg-white px-4 text-lg outline-none focus:border-amber-500"
              />
            </label>
            {canSwapKid && (
              <button
                type="button"
                onClick={() =>
                  setPlan((p) => {
                    if (!p.wish || !profile) return p;
                    const kidId = nextWishKid(profile, p.wish.kidId);
                    // Der Text gehörte zum vorigen Kind → leeren.
                    return kidId ? { ...p, wish: { ...p.wish, kidId, text: "" } } : p;
                  })
                }
                className="h-12 self-start rounded-2xl bg-white px-4 font-bold text-amber-900 shadow-sm active:scale-95"
              >
                🔄 Anderes Kind
              </button>
            )}
          </section>
        )}

        <FixedMealsSection plan={plan} setPlan={setPlan} />

        <WeekRulesEditor
          rules={plan}
          onChange={(changes: Partial<WeekRules>) => update(changes)}
          available={available}
          blockedWeekdays={blockedWeekdays}
          fixed={fixedByCategory}
          intro="Wie oft soll es diese Woche was geben?"
        />

        <label className="flex flex-col gap-2 rounded-3xl bg-white p-4 shadow-sm">
          <span className="text-lg font-bold">💶 Budget (optional)</span>
          <span className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={5}
              value={plan.budgetEuro ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                const euro = value === "" ? null : Math.max(0, Number(value));
                if (euro === null || !Number.isNaN(euro)) update({ budgetEuro: euro });
              }}
              placeholder="z. B. 120"
              enterKeyHint="done"
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className="h-14 w-40 rounded-2xl border-2 border-stone-200 px-4 text-lg outline-none focus:border-orange-400"
            />
            <span className="text-lg font-bold">€ für die Woche</span>
          </span>
        </label>

        <label className="flex flex-col gap-2 rounded-3xl bg-white p-4 shadow-sm">
          <span className="text-lg font-bold">✨ Besondere Wünsche</span>
          <textarea
            value={plan.wishes}
            onChange={(e) => update({ wishes: e.target.value })}
            placeholder="z. B. Mittwoch Kindergeburtstag, einmal Suppe, Reste von Sonntag verwerten"
            rows={3}
            className="rounded-2xl border-2 border-stone-200 px-4 py-3 text-lg outline-none focus:border-orange-400"
          />
        </label>
      </main>

      <StickyActions>
        <Link href={backHref} className={SECONDARY_BUTTON}>
          Abbrechen
        </Link>
        <button type="button" onClick={save} disabled={invalid} className={PRIMARY_BUTTON}>
          Speichern ✓
        </button>
      </StickyActions>
    </div>
  );
}
