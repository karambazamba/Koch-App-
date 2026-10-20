// Erster Start = kurzes Kennenlernen (max. 4 Abschnitte, jederzeit
// überspringbar): 1. "Wer soll dir helfen?" (Mia, Theo oder eigener Name,
// Vollbild) und die Vorstellung der Begleitung (Vollbild) → 2. wobei helfen
// (& Essensstil, Sport, Startseite) → 3. wer gehört dazu (Formular im Chat) →
// 4. fertig mit Beispiel-Sätzen. Rein (ohne Speicher/React), damit es testbar ist; der
// Zwischenstand liegt unter `wasgibts.willkommen` (welcomeStore.ts).
//
// Jeder Schritt erscheint genau einmal: Das Gespräch wird aus dem Zustand
// gebaut (Frage + Antwort je Schritt), nicht angehängt. Antippen einer
// Antwort öffnet den Schritt wieder zum Bearbeiten.

import { DEFAULT_HOME, type HomeTile } from "../core/homeLayout";
import { extractNames, type NameHint } from "./onboarding/recognize";
import {
  DEFAULT_HELPER,
  migrateHelper,
  createEmptyProfile,
  createPerson,
  deriveHouseholdType,
  type HelperSettings,
  type HouseholdProfile,
  type PlanStyle,
} from "./profile";

export type WelcomeStep = "begleitung" | "hallo" | "hilfe" | "essen" | "sport" | "startseite" | "wer" | "fertig";
export type HelpId = "termine" | "arbeit" | "essen" | "einkauf" | "familie" | "sport";
export type WelcomeHomeMode = "mitdenkend" | "gleich";
/** members[0] ist man selbst (immer erwachsen) */
export type Member = { name: string; kid: boolean };

export type WelcomeState = {
  version: 2;
  step: WelcomeStep;
  helper: HelperSettings;
  help: HelpId[];
  planStyle: PlanStyle | null;
  members: Member[];
  /** Schon beantwortete Schritte */
  answered: WelcomeStep[];
  /** Früher: "Lieber anders nennen" (heute im Schritt "begleitung") */
  renamed: boolean;
  /** Früher: eigener Name wurde eingetippt */
  custom: boolean;
  /** Sport gewählt: Wochenziel (Trainings pro Woche) */
  sportGoal?: number | null;
  /** Soll sich die Startseite dem Tag anpassen? */
  homeMode?: WelcomeHomeMode | null;
};

export type WelcomeChip = { label: string; value: string; kind: "primary" | "select" | "plain"; selected?: boolean; disabled?: boolean };

const HELP_OPTIONS: { id: HelpId; label: string }[] = [
  { id: "termine", label: "🗓 Termine" },
  { id: "arbeit", label: "💼 Arbeit" },
  { id: "essen", label: "🍽 Essen" },
  { id: "einkauf", label: "🛒 Einkauf" },
  { id: "familie", label: "👨‍👩‍👦 Familie" },
  { id: "sport", label: "🏃 Sport" },
];

const DEFAULT_HELP: HelpId[] = ["termine", "essen", "einkauf"];

/** Abschnitt 1–4 für den Fortschrittsbalken */
export function sectionOf(step: WelcomeStep): number {
  if (step === "begleitung" || step === "hallo") return 1;
  if (step === "hilfe" || step === "essen" || step === "sport" || step === "startseite") return 2;
  if (step === "wer") return 3;
  return 4;
}

/** Reihenfolge der Schritte – abhängig von den Antworten */
function flow(state: Pick<WelcomeState, "help">): WelcomeStep[] {
  return <WelcomeStep[]>["begleitung", "hallo", "hilfe", ...(state.help.includes("essen") ? (["essen"] as const) : []), ...(state.help.includes("sport") ? (["sport"] as const) : []), "startseite", "wer", "fertig"];
}

/** Familie gewählt → Formular mit Familie, sonst nur der eigene Name */
export const asksFamily = (state: Pick<WelcomeState, "help">) => state.help.includes("familie");

