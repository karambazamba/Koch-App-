"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PRIMARY_BUTTON, SECONDARY_BUTTON, StickyActions } from "@/components/StickyActions";
import { NumberStepper } from "@/components/form/NumberStepper";
import { NameField } from "@/components/form/NameField";
import { FamilyOverview } from "@/components/profile/FamilyOverview";
import { PersonHeading } from "@/components/profile/PersonHeading";
import {
  FavoritesEditor,
  LunchHeadcountNote,
  PersonLunchFields,
  PersonPreferencesFields,
  WarmMealEditor,
  WeekRulesEditor,
  tooManyDays,
} from "@/components/profile/editors";
import {
  LIMITS,
  createEmptyProfile,
  personRoleLabel,
  saveProfile,
  syncPersons,
  type HouseholdProfile,
  type Person,
} from "@/lib/profile";
import { focusNextInChain } from "@/lib/useMobileKeyboard";
import { useProfile } from "@/lib/useProfile";

const STEPS = [
  { title: "Wer isst mit?", emoji: "👨‍👩‍👧" },
  { title: "Allergien & Abneigungen", emoji: "🥜" },
  { title: "Lieblingsgerichte", emoji: "😋" },
  { title: "Euer Alltag", emoji: "🕛" },
  { title: "Wochenregeln", emoji: "📋" },
];

/**
 * /profil: Gibt es schon ein Profil, zeigt es die Übersicht "Unsere Familie".
 * Sonst startet der Assistent zum ersten Anlegen.
 */
export function ProfilePageContent() {
  const profile = useProfile();
  if (profile === undefined) {
    return <div className="m-4 h-64 animate-pulse rounded-3xl bg-white/70" />;
  }
  if (profile) return <FamilyOverview profile={profile} />;
  return <ProfileWizard />;
}

/** Assistent in 5 Schritten – nur beim ersten Anlegen. */
function ProfileWizard() {
  const router = useRouter();
  const [profile, setProfile] = useState(createEmptyProfile);
  const [step, setStep] = useState(0);

  const update = (changes: Partial<HouseholdProfile>) =>
    setProfile((p) => ({ ...p, ...changes }));

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

  const goTo = (next: number) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const finish = () => {
    saveProfile(profile);
    router.push("/");
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
          <StepHousehold
            profile={profile}
            update={update}
            setCounts={setCounts}
            updatePerson={updatePerson}
          />
        )}
        {step === 1 && (
          <>
            <p className="text-stone-600">
              Für jede Person einzeln – so können wir später passende Gerichte
              vorschlagen.
            </p>
            {profile.persons.map((person) => (
              <section
                key={person.id}
                className="flex flex-col gap-5 rounded-3xl bg-white p-4 shadow-sm"
              >
                <PersonHeading person={person} persons={profile.persons} />
                <PersonPreferencesFields
                  person={person}
                  onChange={(changes) => updatePerson(person.id, changes)}
                />
              </section>
            ))}
          </>
        )}
        {step === 2 && (
          <FavoritesEditor
            values={profile.favoriteDishes}
            onChange={(favoriteDishes) => update({ favoriteDishes })}
          />
        )}
        {step === 3 && (
          <>
            <WarmMealEditor
              warmMeal={profile.warmMeal}
              onChange={(warmMeal) => update({ warmMeal })}
            />
            <p className="mt-2 text-lg font-bold">Wer isst unter der Woche mittags zu Hause?</p>
            {profile.persons.map((person) => (
              <section
                key={person.id}
                className="flex flex-col gap-5 rounded-3xl bg-white p-4 shadow-sm"
              >
                <PersonHeading person={person} persons={profile.persons} />
                <PersonLunchFields
                  person={person}
                  onChange={(changes) => updatePerson(person.id, changes)}
                />
              </section>
            ))}
            <LunchHeadcountNote profile={profile} />
          </>
        )}
        {step === 4 && (
          <WeekRulesEditor
            rules={profile.weekRules}
            onChange={(changes) =>
              update({ weekRules: { ...profile.weekRules, ...changes } })
            }
          />
        )}
      </main>

      <StickyActions>
        {step > 0 ? (
          <button type="button" onClick={() => goTo(step - 1)} className={SECONDARY_BUTTON}>
            Zurück
          </button>
        ) : (
          <Link href="/" className={SECONDARY_BUTTON}>
            Abbrechen
          </Link>
        )}
        <button
          type="button"
          onClick={isLast ? finish : () => goTo(step + 1)}
          disabled={isLast && tooManyDays(profile.weekRules)}
          className={PRIMARY_BUTTON}
        >
          {isLast ? "Speichern ✓" : "Weiter"}
        </button>
      </StickyActions>
    </div>
  );
}

function StepHousehold({
  profile,
  update,
  setCounts,
  updatePerson,
}: {
  profile: HouseholdProfile;
  update: (changes: Partial<HouseholdProfile>) => void;
  setCounts: (adults: number, kids: number) => void;
  updatePerson: (id: string, changes: Partial<Person>) => void;
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
          enterKeyHint="next"
          data-enter-chain
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              focusNextInChain(e.currentTarget);
            }
          }}
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
      <section className="flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-sm">
        <div>
          <p className="text-lg font-bold">Wie heißen alle?</p>
          <p className="text-stone-500">
            Freiwillig – hilft aber in den nächsten Schritten.
          </p>
        </div>
        {profile.persons.map((person, index) => (
          <NameField
            key={person.id}
            isLast={index === profile.persons.length - 1}
            who={personRoleLabel(person, profile.persons)}
            emoji={person.role === "erwachsen" ? "🧑" : "🧒"}
            value={person.name}
            onChange={(name) => updatePerson(person.id, { name })}
          />
        ))}
      </section>
    </>
  );
}
