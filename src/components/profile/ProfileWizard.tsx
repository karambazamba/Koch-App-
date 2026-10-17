"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ChoiceGroup, MultiChoiceGroup } from "@/components/form/ChoiceGroup";
import { NumberStepper } from "@/components/form/NumberStepper";
import { NameField } from "@/components/form/NameField";
import { TagInput } from "@/components/form/TagInput";
import { PersonHeading } from "@/components/profile/PersonHeading";
import {
  COMMON_ALLERGIES,
  KID_AGE_GROUP_LABELS,
  LIMITS,
  WEEKDAYS,
  clearProfile,
  createEmptyProfile,
  personRoleLabel,
  saveProfile,
  syncPersons,
  weekdayLunchHeadcount,
  type HouseholdProfile,
  type KidAgeGroup,
  type Person,
  type WarmMeal,
  type WeekdayLunch,
  type WeekRules,
} from "@/lib/profile";
import { focusNextInChain, useMobileKeyboard } from "@/lib/useMobileKeyboard";
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
  const keyboardOpen = useMobileKeyboard();

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
          <StepHousehold
            profile={profile}
            update={update}
            setCounts={setCounts}
            updatePerson={updatePerson}
          />
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
        {step === 3 && (
          <StepDailyLife profile={profile} update={update} updatePerson={updatePerson} />
        )}
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

      {/* Bei offener Tastatur ausblenden – sonst schiebt iOS die Leiste über das
          Formular. "invisible" statt "hidden", damit sich die Seitenhöhe nicht
          ändert und nichts springt. */}
      <nav
        aria-hidden={keyboardOpen}
        className={`safe-bottom sticky bottom-0 flex gap-3 bg-background/95 px-4 pt-3 backdrop-blur ${keyboardOpen ? "pointer-events-none invisible" : ""}`}
      >
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
        vorschlagen.
      </p>
      {profile.persons.map((person) => (
        <section
          key={person.id}
          className="flex flex-col gap-5 rounded-3xl bg-white p-4 shadow-sm"
        >
          <PersonHeading person={person} persons={profile.persons} />
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

const WARM_MEAL_OPTIONS: { value: WarmMeal; label: string; emoji: string }[] = [
  { value: "mittags", label: "Mittags", emoji: "☀️" },
  { value: "abends", label: "Abends", emoji: "🌙" },
  { value: "flexibel", label: "Mal so, mal so", emoji: "🔄" },
];

/** Vorschlag für die Altersgruppe, wenn ein Alter eingetragen wird. */
function ageGroupForAge(age: number): KidAgeGroup {
  if (age < 3) return "kleinkind";
  if (age < 6) return "kitakind";
  return "schulkind";
}

function StepDailyLife({
  profile,
  update,
  updatePerson,
}: {
  profile: HouseholdProfile;
  update: (changes: Partial<HouseholdProfile>) => void;
  updatePerson: (id: string, changes: Partial<Person>) => void;
}) {
  const adults = profile.persons.filter((p) => p.role === "erwachsen");
  const kids = profile.persons.filter((p) => p.role === "kind");
  const lunch = weekdayLunchHeadcount(profile);

  return (
    <>
      <section className="flex flex-col gap-5 rounded-3xl bg-white p-4 shadow-sm">
        <p className="text-lg font-bold">Wann gibt es die warme Mahlzeit?</p>
        <MultiChoiceGroup<WarmMeal>
          label="Unter der Woche (Mo–Fr)"
          hint="Mittags und abends gleichzeitig = zwei warme Mahlzeiten"
          values={profile.warmMeal.weekday}
          onChange={(weekday) => update({ warmMeal: { ...profile.warmMeal, weekday } })}
          options={WARM_MEAL_OPTIONS}
          exclusive={["flexibel"]}
          variant="plain"
        />
        <MultiChoiceGroup<WarmMeal>
          label="Am Wochenende (Sa–So)"
          hint="Mittags und abends gleichzeitig = zwei warme Mahlzeiten"
          values={profile.warmMeal.weekend}
          onChange={(weekend) => update({ warmMeal: { ...profile.warmMeal, weekend } })}
          options={WARM_MEAL_OPTIONS}
          exclusive={["flexibel"]}
          variant="plain"
        />
      </section>

      <p className="mt-2 text-lg font-bold">Wer isst unter der Woche mittags zu Hause?</p>
      {adults.map((adult) => (
        <AdultLunchCard
          key={adult.id}
          adult={adult}
          persons={profile.persons}
          updatePerson={updatePerson}
        />
      ))}
      {kids.map((kid) => (
        <KidLunchCard
          key={kid.id}
          kid={kid}
          persons={profile.persons}
          updatePerson={updatePerson}
        />
      ))}

      <p className="rounded-2xl bg-emerald-100 px-4 py-3 text-base font-semibold text-emerald-800" role="status">
        Mittagessen unter der Woche zu Hause:{" "}
        {lunch.min === lunch.max ? lunch.min : `${lunch.min}–${lunch.max}`}{" "}
        {lunch.min === 1 && lunch.max === 1 ? "Person" : "Personen"}
      </p>
    </>
  );
}

function AdultLunchCard({
  adult,
  persons,
  updatePerson,
}: {
  adult: Person;
  persons: Person[];
  updatePerson: (id: string, changes: Partial<Person>) => void;
}) {
  const employed = adult.employed === true ? "ja" : adult.employed === false ? "nein" : "";

  return (
    <section className="flex flex-col gap-5 rounded-3xl bg-white p-4 shadow-sm">
      <PersonHeading person={adult} persons={persons} />
      <ChoiceGroup<WeekdayLunch>
        label="Mittagessen unter der Woche"
        value={adult.weekdayLunch ?? "zuhause"}
        onChange={(weekdayLunch) => updatePerson(adult.id, { weekdayLunch })}
        options={[
          { value: "zuhause", label: "Ist mittags zu Hause", emoji: "🏠" },
          { value: "auswaerts", label: "Isst auswärts (z.\u00A0B. Arbeit)", emoji: "💼" },
          { value: "manchmal", label: "Manchmal", emoji: "🔄" },
        ]}
        variant="plain"
      />
      <ChoiceGroup<"ja" | "nein" | "">
        label="Berufstätig?"
        hint="Optional, nur als Info"
        value={employed}
        onChange={(v) => updatePerson(adult.id, { employed: v === "ja" })}
        options={[
          { value: "ja", label: "Ja" },
          { value: "nein", label: "Nein" },
        ]}
        columns={2}
        variant="plain"
      />
    </section>
  );
}

function KidLunchCard({
  kid,
  persons,
  updatePerson,
}: {
  kid: Person;
  persons: Person[];
  updatePerson: (id: string, changes: Partial<Person>) => void;
}) {
  const { min, max } = LIMITS.kidAge;

  const setAge = (value: string) => {
    if (value === "") {
      updatePerson(kid.id, { age: null });
      return;
    }
    const age = Math.min(max, Math.max(min, Math.round(Number(value))));
    if (Number.isNaN(age)) return;
    updatePerson(kid.id, { age, ageGroup: ageGroupForAge(age) });
  };

  return (
    <section className="flex flex-col gap-5 rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <PersonHeading person={kid} persons={persons} />
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={kid.age ?? ""}
          onChange={(e) => setAge(e.target.value)}
          placeholder="Alter"
          enterKeyHint="done"
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          aria-label="Alter in Jahren (optional)"
          className="h-14 w-24 shrink-0 rounded-2xl border-2 border-stone-200 px-3 text-center text-lg font-bold outline-none focus:border-orange-400"
        />
      </div>
      <ChoiceGroup<KidAgeGroup>
        label="Alter oder Gruppe"
        value={kid.ageGroup ?? "kitakind"}
        onChange={(ageGroup) => updatePerson(kid.id, { ageGroup })}
        options={[
          { value: "kleinkind", label: KID_AGE_GROUP_LABELS.kleinkind, emoji: "👶" },
          { value: "kitakind", label: KID_AGE_GROUP_LABELS.kitakind, emoji: "🧸" },
          { value: "schulkind", label: KID_AGE_GROUP_LABELS.schulkind, emoji: "🎒" },
        ]}
        variant="plain"
      />
      <ChoiceGroup<WeekdayLunch>
        label="Mittagessen unter der Woche"
        value={kid.weekdayLunch ?? "auswaerts"}
        onChange={(weekdayLunch) => updatePerson(kid.id, { weekdayLunch })}
        options={[
          { value: "auswaerts", label: "Isst in Kita/Schule", emoji: "🏫" },
          { value: "zuhause", label: "Isst zu Hause", emoji: "🏠" },
          { value: "manchmal", label: "Manchmal", emoji: "🔄" },
        ]}
        variant="plain"
      />
    </section>
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
