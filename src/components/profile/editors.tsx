"use client";

// Formular-Bausteine des Haushaltsprofils. Werden im Assistenten (erstes
// Anlegen) und in den einzelnen Bearbeiten-Ansichten verwendet.

import { ChoiceGroup, MultiChoiceGroup } from "@/components/form/ChoiceGroup";
import { NumberStepper } from "@/components/form/NumberStepper";
import { TagInput } from "@/components/form/TagInput";
import {
  COMMON_ALLERGIES,
  KID_AGE_GROUP_LABELS,
  LIMITS,
  WEEKDAYS,
  weekdayLunchHeadcount,
  type HouseholdProfile,
  type KidAgeGroup,
  type Person,
  type WarmMeal,
  type WarmMealSchedule,
  type WeekdayLunch,
  type WeekRules,
} from "@/lib/profile";

export const FAVORITE_SUGGESTIONS = [
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

const WARM_MEAL_OPTIONS: { value: WarmMeal; label: string; emoji: string }[] = [
  { value: "mittags", label: "Mittags", emoji: "☀️" },
  { value: "abends", label: "Abends", emoji: "🌙" },
  { value: "flexibel", label: "Mal so, mal so", emoji: "🔄" },
];

const ADULT_LUNCH_OPTIONS: { value: WeekdayLunch; label: string; emoji: string }[] = [
  { value: "zuhause", label: "Ist mittags zu Hause", emoji: "🏠" },
  { value: "auswaerts", label: "Isst auswärts (z. B. Arbeit)", emoji: "💼" },
  { value: "manchmal", label: "Manchmal", emoji: "🔄" },
];

const KID_LUNCH_OPTIONS: { value: WeekdayLunch; label: string; emoji: string }[] = [
  { value: "auswaerts", label: "Isst in Kita/Schule", emoji: "🏫" },
  { value: "zuhause", label: "Isst zu Hause", emoji: "🏠" },
  { value: "manchmal", label: "Manchmal", emoji: "🔄" },
];

/** Kurzform fürs Mittagessen unter der Woche, z. B. für die Übersicht. */
export function lunchSummary(person: Person): string {
  const lunch = person.weekdayLunch ?? (person.role === "kind" ? "auswaerts" : "zuhause");
  if (lunch === "zuhause") return "zu Hause";
  if (lunch === "manchmal") return "manchmal zu Hause";
  return person.role === "kind" ? "in Kita/Schule" : "auswärts";
}

/** Vorschlag für die Altersgruppe, wenn ein Alter eingetragen wird. */
function ageGroupForAge(age: number): KidAgeGroup {
  if (age < 3) return "kleinkind";
  if (age < 6) return "kitakind";
  return "schulkind";
}

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
        <span className="text-lg font-bold">Alter (optional)</span>
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
          className="h-14 w-24 shrink-0 rounded-2xl border-2 border-stone-200 px-3 text-center text-lg font-bold outline-none focus:border-orange-400"
        />
      </label>
      <ChoiceGroup<KidAgeGroup>
        label="Alter oder Gruppe"
        value={person.ageGroup ?? "kitakind"}
        onChange={(ageGroup) => onChange({ ageGroup })}
        options={[
          { value: "kleinkind", label: KID_AGE_GROUP_LABELS.kleinkind, emoji: "👶" },
          { value: "kitakind", label: KID_AGE_GROUP_LABELS.kitakind, emoji: "🧸" },
          { value: "schulkind", label: KID_AGE_GROUP_LABELS.schulkind, emoji: "🎒" },
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

export function FavoritesEditor({
  values,
  onChange,
}: {
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <p className="mb-4 text-stone-600">
        Was kommt bei euch immer gut an? Tippe an oder schreib eigene Gerichte dazu.
      </p>
      <TagInput
        label="Unsere Lieblingsgerichte"
        placeholder="z. B. Omas Gulasch"
        values={values}
        onChange={onChange}
        suggestions={FAVORITE_SUGGESTIONS}
      />
    </section>
  );
}

export function WarmMealEditor({
  warmMeal,
  onChange,
}: {
  warmMeal: WarmMealSchedule;
  onChange: (warmMeal: WarmMealSchedule) => void;
}) {
  return (
    <section className="flex flex-col gap-5 rounded-3xl bg-white p-4 shadow-sm">
      <p className="text-lg font-bold">Wann gibt es die warme Mahlzeit?</p>
      <MultiChoiceGroup<WarmMeal>
        label="Unter der Woche (Mo–Fr)"
        hint="Mittags und abends gleichzeitig = zwei warme Mahlzeiten"
        values={warmMeal.weekday}
        onChange={(weekday) => onChange({ ...warmMeal, weekday })}
        options={WARM_MEAL_OPTIONS}
        exclusive={["flexibel"]}
        variant="plain"
      />
      <MultiChoiceGroup<WarmMeal>
        label="Am Wochenende (Sa–So)"
        hint="Mittags und abends gleichzeitig = zwei warme Mahlzeiten"
        values={warmMeal.weekend}
        onChange={(weekend) => onChange({ ...warmMeal, weekend })}
        options={WARM_MEAL_OPTIONS}
        exclusive={["flexibel"]}
        variant="plain"
      />
    </section>
  );
}

export function LunchHeadcountNote({ profile }: { profile: HouseholdProfile }) {
  const lunch = weekdayLunchHeadcount(profile);
  return (
    <p
      className="rounded-2xl bg-emerald-100 px-4 py-3 text-base font-semibold text-emerald-800"
      role="status"
    >
      Mittagessen unter der Woche zu Hause:{" "}
      {lunch.min === lunch.max ? lunch.min : `${lunch.min}–${lunch.max}`}{" "}
      {lunch.min === 1 && lunch.max === 1 ? "Person" : "Personen"}
    </p>
  );
}

export const STANDARD_WEEK_HINT =
  "Vorlage für jede neue Woche – im Wochen-Check pro Woche anpassbar.";

/** Mehr Tage verplant als zum Kochen da sind? */
export function tooManyDays(rules: WeekRules, available = 7): boolean {
  return rules.meatDays + rules.vegetarianDays + rules.fishDays > available;
}

/**
 * Fleisch/vegetarisch/Fisch pro Woche und Cheat Day. Für die Standardwoche
 * (7 Tage) und den Wochen-Check (7 Tage minus Ausflugstage).
 */
export function WeekRulesEditor({
  rules,
  onChange,
  available = 7,
  blockedWeekdays = [],
  intro = "Wie oft pro Woche soll es was geben?",
}: {
  rules: WeekRules;
  onChange: (changes: Partial<WeekRules>) => void;
  /** Tage, an denen gekocht wird */
  available?: number;
  /** Wochentage, die nicht Cheat Day sein können (z. B. Ausflug) */
  blockedWeekdays?: string[];
  intro?: string;
}) {
  const planned = rules.meatDays + rules.vegetarianDays + rules.fishDays;
  const { min } = LIMITS.daysPerWeek;
  const max = Math.max(min, available);
  const free = available - planned;
  const daysWord = (n: number) => (n === 1 ? "Tag" : "Tage");

  return (
    <>
      {intro && <p className="text-stone-600">{intro}</p>}
      <NumberStepper
        label="🥩 Fleisch"
        hint="Tage pro Woche"
        value={rules.meatDays}
        min={min}
        max={max}
        onChange={(meatDays) => onChange({ meatDays })}
      />
      <NumberStepper
        label="🥦 Vegetarisch"
        hint="Tage pro Woche"
        value={rules.vegetarianDays}
        min={min}
        max={max}
        onChange={(vegetarianDays) => onChange({ vegetarianDays })}
      />
      <NumberStepper
        label="🐟 Fisch"
        hint="Tage pro Woche"
        value={rules.fishDays}
        min={min}
        max={max}
        onChange={(fishDays) => onChange({ fishDays })}
      />
      <p
        className={`rounded-2xl px-4 py-3 text-base font-semibold ${
          planned > available ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
        }`}
        role="status"
      >
        {planned > available
          ? available === 7
            ? `Zusammen ${planned} Tage – eine Woche hat nur 7. Bitte etwas reduzieren.`
            : `Zusammen ${planned} Tage – es sind nur ${available} Kochtage frei. Bitte etwas reduzieren.`
          : `${planned} von ${available} ${available === 7 ? "Tagen" : "Kochtagen"} verplant${free > 0 ? ` – ${free} ${daysWord(free)} ${free === 1 ? "bleibt" : "bleiben"} frei.` : "."}`}
      </p>

      <ChoiceGroup<"ja" | "nein">
        label="🍕 Cheat Day? (Pizza, Pommes & Co.)"
        value={rules.cheatDay ? "ja" : "nein"}
        onChange={(v) => onChange({ cheatDay: v === "ja" })}
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
              const blocked = blockedWeekdays.includes(day);
              return (
                <button
                  key={day || "egal"}
                  type="button"
                  aria-pressed={selected}
                  aria-label={day ? (blocked ? `${day} (unterwegs)` : day) : "Egal"}
                  disabled={blocked}
                  onClick={() => onChange({ cheatDayWeekday: day })}
                  className={`h-14 rounded-2xl border-2 text-base font-bold active:scale-95 disabled:opacity-30 ${
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
