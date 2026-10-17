"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ChoiceGroup } from "@/components/form/ChoiceGroup";
import { NumberStepper } from "@/components/form/NumberStepper";
import { TagInput } from "@/components/form/TagInput";
import {
  COMMON_ALLERGIES,
  LIMITS,
  WEEKDAYS,
  clearProfile,
  createEmptyProfile,
  personLabel,
  saveProfile,
  syncPersons,
  type HouseholdProfile,
  type KidsLunch,
  type Person,
  type WarmMeal,
  type WeekRules,
} from "@/lib/profile";
import { useProfile } from "@/lib/useProfile";

const STEPS = [
  { title: "Wer isst mit?", emoji: "👨‍👩‍👧" },
  { title: "Allergien & Abneigungen", emoji: "🥜" },
  { title: "Lieblingsgerichte", emoji: "😋" },
  { title: "Euer Alltag", emoji: "🕛" },
  { title: "Wochenregeln", emoji: "📋" },
];

const FAVORITE_SUGGESTIONS = [
  "Spaghetti Bolognese",
  "Pfannkuchen",
  "Pizza",
  "Fischstäbchen",
  "Gemüsecurry",
  "Kartoffelsuppe",
  "Lasagne",
  "Schnitzel",
  "Milchreis",
  "Tacos",
];

const DISLIKE_SUGGESTIONS = ["Pilze", "Zwiebeln", "Paprika", "Oliven", "Scharfes"];

/** Wartet, bis das gespeicherte Profil aus dem Browser gelesen ist. */
export function ProfileWizardLoader() {
  const profile = useProfile();
  if (profile === undefined) {
    return <div className="m-4 h-64 animate-pulse rounded-3xl bg-white/70" />;
  }
  return <ProfileWizard initial={profile ?? createEmptyProfile()} isNew={!profile} />;
}

function ProfileWizard({
  initial,
  isNew,
}: {
  initial: HouseholdProfile;
  isNew: boolean;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState(initial);
  const [step, setStep] = useState(0);

  const update = (changes: Partial<HouseholdProfile>) =>
    setProfile((p) => ({ ...p, ...changes }));

  const updateRules = (changes: Partial<WeekRules>) =>
    setProfile((p) => ({ ...p, weekRules: { ...p.weekRules, ...changes } }));

  const updatePerson = (id: string, changes: Partial<Person>) =>
    setProfile((p) => ({
      ...p,
      persons: p.persons.map((person) =>
        person.id === id ? { ...person, ...changes } : person,
      ),
    }));

  const setCounts = (adults: number, kids: number) =>
    setProfile((p) => ({
      ...p,
      adults,
      kids,
      persons: syncPersons(p.persons, adults, kids),
    }));

  const isLast = step === STEPS.length - 1;
  const { meatDays, vegetarianDays, fishDays } = profile.weekRules;
  const tooManyDays = meatDays + vegetarianDays + fishDays > 7;

  const goTo = (next: number) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const finish = () => {
    saveProfile(profile);
    router.push("/");
  };

  const reset = () => {
    if (window.confirm("Profil wirklich löschen und neu beginnen?")) {
      clearProfile();
      setProfile(createEmptyProfile());
      goTo(0);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Haushaltsprofil" />

      <div className="px-4">
        <div className="flex gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              tabIndex={-1}
              onClick={() => goTo(i)}
              className={`h-2.5 flex-1 rounded-full ${i <= step ? "bg-orange-500" : "bg-orange-200"}`}
            />
          ))}
        </div>
        <p className="mt-3 text-base font-semibold text-stone-500">
          Schritt {step + 1} von {STEPS.length}
        </p>
        <h2 className="text-2xl font-extrabold">
          {STEPS[step].emoji} {STEPS[step].title}
        </h2>
      </div>

      <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4">
        {step === 0 && (
          <StepHousehold profile={profile} update={update} setCounts={setCounts} />
        )}
        {step === 1 && <StepPersons profile={profile} updatePerson={updatePerson} />}
        {step === 2 && (
          <section className="rounded-3xl bg-white p-4 shadow-sm">
            <p className="mb-4 text-stone-600">
              Was kommt bei euch immer gut an? Tippe an oder schreib eigene
              Gerichte dazu.
            </p>
            <TagInput
              label="Unsere Lieblingsgerichte"
              placeholder="z. B. Omas Gulasch"
              values={profile.favoriteDishes}
              onChange={(favoriteDishes) => update({ favoriteDishes })}
              suggestions={FAVORITE_SUGGESTIONS}
            />
          </section>
        )}
        {step === 3 && <StepDailyLife profile={profile} update={update} />}
        {step === 4 && <StepWeekRules rules={profile.weekRules} updateRules={updateRules} />}

        {isLast && !isNew && (
          <button
            type="button"
            onClick={reset}
            className="mt-2 self-center rounded-2xl px-4 py-3 font-semibold text-stone-500 underline"
          >
            Profil löschen und neu beginnen
          </button>
        )}
      </main>

      <nav className="safe-bottom sticky bottom-0 flex gap-3 bg-background/95 px-4 pt-3 backdrop-blur">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => goTo(step - 1)}
            className="h-16 flex-1 rounded-2xl bg-white text-lg font-bold text-stone-700 shadow-sm active:scale-95"
          >
            Zurück
          </button>
        ) : (
          <Link
            href="/"
            className="flex h-16 flex-1 items-center justify-center rounded-2xl bg-white text-lg font-bold text-stone-700 shadow-sm active:scale-95"
          >
            Abbrechen
          </Link>
        )}
        <button
          type="button"
          onClick={isLast ? finish : () => goTo(step + 1)}
          disabled={isLast && tooManyDays}
          className="h-16 flex-[2] rounded-2xl bg-orange-500 text-lg font-extrabold text-white shadow-md active:scale-95 disabled:opacity-40"
        >
          {isLast ? "Speichern ✓" : "Weiter"}
        </button>
      </nav>
    </div>
  );
}

