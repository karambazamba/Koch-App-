// Erster Start = kurzes Kennenlernen im Chat (max. 4 Abschnitte, jederzeit
// überspringbar): Begrüßung → Name & wobei helfen (& Essensstil) → wer gehört
// dazu → fertig mit Beispiel-Sätzen. Rein (ohne Speicher/React), damit es
// testbar ist; der Zwischenstand liegt unter `wasgibts.willkommen`
// (welcomeStore.ts). Die Antworten steuern die Startseite.

import { DEFAULT_HOME, type HomeTile } from "../core/homeLayout";
import { extractNames, type NameHint } from "./onboarding/recognize";
import {
  HELPER_NAME_MAX,
  HELPER_NAMES,
  createEmptyProfile,
  createPerson,
  deriveHouseholdType,
  type HelperSettings,
  type HouseholdProfile,
  type PlanStyle,
} from "./profile";

export type WelcomeStep = "hallo" | "name" | "eigener" | "hilfe" | "essen" | "wer" | "bestaetigen" | "fertig";
export type HelpId = "termine" | "arbeit" | "essen" | "einkauf" | "familie";
export type Member = { name: string; kid: boolean };
export type WelcomeTurn = { from: "assistent" | "ich"; text: string; lines?: string[] };

export type WelcomeState = {
  version: 1;
  step: WelcomeStep;
  helper: HelperSettings;
  help: HelpId[];
  planStyle: PlanStyle | null;
  members: Member[];
  turns: WelcomeTurn[];
};

export type WelcomeChip = { label: string; value: string; kind: "primary" | "select" | "plain"; selected?: boolean };

export const HELP_OPTIONS: { id: HelpId; label: string }[] = [
  { id: "termine", label: "🗓 Termine" },
  { id: "arbeit", label: "💼 Arbeit" },
  { id: "essen", label: "🍽 Essen" },
  { id: "einkauf", label: "🛒 Einkauf" },
  { id: "familie", label: "👨‍👩‍👦 Familie" },
];

export const DEFAULT_HELP: HelpId[] = ["termine", "essen", "einkauf"];

const FEATURE_LINES = ["🗓 Termine & Aufgaben – Familie und Arbeit", "🍽 Essenswünsche und Wochenpläne", "🛒 Einkaufsliste, die mitdenkt"];

/** Abschnitt 1–4 für den Fortschrittsbalken */
export function sectionOf(step: WelcomeStep): number {
  if (step === "hallo") return 1;
  if (step === "name" || step === "eigener" || step === "hilfe" || step === "essen") return 2;
  if (step === "wer" || step === "bestaetigen") return 3;
  return 4;
}

const say = (text: string, lines?: string[]): WelcomeTurn => ({ from: "assistent", text, ...(lines ? { lines } : {}) });
const me = (text: string): WelcomeTurn => ({ from: "ich", text });

function question(state: WelcomeState): WelcomeTurn[] {
  switch (state.step) {
    case "hallo":
      return [say(`Hallo, ich bin ${state.helper.name} 👋 Ich bin deine persönliche Assistentin und mache dir den Alltag leichter. Am einfachsten: sprich mit mir, ich verstehe eine Menge. Schreiben geht natürlich auch.`, FEATURE_LINES)];
    case "name":
      return [say("Willst du mich lieber anders nennen?")];
    case "eigener":
      return [say("Wie soll ich heißen?")];
    case "hilfe":
      return [say("Wobei soll ich dir helfen? Gern mehrere.")];
    case "essen":
      return [say("Planst du das Essen gern für die Woche oder lieber spontan?")];
    case "wer":
      return [say("Wie heißt du – und wer gehört noch dazu?")];
    case "bestaetigen":
      return [say(state.members.length > 1 ? "Schön, euch kennenzulernen! Passt das so?" : "Schön, dich kennenzulernen! Passt das so?")];
    case "fertig": {
      const name = state.members[0]?.name;
      return [
        say(`Super${name ? `, ${name}` : ""} – alles bereit! 🎉 Probier's gleich aus: Sag mir einfach, was ansteht. Ich kümmere mich um den Rest.`),
        say("Alles, was du hier eingestellt hast, kannst du jederzeit ändern – sag's mir oder schau in die Einstellungen."),
      ];
    }
  }
}

export function initialWelcome(): WelcomeState {
  const state: WelcomeState = { version: 1, step: "hallo", helper: { ...HELPER_NAMES[0] }, help: [...DEFAULT_HELP], planStyle: null, members: [], turns: [] };
  return { ...state, turns: question(state) };
}

/** Weiter zu `step`: Antwort (falls vorhanden) und neue Frage ins Gespräch */
function go(state: WelcomeState, step: WelcomeStep, answer?: string): WelcomeState {
  const next = { ...state, step };
  return { ...next, turns: [...state.turns, ...(answer ? [me(answer)] : []), ...question(next)] };
}

