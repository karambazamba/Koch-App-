"use client";

// Formular-Bausteine für eine Person im Haushaltsprofil: Allergien und
// "Mag nicht", Mittagessen unter der Woche, bei Kindern Alter und Gruppe.

import { Backpack, Baby, Briefcase, Home, RefreshCw, School, Smile, type LucideIcon } from "lucide-react";
import { ChoiceGroup } from "@/components/ui/ChoiceGroup";
import { TagInput } from "@/components/ui/TagInput";
import { INPUT_BASE } from "@/components/ui/styles";
import { COMMON_ALLERGIES, KID_AGE_GROUP_LABELS, LIMITS, type KidAgeGroup, type Person, type WeekdayLunch } from "@/lib/einstellungen/profile";
import { ageGroupForAge } from "@/lib/einstellungen/personLunch";

const DISLIKE_SUGGESTIONS = ["Pilze", "Zwiebeln", "Paprika", "Oliven", "Scharfes"];

const ADULT_LUNCH_OPTIONS = [
  { value: "zuhause", label: "Ist mittags zu Hause", icon: Home },
  { value: "auswaerts", label: "Isst auswärts (z. B. Arbeit)", icon: Briefcase },
  { value: "manchmal", label: "Manchmal", icon: RefreshCw },
] satisfies { value: WeekdayLunch; label: string; icon: LucideIcon }[];

const KID_LUNCH_OPTIONS = [
  { value: "auswaerts", label: "Isst in Kita/Schule", icon: School },
  { value: "zuhause", label: "Isst zu Hause", icon: Home },
  { value: "manchmal", label: "Manchmal", icon: RefreshCw },
] satisfies { value: WeekdayLunch; label: string; icon: LucideIcon }[];

/** Altersgruppen mit Icon (auch im Assistenten) */
const AGE_GROUP_ICONS = { kleinkind: Baby, kitakind: Smile, schulkind: Backpack } as const;

type PersonFieldsProps = {
  person: Person;
  onChange: (changes: Partial<Person>) => void;
};

/** Allergien und "Mag nicht" einer Person. */
export function PersonPreferencesFields({ person, onChange }: PersonFieldsProps) {
  return (
    <>
      <TagInput
        label="Allergien & Unverträglichkeiten"
        placeholder="Weitere Allergie"
        values={person.allergies}
        onChange={(allergies) => onChange({ allergies })}
        suggestions={COMMON_ALLERGIES}
        tone="red"
      />
      <TagInput
        label="Mag nicht"
        placeholder="z. B. Rosenkohl"
        values={person.dislikes}
        onChange={(dislikes) => onChange({ dislikes })}
        suggestions={DISLIKE_SUGGESTIONS}
      />
    </>
  );
}

/**
 * Mittagessen unter der Woche. Bei Erwachsenen zusätzlich "Berufstätig",
 * bei Kindern Alter und Gruppe.
 */
export function PersonLunchFields({ person, onChange }: PersonFieldsProps) {
  if (person.role === "erwachsen") {
    const employed =
      person.employed === true ? "ja" : person.employed === false ? "nein" : "";
    return (
      <>
        <ChoiceGroup<WeekdayLunch>
          label="Mittagessen unter der Woche"
          value={person.weekdayLunch ?? "zuhause"}
          onChange={(weekdayLunch) => onChange({ weekdayLunch })}
          options={ADULT_LUNCH_OPTIONS}
          variant="plain"
        />
        <ChoiceGroup<"ja" | "nein" | "">
          label="Berufstätig?"
          hint="Optional, nur als Info"
          value={employed}
          onChange={(v) => onChange({ employed: v === "ja" })}
          options={[
            { value: "ja", label: "Ja" },
            { value: "nein", label: "Nein" },
          ]}
          columns={2}
          variant="plain"
        />
      </>
    );
  }

  const { min, max } = LIMITS.kidAge;
  const setAge = (value: string) => {
    if (value === "") {
      onChange({ age: null });
      return;
    }
    const age = Math.min(max, Math.max(min, Math.round(Number(value))));
    if (Number.isNaN(age)) return;
    onChange({ age, ageGroup: ageGroupForAge(age) });
  };

  return (
    <>
      <label className="flex items-center justify-between gap-3">
        <span className="text-base font-bold">Alter (optional)</span>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={person.age ?? ""}
          onChange={(e) => setAge(e.target.value)}
          placeholder="Jahre"
          enterKeyHint="done"
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          aria-label="Alter in Jahren (optional)"
          className={`${INPUT_BASE} h-12 w-24 shrink-0 px-3 text-center text-lg font-bold`}
        />
      </label>
      <ChoiceGroup<KidAgeGroup>
        label="Alter oder Gruppe"
        value={person.ageGroup ?? "kitakind"}
        onChange={(ageGroup) => onChange({ ageGroup })}
        options={[
          { value: "kleinkind", label: KID_AGE_GROUP_LABELS.kleinkind, icon: AGE_GROUP_ICONS.kleinkind },
          { value: "kitakind", label: KID_AGE_GROUP_LABELS.kitakind, icon: AGE_GROUP_ICONS.kitakind },
          { value: "schulkind", label: KID_AGE_GROUP_LABELS.schulkind, icon: AGE_GROUP_ICONS.schulkind },
        ]}
        variant="plain"
      />
      <ChoiceGroup<WeekdayLunch>
        label="Mittagessen unter der Woche"
        value={person.weekdayLunch ?? "auswaerts"}
        onChange={(weekdayLunch) => onChange({ weekdayLunch })}
        options={KID_LUNCH_OPTIONS}
        variant="plain"
      />
    </>
  );
}
