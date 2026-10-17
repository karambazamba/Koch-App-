"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { PageHeader } from "@/components/PageHeader";
import { PRIMARY_BUTTON, SECONDARY_BUTTON, StickyActions } from "@/components/StickyActions";
import { NumberStepper } from "@/components/form/NumberStepper";
import { NameField } from "@/components/form/NameField";
import { FamilyOverview } from "@/components/profile/FamilyOverview";
import { PersonHeading } from "@/components/profile/PersonHeading";
import { LunchQuestion, PreferencesQuestion } from "@/components/profile/PersonQuestions";
import { PersonSwitcher } from "@/components/profile/PersonSwitcher";
import {
  FavoritesEditor,
  LunchHeadcountNote,
  PersonLunchFields,
  PersonPreferencesFields,
  STANDARD_WEEK_HINT,
  WarmMealEditor,
  WishDayEditor,
  withWishDay,
  WeekRulesEditor,
  tooManyDays,
} from "@/components/profile/editors";
import {
  LIMITS,
  createEmptyProfile,
  personLabel,
  personRoleLabel,
  saveProfile,
  standardWeekDays,
  usualLunch,
  syncPersons,
  type HouseholdProfile,
  type Person,
} from "@/lib/profile";
import { scrollToNextOpenSection } from "@/lib/stepScroll";
import { useProfile } from "@/lib/useProfile";

const STEPS = [
  { title: "Wer isst mit?", emoji: "👨‍👩‍👧" },
  { title: "Wie heißen alle?", emoji: "✏️" },
  { title: "Allergien & Abneigungen", emoji: "🥜", perPerson: true },
  { title: "Lieblingsgerichte", emoji: "😋" },
  { title: "Warme Mahlzeit", emoji: "🍽️" },
  { title: "Mittagessen unter der Woche", emoji: "🕛", perPerson: true },
  { title: "Standardwoche", emoji: "📋" },
];

const STEP = {
  household: 0,
  names: 1,
  preferences: 2,
  favorites: 3,
  warmMeal: 4,
  lunch: 5,
  rules: 6,
};

/** Mindestweg in Pixeln, ab dem eine waagrechte Wischbewegung zählt */
const SWIPE_DISTANCE = 60;

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