const afterHelp = (state: WelcomeState) => (state.help.includes("essen") ? "essen" : "wer");

/** Stimme passend zum Namen (bekannte Namen, sonst grob nach Endung) */
export function voiceForName(name: string): HelperSettings["voice"] {
  const known = HELPER_NAMES.find((h) => h.name.toLowerCase() === name.trim().toLowerCase());
  if (known) return known.voice;
  return /(a|e|i|y|ie|ine|ina|ette)$/i.test(name.trim()) ? "weiblich" : "maennlich";
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Namen aus freier Antwort: "Ich bin Felix, dazu Lisa, Mathis und Ole" → Felix (ich) + die anderen */
export function membersFrom(text: string, hints?: NameHint[]): Member[] {
  const found = hints?.length ? hints : extractNames(text);
  const names = found.length
    ? found
    : text
        .split(/,|\bund\b|\bdazu\b/i)
        .map((n) => n.replace(/\b(ich bin|ich heiße|mein name ist|ich|wir|sind)\b/gi, "").trim())
        .filter((n) => n && n.split(/\s+/).length <= 2)
        .map((name) => ({ name: cap(name) }) as NameHint);
  return names.slice(0, 12).map((n) => ({ name: n.name, kid: n.role === "kind" }));
}

function helpFrom(text: string): HelpId[] {
  const t = text.toLowerCase();
  const found: HelpId[] = [];
  if (/termin|kalender|aufgabe/.test(t)) found.push("termine");
  if (/arbeit|job|büro/.test(t)) found.push("arbeit");
  if (/essen|kochen|rezept|wochenplan/.test(t)) found.push("essen");
  if (/einkauf|liste|einkaufen/.test(t)) found.push("einkauf");
  if (/familie|kinder/.test(t)) found.push("familie");
  if (/alles|überall/.test(t)) return HELP_OPTIONS.map((o) => o.id);
  return found;
}

function planFrom(text: string): PlanStyle | null {
  const t = text.toLowerCase();
  if (/mal so|beides|gemischt|je nachdem|mal mal/.test(t)) return "mix";
  if (/spontan|nicht planen|ohne plan/.test(t)) return "spontan";
  if (/woche|plan/.test(t)) return "plan";
  return null;
}

const helpLabel = (ids: HelpId[]) => HELP_OPTIONS.filter((o) => ids.includes(o.id)).map((o) => o.label.replace(/^\S+\s/, "")).join(", ");
const memberLabel = (m: Member) => `${m.name || "Ich"}${m.kid ? " · Kind" : ""}`;

/** Antwort-Chips zur aktuellen Frage */
export function chipsFor(state: WelcomeState): WelcomeChip[] {
  switch (state.step) {
    case "hallo":
      return [
        { label: "Los geht's", value: "los", kind: "primary" },
        { label: "Anders nennen", value: "anders", kind: "plain" },
      ];
    case "name":
      return [
        ...HELPER_NAMES.map((h) => ({ label: h.name, value: `name:${h.name}`, kind: "select" as const, selected: state.helper.name === h.name })),
        { label: "Eigener …", value: "eigener", kind: "plain" },
      ];
    case "eigener":
      return [{ label: "Doch Lotte", value: "name:Lotte", kind: "plain" }];
    case "hilfe":
      return [
        ...HELP_OPTIONS.map((o) => ({ label: o.label, value: `hilfe:${o.id}`, kind: "select" as const, selected: state.help.includes(o.id) })),
        { label: "Weiter", value: "weiter", kind: "primary" },
      ];
    case "essen":
      return [
        { label: "Woche planen", value: "plan:plan", kind: "plain" },
        { label: "Spontan", value: "plan:spontan", kind: "plain" },
        { label: "Mal so, mal so", value: "plan:mix", kind: "plain" },
      ];
    case "wer":
      return [{ label: "Nur ich", value: "nurich", kind: "plain" }];
    case "bestaetigen":
      return [
        ...state.members.map((m, i) => ({ label: memberLabel(m), value: `person:${i}`, kind: "select" as const, selected: true })),
        { label: "Passt", value: "passt", kind: "primary" },
        { label: "Ändern", value: "aendern", kind: "plain" },
        ...(state.members.length > 1 ? [{ label: "Nur ich", value: "nurich", kind: "plain" as const }] : []),
      ];
    case "fertig":
      return [];
  }
}

/** Eine Antwort verarbeiten: Chip-Wert oder freier Text (mit evtl. erkannten Namen von der KI) */
export function answer(state: WelcomeState, input: { chip?: string; text?: string; names?: NameHint[] }): WelcomeState {
  const chip = input.chip ?? "";
  const text = (input.text ?? "").trim();
  switch (state.step) {
    case "hallo":
      if (chip === "anders" || /anders|nennen|name/i.test(text)) return go(state, "name", "Anders nennen");
      return go(state, "hilfe", chip ? "Los geht's" : text || "Los geht's");
    case "name":
    case "eigener": {
      if (chip === "eigener") return go(state, "eigener", "Eigener Name");
      const picked = chip.startsWith("name:") ? chip.slice(5) : text.replace(/^(nenn mich|ich nenn dich|du heißt|lieber)\s+/i, "").replace(/[.!?]+$/, "").trim();
      if (!picked) return state;
      const name = cap(picked.slice(0, HELPER_NAME_MAX));
      const next = { ...state, helper: { name, voice: voiceForName(name) } };
      return go(next, "hilfe", name);
    }
    case "hilfe": {
      if (chip.startsWith("hilfe:")) {
        const id = chip.slice(6) as HelpId;
        return { ...state, help: state.help.includes(id) ? state.help.filter((h) => h !== id) : [...state.help, id] };
      }
      const fromText = text ? helpFrom(text) : [];
      const help = fromText.length ? fromText : state.help.length ? state.help : [...DEFAULT_HELP];
      const next = { ...state, help };
      return go(next, afterHelp(next), helpLabel(help) || "Weiter");
    }
    case "essen": {
      const plan = chip.startsWith("plan:") ? (chip.slice(5) as PlanStyle) : planFrom(text);
      if (!plan) return state;
      const label = plan === "plan" ? "Woche planen" : plan === "spontan" ? "Spontan" : "Mal so, mal so";
      return go({ ...state, planStyle: plan }, "wer", chip ? label : text);
    }
    case "wer": {
      if (chip === "nurich" || /^nur ich\b/i.test(text)) return go({ ...state, members: [{ name: state.members[0]?.name ?? "", kid: false }] }, "bestaetigen", "Nur ich");
      const members = membersFrom(text, input.names);
      if (!members.length) return state;
      return go({ ...state, members }, "bestaetigen", text);
    }
    case "bestaetigen": {
      if (chip.startsWith("person:")) {
        // Antippen = Kind ↔ erwachsen (ich selbst bleibe erwachsen)
        const i = Number(chip.slice(7));
        if (i === 0) return state;
        return { ...state, members: state.members.map((m, n) => (n === i ? { ...m, kid: !m.kid } : m)) };
      }
      if (chip === "aendern") return go(state, "wer", "Ändern");
      if (chip === "nurich") return go({ ...state, members: state.members.slice(0, 1) }, "fertig", "Nur ich");
      if (chip === "passt" || /^(ja|passt|stimmt|genau|richtig|ok|okay)\b/i.test(text)) return go(state, "fertig", "Passt");
      const members = text ? membersFrom(text, input.names) : [];
      return members.length ? go({ ...state, members }, "bestaetigen", text) : state;
    }
    case "fertig":
      return state;
  }
}

/** Überspringen: Standardwerte (Name bleibt, wie bisher gewählt) */
export function skipWelcome(state: WelcomeState): WelcomeState {
  return {
    ...state,
    step: "fertig",
    help: state.step === "hallo" || state.step === "name" || state.step === "eigener" || state.step === "hilfe" ? [...DEFAULT_HELP] : state.help,
    planStyle: state.planStyle ?? "mix",
    members: state.members.length ? state.members : [{ name: "", kid: false }],
  };
}

/** Beispiel-Sätze zum Ausprobieren – passend zur Auswahl und Uhrzeit */
export function examplesFor(state: Pick<WelcomeState, "help">, hour: number): string[] {
  const list: string[] = [];
  if (state.help.includes("termine")) list.push(hour < 16 ? "Morgen 9 Uhr Steuerberater" : "Morgen um 8 Kita-Ausflug");
  if (state.help.includes("arbeit") && list.length < 3) list.push("Freitag 14 Uhr Meeting mit Kunden");
  if (state.help.includes("essen")) list.push(hour < 19 ? "Was koche ich heute?" : "Was gibt's morgen?");
  if (state.help.includes("einkauf")) list.push("Milch auf die Liste");
  if (state.help.includes("familie") && list.length < 3) list.push("Jonne hat Dienstag Turnen bis 17:30");
  if (list.length < 3) list.push("Was steht diese Woche an?");
  return list.slice(0, 3);
}

/** Profil aus den Antworten */
export function profileFrom(state: WelcomeState): HouseholdProfile {
  const members = state.members.length ? state.members : [{ name: "", kid: false }];
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

/** Kacheln auf "Heute": ohne Essen/Einkauf/Termine keine Kachel dafür (Seiten bleiben erreichbar) */
export function homeTilesFor(help: HelpId[]): HomeTile[] {
  const shown: Record<string, boolean> = { termine: help.includes("termine") || help.includes("arbeit") || help.includes("familie"), essen: help.includes("essen"), einkauf: help.includes("einkauf") };
  return DEFAULT_HOME.map((t) => (t.id in shown ? { ...t, visible: shown[t.id] } : t));
}