function StepHousehold({
  profile,
  update,
  setCounts,
}: {
  profile: HouseholdProfile;
  update: (changes: Partial<HouseholdProfile>) => void;
  setCounts: (adults: number, kids: number) => void;
}) {
  return (
    <>
      <label className="flex flex-col gap-2 rounded-3xl bg-white p-4 shadow-sm">
        <span className="text-lg font-bold">Name eures Haushalts (optional)</span>
        <input
          type="text"
          value={profile.householdName}
          onChange={(e) => update({ householdName: e.target.value })}
          placeholder="z. B. Familie Müller"
          className="h-14 rounded-2xl border-2 border-stone-200 px-4 text-lg outline-none focus:border-orange-400"
        />
      </label>
      <NumberStepper
        label="Erwachsene"
        value={profile.adults}
        min={LIMITS.adults.min}
        max={LIMITS.adults.max}
        onChange={(adults) => setCounts(adults, profile.kids)}
      />
      <NumberStepper
        label="Kinder"
        hint="bis ca. 14 Jahre"
        value={profile.kids}
        min={LIMITS.kids.min}
        max={LIMITS.kids.max}
        onChange={(kids) => setCounts(profile.adults, kids)}
      />
    </>
  );
}

function StepPersons({
  profile,
  updatePerson,
}: {
  profile: HouseholdProfile;
  updatePerson: (id: string, changes: Partial<Person>) => void;
}) {
  return (
    <>
      <p className="text-stone-600">
        Für jede Person einzeln – so können wir später passende Gerichte
        vorschlagen. Namen sind freiwillig.
      </p>
      {profile.persons.map((person) => (
        <section
          key={person.id}
          className="flex flex-col gap-5 rounded-3xl bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden>
              {person.role === "erwachsen" ? "🧑" : "🧒"}
            </span>
            <input
              type="text"
              value={person.name}
              onChange={(e) => updatePerson(person.id, { name: e.target.value })}
              placeholder={personLabel(person, profile.persons)}
              aria-label="Name"
              className="h-14 min-w-0 flex-1 rounded-2xl border-2 border-stone-200 px-4 text-lg font-bold outline-none focus:border-orange-400"
            />
          </div>
          <TagInput
            label="Allergien & Unverträglichkeiten"
            placeholder="Weitere Allergie"
            values={person.allergies}
            onChange={(allergies) => updatePerson(person.id, { allergies })}
            suggestions={COMMON_ALLERGIES}
            tone="red"
          />
          <TagInput
            label="Mag nicht"
            placeholder="z. B. Rosenkohl"
            values={person.dislikes}
            onChange={(dislikes) => updatePerson(person.id, { dislikes })}
            suggestions={DISLIKE_SUGGESTIONS}
          />
        </section>
      ))}
    </>
  );
}

