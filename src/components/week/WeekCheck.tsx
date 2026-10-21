"use client";

import { useGoBack } from "@/lib/core/useGoBack";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Repeat, Sparkles, Wallet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { WeekRulesEditor, tooManyDays } from "@/components/profile/editors";
import { CARD, INPUT_BASE, PAGE_MAIN, buttonClass, chipClass } from "@/components/ui/styles";
import { FixedMealsSection } from "@/components/week/FixedMealsSection";
import {
  createEmptyProfile,
  personLabel,
  wishDayKids,
  wishDayActive,
  type HouseholdProfile,
  type WeekRules,
} from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";
import {
  availableDays,
  createWeekPlan,
  formatWeekRange,
  CATEGORY_COUNT_KEY,
  DEFAULT_SHOPPING_DAY,
  isWeekStartIso,
  planForWeek,
  planningWeekStart,
  weekDayNames,
  weekStartFor,
  nextWishKid,
  saveWeekPlan,
  useToday,
  useWeekPlans,
  wishIsActive,
  wishKidForWeek,
  type WeekPlan,
} from "@/lib/essen/weekPlan";

const SKELETON = <div className={`${CARD} m-4 h-64 animate-pulse`} />;

/**
 * „Kurz vor der Woche“ (früher Wochen-Check): drei kurze Fragen mit Chips
 * (unterwegs? · wie oft Fleisch? · etwas Besonderes?), Fortschritt als
 * Striche, „Weiter“/„Überspringen“ am Inhaltsende; Feinheiten (feste
 * Gerichte, Mengen, Budget, Wünsche) hinter „Alles im Detail“.
 * Vorgaben für eine Planungswoche (ab Einkaufstag, 7 Tage).
 * Ohne ?woche= die Woche, die gerade zu planen ist (ab 2 Tage vor dem
 * Einkaufstag die nächste). Vorausgefüllt aus gespeicherten Vorgaben dieser
 * Woche, sonst aus der Standardwoche.
 */