/** Assistent in mehreren Schritten – nur beim ersten Anlegen. */
function ProfileWizard() {
  const router = useRouter();
  const [profile, setProfile] = useState(createEmptyProfile);
  const [step, setStep] = useState(0);
  // In Schritten mit einer Person pro Ansicht: welche Person gerade dran ist
  // und welche pro Schritt schon erledigt sind.
  const [personIndex, setPersonIndex] = useState(0);
  const [doneIds, setDoneIds] = useState<Record<number, string[]>>({});
  // Personen-Schritte beginnen mit einer Vorfrage; nur die dort ausgewählten
  // Personen bekommen eine Einzelseite.
  const [phase, setPhase] = useState<"question" | "persons">("question");
  const [selected, setSelected] = useState<Record<number, string[]>>({});
  const mainRef = useRef<HTMLElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

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
  const perPerson = Boolean(STEPS[step].perPerson);
  const persons = profile.persons;
  const showQuestion = perPerson && phase === "question";
  const selectedIds = selected[step] ?? [];
  // In Personen-Schritten nur die ausgewählten Personen, in Profil-Reihenfolge
  const stepPersons = perPerson ? persons.filter((p) => selectedIds.includes(p.id)) : persons;
  const currentPerson = showQuestion
    ? undefined
    : stepPersons[Math.min(personIndex, stepPersons.length - 1)];
  const nextPerson = perPerson && !showQuestion ? stepPersons[personIndex + 1] : undefined;

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const markDone = () => {
    if (!perPerson || !currentPerson) return;
    setDoneIds((d) => {
      const ids = d[step] ?? [];
      return ids.includes(currentPerson.id) ? d : { ...d, [step]: [...ids, currentPerson.id] };
    });
  };

  /** Zu einem Schritt springen; rückwärts landet man bei der letzten Person. */
  const goTo = (next: number, entry: "start" | "end" = "start") => {
    markDone();
    // Synchron rendern, damit der Fokus noch im Tipp-Ereignis gesetzt werden
    // kann – nur dann öffnet iOS die Tastatur.
    flushSync(() => {
      setStep(next);
      // Rückwärts in einen Personen-Schritt: zur letzten ausgewählten Person,
      // ohne Auswahl zur Vorfrage. Vorwärts immer erst die Vorfrage.
      const count = (selected[next] ?? []).length;
      const toLastPerson = entry === "end" && STEPS[next].perPerson && count > 0;
      setPhase(toLastPerson ? "persons" : "question");
      setPersonIndex(toLastPerson ? count - 1 : 0);
    });
    if (next === STEP.names && entry === "start") {
      mainRef.current?.querySelector<HTMLInputElement>("[data-enter-chain]")?.focus();
    }
    scrollTop();
  };

  const selectPerson = (index: number) => {
    if (index === personIndex) return;
    markDone();
    setPersonIndex(index);
    scrollTop();
  };

  /**
   * Wer in der Vorfrage nicht ausgewählt ist, hat keine Besonderheiten:
   * keine Allergien/Abneigungen bzw. Mittagessen wie üblich.
   */
  const applyUnselected = (ids: string[]) =>
    setProfile((p) => ({
      ...p,
      persons: p.persons.map((person) => {
        if (ids.includes(person.id)) return person;
        return step === STEP.preferences
          ? { ...person, allergies: [], dislikes: [] }
          : { ...person, weekdayLunch: usualLunch(person) };
      }),
    }));

  /** "Nein, alle essen alles" / "Passt so – alle wie üblich" */
  const answerNone = () => {
    applyUnselected([]);
    setSelected((s) => ({ ...s, [step]: [] }));
    goTo(step + 1);
  };

  const toggleSelected = (id: string) =>
    setSelected((s) => {
      const ids = s[step] ?? [];
      return { ...s, [step]: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] };
    });

  /** "Doch nichts – überspringen": Person ohne Besonderheiten, weiter zur nächsten */
  const skipPerson = () => {
    if (!currentPerson) return;
    updatePerson(
      currentPerson.id,
      step === STEP.preferences
        ? { allergies: [], dislikes: [] }
        : { weekdayLunch: usualLunch(currentPerson) },
    );
    const remaining = selectedIds.filter((id) => id !== currentPerson.id);
    setSelected((s) => ({ ...s, [step]: remaining }));
    if (personIndex < remaining.length) {
      // Die nächste Person rückt auf denselben Platz nach.
      scrollTop();
    } else {
      goTo(step + 1);
    }
  };

  const forward = () => {
    // Erst den Rest des Schritts zeigen, falls noch nicht bis unten gescrollt.
    if (scrollToNextOpenSection(mainRef.current)) return;
    if (isLast) finish();
    else if (showQuestion) {
      if (selectedIds.length === 0) return answerNone();
      applyUnselected(selectedIds);
      setPhase("persons");
      setPersonIndex(0);
      scrollTop();
    } else if (nextPerson) selectPerson(personIndex + 1);
    else goTo(step + 1);
  };

  const back = () => {
    if (perPerson && !showQuestion && personIndex > 0) selectPerson(personIndex - 1);
    else if (perPerson && !showQuestion) {
      markDone();
      setPhase("question");
      scrollTop();
    } else goTo(step - 1, "end");
  };

  function finish() {
    saveProfile(profile);
    router.push("/");
  }

  const canFinish = !tooManyDays(profile.weekRules, standardWeekDays(profile));
  const missingNames = step === STEP.names && persons.some((p) => !p.name.trim());

  // Wischen nach links = Weiter, nach rechts = Zurück (nicht in Eingabefeldern
  // und nicht in waagrecht scrollbaren Leisten).
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const target = e.target as HTMLElement;
    touchStart.current =
      t && !target.closest("input, textarea, [data-no-swipe]") ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    const t = e.changedTouches[0];
    touchStart.current = null;
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    // Speichern nie per Wischen – nur über den Knopf.
    if (dx < 0 && !isLast) forward();
    if (dx > 0 && step > 0) back();
  };

  return (
    <div
      className="mx-auto flex w-full max-w-lg flex-1 flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
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

      <main ref={mainRef} className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4">
        {step === STEP.household && (
          <StepHousehold profile={profile} update={update} setCounts={setCounts} />
        )}
        {step === STEP.names && <StepNames profile={profile} updatePerson={updatePerson} />}
        {step === STEP.preferences && showQuestion && (
          <PreferencesQuestion
            persons={persons}
            selectedIds={selectedIds}
            onToggle={toggleSelected}
            onNone={answerNone}
          />
        )}
        {step === STEP.preferences && currentPerson && (
          <PersonSwitcher
            persons={stepPersons}
            everyone={persons}
            index={personIndex}
            doneIds={doneIds[step] ?? []}
            onSelect={selectPerson}
          >
            <section className="flex flex-col gap-5 rounded-3xl bg-white p-4 shadow-sm">
              <PersonHeading person={currentPerson} persons={persons} />
              <PersonPreferencesFields
                person={currentPerson}
                onChange={(changes) => updatePerson(currentPerson.id, changes)}
              />
            </section>
            <SkipLink onClick={skipPerson}>Doch nichts – überspringen</SkipLink>
          </PersonSwitcher>
        )}
        {step === STEP.favorites && (
          <FavoritesEditor
            values={profile.favoriteDishes}
            onChange={(favoriteDishes) => update({ favoriteDishes })}
          />
        )}
        {step === STEP.warmMeal && (
          <WarmMealEditor
            warmMeal={profile.warmMeal}
            onChange={(warmMeal) => update({ warmMeal })}
          />
        )}
        {step === STEP.lunch && showQuestion && (
          <>
            <LunchQuestion
              persons={persons}
              selectedIds={selectedIds}
              onToggle={toggleSelected}
              onUsual={answerNone}
              updatePerson={updatePerson}
            />
            <LunchHeadcountNote
              profile={{
                ...profile,
                persons: persons.map((p) =>
                  selectedIds.includes(p.id) ? p : { ...p, weekdayLunch: usualLunch(p) },
                ),
              }}
            />
          </>
        )}
        {step === STEP.lunch && currentPerson && (
          <>
            <PersonSwitcher
              persons={stepPersons}
              everyone={persons}
              index={personIndex}
              doneIds={doneIds[step] ?? []}
              onSelect={selectPerson}
            >
              <section className="flex flex-col gap-5 rounded-3xl bg-white p-4 shadow-sm">
                <PersonHeading person={currentPerson} persons={persons} />
                <PersonLunchFields
                  person={currentPerson}
                  onChange={(changes) => updatePerson(currentPerson.id, changes)}
                />
              </section>
              <SkipLink onClick={skipPerson}>Doch wie üblich – überspringen</SkipLink>
            </PersonSwitcher>
            <LunchHeadcountNote profile={profile} />
          </>
        )}
        {step === STEP.rules && (
          <>
            <p className="rounded-2xl bg-sky-50 px-4 py-3 text-base text-sky-900">
              {STANDARD_WEEK_HINT}
            </p>
            <WeekRulesEditor
              rules={profile.weekRules}
              onChange={(changes) =>
                update({ weekRules: { ...profile.weekRules, ...changes } })
              }
              available={standardWeekDays(profile)}
              blockedWeekdays={profile.wishDay.enabled ? [profile.wishDay.weekday] : []}
            />
            <WishDayEditor
              profile={profile}
              onChange={(wishDay) => setProfile((p) => withWishDay(p, wishDay))}
            />
          </>
        )}
      </main>

      <StickyActions>
        {step > 0 ? (
          <button type="button" onClick={back} className={SECONDARY_BUTTON}>
            Zurück
          </button>
        ) : (
          <Link href="/" className={SECONDARY_BUTTON}>
            Abbrechen
          </Link>
        )}
        <button
          type="button"
          onClick={forward}
          disabled={isLast && !canFinish}
          className={
            missingNames
              ? // Dezenter, damit niemand aus Versehen die Namen überspringt
                "h-16 min-w-0 flex-[2] truncate rounded-2xl border-2 border-orange-300 bg-white px-3 text-lg font-bold text-orange-700 active:scale-95"
              : `${PRIMARY_BUTTON} min-w-0 truncate px-3`
          }
        >
          {isLast
            ? "Speichern ✓"
            : missingNames
              ? "Ohne Namen weiter"
              : nextPerson
                ? `Weiter zu ${personLabel(nextPerson, persons)} →`
                : "Weiter"}
        </button>
      </StickyActions>
    </div>
  );
}