function StepDailyLife({
  profile,
  update,
}: {
  profile: HouseholdProfile;
  update: (changes: Partial<HouseholdProfile>) => void;
}) {
  return (
    <>
      <ChoiceGroup<WarmMeal>
        label="Wann gibt es die warme Mahlzeit?"
        value={profile.warmMeal}
        onChange={(warmMeal) => update({ warmMeal })}
        options={[
          { value: "mittags", label: "Mittags", emoji: "☀️" },
          { value: "abends", label: "Abends", emoji: "🌙" },
          { value: "flexibel", label: "Mal so, mal so", emoji: "🔄" },
        ]}
      />
      {profile.kids > 0 && (
        <ChoiceGroup<KidsLunch>
          label="Essen die Kinder mittags in Schule oder Kita?"
          value={profile.kidsLunchAway}
          onChange={(kidsLunchAway) => update({ kidsLunchAway })}
          options={[
            { value: "ja", label: "Ja", emoji: "🏫" },
            { value: "teilweise", label: "Manchmal", emoji: "🤏" },
            { value: "nein", label: "Nein", emoji: "🏠" },
          ]}
        />
      )}
    </>
  );
}

function StepWeekRules({
  rules,
  updateRules,
}: {
  rules: WeekRules;
  updateRules: (changes: Partial<WeekRules>) => void;
}) {
  const planned = rules.meatDays + rules.vegetarianDays + rules.fishDays;
  const { min, max } = LIMITS.daysPerWeek;

  return (
    <>
      <p className="text-stone-600">Wie oft pro Woche soll es was geben?</p>
      <NumberStepper
        label="🥩 Fleisch"
        hint="Tage pro Woche"
        value={rules.meatDays}
        min={min}
        max={max}
        onChange={(meatDays) => updateRules({ meatDays })}
      />
      <NumberStepper
        label="🥦 Vegetarisch"
        hint="Tage pro Woche"
        value={rules.vegetarianDays}
        min={min}
        max={max}
        onChange={(vegetarianDays) => updateRules({ vegetarianDays })}
      />
      <NumberStepper
        label="🐟 Fisch"
        hint="Tage pro Woche"
        value={rules.fishDays}
        min={min}
        max={max}
        onChange={(fishDays) => updateRules({ fishDays })}
      />
      <p
        className={`rounded-2xl px-4 py-3 text-base font-semibold ${
          planned > 7 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
        }`}
        role="status"
      >
        {planned > 7
          ? `Zusammen ${planned} Tage – eine Woche hat nur 7. Bitte etwas reduzieren.`
          : `${planned} von 7 Tagen verplant${planned < 7 ? ` – ${7 - planned} ${7 - planned === 1 ? "Tag bleibt" : "Tage bleiben"} frei.` : "."}`}
      </p>

      <ChoiceGroup<"ja" | "nein">
        label="🍕 Cheat Day? (Pizza, Pommes & Co.)"
        value={rules.cheatDay ? "ja" : "nein"}
        onChange={(v) => updateRules({ cheatDay: v === "ja" })}
        columns={2}
        options={[
          { value: "ja", label: "Ja, gerne!" },
          { value: "nein", label: "Nein" },
        ]}
      />
      {rules.cheatDay && (
        <fieldset className="rounded-3xl bg-white p-4 shadow-sm">
          <legend className="sr-only">An welchem Tag?</legend>
          <p className="mb-3 text-lg font-bold" aria-hidden>
            An welchem Tag?
          </p>
          <div className="grid grid-cols-4 gap-2">
            {["", ...WEEKDAYS].map((day) => {
              const selected = rules.cheatDayWeekday === day;
              return (
                <button
                  key={day || "egal"}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => updateRules({ cheatDayWeekday: day })}
                  className={`h-14 rounded-2xl border-2 text-base font-bold active:scale-95 ${
                    selected
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-stone-200 text-stone-700"
                  }`}
                >
                  {day ? day.slice(0, 2) : "Egal"}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
    </>
  );
}
