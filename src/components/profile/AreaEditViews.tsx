"use client";

import { ProfileEditPage } from "@/components/profile/ProfileEditPage";
import {
  FavoritesEditor,
  STANDARD_WEEK_HINT,
  WarmMealEditor,
  WeekRulesEditor,
  tooManyDays,
} from "@/components/profile/editors";

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
    <ProfileEditPage title="Standardwoche" canSave={(d) => !tooManyDays(d.weekRules)}>
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
