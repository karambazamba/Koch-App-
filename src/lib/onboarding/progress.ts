// Zwischenstand des Kennenlernens, damit man aufhören und später
// weitermachen kann. Wird beim Abschluss gelöscht.

import { createLocalStore } from "../localStore";
import { migrateProfile } from "../profile";
import type { OnboardingState } from "./engine";

function migrate(raw: unknown): OnboardingState | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<OnboardingState>;
  if (s.version !== 1 || s.mode !== "onboarding" || typeof s.step !== "string" || !Array.isArray(s.messages)) return null;
  // Im Entwurf zählen adults/kids noch nicht mit → für die Migration aus den
  // Personen ableiten, sonst würden sie weggekürzt.
  const rawDraft = (s.draft ?? {}) as { persons?: { role?: string }[] };
  const rawPersons = Array.isArray(rawDraft.persons) ? rawDraft.persons : [];
  const migrated = migrateProfile({
    ...rawDraft,
    adults: rawPersons.filter((p) => p.role !== "kind").length,
    kids: rawPersons.filter((p) => p.role === "kind").length,
  });
  if (!migrated) return null;
  const draft = { ...migrated, adults: 0, kids: 0 };
  return {
    version: 1,
    mode: "onboarding",
    step: s.step,
    draft,
    names: Array.isArray(s.names) ? s.names : [],
    queue: Array.isArray(s.queue) ? s.queue : [],
    personId: typeof s.personId === "string" ? s.personId : null,
    known: s.known && typeof s.known === "object" ? s.known : {},
    pendingDiet: Array.isArray(s.pendingDiet) ? s.pendingDiet : [],
    returnTo: typeof s.returnTo === "string" ? s.returnTo : null,
    messages: s.messages,
    counter: typeof s.counter === "number" ? s.counter : s.messages.length,
  };
}

const store = createLocalStore<OnboardingState>("wasgibts.kennenlernen", migrate);

export const loadOnboarding = store.load;
export const saveOnboarding = store.save;
export const clearOnboarding = store.clear;
