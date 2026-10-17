"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PRIMARY_BUTTON, SECONDARY_BUTTON, StickyActions } from "@/components/StickyActions";
import { WeekRulesEditor, tooManyDays } from "@/components/profile/editors";
import { WEEKDAYS, createEmptyProfile, type WeekRules } from "@/lib/profile";
import { useProfile } from "@/lib/useProfile";
import {
  availableDays,
  createWeekPlan,
  formatWeekRange,
  nextMonday,
  saveWeekPlan,
  useToday,
  useWeekPlan,
  type WeekPlan,
} from "@/lib/weekPlan";

const SKELETON = <div className="m-4 h-64 animate-pulse rounded-3xl bg-white/70" />;

/**
 * Wochen-Check: Vorgaben für die Woche ab nächstem Montag. Vorausgefüllt aus
 * bereits gespeicherten Vorgaben dieser Woche, sonst aus der Standardwoche.
 */
export function WeekCheck() {
  const today = useToday();
  const weekStart = today ? nextMonday(today) : undefined;
  const profile = useProfile();
  const saved = useWeekPlan(weekStart);
  // Jede neue Navigation startet mit dem gespeicherten Stand (Next.js hält
  // besuchte Seiten sonst mit altem Entwurf am Leben).
  const { bfcacheId } = useRouter();

  if (!weekStart || profile === undefined || saved === undefined) return SKELETON;

  const rules = (profile ?? createEmptyProfile()).weekRules;
  const initial = saved ?? createWeekPlan(weekStart, rules);
  return <WeekCheckForm key={`${bfcacheId}|${weekStart}`} initial={initial} hasProfile={!!profile} />;
}

function WeekCheckForm({ initial, hasProfile }: { initial: WeekPlan; hasProfile: boolean }) {
  const router = useRouter();
  const [plan, setPlan] = useState(initial);
  const available = availableDays(plan);
  const invalid = tooManyDays(plan, available);

  const update = (changes: Partial<WeekPlan>) => setPlan((p) => ({ ...p, ...changes }));

  const toggleAway = (day: string) =>
    setPlan((p) => {
      const away = p.awayDays.includes(day)
        ? p.awayDays.filter((d) => d !== day)
        : WEEKDAYS.filter((d) => d === day || p.awayDays.includes(d));
      // Cheat Day an einem Ausflugstag ergibt keinen Sinn → auf "egal" zurück.
      const cheatDayWeekday = away.includes(p.cheatDayWeekday) ? "" : p.cheatDayWeekday;
      return { ...p, awayDays: away, cheatDayWeekday };
    });

  const save = () => {
    saveWeekPlan(plan);
    router.push("/");
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Wochen-Check" />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-2">
        <div>
          <h2 className="text-2xl font-extrabold">Wie sieht eure nächste Woche aus?</h2>
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

        <WeekRulesEditor
          rules={plan}
          onChange={(changes: Partial<WeekRules>) => update(changes)}
          available={available}
          blockedWeekdays={plan.awayDays}
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
        <Link href="/" className={SECONDARY_BUTTON}>
          Abbrechen
        </Link>
        <button type="button" onClick={save} disabled={invalid} className={PRIMARY_BUTTON}>
          Speichern ✓
        </button>
      </StickyActions>
    </div>
  );
}
