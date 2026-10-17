"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Briefcase,
  CalendarRange,
  Heart,
  Home,
  Plus,
  RefreshCw,
  School,
  ShoppingCart,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { PERSON_ICONS } from "@/components/form/NameField";
import { PageHeader } from "@/components/PageHeader";
import { ListRow } from "@/components/ui/ListRow";
import { CARD_LIST, PAGE_MAIN, SECTION_TITLE, SUBTLE } from "@/components/ui/styles";
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

const LUNCH_ICONS: Record<"zuhause" | "auswaerts" | "manchmal", LucideIcon> = {
  zuhause: Home,
  auswaerts: Briefcase,
  manchmal: RefreshCw,
};

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

      <main className={`${PAGE_MAIN} gap-8`}>
        <Section title="Familie">
          <List>
            <Row href="/profil/haushalt" icon={Home} title={profile.householdName.trim() || "Haushalt"}>
              <span>
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
          <p className={`flex items-center gap-1.5 px-1 ${SUBTLE}`} role="status">
            <Home className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
            <span>
              Mittagessen Mo–Fr zu Hause:{" "}
              <span className="whitespace-nowrap font-semibold text-ink">
              {lunch.min === lunch.max ? lunch.min : `${lunch.min}–${lunch.max}`}{" "}
              {lunch.min === 1 && lunch.max === 1 ? "Person" : "Personen"}
              </span>
            </span>
          </p>
        </Section>

        <Section title="Essgewohnheiten">
          <List>
            <Row href="/profil/lieblingsgerichte" icon={Heart} title="Lieblingsgerichte">
              <span className="line-clamp-2">
                {profile.favoriteDishes.length > 0
                  ? profile.favoriteDishes.join(", ")
                  : "Noch keine eingetragen"}
              </span>
            </Row>
            <Row href="/profil/warme-mahlzeit" icon={UtensilsCrossed} title="Warme Mahlzeit">
              <span>
                <Nowrap>Mo–Fr: {formatWarmMeals(profile.warmMeal.weekday)}</Nowrap>
                {" · "}
                <Nowrap>Sa–So: {formatWarmMeals(profile.warmMeal.weekend)}</Nowrap>
              </span>
            </Row>
            <Row href="/profil/einkaufstag" icon={ShoppingCart} title="Einkaufstag">
              <span>
                <Nowrap>{profile.shoppingDay}</Nowrap>
                {" · "}
                <Nowrap>Planungswoche {planningWeekLabel(profile.shoppingDay)}</Nowrap>
              </span>
            </Row>
          </List>
        </Section>

        <Section title="Standardwoche" hint={STANDARD_WEEK_HINT}>
          <List>
            <Row href="/profil/standardwoche" icon={CalendarRange} title="Wochenvorlage">
              <span>
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
          className="self-center px-4 py-3 text-sm font-semibold text-muted underline"
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
        <h2 className={SECTION_TITLE}>{title}</h2>
        {hint && <p className={SUBTLE}>{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** Weiße Karte mit Trennlinien zwischen den Zeilen */
function List({ children }: { children: ReactNode }) {
  return (
    <ul className={CARD_LIST}>
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
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
}) {
  return (
    <li>
      <ListRow href={href} icon={icon} title={title} subtitle={children} />
    </li>
  );
}

function PersonRow({ person, persons }: { person: Person; persons: Person[] }) {
  const lunch = person.weekdayLunch ?? (person.role === "kind" ? "auswaerts" : "zuhause");
  const LunchIcon = lunch === "auswaerts" && person.role === "kind" ? School : LUNCH_ICONS[lunch];
  const named = Boolean(person.name.trim());

  return (
    <Row
      href={`/profil/person?id=${encodeURIComponent(person.id)}`}
      icon={PERSON_ICONS[person.role]}
      title={personLabel(person, persons)}
    >
      {named && <span className="block">{personRoleLabel(person, persons)}</span>}
      <span className="mt-1 flex flex-wrap gap-1">
        {person.allergies.map((item) => (
          <Chip key={`a-${item}`} className="bg-red-50 text-red-700">
            {item}
          </Chip>
        ))}
        {person.dislikes.map((item) => (
          <Chip key={`d-${item}`} className="bg-stone-100 text-stone-700">
            {item}
          </Chip>
        ))}
        <Chip className="bg-stone-100 text-stone-700">
          <LunchIcon className="h-3 w-3" strokeWidth={2.5} aria-hidden /> mittags {lunchSummary(person)}
        </Chip>
      </span>
    </Row>
  );
}

function Chip({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function AddRow({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-14 items-center gap-3 px-4 py-2 font-bold text-accent-strong transition active:bg-stone-50"
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dashed border-accent/50 text-accent"
          aria-hidden
        >
          <Plus className="h-5 w-5" strokeWidth={2.25} />
        </span>
        {label}
      </Link>
    </li>
  );
}
