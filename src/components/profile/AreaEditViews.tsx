"use client";

import { Info } from "lucide-react";
import { CARD, INPUT, SUBTLE, tileClass } from "@/components/ui/styles";
import { ProfileEditPage } from "@/components/profile/ProfileEditPage";
import {
  FavoritesEditor,
  NOTE,
  STANDARD_WEEK_HINT,
  WarmMealEditor,
  WeekRulesEditor,
  WishDayEditor,
  tooManyDays,
  withWishDay,
  HelperEditor,
} from "@/components/profile/editors";
import { NumberStepper } from "@/components/form/NumberStepper";
import { sortedBases } from "@/lib/bases";
import { WEEKDAYS, planningWeekLabel, standardWeekDays } from "@/lib/profile";

export function FavoritesEditView() {
  return (
    <ProfileEditPage title="Lieblingsgerichte">
      {(draft, setDraft) => (
        <FavoritesEditor
          values={draft.favoriteDishes}
          onChange={(favoriteDishes) => setDraft((d) => ({ ...d, favoriteDishes }))}
        />
      )}
    </ProfileEditPage>
  );
}

export function WarmMealEditView() {
  return (
    <ProfileEditPage title="Zusammen warm essen">
      {(draft, setDraft) => (
        <WarmMealEditor
          warmMeal={draft.warmMeal}
          onChange={(warmMeal) => setDraft((d) => ({ ...d, warmMeal }))}
        />
      )}
    </ProfileEditPage>
  );
}

export function HelperEditView() {
  return (
    <ProfileEditPage title="Küchenhelfer">
      {(draft, setDraft) => (
        <HelperEditor helper={draft.helper} onChange={(helper) => setDraft((d) => ({ ...d, helper }))} />
      )}
    </ProfileEditPage>
  );
}

export function StandardWeekEditView() {
  return (
    <ProfileEditPage
      title="Standardwoche"
      canSave={(d) => !tooManyDays(d.weekRules, standardWeekDays(d))}
    >
      {(draft, setDraft) => (
        <>
          <p className={NOTE}>
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={2.25} aria-hidden />
            {STANDARD_WEEK_HINT}
          </p>
          <WeekRulesEditor
            rules={draft.weekRules}
            onChange={(changes) =>
              setDraft((d) => ({ ...d, weekRules: { ...d.weekRules, ...changes } }))
            }
            available={standardWeekDays(draft)}
            blockedWeekdays={draft.wishDay.enabled ? [draft.wishDay.weekday] : []}
          />
          <WishDayEditor
            profile={draft}
            onChange={(wishDay) => setDraft((d) => withWishDay(d, wishDay))}
          />
        </>
      )}
    </ProfileEditPage>
  );
}

export function HouseholdNameEditView() {
  return (
    <ProfileEditPage title="Haushalt">
      {(draft, setDraft) => (
        <label className={`${CARD} flex flex-col gap-2 p-4`}>
          <span className="text-base font-bold">Name eures Haushalts (optional)</span>
          <input
            type="text"
            value={draft.householdName}
            onChange={(e) => {
              const householdName = e.target.value;
              setDraft((d) => ({ ...d, householdName }));
            }}
            placeholder="z. B. Familie Müller"
            enterKeyHint="done"
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className={INPUT}
          />
        </label>
      )}
    </ProfileEditPage>
  );
}

export function ShoppingDayEditView() {
  return (
    <ProfileEditPage title="Einkaufstag">
      {(draft, setDraft) => (
        <>
          <fieldset className={`${CARD} p-4`}>
            <legend className="sr-only">Einkaufstag</legend>
            <p className="mb-1 text-base font-bold" aria-hidden>
              An welchem Tag kauft ihr ein?
            </p>
            <p className={`mb-3 ${SUBTLE}`}>
              Ab diesem Tag läuft eure Planungswoche 7 Tage – für Wochenplan und Wochen-Check.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {WEEKDAYS.map((day) => {
                const selected = draft.shoppingDay === day;
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`Einkaufstag ${day}`}
                    onClick={() => setDraft((d) => ({ ...d, shoppingDay: day }))}
                    className={tileClass(selected)}
                  >
                    {day.slice(0, 2)}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <p className={NOTE} role="status">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={2.25} aria-hidden />
            Planungswoche: {planningWeekLabel(draft.shoppingDay)}
          </p>
        </>
      )}
    </ProfileEditPage>
  );
}

/** "Eure Lieblings-Basen": wie oft welche Basis gewählt bzw. gut bewertet wurde */
export function BasesEditView() {
  return (
    <ProfileEditPage title="Lieblings-Basen">
      {(draft, setDraft) => (
        <>
          <p className={SUBTLE}>
            Merke ich mir, wenn ihr bei Reste-Ideen oder neuen Rezepten eine Basis wählt oder ein Gericht gut bewertet.
            Die beliebtesten schlage ich zuerst vor.
          </p>
          <div className={`${CARD} flex flex-col divide-y divide-line px-4`}>
            {sortedBases(draft.bases).map((b) => (
              <div key={b.id} className="py-2">
                <NumberStepper
                  variant="plain"
                  label={b.label}
                  hint={draft.bases[b.id] === 1 ? "1-mal gewählt" : `${draft.bases[b.id]}-mal gewählt`}
                  value={draft.bases[b.id]}
                  min={0}
                  max={999}
                  onChange={(value) => setDraft((d) => ({ ...d, bases: { ...d.bases, [b.id]: value } }))}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </ProfileEditPage>
  );
}
