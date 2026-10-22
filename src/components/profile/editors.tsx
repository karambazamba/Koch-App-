"use client";

// Formular-Bausteine des Haushaltsprofils. Werden im Assistenten (erstes
// Anlegen) und in den einzelnen Bearbeiten-Ansichten verwendet. Die Felder
// einer Person stehen in PersonEditors.tsx.

import { AlertTriangle, CheckCircle2, Moon, Sun, type LucideIcon } from "lucide-react";
import { ChoiceGroup } from "@/components/form/ChoiceGroup";
import { NumberStepper } from "@/components/form/NumberStepper";
import { TagInput } from "@/components/form/TagInput";
import { CARD, NOTE, WARNING, tileClass } from "@/components/ui/styles";
import { LIMITS, WEEKDAYS, isWishDayEligible, personLabel, wishDayOrder, type HouseholdProfile, type MealTime, type WarmMealSchedule, type WeekRules, type WishDaySettings } from "@/lib/einstellungen/profile";

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

const MEAL_TIME_OPTIONS = [
  { value: "mittags", label: "Mittags", icon: Sun },
  { value: "abends", label: "Abends", icon: Moon },
] satisfies { value: MealTime; label: string; icon: LucideIcon }[];

export { NOTE,  };
export { PersonLunchFields, PersonPreferencesFields } from "@/components/profile/PersonEditors";
export { lunchSummary } from "@/lib/einstellungen/personLunch";

export function FavoritesEditor({
  values,
  onChange,
}: {
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <section className={`${CARD} p-4`}>
      <p className="mb-4 text-base text-muted">
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
    <section className={`${CARD} flex flex-col gap-6 p-4`}>
      <div>
        <p className="text-lg font-bold">Wann esst ihr meistens zusammen warm?</p>
        <p className="text-sm text-muted">
          Wir planen ein Hauptgericht pro Tag. Die Zeit bestimmt nur, wer dabei ist.
        </p>
      </div>
      <ChoiceGroup<MealTime>
        label="Unter der Woche (Mo–Fr)"
        value={warmMeal.weekday}
        onChange={(weekday) => onChange({ ...warmMeal, weekday })}
        options={MEAL_TIME_OPTIONS}
        columns={2}
        variant="plain"
      />
      <ChoiceGroup<MealTime>
        label="Am Wochenende (Sa–So)"
        value={warmMeal.weekend}
        onChange={(weekend) => onChange({ ...warmMeal, weekend })}
        options={MEAL_TIME_OPTIONS}
        columns={2}
        variant="plain"
      />
    </section>
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
  fixed = {},
}: {
  rules: WeekRules;
  onChange: (changes: Partial<WeekRules>) => void;
  /** Tage, an denen gekocht wird */
  available?: number;
  /** Wochentage, die nicht Cheat Day sein können (z. B. Ausflug) */
  blockedWeekdays?: string[];
  intro?: string;
  /** Feste Gerichte je Kategorie (Wochen-Check): Untergrenze + Hinweis "davon fest: …" */
  fixed?: Partial<Record<"meatDays" | "vegetarianDays" | "fishDays", string[]>>;
}) {
  const planned = rules.meatDays + rules.vegetarianDays + rules.fishDays;
  const { min } = LIMITS.daysPerWeek;
  const max = Math.max(min, available);
  const stepper = (key: "meatDays" | "vegetarianDays" | "fishDays", label: string) => {
    const dishes = fixed[key] ?? [];
    return (
      <NumberStepper
        label={label}
        hint={dishes.length > 0 ? `davon fest: ${dishes.join(", ")}` : "Tage pro Woche"}
        value={rules[key]}
        // Weniger als feste Gerichte geht nicht – die zählen ja mit.
        min={Math.max(min, dishes.length)}
        max={Math.max(max, dishes.length)}
        onChange={(value) => onChange({ [key]: value })}
      />
    );
  };
  const free = available - planned;
  const daysWord = (n: number) => (n === 1 ? "Tag" : "Tage");

  return (
    <>
      {intro && <p className="text-base text-muted">{intro}</p>}
      {stepper("meatDays", "Fleisch")}
      {stepper("vegetarianDays", "Vegetarisch")}
      {stepper("fishDays", "Fisch")}
      <p className={planned > available ? WARNING : NOTE} role="status">
        {planned > available ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
        ) : (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.25} aria-hidden />
        )}
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
        <fieldset className={`${CARD} p-4`}>
          <legend className="sr-only">An welchem Tag?</legend>
          <p className="mb-3 text-base font-bold" aria-hidden>
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
                  aria-label={day ? (blocked ? `${day} (nicht wählbar)` : day) : "Egal"}
                  disabled={blocked}
                  onClick={() => onChange({ cheatDayWeekday: day })}
                  className={`${tileClass(selected)} disabled:opacity-30`}
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

