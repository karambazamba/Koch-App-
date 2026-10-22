// Erster Start (seit v0.27): Hallo-Bildschirm → "Los geht's" → Startseite mit
// Beispiel-Tag, ohne weitere Fragen. Hier nur noch die Standardwerte dafür
// (rein, ohne Speicher/React): Profil und Start-Kacheln. Was das frühere
// Kennenlernen fragte (wobei helfen, Familie, Essensstil, Sport), stellt man
// später in den Einstellungen ein oder sagt es der Begleitung.

import { DEFAULT_HOME, type HomeTile } from "@/lib/core/homeLayout";
import { DEFAULT_HELPER, createEmptyProfile, createPerson, deriveHouseholdType, type HelperSettings, type HouseholdProfile, type PlanStyle } from "@/lib/einstellungen/profile";

export type HelpId = "termine" | "arbeit" | "essen" | "einkauf" | "familie" | "sport";
type Member = { name: string; kid: boolean };

export type WelcomeState = {
  helper: HelperSettings;
  help: HelpId[];
  planStyle: PlanStyle | null;
  /** members[0] ist man selbst (immer erwachsen) */
  members: Member[];
  sportGoal?: number | null;
};

/** Standardwerte beim ersten Start: Termine, Essen, Einkauf; mal so, mal so; Startseite denkt mit */
export function startState(): WelcomeState {
  return { helper: { ...DEFAULT_HELPER }, help: ["termine", "essen", "einkauf"], planStyle: "mix", members: [{ name: "", kid: false }], sportGoal: null };
}

const namedMembers = (members: Member[]) => members.filter((m, i) => i === 0 || m.name.trim());

/** Profil aus den Werten */
export function profileFrom(state: WelcomeState): HouseholdProfile {
  const members = namedMembers(state.members.length ? state.members : [{ name: "", kid: false }]);
  const persons = members.map((m, i) => ({ ...createPerson(m.kid && i > 0 ? "kind" : "erwachsen"), name: m.name.trim() }));
  const adults = persons.filter((p) => p.role === "erwachsen").length;
  const kids = persons.length - adults;
  const base = createEmptyProfile();
  return {
    ...base,
    persons,
    adults,
    kids,
    householdType: state.help.includes("familie") && persons.length > 1 ? "familie" : deriveHouseholdType(adults, kids),
    helper: state.helper,
    planStyle: state.planStyle ?? "mix",
  };
}

/**
 * Start-Kacheln aus dem, wobei geholfen werden soll: Termine, Essen, Einkauf,
 * Sport (in Standard-Reihenfolge); Aufgaben sind immer dabei.
 */
export function homeTilesFor(help: HelpId[]): HomeTile[] {
  const shown: Record<string, boolean> = { termine: help.includes("termine"), aufgaben: true, essen: help.includes("essen"), einkauf: help.includes("einkauf"), sport: help.includes("sport") };
  return DEFAULT_HOME.map((t) => (t.id in shown ? { ...t, visible: shown[t.id] } : t));
}