function SkipLink({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 w-full rounded-2xl py-3 text-center text-base font-semibold text-stone-500 underline"
    >
      {children}
    </button>
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
        <span className="text-base font-bold">Name eures Haushalts (optional)</span>
        <input
          type="text"
          value={profile.householdName}
          onChange={(e) => update({ householdName: e.target.value })}
          placeholder="z. B. Familie Müller"
          enterKeyHint="done"
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="h-14 rounded-2xl border-2 border-stone-200 px-4 text-lg outline-none focus:border-orange-400"
        />
      </label>
      {/* Beide Zähler in einer Karte – Schritt 1 soll ohne Scrollen aufs Handy passen */}
      <div className="divide-y divide-stone-100 rounded-3xl bg-white px-4 py-1 shadow-sm">
        <NumberStepper
          label="Erwachsene"
          value={profile.adults}
          min={LIMITS.adults.min}
          max={LIMITS.adults.max}
          onChange={(adults) => setCounts(adults, profile.kids)}
          variant="plain"
        />
        <NumberStepper
          label="Kinder"
          hint="bis ca. 14 Jahre"
          value={profile.kids}
          min={LIMITS.kids.min}
          max={LIMITS.kids.max}
          onChange={(kids) => setCounts(profile.adults, kids)}
          variant="plain"
        />
      </div>
    </>
  );
}

function StepNames({
  profile,
  updatePerson,
}: {
  profile: HouseholdProfile;
  updatePerson: (id: string, changes: Partial<Person>) => void;
}) {
  return (
    <>
      <p className="text-stone-600">Freiwillig – hilft aber in den nächsten Schritten.</p>
      <section className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm">
        {profile.persons.map((person, index) => (
          <NameField
            key={person.id}
            isLast={index === profile.persons.length - 1}
            compact
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
