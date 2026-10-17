"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/PageHeader";
import { STANDARD_WEEK_HINT, lunchSummary } from "@/components/profile/editors";
import {
  LIMITS,
  clearProfile,
  formatWarmMeals,
  personLabel,
  personRoleLabel,
  planningWeekLabel,
  weekdayLunchHeadcount,
  WISH_MEAL_LABELS,
  type HouseholdProfile,
  type Person,
} from "@/lib/profile";

const LUNCH_ICONS = { zuhause: "🏠", auswaerts: "💼", manchmal: "🔄" } as const;

/**
 * Übersicht "Unsere Familie" in drei Abschnitten: Familie, Essgewohnheiten,
 * Standardwoche. Jede Zeile öffnet die passende Bearbeiten-Ansicht.
 */
export function FamilyOverview({ profile }: { profile: HouseholdProfile }) {
  const { persons, weekRules } = profile;
  const lunch = weekdayLunchHeadcount(profile);

  const reset = () => {
    if (window.confirm("Profil wirklich löschen und komplett neu beginnen?")) {
      clearProfile();
      window.scrollTo({ top: 0 });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Unsere Familie" />

      <main className="safe-bottom flex flex-1 flex-col gap-8 px-4 pb-8 pt-2">
        <Section title="Familie">
          <List>
            <Row href="/profil/haushalt" icon="🏡" title={profile.householdName.trim() || "Haushalt"}>
              <span className="text-sm text-stone-500">
                {profile.householdName.trim() ? "Haushalt" : "Name des Haushalts eintragen"}
              </span>
            </Row>
            {persons.map((person) => (
              <PersonRow key={person.id} person={person} persons={persons} />
            ))}
            {profile.adults < LIMITS.adults.max && (
              <AddRow href="/profil/person?neu=erwachsen" label="Erwachsene:r hinzufügen" />
            )}
            {profile.kids < LIMITS.kids.max && (
              <AddRow href="/profil/person?neu=kind" label="Kind hinzufügen" />
            )}
          </List>
          <p className="px-1 text-sm text-stone-500" role="status">
            🏠 Mittagessen Mo–Fr zu Hause:{" "}
            <span className="whitespace-nowrap font-semibold text-stone-700">
              {lunch.min === lunch.max ? lunch.min : `${lunch.min}–${lunch.max}`}{" "}
              {lunch.min === 1 && lunch.max === 1 ? "Person" : "Personen"}
            </span>
          </p>
        </Section>

        <Section title="Essgewohnheiten">
          <List>
            <Row href="/profil/lieblingsgerichte" icon="😋" title="Lieblingsgerichte">
              <span className="line-clamp-2 text-sm text-stone-500">
                {profile.favoriteDishes.length > 0
                  ? profile.favoriteDishes.join(", ")
                  : "Noch keine eingetragen"}
              </span>
            </Row>
            <Row href="/profil/warme-mahlzeit" icon="🍽️" title="Warme Mahlzeit">
              <span className="text-sm text-stone-500">
                <Nowrap>Mo–Fr: {formatWarmMeals(profile.warmMeal.weekday)}</Nowrap>
                {" · "}
                <Nowrap>Sa–So: {formatWarmMeals(profile.warmMeal.weekend)}</Nowrap>
              </span>
            </Row>
            <Row href="/profil/einkaufstag" icon="🛒" title="Einkaufstag">
              <span className="text-sm text-stone-500">
                <Nowrap>{profile.shoppingDay}</Nowrap>
                {" · "}
                <Nowrap>Planungswoche {planningWeekLabel(profile.shoppingDay)}</Nowrap>
              </span>
            </Row>
          </List>
        </Section>

        <Section title="Standardwoche" hint={STANDARD_WEEK_HINT}>
          <List>
            <Row href="/profil/standardwoche" icon="📋" title="Wochenvorlage">
              <span className="text-sm text-stone-500">
                <Nowrap>{weekRules.meatDays}× Fleisch</Nowrap>
                {" · "}
                <Nowrap>{weekRules.vegetarianDays}× vegetarisch</Nowrap>
                {" · "}
                <Nowrap>{weekRules.fishDays}× Fisch</Nowrap>
                {" · "}
                <Nowrap>
                  Cheat Day:{" "}
                  {weekRules.cheatDay ? weekRules.cheatDayWeekday || "ja" : "nein"}
                </Nowrap>
                {profile.wishDay.enabled && (
                  <>
                    {" · "}
                    <Nowrap>
                      🎉 Wunschtag: {profile.wishDay.weekday.slice(0, 2)}{" "}
                      {WISH_MEAL_LABELS[profile.wishDay.meal]}
                    </Nowrap>
                  </>
                )}
              </span>
            </Row>
          </List>
        </Section>

        <button
          type="button"
          onClick={reset}
          className="self-center rounded-2xl px-4 py-3 text-sm font-semibold text-stone-500 underline"
        >
          Profil löschen und neu beginnen
        </button>
      </main>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="px-1">
        <h2 className="text-xl font-extrabold">{title}</h2>
        {hint && <p className="text-sm text-stone-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** Weiße Karte mit Trennlinien zwischen den Zeilen */
function List({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-stone-100 overflow-hidden rounded-3xl bg-white shadow-sm">
      {children}
    </ul>
  );
}

function Nowrap({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap">{children}</span>;
}

function Row({
  href,
  icon,
  title,
  children,
}: {
  href: string;
  icon: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <li>
      <Link href={href} className="flex min-h-16 items-center gap-3 px-4 py-3 active:bg-orange-50">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-50 text-2xl"
          aria-hidden
        >
          {icon}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-lg font-bold leading-tight">{title}</span>
          {children}
        </span>
        <span className="shrink-0 text-2xl text-stone-300" aria-hidden>
          ›
        </span>
      </Link>
    </li>
  );
}

function PersonRow({ person, persons }: { person: Person; persons: Person[] }) {
  const lunch = person.weekdayLunch ?? (person.role === "kind" ? "auswaerts" : "zuhause");
  const lunchIcon = lunch === "auswaerts" && person.role === "kind" ? "🏫" : LUNCH_ICONS[lunch];
  const named = Boolean(person.name.trim());

  return (
    <Row
      href={`/profil/person?id=${encodeURIComponent(person.id)}`}
      icon={person.role === "erwachsen" ? "🧑" : "🧒"}
      title={personLabel(person, persons)}
    >
      {named && <span className="text-sm text-stone-500">{personRoleLabel(person, persons)}</span>}
      <span className="flex flex-wrap gap-1">
        {person.allergies.map((item) => (
          <Chip key={`a-${item}`} className="bg-rose-100 text-rose-800">
            {item}
          </Chip>
        ))}
        {person.dislikes.map((item) => (
          <Chip key={`d-${item}`} className="bg-stone-100 text-stone-600">
            {item}
          </Chip>
        ))}
        <Chip className="bg-sky-50 text-sky-800">
          <span aria-hidden>{lunchIcon}</span> mittags {lunchSummary(person)}
        </Chip>
      </span>
    </Row>
  );
}

function Chip({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function AddRow({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-14 items-center gap-3 px-4 py-2 font-semibold text-orange-700 active:bg-orange-50"
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-orange-300 text-xl"
          aria-hidden
        >
          +
        </span>
        {label}
      </Link>
    </li>
  );
}
