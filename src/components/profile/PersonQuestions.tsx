"use client";

// Vorfragen für die Personen-Schritte im Assistenten: Erst fragen, ob es bei
// jemandem Besonderheiten gibt – nur diese Personen bekommen eine Einzelseite.

import { lunchSummary } from "@/components/profile/editors";
import {
  KID_AGE_GROUP_LABELS,
  personLabel,
  usualLunch,
  type KidAgeGroup,
  type Person,
} from "@/lib/profile";

const BIG_BUTTON =
  "flex min-h-16 w-full items-center justify-center rounded-2xl bg-emerald-500 px-4 text-lg font-extrabold text-white shadow-md active:scale-95";

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
            className={`flex h-12 items-center gap-1.5 rounded-full border-2 px-4 text-base font-bold active:scale-95 ${
              selected
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-stone-200 bg-white text-stone-700"
            }`}
          >
            {selected && <span aria-hidden>✓</span>}
            {person.role === "erwachsen" ? "🧑" : "🧒"} {personLabel(person, persons)}
          </button>
        );
      })}
    </div>
  );
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
      <p className="text-xl font-bold">
        Gibt es bei jemandem Allergien oder Sachen, die er/sie nicht mag?
      </p>
      <button type="button" onClick={onNone} className={BIG_BUTTON}>
        Nein, alle essen alles 👍
      </button>
      <section className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm">
        <p className="text-lg font-bold">Ja, bei:</p>
        <PersonChips
          label="Personen mit Allergien oder Abneigungen"
          persons={persons}
          selectedIds={selectedIds}
          onToggle={onToggle}
        />
        <p className="text-sm text-stone-500">
          {selectedIds.length > 0
            ? "Mit „Weiter“ geht es zu den ausgewählten Personen."
            : "Antippen, wen es betrifft – dann „Weiter“."}
        </p>
      </section>
    </>
  );
}

const GROUPS: { value: KidAgeGroup; emoji: string }[] = [
  { value: "kleinkind", emoji: "👶" },
  { value: "kitakind", emoji: "🧸" },
  { value: "schulkind", emoji: "🎒" },
];

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
      <p className="text-xl font-bold">So planen wir das Mittagessen unter der Woche – passt das?</p>
      <ul className="divide-y divide-stone-100 rounded-3xl bg-white px-4 shadow-sm">
        {persons.map((person) => {
          // Abweichende Personen werden auf ihrer eigenen Seite eingestellt.
          const shown = selectedIds.includes(person.id)
            ? person
            : { ...person, weekdayLunch: usualLunch(person) };
          return (
            <li key={person.id} className="flex flex-col gap-2 py-3">
              <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-lg font-bold">
                  {person.role === "erwachsen" ? "🧑" : "🧒"} {personLabel(person, persons)}
                </span>
                <span className="text-base text-stone-600">
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
                  {GROUPS.map((g) => {
                    const selected = (person.ageGroup ?? "kitakind") === g.value;
                    return (
                      <button
                        key={g.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          updatePerson(person.id, {
                            ageGroup: g.value,
                            weekdayLunch: usualLunch({ role: "kind", ageGroup: g.value }),
                          })
                        }
                        className={`h-11 rounded-xl border-2 text-sm font-bold active:scale-95 ${
                          selected
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-stone-200 bg-white text-stone-600"
                        }`}
                      >
                        {g.emoji} {KID_AGE_GROUP_LABELS[g.value]}
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
        Passt so – alle wie üblich 👍
      </button>
      <section className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm">
        <p className="text-lg font-bold">Bei wem ist es anders?</p>
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