/**
 * Wunschtag ein-/ausschalten und einstellen. Wunschtag und Cheat Day dürfen
 * nicht auf denselben Tag fallen – ein kollidierender Cheat Day wird auf
 * "egal" gesetzt.
 */
export function withWishDay(profile: HouseholdProfile, wishDay: WishDaySettings): HouseholdProfile {
  const clash = wishDay.enabled && profile.weekRules.cheatDayWeekday === wishDay.weekday;
  return {
    ...profile,
    wishDay,
    weekRules: clash ? { ...profile.weekRules, cheatDayWeekday: "" } : profile.weekRules,
  };
}

export function WishDayEditor({
  profile,
  onChange,
}: {
  profile: HouseholdProfile;
  onChange: (wishDay: WishDaySettings) => void;
}) {
  const { wishDay } = profile;
  const kids = wishDayOrder(profile);
  const joining = kids.filter((k) => isWishDayEligible(k, wishDay.minAge));
  const tooYoung = kids.filter((k) => !isWishDayEligible(k, wishDay.minAge));
  const set = (changes: Partial<WishDaySettings>) => onChange({ ...wishDay, ...changes });
  const names = (list: typeof kids) => list.map((k) => personLabel(k, profile.persons)).join(", ");

  return (
    <section className={`${CARD} flex flex-col gap-6 p-4`}>
      <ChoiceGroup<"ja" | "nein">
        label="🎉 Wunschtag für Kinder"
        hint="Die Kinder kommen reihum dran – eins pro Woche darf sich ein Gericht wünschen."
        value={wishDay.enabled ? "ja" : "nein"}
        onChange={(v) => set({ enabled: v === "ja" })}
        columns={2}
        options={[
          { value: "ja", label: "Ja" },
          { value: "nein", label: "Nein" },
        ]}
        variant="plain"
      />
      {wishDay.enabled && (
        <>
          <fieldset>
            <legend className="sr-only">Wunschtag: Wochentag</legend>
            <p className="mb-3 text-base font-bold" aria-hidden>
              An welchem Tag?
            </p>
            <div className="grid grid-cols-4 gap-2">
              {WEEKDAYS.map((day) => {
                const selected = wishDay.weekday === day;
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`Wunschtag ${day}`}
                    onClick={() => set({ weekday: day })}
                    className={tileClass(selected)}
                  >
                    {day.slice(0, 2)}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <NumberStepper
            label="Mindestalter"
            hint="Jahre"
            value={wishDay.minAge}
            min={LIMITS.wishMinAge.min}
            max={LIMITS.wishMinAge.max}
            onChange={(minAge) => set({ minAge })}
          />
          <p className={`${NOTE} flex-col gap-1`} role="note">
            <span>
            {joining.length > 0 ? (
              <>
                <span className="font-semibold">Reihum dabei:</span> {names(joining)}
              </>
            ) : (
              "Noch kein Kind alt genug – ohne Alter zählen Kita- und Schulkinder."
            )}
            </span>
            {tooYoung.length > 0 && (
              <span className="block text-muted">
                Noch zu jung: {names(tooYoung)}
              </span>
            )}
            <span className="block text-muted">
              Der Wunsch zählt nicht bei Fleisch/Veggie/Fisch.
            </span>
          </p>
        </>
      )}
    </section>
  );
}
