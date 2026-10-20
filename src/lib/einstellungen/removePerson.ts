// Person aus dem Haushalt entfernen – mit allen Bezügen: Personenzahl
// (Portionen), Wunschtag-Reihenfolge, Wünsche in Wochen-Vorgaben und im Plan.
// Allergien und "mag nicht" hängen an der Person und gehen mit ihr.
// Gibt eine Funktion zum Rückgängigmachen zurück.

import { guessDishCategory } from "../essen/dishCategory";
import { loadMealPlans, replaceMealPlans, type StoredEntry } from "../essen/mealPlan";
import { type HouseholdProfile } from "./profile";
import { loadProfile, saveProfile } from "./profileStore";
import { loadWeekPlans, replaceWeekPlans, type WeekPlan } from "../essen/weekPlan";

/** Neues Profil ohne die Person (rein, testbar). Die letzte Person bleibt. */
function profileWithoutPerson(profile: HouseholdProfile, id: string): HouseholdProfile {
  if (profile.persons.length <= 1 || !profile.persons.some((p) => p.id === id)) return profile;
  const persons = profile.persons.filter((p) => p.id !== id);
  return {
    ...profile,
    persons,
    adults: persons.filter((p) => p.role === "erwachsen").length,
    kids: persons.filter((p) => p.role === "kind").length,
    wishDay: { ...profile.wishDay, order: profile.wishDay.order.filter((k) => k !== id) },
  };
}

/** Wünsche der Person in den Wochen-Vorgaben entfernen */
function weekPlansWithoutPerson(weeks: Record<string, WeekPlan>, id: string): Record<string, WeekPlan> {
  return Object.fromEntries(Object.entries(weeks).map(([key, w]) => [key, w.wish?.kidId === id ? { ...w, wish: null } : w]));
}

/** Wunschessen der Person bleibt als normales Gericht im Plan stehen */
function mealPlansWithoutPerson(weeks: Record<string, Record<string, StoredEntry>>, id: string): Record<string, Record<string, StoredEntry>> {
  return Object.fromEntries(
    Object.entries(weeks).map(([key, entries]) => [
      key,
      Object.fromEntries(
        Object.entries(entries).map(([day, e]) => {
          if (e.kind !== "wish" || e.kidId !== id) return [day, e];
          if (!e.text.trim()) return [day, { kind: "cleared" } as StoredEntry];
          const text: StoredEntry = { kind: "text", title: e.text.trim(), category: guessDishCategory(e.text), ...(e.double ? { double: true } : {}) };
          return [day, text];
        }),
      ),
    ]),
  );
}

type RemoveResult = { ok: true; undo: () => void } | { ok: false; reason: "last" | "missing" };

export function removePerson(id: string): RemoveResult {
  const profile = loadProfile();
  if (!profile || !profile.persons.some((p) => p.id === id)) return { ok: false, reason: "missing" };
  if (profile.persons.length <= 1) return { ok: false, reason: "last" };
  const weekPlans = loadWeekPlans();
  const mealPlans = loadMealPlans();
  saveProfile(profileWithoutPerson(profile, id));
  replaceWeekPlans(weekPlansWithoutPerson(weekPlans, id));
  replaceMealPlans(mealPlansWithoutPerson(mealPlans, id));
  return {
    ok: true,
    undo: () => {
      saveProfile(profile);
      replaceWeekPlans(weekPlans);
      replaceMealPlans(mealPlans);
    },
  };
}