export function WeekCheck() {
  const today = useToday();
  const requested = useSearchParams().get("woche");
  const fromPlan = Boolean(requested);
  const profile = useProfile();
  const weeks = useWeekPlans();
  // Jede neue Navigation startet mit dem gespeicherten Stand (Next.js hält
  // besuchte Seiten sonst mit altem Entwurf am Leben).
  const { bfcacheId } = useRouter();

  if (!today || profile === undefined || weeks === undefined) return SKELETON;

  const shoppingDay = profile?.shoppingDay ?? DEFAULT_SHOPPING_DAY;
  const currentStart = weekStartFor(today, shoppingDay);
  // ?woche=… (z. B. vom Wochenplan): nur ein Einkaufstag, nicht in der Vergangenheit
  const weekStart =
    isWeekStartIso(requested, shoppingDay) && requested >= currentStart
      ? requested
      : planningWeekStart(today, shoppingDay).weekStart;
  const saved = planForWeek(weeks, weekStart);
  const base = saved ?? createWeekPlan(weekStart, (profile ?? createEmptyProfile()).weekRules);
  const initial = { ...base, wish: initialWish(base, profile, weeks) };
  return (
    <WeekCheckForm
      key={`${bfcacheId}|${weekStart}`}
      initial={initial}
      profile={profile}
      isCurrentWeek={weekStart === currentStart}
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
  if (!profile || !wishDayActive(profile)) return null;
  const { weekday } = profile.wishDay;
  const kids = wishDayKids(profile);
  if (plan.wish && kids.some((k) => k.id === plan.wish!.kidId)) {
    return { ...plan.wish, weekday };
  }
  const kidId = wishKidForWeek(profile, weeks, plan.weekStart);
  return kidId ? { kidId, text: "", weekday } : null;
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
  const goBack = useGoBack();
  const [plan, setPlan] = useState(initial);
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState(false);
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
        : weekDayNames(p.weekStart).filter((d) => d === day || p.awayDays.includes(d));
      const fixedMeals = becomesAway ? p.fixedMeals.filter((m) => m.weekday !== day) : p.fixedMeals;
      // Cheat Day an einem Ausflugs- oder Wunschtag ergibt keinen Sinn → auf "egal" zurück.
      const blocked = p.wish ? [...away, p.wish.weekday] : away;
      const cheatDayWeekday = blocked.includes(p.cheatDayWeekday) ? "" : p.cheatDayWeekday;
      return { ...p, awayDays: away, cheatDayWeekday, fixedMeals };
    });
  };

  const save = () => {
    saveWeekPlan(plan);
    goBack(backHref);
  };

  const steps = ["unterwegs", "fleisch", "besonders"] as const;
  const last = step === steps.length - 1;
  const next = () => (last ? save() : setStep((n) => n + 1));
  const extra = (text: string) => update({ wishes: plan.wishes.includes(text) ? plan.wishes.replace(text, "").replace(/(^[,\s]+|[,\s]+$)/g, "").replace(/,\s*,/g, ",") : [plan.wishes.trim(), text].filter(Boolean).join(", ") });
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Kurz vor der Woche" subtitle={`Woche vom ${formatWeekRange(plan.weekStart)}`} backHref={backHref} />
      <main className={PAGE_MAIN}>
        <div className="flex gap-1.5" aria-label={`Frage ${step + 1} von ${steps.length}`} role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1}>
          {steps.map((st, i) => (
            <span key={st} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-fill-strong"}`} />
          ))}
        </div>

        {steps[step] === "unterwegs" && (
          <section className="flex flex-col gap-3" aria-label="Unterwegs">
            <h2 className="text-[22px] font-extrabold leading-tight">{isCurrentWeek ? "Seid ihr diese Woche mal unterwegs?" : "Seid ihr nächste Woche mal unterwegs?"}</h2>
            <p className="text-base text-muted">An diesen Tagen plane ich kein Gericht.</p>
            <div className="flex flex-wrap gap-2">
              {weekDayNames(plan.weekStart).map((day) => {
                const away = plan.awayDays.includes(day);
                return (
                  <button key={day} type="button" aria-pressed={away} aria-label={`${day}: unterwegs`} onClick={() => toggleAway(day)} className={chipClass(away)}>
                    {day.slice(0, 2)}
                  </button>
                );
              })}
            </div>
            {plan.awayDays.length === 0 && <p className="text-sm font-semibold text-good-ink">Alle Tage zu Hause.</p>}
          </section>
        )}

        {steps[step] === "fleisch" && (
          <section className="flex flex-col gap-3" aria-label="Fleisch">
            <h2 className="text-[22px] font-extrabold leading-tight">Wie oft darf es Fleisch sein?</h2>
            <p className="text-base text-muted">Die anderen Tage plane ich vegetarisch{plan.fishDays ? " oder mit Fisch" : ""}.</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Fleisch-Tage">
              {[0, 1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={plan.meatDays === n}
                  onClick={() => update({ meatDays: n, vegetarianDays: Math.max(0, Math.min(plan.vegetarianDays, available - n - plan.fishDays)) })}
                  className={chipClass(plan.meatDays === n)}
                >
                  {n === 0 ? "Gar nicht" : `${n}×`}
                </button>
              ))}
            </div>
          </section>
        )}

        {steps[step] === "besonders" && (
          <section className="flex flex-col gap-3" aria-label="Besonderes">
            <h2 className="text-[22px] font-extrabold leading-tight">Etwas Besonderes?</h2>
            <div className="flex flex-wrap gap-2">
              {["Einmal Suppe", "Reste verwerten", "Was Neues", "Schnelle Woche"].map((w) => (
                <button key={w} type="button" aria-pressed={plan.wishes.includes(w)} onClick={() => extra(w)} className={chipClass(plan.wishes.includes(w))}>
                  {w}
                </button>
              ))}
            </div>
        {plan.wish && wishKid && profile && (
          <section className={`${CARD} flex flex-col gap-3 p-4`}>
            <div>
              <h3 className="text-lg font-bold">
                Diese Woche wünscht sich {personLabel(wishKid, profile.persons)} was
              </h3>
              <p className="text-sm text-muted">
                <span className="whitespace-nowrap">
                  {plan.wish.weekday}
                </span>
                {" · "}zählt nicht bei Fleisch/Veggie/Fisch
              </p>
            </div>
            {!wishIsActive(plan) && (
              <p className="rounded-field bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
                Am {plan.wish.weekday} seid ihr unterwegs – der Wunsch wird diese Woche
                nicht eingeplant.
              </p>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-muted">
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
                className={`${INPUT_BASE} h-14 w-full px-4 text-lg`}
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
                className={`${buttonClass("secondary")} self-start`}
              >
                <Repeat className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
                Anderes Kind
              </button>
            )}
          </section>
        )}

            <button type="button" onClick={() => setDetails((v) => !v)} aria-expanded={details} className="hit self-start text-[15px] font-semibold text-accent-strong">
              {details ? "Weniger anzeigen" : "Alles im Detail"}
            </button>
            {details && (
              <>
        <FixedMealsSection plan={plan} setPlan={setPlan} />

        <WeekRulesEditor
          rules={plan}
          onChange={(changes: Partial<WeekRules>) => update(changes)}
          available={available}
          blockedWeekdays={blockedWeekdays}
          fixed={fixedByCategory}
          intro="Wie oft soll es diese Woche was geben?"
        />

        <label className={`${CARD} flex flex-col gap-2 p-4`}>
          <span className="flex items-center gap-2 text-base font-bold">
            <Wallet className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
            Budget (optional)
          </span>
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
              className={`${INPUT_BASE} h-12 w-40 px-4`}
            />
            <span className="text-base font-semibold text-muted">€ für die Woche</span>
          </span>
        </label>

        <label className={`${CARD} flex flex-col gap-2 p-4`}>
          <span className="flex items-center gap-2 text-base font-bold">
            <Sparkles className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
            Besondere Wünsche
          </span>
          <textarea
            value={plan.wishes}
            onChange={(e) => update({ wishes: e.target.value })}
            placeholder="z. B. Mittwoch Kindergeburtstag, einmal Suppe, Reste von Sonntag verwerten"
            rows={3}
            className={`${INPUT_BASE} w-full px-4 py-3`}
          />
        </label>
              </>
            )}
          </section>
        )}

        <div className="mt-2 flex flex-col gap-2">
          <button type="button" onClick={next} disabled={invalid} className={buttonClass("primary", "lg")}>
            {last ? "Fertig" : "Weiter"}
          </button>
          {!last ? (
            <button type="button" onClick={() => setStep((n) => n + 1)} className={buttonClass("ghost")}>
              Überspringen
            </button>
          ) : (
            <button type="button" onClick={() => goBack(backHref)} className={buttonClass("ghost")}>
              Abbrechen
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
