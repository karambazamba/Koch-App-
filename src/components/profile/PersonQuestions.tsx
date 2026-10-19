"use client";

// Vorfragen für die Personen-Schritte im Assistenten: Erst fragen, ob es bei
// jemandem Besonderheiten gibt – nur diese Personen bekommen eine Einzelseite.

import { Check, ThumbsUp } from "lucide-react";
import { PERSON_ICONS } from "@/components/form/NameField";
import { AGE_GROUP_ICONS, lunchSummary } from "@/components/profile/editors";
import { CARD, CARD_LIST, SUBTLE, buttonClass, chipClass, tileClass } from "@/components/ui/styles";
import {
  KID_AGE_GROUP_LABELS,
  personLabel,
  usualLunch,
  type KidAgeGroup,
  type Person,
} from "@/lib/einstellungen/profile";

const BIG_BUTTON = `${buttonClass("primary", "lg")} w-full`;

/** Mehrfachauswahl von Personen als Chips */
function PersonChips({
  label,
  persons,
  selectedIds,
  onToggle,
}: {
  label: string;
  persons: Person[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {persons.map((person) => {
        const selected = selectedIds.includes(person.id);
        return (
          <button
            key={person.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onToggle(person.id)}
            className={`${chipClass(selected)} h-11`}
          >
            {selected ? (
              <Check className="h-4 w-4" strokeWidth={2.75} aria-hidden />
            ) : (
              <PersonIcon person={person} />
            )}
            {personLabel(person, persons)}
          </button>
        );
      })}
    </div>
  );
}

function PersonIcon({ person }: { person: Person }) {
  const Icon = PERSON_ICONS[person.role];
  return <Icon className="h-4 w-4 text-muted" strokeWidth={2.25} aria-hidden />;
}

export function PreferencesQuestion({
  persons,
  selectedIds,
  onToggle,
  onNone,
}: {
  persons: Person[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onNone: () => void;
}) {
  return (
    <>
      <p className="text-xl font-bold tracking-tight">
        Gibt es bei jemandem Allergien oder Sachen, die er/sie nicht mag?
      </p>
      <button type="button" onClick={onNone} className={BIG_BUTTON}>
        <ThumbsUp className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        Nein, alle essen alles
      </button>
      <section className={`${CARD} flex flex-col gap-3 p-4`}>
        <p className="text-base font-bold">Ja, bei:</p>
        <PersonChips
          label="Personen mit Allergien oder Abneigungen"
          persons={persons}
          selectedIds={selectedIds}
          onToggle={onToggle}
        />
        <p className={SUBTLE}>
          {selectedIds.length > 0
            ? "Mit „Weiter“ geht es zu den ausgewählten Personen."
            : "Antippen, wen es betrifft – dann „Weiter“."}
        </p>
      </section>
    </>
  );
}

const GROUPS: KidAgeGroup[] = ["kleinkind", "kitakind", "schulkind"];

export function LunchQuestion({
  persons,
  selectedIds,
  onToggle,
  onUsual,
  updatePerson,
}: {
  persons: Person[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onUsual: () => void;
  updatePerson: (id: string, changes: Partial<Person>) => void;
}) {
  return (
    <>
      <p className="text-xl font-bold tracking-tight">So planen wir das Mittagessen unter der Woche – passt das?</p>
      <ul className={`${CARD_LIST} px-4`}>
        {persons.map((person) => {
          // Abweichende Personen werden auf ihrer eigenen Seite eingestellt.
          const shown = selectedIds.includes(person.id)
            ? person
            : { ...person, weekdayLunch: usualLunch(person) };
          return (
            <li key={person.id} className="flex flex-col gap-2 py-3">
              <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="flex items-center gap-2 text-base font-bold">
                  <PersonIcon person={person} />
                  {personLabel(person, persons)}
                </span>
                <span className="text-sm text-muted">
                  {selectedIds.includes(person.id)
                    ? "einzeln einstellen"
                    : `mittags ${lunchSummary(shown)}`}
                </span>
              </span>
              {person.role === "kind" && (
                <span
                  role="group"
                  aria-label={`${personLabel(person, persons)}: Gruppe`}
                  className="grid grid-cols-3 gap-2"
                >
                  {GROUPS.map((group) => {
                    const selected = (person.ageGroup ?? "kitakind") === group;
                    const Icon = AGE_GROUP_ICONS[group];
                    return (
                      <button
                        key={group}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          updatePerson(person.id, {
                            ageGroup: group,
                            weekdayLunch: usualLunch({ role: "kind", ageGroup: group }),
                          })
                        }
                        className={tileClass(selected)}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                        {KID_AGE_GROUP_LABELS[group]}
                      </button>
                    );
                  })}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={onUsual} className={BIG_BUTTON}>
        <ThumbsUp className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        Passt so – alle wie üblich
      </button>
      <section className={`${CARD} flex flex-col gap-3 p-4`}>
        <p className="text-base font-bold">Bei wem ist es anders?</p>
        <PersonChips
          label="Personen mit abweichendem Mittagessen"
          persons={persons}
          selectedIds={selectedIds}
          onToggle={onToggle}
        />
      </section>
    </>
  );
}
