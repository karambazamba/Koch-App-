"use client";

import { ProfileEditPage } from "@/components/profile/ProfileEditPage";
import {
  FavoritesEditor,
  STANDARD_WEEK_HINT,
  WarmMealEditor,
  WeekRulesEditor,
  WishDayEditor,
  tooManyDays,
  withWishDay,
} from "@/components/profile/editors";
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
    <ProfileEditPage title="Warme Mahlzeit">
      {(draft, setDraft) => (
        <WarmMealEditor
          warmMeal={draft.warmMeal}
          onChange={(warmMeal) => setDraft((d) => ({ ...d, warmMeal }))}
        />
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
          <p className="rounded-2xl bg-sky-50 px-4 py-3 text-base text-sky-900">
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
        <label className="flex flex-col gap-2 rounded-3xl bg-white p-4 shadow-sm">
          <span className="text-lg font-bold">Name eures Haushalts (optional)</span>
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
            className="h-14 rounded-2xl border-2 border-stone-200 px-4 text-lg outline-none focus:border-orange-400"
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
          <fieldset className="rounded-3xl bg-white p-4 shadow-sm">
            <legend className="sr-only">Einkaufstag</legend>
            <p className="mb-1 text-lg font-bold" aria-hidden>
              An welchem Tag kauft ihr ein?
            </p>
            <p className="mb-3 text-sm text-stone-500">
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
                    className={`h-14 rounded-2xl border-2 text-base font-bold active:scale-95 ${
                      selected
                        ? "border-orange-500 bg-orange-50 text-orange-700"
                        : "border-stone-200 text-stone-700"
                    }`}
                  >
                    {day.slice(0, 2)}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <p className="rounded-2xl bg-sky-50 px-4 py-3 text-base text-sky-900" role="status">
            Planungswoche: {planningWeekLabel(draft.shoppingDay)}
          </p>
        </>
      )}
    </ProfileEditPage>
  );
}