/** Frage eines Schritts */
function questionFor(state: WelcomeState, step: WelcomeStep): string {
  switch (step) {
    case "begleitung":
      return "Wer soll dir helfen?";
    case "hallo":
      return `Hallo, schön, dass du da bist! Ich bin ${state.helper.name}.`;
    case "hilfe":
      return "Wobei soll ich dir helfen? Gern mehrere.";
    case "essen":
      return "Planst du das Essen gern für die Woche oder lieber spontan?";
    case "sport":
      return "Wie oft pro Woche möchtest du Sport machen?";
    case "startseite":
      return "Soll sich deine Startseite dem Tag anpassen? Morgens Überblick, beim Kochen das Essen, abends nur Familie.";
    case "wer":
      return asksFamily(state) ? "Wer gehört zu deiner Familie? Sag's mir einfach – oder trag es hier ein." : "Wie heißt du?";
    case "fertig": {
      const name = state.members[0]?.name.trim();
      return `Super${name ? `, ${name}` : ""} – alles bereit! 🎉 Probier's gleich aus: Sag mir einfach, was ansteht. Ich kümmere mich um den Rest.`;
    }
  }
}

const helpLabel = (ids: HelpId[]) => HELP_OPTIONS.filter((o) => ids.includes(o.id)).map((o) => o.label.replace(/^\S+\s/, "")).join(", ");
const PLAN_LABEL: Record<PlanStyle, string> = { plan: "Woche planen", spontan: "Spontan", mix: "Mal so, mal so" };

/** Personen mit Namen (man selbst bleibt immer vorn, auch ohne Namen) */
const namedMembers = (members: Member[]) => members.filter((m, i) => i === 0 || m.name.trim());

/** Antwort eines Schritts als kurze Blase (antippbar = bearbeiten) */
function answerLabel(state: WelcomeState, step: WelcomeStep): string {
  switch (step) {
    case "begleitung":
      return state.helper.name;
    case "hilfe":
      return helpLabel(state.help) || "Weiter";
    case "essen":
      return state.planStyle ? PLAN_LABEL[state.planStyle] : "";
    case "sport":
      return state.sportGoal ? `${state.sportGoal}× pro Woche` : "";
    case "startseite":
      return state.homeMode === "gleich" ? "📌 Immer gleich" : state.homeMode ? "✨ Ja, mitdenken" : "";
    case "wer": {
      const people = namedMembers(state.members);
      if (people.length <= 1) return people[0]?.name ? `Ich bin ${people[0].name}` : "Nur ich";
      return people.map((m, i) => (i === 0 ? m.name : `${m.name}${m.kid ? " (Kind)" : ""}`)).join(", ");
    }
    default:
      return "";
  }
}

/** Gespräch zum aktuellen Stand: je Schritt Frage, Antwort (falls beantwortet), aktueller Schritt zuletzt */
export function transcript(state: WelcomeState): { step: WelcomeStep; question: string; answer: string | null; current: boolean }[] {
  const steps: WelcomeStep[] = flow(state).filter((s) => s !== "hallo" && s !== "begleitung");
  const at = steps.indexOf(state.step);
  // Beim Bearbeiten eines früheren Schritts stehen spätere erst wieder da, wenn es weitergeht
  const shown = at >= 0 ? steps.slice(0, at + 1) : steps.filter((s) => state.answered.includes(s));
  return shown.map((step) => ({ step, question: questionFor(state, step), answer: step !== state.step && state.answered.includes(step) ? answerLabel(state, step) : null, current: step === state.step }));
}

