"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/PageHeader";
import { LunchHeadcountNote, lunchSummary } from "@/components/profile/editors";
import {
  LIMITS,
  clearProfile,
  formatWarmMeals,
  personLabel,
  personRoleLabel,
  saveProfile,
  type HouseholdProfile,
  type Person,
} from "@/lib/profile";

/** Übersicht "Unsere Familie": jede Person und jeder Bereich einzeln bearbeitbar. */
export function FamilyOverview({ profile }: { profile: HouseholdProfile }) {
  const { persons } = profile;
  const canRemoveAdult = profile.adults > LIMITS.adults.min;

  const removePerson = (person: Person) => {
    if (!window.confirm(`${personLabel(person, persons)} wirklich entfernen?`)) return;
    const isKid = person.role === "kind";
    saveProfile({
      ...profile,
      adults: isKid ? profile.adults : profile.adults - 1,
      kids: isKid ? profile.kids - 1 : profile.kids,
      persons: persons.filter((p) => p.id !== person.id),
    });
  };

  const reset = () => {
    if (window.confirm("Profil wirklich löschen und komplett neu beginnen?")) {
      clearProfile();
      window.scrollTo({ top: 0 });
    }
  };

  const { weekRules } = profile;
  const warmWeekday = formatWarmMeals(profile.warmMeal.weekday);
  const warmWeekend = formatWarmMeals(profile.warmMeal.weekend);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Unsere Familie" />

      <main className="safe-bottom flex flex-1 flex-col gap-4 px-4 pb-8 pt-2">
        <Link
          href="/profil/haushalt"
          className="flex items-center justify-between gap-3 rounded-3xl bg-white p-4 shadow-sm active:scale-[0.98]"
        >
          <span className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden>
              🏡
            </span>
            <span>
              <span className="block text-sm text-stone-500">Haushalt</span>
              <span className="block text-xl font-extrabold">
                {profile.householdName.trim() || "Ohne Namen"}
              </span>
            </span>
          </span>
          <EditHint />
        </Link>

        <h2 className="mt-2 text-xl font-extrabold">Personen</h2>
        {persons.map((person) => {
          const removable = person.role === "kind" || canRemoveAdult;
          return (
            <article key={person.id} className="rounded-3xl bg-white shadow-sm">
              <Link
                href={`/profil/person?id=${encodeURIComponent(person.id)}`}
                className="flex items-start gap-3 rounded-3xl p-4 active:scale-[0.98]"
              >
                <span className="text-3xl" aria-hidden>
                  {person.role === "erwachsen" ? "🧑" : "🧒"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xl font-extrabold">
                    {personLabel(person, persons)}
                  </span>
                  <span className="block text-sm text-stone-500">
                    {personRoleLabel(person, persons)}
                  </span>
                  <span className="mt-2 block space-y-0.5 text-base text-stone-700">
                    <InfoLine label="Allergien" items={person.allergies} />
                    <InfoLine label="Mag nicht" items={person.dislikes} />
                    <span className="block">
                      <span className="font-semibold">Mittags (Mo–Fr):</span>{" "}
                      {lunchSummary(person)}
                    </span>
                  </span>
                </span>
                <EditHint />
              </Link>
              {removable && (
                <div className="border-t border-stone-100 px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => removePerson(person)}
                    className="rounded-xl px-3 py-2 font-semibold text-rose-700 active:scale-95"
                  >
                    Entfernen
                  </button>
                </div>
              )}
            </article>
          );
        })}

        <div className="grid grid-cols-2 gap-3">
          <AddPersonLink
            role="erwachsen"
            label="+ Erwachsene:r"
            disabled={profile.adults >= LIMITS.adults.max}
          />
          <AddPersonLink
            role="kind"
            label="+ Kind"
            disabled={profile.kids >= LIMITS.kids.max}
          />
        </div>

        <LunchHeadcountNote profile={profile} />

        <h2 className="mt-2 text-xl font-extrabold">Essen &amp; Regeln</h2>
        <AreaCard href="/profil/lieblingsgerichte" emoji="😋" title="Lieblingsgerichte">
          {profile.favoriteDishes.length > 0
            ? profile.favoriteDishes.join(", ")
            : "Noch keine eingetragen"}
        </AreaCard>
        <AreaCard href="/profil/warme-mahlzeit" emoji="🍽️" title="Warme Mahlzeit">
          Mo–Fr: {warmWeekday}
          <br />
          Sa–So: {warmWeekend}
        </AreaCard>
        <AreaCard href="/profil/wochenregeln" emoji="📋" title="Wochenregeln">
          {weekRules.meatDays}× Fleisch · {weekRules.vegetarianDays}× vegetarisch ·{" "}
          {weekRules.fishDays}× Fisch
          <br />
          Cheat Day:{" "}
          {weekRules.cheatDay ? weekRules.cheatDayWeekday || "ja, Tag egal" : "nein"}
        </AreaCard>

        <button
          type="button"
          onClick={reset}
          className="mt-4 self-center rounded-2xl px-4 py-3 font-semibold text-stone-500 underline"
        >
          Profil löschen und neu beginnen
        </button>
      </main>
    </div>
  );
}

function EditHint() {
  return (
    <span className="shrink-0 rounded-xl bg-orange-100 px-3 py-2 text-sm font-bold text-orange-700">
      Bearbeiten
    </span>
  );
}

function InfoLine({ label, items }: { label: string; items: string[] }) {
  return (
    <span className="block">
      <span className="font-semibold">{label}:</span>{" "}
      {items.length > 0 ? items.join(", ") : <span className="text-stone-400">keine</span>}
    </span>
  );
}

function AddPersonLink({
  role,
  label,
  disabled,
}: {
  role: "erwachsen" | "kind";
  label: string;
  disabled: boolean;
}) {
  const className =
    "flex h-14 items-center justify-center rounded-2xl border-2 border-dashed border-orange-300 bg-white text-lg font-bold text-orange-700";
  if (disabled) {
    return (
      <span aria-disabled className={`${className} opacity-40`}>
        {label}
      </span>
    );
  }
  return (
    <Link href={`/profil/person?neu=${role}`} className={`${className} active:scale-95`}>
      {label}
    </Link>
  );
}

function AreaCard({
  href,
  emoji,
  title,
  children,
}: {
  href: string;
  emoji: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-3xl bg-white p-4 shadow-sm active:scale-[0.98]"
    >
      <span className="text-3xl" aria-hidden>
        {emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xl font-extrabold">{title}</span>
        <span className="block text-base text-stone-700">{children}</span>
      </span>
      <EditHint />
    </Link>
  );
}