export function initialWelcome(): WelcomeState {
  return { version: 2, step: "begleitung", helper: { ...DEFAULT_HELPER }, help: [...DEFAULT_HELP], planStyle: null, members: [{ name: "", kid: false }], answered: [], renamed: false, custom: false };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Namen aus freier Antwort: "Ich bin Felix, dazu Lisa und die Kinder Mathis,
 * Jonne und Ole" → Felix + Lisa + Kinder. Mit KI kommen die Namen samt
 * Kind/erwachsen als `hints`.
 */
function membersFrom(text: string, hints?: NameHint[]): Member[] {
  const found = hints?.length ? hints : extractNames(text);
  const names = found.length
    ? found
    : text
        .split(/,|\bund\b|\bdazu\b/i)
        .map((n) => n.replace(/\b(ich bin|ich heiße|mein name ist|ich|wir|sind|die kinder|kinder)\b/gi, "").trim())
        .filter((n) => n && n.split(/\s+/).length <= 2)
        .map((name) => ({ name: cap(name) }) as NameHint);
  return names.slice(0, 12).map((n) => ({ name: n.name, kid: n.role === "kind" }));
}

/**
 * Gesagtes ins Formular übernehmen: "Ich bin Felix" setzt den eigenen Namen,
 * die übrigen Namen kommen dazu (ohne Doppelte). Ohne "Ich bin …" und ohne
 * eigenen Namen ist der erste Name man selbst.
 */
function fillMembers(members: Member[], text: string, hints?: NameHint[], family = true): Member[] {
  const found = membersFrom(text, hints);
  if (!found.length) return members;
  const me = members[0] ?? { name: "", kid: false };
  const saysMe = /\b(ich bin|ich heiße|ich heisse|mein name ist|hier ist)\b/i.test(text);
  let rest = found;
  let myName = me.name;
  if (saysMe || !me.name.trim() || !family) {
    myName = found[0].name;
    rest = found.slice(1);
  }
  if (!family) return [{ name: myName, kid: false }];
  const others = members.slice(1).filter((m) => m.name.trim());
  for (const m of rest) {
    if (m.name.toLowerCase() === myName.toLowerCase()) continue;
    const i = others.findIndex((o) => o.name.toLowerCase() === m.name.toLowerCase());
    if (i >= 0) others[i] = { ...others[i], kid: m.kid || others[i].kid };
    else others.push(m);
  }
  return [{ name: myName, kid: false }, ...others].slice(0, 13);
}

function helpFrom(text: string): HelpId[] {
  const t = text.toLowerCase();
  const found: HelpId[] = [];
  if (/termin|kalender|aufgabe/.test(t)) found.push("termine");
  if (/arbeit|job|büro/.test(t)) found.push("arbeit");
  if (/essen|kochen|rezept|wochenplan/.test(t)) found.push("essen");
  if (/einkauf|liste|einkaufen/.test(t)) found.push("einkauf");
  if (/familie|kinder/.test(t)) found.push("familie");
  if (/sport|training|laufen|fitness/.test(t)) found.push("sport");
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

/** Eigener Name ausgefüllt? (Voraussetzung für "Fertig" / "Nur ich") */
const hasMyName = (state: Pick<WelcomeState, "members">) => Boolean(state.members[0]?.name.trim());

/** Antwort-Chips zum aktuellen Schritt */
export function chipsFor(state: WelcomeState): WelcomeChip[] {
  switch (state.step) {
    case "begleitung":
      return [{ label: "Weiter", value: "weiter", kind: "primary" }];
    case "hallo":
      return [{ label: "Los geht's", value: "los", kind: "primary" }];
    case "hilfe":
      return [
        ...HELP_OPTIONS.map((o) => ({ label: o.label, value: `hilfe:${o.id}`, kind: "select" as const, selected: state.help.includes(o.id) })),
        { label: "Weiter", value: "weiter", kind: "primary" },
      ];
    case "essen":
      return (Object.keys(PLAN_LABEL) as PlanStyle[]).map((p) => ({ label: PLAN_LABEL[p], value: `plan:${p}`, kind: "select" as const, selected: state.planStyle === p }));
    case "sport":
      return [1, 2, 3, 4, 5].map((n) => ({ label: `${n}×`, value: `sport:${n}`, kind: "select" as const, selected: state.sportGoal === n }));
    case "startseite":
      return [
        { label: "✨ Ja, mitdenken", value: "modus:mitdenkend", kind: "select" as const, selected: state.homeMode === "mitdenkend" },
        { label: "📌 Immer gleich", value: "modus:gleich", kind: "select" as const, selected: state.homeMode === "gleich" },
      ];
    case "wer":
      return [
        { label: "Fertig", value: "fertig", kind: "primary", disabled: !hasMyName(state) },
        ...(asksFamily(state) ? [{ label: "Nur ich", value: "nurich", kind: "plain" as const, disabled: !hasMyName(state) }] : []),
      ];
    case "fertig":
      return [];
  }
}

/** Schritt erledigt → zum nächsten noch offenen Schritt (sonst "fertig") */
function advance(state: WelcomeState, from: WelcomeStep): WelcomeState {
  const steps = flow(state);
  const answered = [...new Set([...state.answered, from])].filter((s) => steps.includes(s));
  const next = steps.slice(steps.indexOf(from) + 1).find((s) => s !== "fertig" && !answered.includes(s)) ?? "fertig";
  return { ...state, answered, step: next, custom: false };
}

/** Einen beantworteten Schritt wieder öffnen (bearbeiten statt neu anhängen) */
export function editStep(state: WelcomeState, step: WelcomeStep): WelcomeState {
  if (!state.answered.includes(step) || step === "hallo" || step === "fertig") return state;
  return { ...state, step, custom: false };
}

/** Formular "Wer gehört dazu?": Person ändern, hinzufügen, entfernen */
export function setMember(state: WelcomeState, index: number, patch: Partial<Member>): WelcomeState {
  return { ...state, members: state.members.map((m, i) => (i === index ? { ...m, ...patch, ...(i === 0 ? { kid: false } : {}) } : m)) };
}
export function addMember(state: WelcomeState): WelcomeState {
  return { ...state, members: [...state.members, { name: "", kid: false }] };
}
export function removeMember(state: WelcomeState, index: number): WelcomeState {
  return index === 0 ? state : { ...state, members: state.members.filter((_, i) => i !== index) };
}

/** Eine Antwort verarbeiten: Chip-Wert oder freier Text (mit evtl. erkannten Namen von der KI) */
export function answer(state: WelcomeState, input: { chip?: string; text?: string; names?: NameHint[] }): WelcomeState {
  const chip = input.chip ?? "";
  const text = (input.text ?? "").trim();
  switch (state.step) {
    case "begleitung":
      return advance(state, "begleitung");
    case "hallo":
      return advance(state, "hallo");
    case "hilfe": {
      if (chip.startsWith("hilfe:")) {
        const id = chip.slice(6) as HelpId;
        return { ...state, help: state.help.includes(id) ? state.help.filter((h) => h !== id) : [...state.help, id] };
      }
      const fromText = text ? helpFrom(text) : [];
      const help = fromText.length ? fromText : state.help.length ? state.help : [...DEFAULT_HELP];
      return advance({ ...state, help }, "hilfe");
    }
    case "essen": {
      const plan = chip.startsWith("plan:") ? (chip.slice(5) as PlanStyle) : planFrom(text);
      if (!plan) return state;
      return advance({ ...state, planStyle: plan }, "essen");
    }
    case "sport": {
      const n = chip.startsWith("sport:") ? Number(chip.slice(6)) : Number(text.match(/\d/)?.[0] ?? ({ einmal: 1, zweimal: 2, dreimal: 3, viermal: 4, fünfmal: 5 } as Record<string, number>)[text.toLowerCase().match(/(ein|zwei|drei|vier|fünf)mal/)?.[0] ?? ""] ?? NaN);
      if (!Number.isInteger(n) || n < 1 || n > 7) return state;
      return advance({ ...state, sportGoal: n }, "sport");
    }
    case "startseite": {
      const mode: WelcomeHomeMode | null = chip.startsWith("modus:") ? (chip.slice(6) as WelcomeHomeMode) : /\b(nein|gleich|nicht)\b/i.test(text) ? "gleich" : /\b(ja|gern|mitdenk|klar|okay|ok)\w*/i.test(text) ? "mitdenkend" : null;
      if (!mode) return state;
      return advance({ ...state, homeMode: mode }, "startseite");
    }
    case "wer": {
      const family = asksFamily(state);
      if (chip === "nurich" || /^nur ich\b/i.test(text)) {
        const me = state.members[0] ?? { name: "", kid: false };
        const rest = text.replace(/^nur ich\W*/i, "");
        const next = { ...state, members: [rest ? fillMembers([me], rest, input.names, false)[0] : { ...me, kid: false }] };
        return hasMyName(next) ? advance(next, "wer") : next;
      }
      if (chip === "fertig" || (!chip && /^(fertig|passt|ja|stimmt|genau|ok|okay)\b/i.test(text))) {
        const next = { ...state, members: namedMembers(state.members) };
        return hasMyName(next) ? advance(next, "wer") : state;
      }
      // Gesagtes/Getipptes füllt das Formular – bestätigt wird mit "Fertig"
      return text ? { ...state, members: fillMembers(state.members, text, input.names, family) } : state;
    }
    case "fertig":
      return state;
  }
}

/** Begleitung gewählt (Mia, Theo oder eigener Name mit Art und Farbe) */
export function setHelper(state: WelcomeState, helper: HelperSettings): WelcomeState {
  return { ...state, helper: migrateHelper(helper) };
}

/** Überspringen: Standardwerte (bisher Gewähltes bleibt) */
export function skipWelcome(state: WelcomeState): WelcomeState {
  const touched = state.answered.includes("hilfe");
  return {
    ...state,
    step: "fertig",
    help: touched ? state.help : [...DEFAULT_HELP],
    planStyle: state.planStyle ?? "mix",
    sportGoal: state.sportGoal ?? (state.help.includes("sport") ? 3 : null),
    homeMode: state.homeMode ?? "mitdenkend",
    members: namedMembers(state.members.length ? state.members : [{ name: "", kid: false }]),
    custom: false,
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
  if (state.help.includes("sport") && list.length < 3) list.push("War heute 5 km laufen");
  if (list.length < 3) list.push("Was steht diese Woche an?");
  return list.slice(0, 3);
}

/** Profil aus den Antworten */
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
 * Start-Kacheln aus "Wobei soll ich dir helfen?": Termine → Termine-Kachel,
 * Essen → Essen, Einkauf → Einkauf, Sport → Sport (in Standard-Reihenfolge);
 * Aufgaben sind immer dabei. Arbeit und
 * Familie steuern nur die Räume. (Seiten bleiben immer erreichbar.)
 */
export function homeTilesFor(help: HelpId[]): HomeTile[] {
  const shown: Record<string, boolean> = { termine: help.includes("termine"), aufgaben: true, essen: help.includes("essen"), einkauf: help.includes("einkauf"), sport: help.includes("sport") };
  return DEFAULT_HOME.map((t) => (t.id in shown ? { ...t, visible: shown[t.id] } : t));
}

/** Zwischenstand prüfen; einen von früher (v1, Chat-Verlauf) auf v2 übernehmen */
export function migrateWelcome(raw: unknown): WelcomeState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<Omit<WelcomeState, "version" | "step">> & { version?: number; step?: string };
  if (r.version === 2 && Array.isArray(r.answered) && Array.isArray(r.members)) {
    // v0.22: "Wer soll dir helfen?" ist der erste Schritt; der frühere Schritt "name" geht darin auf
    const state = { ...initialWelcome(), ...r, version: 2, helper: migrateHelper(r.helper) } as WelcomeState;
    const begun = state.answered.length > 0 || (r.step !== "hallo" && r.step !== "name");
    const step = (r.step as string) === "name" || !begun ? "begleitung" : state.step;
    return { ...state, step, answered: [...new Set([...(begun ? (["begleitung"] as WelcomeStep[]) : []), ...state.answered.filter((a) => (a as string) !== "name")])] };
  }
  if (r.version !== 1) return null;
  const base = initialWelcome();
  const help = Array.isArray(r.help) ? (r.help as HelpId[]) : base.help;
  const renamed = r.step === "name" || r.step === "eigener";
  const wanted = (r.step === "bestaetigen" ? "wer" : renamed ? "begleitung" : r.step) as WelcomeStep;
  const steps = flow({ help });
  const step = steps.includes(wanted) ? wanted : "hilfe";
  const members = Array.isArray(r.members) && r.members.length ? (r.members as Member[]) : base.members;
  return { ...base, helper: migrateHelper(r.helper ?? base.helper), help, planStyle: r.planStyle ?? null, members, renamed, step, answered: steps.slice(0, steps.indexOf(step)) };
}
