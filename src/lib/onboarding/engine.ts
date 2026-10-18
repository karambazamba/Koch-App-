// Kennenlernen als Gespräch: feste Fragenfolge, Antworten per Sprache,
// Tippen oder Chips. Alles hier ist rein (ohne Speicher/Oberfläche) – der
// Zustand wird von außen gespeichert, damit man später weitermachen kann.
// Freie Antworten erkennt ./recognize.ts (Regeln) bzw. ./ai.ts (KI).

import {
  DEFAULT_HELPER,
  HELPER_NAMES,
  HOUSEHOLD_TYPES,
  HELPER_NAME_MAX,
  KID_AGE_GROUP_LABELS,
  MEAL_TIME_LABELS,
  WEEKDAYS,
  createEmptyProfile,
  createPerson,
  fitHouseholdType,
  personLabel,
  syncPersons,
  usualLunch,
  type HelperVoice,
  type HouseholdProfile,
  type HouseholdType,
  type KidAgeGroup,
  type MealTime,
  type Person,
  type PersonRole,
  type WeekendStyle,
  WEEKEND_STYLES,
} from "../profile";
import {
  extractDietItems,
  extractHelperName,
  extractHouseholdName,
  extractNames,
  extractPersonInfo,
  extractWeekCounts,
  mealTimes,
  weekdaysIn,
  yesNo,
  type DietItem,
  type NameHint,
  type PersonInfo,
} from "./recognize";

export type StepId =
  | "householdType"
  | "helperName"
  | "helperNameCustom"
  | "helperVoice"
  | "household"
  | "members"
  | "confirmNames"
  | "personIntro"
  | "personRole"
  | "personGroup"
  | "extras"
  | "extrasWho"
  | "warmWeekday"
  | "warmWeekend"
  | "weekendStyle"
  | "shoppingDay"
  | "weekRules"
  | "cheatDay"
  | "wishDay"
  | "done";

/** Was ein antippbarer Eintrag korrigiert */
export type Target =
  | { kind: "type" }
  | { kind: "helper" }
  | { kind: "household" }
  | { kind: "names" }
  | { kind: "person"; id: string }
  | { kind: "warm" }
  | { kind: "shopping" }
  | { kind: "rules" };

export type ChatMessage = { id: string; from: "helper" | "user"; text: string; target?: Target };

export type Chip = { label: string; value: string; primary?: boolean };

/** Name beim Bestätigen; `id` = schon angelegte Person */
export type NameEntry = NameHint & { id?: string };

type Known = { role?: boolean; group?: boolean; lunch?: boolean };

export type OnboardingState = {
  version: 1;
  /** "addPerson" = später neue Person(en) per Küchenhelfer */
  mode: "onboarding" | "addPerson";
  step: StepId;
  draft: HouseholdProfile;
  names: NameEntry[];
  /** Personen, die noch vorgestellt werden */
  queue: string[];
  personId: string | null;
  known: Record<string, Known>;
  pendingDiet: Omit<DietItem, "person">[];
  /** Beim Korrigieren: danach hierhin zurück */
  returnTo: StepId | null;
  messages: ChatMessage[];
  counter: number;
};

/** Von der KI erkannte Struktur (ersetzt die Regel-Erkennung) */
export type Recognized = { names?: NameHint[]; person?: PersonInfo; diet?: DietItem[] };

export type Answer = { text?: string; chip?: string; recognized?: Recognized };

type Block = "type" | "helper" | "household" | "members" | "persons" | "extras" | "warm" | "shopping" | "rules" | "done";
const BLOCKS: Block[] = ["type", "helper", "household", "members", "persons", "extras", "warm", "shopping", "rules", "done"];
const ADD_BLOCKS: Block[] = ["members", "persons", "done"];

const BLOCK_OF: Record<StepId, Block> = {
  householdType: "type",
  helperName: "helper",
  helperNameCustom: "helper",
  helperVoice: "helper",
  household: "household",
  members: "members",
  confirmNames: "members",
  personIntro: "persons",
  personRole: "persons",
  personGroup: "persons",
  extras: "extras",
  extrasWho: "extras",
  warmWeekday: "warm",
  warmWeekend: "warm",
  weekendStyle: "warm",
  shoppingDay: "shopping",
  weekRules: "rules",
  cheatDay: "rules",
  wishDay: "rules",
  done: "done",
};

export const GREETING =
  "Hi! 👋 Ich bin deine neue Küchenhilfe. Ich nehme dir das Planen, Einkaufen und Kochen-Organisieren ab. Dafür lernen wir uns kurz kennen – ca. 2 Minuten. Du kannst einfach reden oder tippen.";

const RULE_PRESETS = [
  { value: "2-1-4", label: "2× Fleisch · 1× Fisch · 4× Veggie" },
  { value: "3-1-3", label: "3× Fleisch · 1× Fisch · 3× Veggie" },
  { value: "1-1-5", label: "1× Fleisch · 1× Fisch · 5× Veggie" },
  { value: "0-0-7", label: "Nur vegetarisch" },
];

// --- Hilfen --------------------------------------------------------------------

const say = (s: OnboardingState, text: string, target?: Target): OnboardingState => ({
  ...s,
  counter: s.counter + 1,
  messages: [...s.messages, { id: `m${s.counter + 1}`, from: "helper", text, target }],
});
const heard = (s: OnboardingState, text: string): OnboardingState =>
  text.trim()
    ? { ...s, counter: s.counter + 1, messages: [...s.messages, { id: `m${s.counter + 1}`, from: "user", text: text.trim() }] }
    : s;

/** Nur für mich → "du" statt "ihr" */
const solo = (s: OnboardingState) => s.mode === "onboarding" && s.draft.householdType === "single";
const typeOf = (s: OnboardingState): HouseholdType => s.draft.householdType;

/** "Für wen kochst du?" aus freier Antwort */
export function householdTypeFrom(text: string): HouseholdType | null {
  const t = text.toLowerCase();
  if (/\bwg\b|mitbewohner|wohngemeinschaft|mehrere|mehrpersonen|kollegen/.test(t)) return "wg";
  if (/kind|kinder|familie|tochter|sohn|baby|kids/.test(t)) return "familie";
  if (/zu zweit|\bpaar\b|partner|freund(in)?\b|frau und|mann und|wir beide|uns beide|für zwei/.test(t)) return "paar";
  if (/nur (für )?mich|allein|single|\bich\b|für mich/.test(t)) return "single";
  return null;
}

const personById = (s: OnboardingState, id: string | null) => s.draft.persons.find((p) => p.id === id);
const kids = (s: OnboardingState) => s.draft.persons.filter((p) => p.role === "kind");

function updatePerson(s: OnboardingState, id: string, change: (p: Person) => Person): OnboardingState {
  return { ...s, draft: { ...s.draft, persons: s.draft.persons.map((p) => (p.id === id ? change(p) : p)) } };
}

/** Rolle wechseln: passende Standardwerte, Name und Vorlieben bleiben */
function withRole(p: Person, role: PersonRole): Person {
  if (p.role === role) return p;
  const fresh = createPerson(role);
  return { ...fresh, id: p.id, name: p.name, allergies: p.allergies, dislikes: p.dislikes };
}

const mergeList = (list: string[], add: string[]) => [...list, ...add.filter((a) => !list.some((x) => x.toLowerCase() === a.toLowerCase()))];

const listJoin = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`;

const GROUP_PLACE: Record<KidAgeGroup, string> = { kleinkind: "zu Hause", kitakind: "in der Kita", schulkind: "in der Schule" };

/** "Mathis, 7, Schulkind, isst mittags in der Schule, mag nicht: Pilze" */
export function personSummary(p: Person, persons: Person[]): string {
  const parts = [personLabel(p, persons)];
  if (p.age) parts.push(String(p.age));
  parts.push(p.role === "kind" ? KID_AGE_GROUP_LABELS[p.ageGroup ?? "kitakind"] : "erwachsen");
  const lunch = p.weekdayLunch ?? usualLunch(p);
  if (lunch === "zuhause") parts.push("isst mittags zu Hause");
  else if (lunch === "manchmal") parts.push("isst mittags manchmal zu Hause");
  else parts.push(`isst mittags ${p.role === "kind" ? GROUP_PLACE[p.ageGroup ?? "kitakind"] : "auswärts"}`);
  if (p.allergies.length) parts.push(`Allergie: ${p.allergies.join(", ")}`);
  if (p.dislikes.length) parts.push(`mag nicht: ${p.dislikes.join(", ")}`);
  return parts.join(", ");
}

// --- Fragen --------------------------------------------------------------------

function question(s: OnboardingState, step: StepId): string {
  const p = personById(s, s.personId);
  const name = p ? personLabel(p, s.draft.persons) : "";
  const one = solo(s);
  switch (step) {
    case "householdType":
      return "Für wen kochst du?";
    case "helperName":
      return "Wie soll ich heißen?";
    case "helperNameCustom":
      return "Wie denn? Sag oder schreib mir den Namen.";
    case "helperVoice":
      return "Schöner Name! Soll ich beim Vorlesen eher eine Frauen- oder eine Männerstimme haben?";
    case "household":
      return typeOf(s) === "wg" ? "Habt ihr einen Namen für eure WG? (Geht auch ohne.)" : "Wie heißt eure Familie?";
    case "members":
      return s.mode === "addPerson"
        ? "Wie heißt die neue Person?"
        : one
          ? "Wie heißt du?"
          : typeOf(s) === "paar"
            ? "Wie heißt ihr beide?"
            : "Wer isst bei euch mit? Sag mir einfach alle Namen – deinen auch.";
    case "confirmNames":
      return one ? "Richtig geschrieben?" : "Hab ich alle richtig geschrieben?";
    case "personIntro":
      return `Erzähl mir kurz was über ${name}.`;
    case "personRole":
      return `Ist ${name} erwachsen oder ein Kind?`;
    case "personGroup":
      return `Ist ${name} noch zu Hause oder in der Krippe, in der Kita oder in der Schule?`;
    case "extras":
      return one
        ? "Gibt's Allergien oder Sachen, die du gar nicht magst?"
        : typeOf(s) === "familie"
          ? "Gibt's sonst noch Allergien oder Sachen, die jemand gar nicht mag?"
          : "Gibt's Allergien oder Sachen, die jemand gar nicht mag?";
    case "extrasWho":
      return "Wen betrifft das?";
    case "warmWeekday":
      return one ? "Wann isst du unter der Woche meistens warm?" : "Wann esst ihr unter der Woche meistens zusammen warm?";
    case "warmWeekend":
      return "Und am Wochenende – anders?";
    case "weekendStyle":
      return one ? "Wie bist du am Wochenende?" : "Wie seid ihr am Wochenende?";
    case "shoppingDay":
      return one ? "An welchem Tag kaufst du meistens ein? Ab da plane ich immer eine Woche." : "An welchem Tag kauft ihr meistens ein? Ab da plane ich immer eine Woche.";
    case "weekRules":
      return "Wie soll's die Woche über aussehen? Ich hab schon mal was Ausgewogenes vorbereitet.";
    case "cheatDay":
      return "Und ein Cheat Day – einmal pro Woche Pizza, Burger & Co.? 🍕";
    case "wishDay":
      return "Sollen sich die Kinder reihum einmal pro Woche ein Gericht wünschen dürfen? 🎉";
    case "done":
      return "";
  }
}

/** Antwort-Chips zur aktuellen Frage */
export function chipsFor(s: OnboardingState): Chip[] {
  switch (s.step) {
    case "householdType":
      return HOUSEHOLD_TYPES.map((t) => ({ label: `${t.emoji} ${t.label}`, value: t.value }));
    case "helperName":
      return [...HELPER_NAMES.map((h) => ({ label: h.name, value: h.name })), { label: "Eigener Name", value: "custom" }];
    case "helperVoice":
      return [
        { label: "Frauenstimme", value: "weiblich" },
        { label: "Männerstimme", value: "maennlich" },
      ];
    case "household":
      return [{ label: "Überspringen", value: "skip" }];
    case "confirmNames":
      return [{ label: "Passt ✓", value: "ok", primary: true }];
    case "personIntro":
      return [
        { label: "Erwachsen", value: "erwachsen" },
        { label: "Kind", value: "kind" },
        { label: "Weiter", value: "weiter" },
      ];
    case "personRole":
      return [
        { label: "Erwachsen", value: "erwachsen" },
        { label: "Kind", value: "kind" },
      ];
    case "personGroup":
      return [
        { label: "Noch klein (zu Hause/Krippe)", value: "kleinkind" },
        { label: "Kita", value: "kitakind" },
        { label: "Schule", value: "schulkind" },
      ];
    case "extras":
      return [{ label: "Nein, alles gesagt", value: "nein", primary: true }];
    case "extrasWho":
      return [...s.draft.persons.map((p) => ({ label: personLabel(p, s.draft.persons), value: `p:${p.id}` })), { label: "Alle", value: "alle" }];
    case "warmWeekday":
      return [
        { label: "Mittags", value: "mittags" },
        { label: "Abends", value: "abends" },
      ];
    case "warmWeekend":
      return [
        { label: "Genauso", value: "same" },
        { label: "Mittags", value: "mittags" },
        { label: "Abends", value: "abends" },
      ];
    case "weekendStyle":
      return WEEKEND_STYLES.map((w) => ({ label: `${w.emoji} ${w.label}`, value: w.value, primary: w.value === "locker" }));
    case "shoppingDay":
      return WEEKDAYS.map((d) => ({ label: d, value: d }));
    case "weekRules":
      return RULE_PRESETS;
    case "cheatDay":
      return [
        { label: "Ja, freitags", value: "Freitag" },
        { label: "Ja, samstags", value: "Samstag" },
        { label: "Nein", value: "nein" },
      ];
    case "wishDay":
      return [
        { label: "Ja, freitags", value: "Freitag" },
        { label: "Ja, sonntags", value: "Sonntag" },
        { label: "Nein", value: "nein" },
      ];
    case "done":
      return s.mode === "addPerson"
        ? [{ label: "Fertig ✓", value: "fertig", primary: true }]
        : [
            { label: "Erste Woche planen", value: "plan", primary: true },
            { label: "Erstmal umschauen", value: "look" },
          ];
    default:
      return [];
  }
}

export function placeholderFor(s: OnboardingState): string {
  switch (s.step) {
    case "helperNameCustom":
      return "z. B. Oma Hilde";
    case "household":
      return typeOf(s) === "wg" ? "z. B. Villa Kunterbunt" : "z. B. Müller";
    case "members":
      return s.mode === "addPerson"
        ? "z. B. Oma Rosi"
        : solo(s)
          ? "z. B. Lisa"
          : typeOf(s) === "paar"
            ? "z. B. Lisa und Felix"
            : typeOf(s) === "wg"
              ? "z. B. Ich bin Lisa, dazu Tom und Sara"
              : "z. B. Ich bin Lisa, Felix, Mattis und Ella";
    case "confirmNames":
      return "Noch jemand? Einfach dazuschreiben";
    case "personIntro":
      return "z. B. 7, Schulkind, mag keine Pilze";
    case "extras":
      return solo(s) ? "z. B. keine Pilze" : "z. B. Ella mag keine Pilze";
    default:
      return "Antworten oder Chip antippen …";
  }
}

/** Für welche Schritte eine KI-Erkennung lohnt (freie Antworten) */
export function aiKindFor(step: StepId): "names" | "person" | "diet" | null {
  if (step === "members" || step === "confirmNames") return "names";
  if (step === "personIntro") return "person";
  if (step === "extras") return "diet";
  return null;
}

// --- Ablauf --------------------------------------------------------------------

function goto(s: OnboardingState, step: StepId, prefix = ""): OnboardingState {
  const next = { ...s, step };
  if (step === "done") return say(next, doneText(next));
  const q = question(next, step);
  return q ? say(next, prefix ? `${prefix} ${q}` : q) : next;
}

/** Ohne Kinder kürzer: kein Familienname (außer WG, optional), keine Personen-Runde */
function blocksFor(s: OnboardingState): Block[] {
  if (s.mode === "addPerson") return ADD_BLOCKS;
  const type = typeOf(s);
  return BLOCKS.filter((b) => (b === "household" ? type === "familie" || type === "wg" : b === "persons" ? type === "familie" : true));
}

function startBlock(s: OnboardingState, block: Block, prefix = ""): OnboardingState {
  switch (block) {
    case "type":
      return goto(s, "householdType", prefix);
    case "helper":
      return goto(s, "helperName", prefix);
    case "household":
      return goto(s, "household", prefix);
    case "members":
      return goto(s, "members", prefix);
    case "persons": {
      if (s.queue.length === 0) return finishBlock(s, "persons");
      const [first, ...rest] = s.queue;
      return goto({ ...s, personId: first, queue: rest }, "personIntro", prefix);
    }
    case "extras":
      return goto(s, "extras", prefix);
    case "warm":
      return goto(s, "warmWeekday", prefix);
    case "shopping":
      return goto(s, "shoppingDay", prefix);
    case "rules":
      return goto(s, "weekRules", prefix);
    case "done":
      return goto(s, "done", prefix);
  }
}

/** Block fertig: beim Korrigieren zurück, sonst weiter */
function finishBlock(s: OnboardingState, block: Block): OnboardingState {
  if (s.returnTo) {
    const back = s.returnTo;
    const cleared = { ...s, returnTo: null };
    // Mitten in der Personen-Runde: mit der aktuellen Person weiter
    return goto(cleared, back, "Weiter geht's:");
  }
  const order = blocksFor(s);
  // Block evtl. nicht (mehr) in der Folge (z. B. Typ geändert) → nach fester Reihenfolge weiter
  const index = order.indexOf(block);
  const next = index >= 0 ? order[index + 1] : order.find((b) => BLOCKS.indexOf(b) > BLOCKS.indexOf(block));
  return startBlock(s, next ?? "done");
}

export function startOnboarding(): OnboardingState {
  const draft: HouseholdProfile = { ...createEmptyProfile(), adults: 0, kids: 0, persons: [] };
  const s: OnboardingState = {
    version: 1,
    mode: "onboarding",
    step: "householdType",
    draft,
    names: [],
    queue: [],
    personId: null,
    known: {},
    pendingDiet: [],
    returnTo: null,
    messages: [],
    counter: 0,
  };
  return goto(say(s, GREETING), "householdType");
}

/** Neue Person(en) später per Küchenhelfer: Namen bestätigen + kurz vorstellen */
export function startAddPerson(profile: HouseholdProfile, text = ""): OnboardingState {
  const helper = profile.helper.name || DEFAULT_HELPER.name;
  const base: OnboardingState = {
    version: 1,
    mode: "addPerson",
    step: "members",
    draft: profile,
    names: [],
    queue: [],
    personId: null,
    known: {},
    pendingDiet: [],
    returnTo: null,
    messages: [],
    counter: 0,
  };
  const known = new Set(profile.persons.map((p) => p.name.toLowerCase()));
  const names = extractNames(text).filter((n) => !known.has(n.name.toLowerCase()) && n.name.toLowerCase() !== helper.toLowerCase());
  const s = say(heard(base, text), "Oh, Zuwachs! 🙌");
  return names.length > 0 ? goto({ ...s, names }, "confirmNames") : goto(s, "members");
}

/** Eintrag antippen → Frage nochmal stellen, danach zurück */
export function revisit(s: OnboardingState, target: Target): OnboardingState {
  if (s.step === "done" && s.mode === "addPerson") return s;
  const base = { ...s, returnTo: s.returnTo ?? s.step };
  switch (target.kind) {
    case "type":
      return goto(base, "householdType", "Klar, nochmal:");
    case "helper":
      return goto(base, "helperName", "Klar, nochmal:");
    case "household":
      return goto(base, "household", "Klar, nochmal:");
    case "names":
      return goto(
        { ...base, names: s.draft.persons.map((p) => ({ name: p.name, role: p.role, id: p.id })) },
        "confirmNames",
        "Klar:",
      );
    case "person":
      // Aktuelle Person merken, damit die Runde danach weiterläuft
      return goto(
        { ...base, queue: s.personId && s.personId !== target.id && BLOCK_OF[s.step] === "persons" ? [s.personId, ...s.queue] : s.queue, personId: target.id, returnTo: BLOCK_OF[s.step] === "persons" ? null : base.returnTo },
        "personIntro",
        "Okay, nochmal:",
      );
    case "warm":
      return goto(base, "warmWeekday", "Klar, nochmal:");
    case "shopping":
      return goto(base, "shoppingDay", "Klar, nochmal:");
    case "rules":
      return goto(base, "weekRules", "Klar, nochmal:");
  }
}

// --- Namen bestätigen (direkt bearbeitbar) -------------------------------------

export function renameName(s: OnboardingState, index: number, name: string): OnboardingState {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) return removeName(s, index);
  return { ...s, names: s.names.map((n, i) => (i === index ? { ...n, name: clean.charAt(0).toUpperCase() + clean.slice(1) } : n)) };
}

export function removeName(s: OnboardingState, index: number): OnboardingState {
  return { ...s, names: s.names.filter((_, i) => i !== index) };
}

/** Bestätigte Namen → Personen anlegen/umbenennen/entfernen */
function applyNames(s: OnboardingState): OnboardingState {
  const keepIds = new Set(s.names.flatMap((n) => (n.id ? [n.id] : [])));
  const before = s.mode === "addPerson" ? s.draft.persons : s.draft.persons.filter((p) => keepIds.has(p.id));
  const known = { ...s.known };
  const created: string[] = [];
  let persons = before.map((p) => {
    const entry = s.names.find((n) => n.id === p.id);
    return entry ? { ...p, name: entry.name } : p;
  });
  // Ohne Kinder sind alle erwachsen – keine Personen-Runde
  const adultsOnly = s.mode === "onboarding" && typeOf(s) !== "familie";
  for (const n of s.names.filter((x) => !x.id)) {
    const person = createPerson(adultsOnly ? "erwachsen" : (n.role ?? "erwachsen"));
    person.name = n.name;
    if (n.age !== undefined) {
      person.age = n.role === "kind" || n.age < 18 ? n.age : null;
      if (person.role === "kind") person.ageGroup = n.age < 3 ? "kleinkind" : n.age < 6 ? "kitakind" : "schulkind";
    }
    known[person.id] = { role: adultsOnly || Boolean(n.role), group: person.role === "kind" && n.age !== undefined };
    created.push(person.id);
    persons = [...persons, person];
  }
  return { ...s, known, names: [], draft: { ...s.draft, persons }, queue: adultsOnly ? [] : [...s.queue, ...created] };
}

// --- Personen ------------------------------------------------------------------

function applyInfo(s: OnboardingState, id: string, info: PersonInfo): OnboardingState {
  const known = { ...s.known[id] };
  let next = updatePerson(s, id, (p) => {
    let q = info.role ? withRole(p, info.role) : p;
    if (info.role) known.role = true;
    if (q.role === "kind") {
      if (info.age !== undefined) q = { ...q, age: info.age };
      if (info.ageGroup) {
        q = { ...q, ageGroup: info.ageGroup };
        known.group = true;
      }
    }
    if (info.lunch) {
      q = { ...q, weekdayLunch: info.lunch };
      known.lunch = true;
    }
    return { ...q, allergies: mergeList(q.allergies, info.allergies), dislikes: mergeList(q.dislikes, info.dislikes) };
  });
  next = { ...next, known: { ...next.known, [id]: known } };
  return next;
}

/** Pflichtangaben (Rolle, bei Kindern Gruppe) nachfragen, sonst bestätigen */
function continuePerson(s: OnboardingState): OnboardingState {
  const p = personById(s, s.personId);
  if (!p) return finishBlock(s, "persons");
  const known = s.known[p.id] ?? {};
  if (!known.role) return goto(s, "personRole");
  if (p.role === "kind" && !known.group) return goto(s, "personGroup");
  // Mittagessen ohne Angabe: wie üblich
  let next = s;
  if (!known.lunch) next = updatePerson(s, p.id, (q) => ({ ...q, weekdayLunch: usualLunch(q) }));
  const done = personById(next, p.id)!;
  next = say(next, `Notiert ✓ ${personSummary(done, next.draft.persons)}`, { kind: "person", id: p.id });
  if (next.queue.length > 0) {
    const [following, ...rest] = next.queue;
    return goto({ ...next, personId: following, queue: rest }, "personIntro");
  }
  return finishBlock({ ...next, personId: null }, "persons");
}

function roleFrom(text: string, chip?: string): PersonRole | null {
  if (chip === "erwachsen" || chip === "kind") return chip;
  const info = extractPersonInfo(text);
  if (info.role) return info.role;
  if (/\b(groß|erwachsen)/i.test(text)) return "erwachsen";
  if (/\b(klein|kind)/i.test(text)) return "kind";
  return null;
}

function groupFrom(text: string, chip?: string): KidAgeGroup | null {
  if (chip === "kleinkind" || chip === "kitakind" || chip === "schulkind") return chip;
  const t = text.toLowerCase();
  if (/krippe|zu hause|zuhause|daheim|klein|baby/.test(t)) return "kleinkind";
  if (/kita|kindergarten/.test(t)) return "kitakind";
  if (/schule|klasse/.test(t)) return "schulkind";
  return extractPersonInfo(text).ageGroup ?? null;
}

// --- Allergien & Abneigungen ---------------------------------------------------

function applyDiet(s: OnboardingState, ids: string[], items: Omit<DietItem, "person">[]): OnboardingState {
  let next = s;
  for (const id of ids) {
    next = updatePerson(next, id, (p) => ({
      ...p,
      allergies: mergeList(p.allergies, items.filter((i) => i.kind === "Allergie").map((i) => i.term)),
      dislikes: mergeList(p.dislikes, items.filter((i) => i.kind === "mag nicht").map((i) => i.term)),
    }));
  }
  return next;
}

function dietText(items: DietItem[]): string {
  return items.map((i) => `${i.person ?? "alle"}: ${i.kind === "Allergie" ? `Allergie ${i.term}` : `kein(e) ${i.term}`}`).join(", ");
}

// --- Antworten -----------------------------------------------------------------

/** Eine Antwort (Text, Chip oder KI-Erkennung) verarbeiten */
export function answer(state: OnboardingState, a: Answer): OnboardingState {
  const text = (a.text ?? "").trim();
  const chipLabel = a.chip ? chipsFor(state).find((c) => c.value === a.chip)?.label : undefined;
  let s = heard(state, chipLabel ?? text);
  const chip = a.chip;

  switch (state.step) {
    case "householdType": {
      const type = (HOUSEHOLD_TYPES.find((t) => t.value === chip)?.value ?? householdTypeFrom(text)) as HouseholdType | null;
      if (!type) return goto(s, "householdType", "Hm, nicht ganz verstanden.");
      s = { ...s, draft: { ...s.draft, householdType: type } };
      const reply =
        type === "single" ? "Schön – dann kümmere ich mich ganz um dich! 😊" : type === "paar" ? "Zu zweit – schön! 👫" : type === "familie" ? "Eine Familie – da ist immer was los! 😄" : "Eine WG – ich mag Trubel! 🏠";
      return finishBlock(say(s, reply, { kind: "type" }), "type");
    }
    case "helperName":
    case "helperNameCustom": {
      if (chip === "custom") return goto(s, "helperNameCustom");
      const name = (chip ?? extractHelperName(text)).slice(0, HELPER_NAME_MAX).trim();
      if (!name) return goto(s, state.step, "Hm, den Namen hab ich nicht verstanden.");
      const preset = HELPER_NAMES.find((h) => h.name.toLowerCase() === name.toLowerCase());
      s = { ...s, draft: { ...s.draft, helper: { name: preset?.name ?? name, voice: preset?.voice ?? s.draft.helper.voice } } };
      if (!preset) return goto(s, "helperVoice");
      return finishBlock(say(s, `Super, ich bin ab jetzt ${preset.name}!`, { kind: "helper" }), "helper");
    }
    case "helperVoice": {
      const voice: HelperVoice =
        chip === "maennlich" || chip === "weiblich" ? chip : /mann|männ|maenn|tief/i.test(text) ? "maennlich" : "weiblich";
      s = { ...s, draft: { ...s.draft, helper: { ...s.draft.helper, voice } } };
      return finishBlock(say(s, `Super, ich bin ab jetzt ${s.draft.helper.name}!`, { kind: "helper" }), "helper");
    }
    case "household": {
      const name = chip === "skip" ? "" : extractHouseholdName(text);
      s = { ...s, draft: { ...s.draft, householdName: name } };
      const hello = typeOf(s) === "wg" ? (name ? `Hallo, ${name}! 😊` : "Kein Problem – dann eben ohne Namen.") : name ? `Hallo, Familie ${name}! 😊` : "Kein Problem – dann eben ohne Nachnamen.";
      return finishBlock(say(s, hello, { kind: "household" }), "household");
    }
    case "members": {
      const helper = s.draft.helper.name.toLowerCase();
      const existing = new Set(s.mode === "addPerson" ? s.draft.persons.map((p) => p.name.toLowerCase()) : []);
      const names = (a.recognized?.names ?? extractNames(text)).filter(
        (n) => n.name.toLowerCase() !== helper && !existing.has(n.name.toLowerCase()),
      );
      if (names.length === 0) {
        return say(s, solo(s) ? "Hm, da hab ich keinen Namen rausgehört. Sag mir einfach deinen Vornamen." : "Hm, da hab ich keinen Namen rausgehört. Sag mir einfach die Vornamen, z. B. „Lisa, Felix und Ella“.");
      }
      return goto({ ...s, names: [...s.names, ...names] }, "confirmNames");
    }
    case "confirmNames": {
      if (chip === "ok") {
        if (s.names.length === 0) return goto(s, "members");
        const applied = applyNames(s);
        const hi = solo(applied) && applied.draft.persons[0]?.name ? `Hallo, ${applied.draft.persons[0].name}! 👋` : "Prima! 👍";
        return finishBlock(say(applied, hi, { kind: "names" }), "members");
      }
      // Weitere Namen dazugesagt
      const more = (a.recognized?.names ?? extractNames(text)).filter((n) => !s.names.some((x) => x.name.toLowerCase() === n.name.toLowerCase()));
      if (more.length === 0) return say(s, "Tipp einen Namen an, um ihn zu korrigieren – oder „Passt ✓“.");
      return say({ ...s, names: [...s.names, ...more] }, `Ergänzt ✓ ${listJoin(more.map((n) => n.name))}. Jetzt alle richtig?`);
    }
    case "personIntro": {
      const id = s.personId;
      if (!id) return finishBlock(s, "persons");
      if (chip === "erwachsen" || chip === "kind") return continuePerson(applyInfo(s, id, { role: chip, allergies: [], dislikes: [] }));
      if (chip === "weiter" || !text) return continuePerson(s);
      return continuePerson(applyInfo(s, id, a.recognized?.person ?? extractPersonInfo(text)));
    }
    case "personRole": {
      const id = s.personId;
      const role = roleFrom(text, chip);
      if (!id) return finishBlock(s, "persons");
      if (!role) return goto(s, "personRole", "Sorry, nochmal:");
      return continuePerson(applyInfo(s, id, { ...extractPersonInfo(text), role }));
    }
    case "personGroup": {
      const id = s.personId;
      const group = groupFrom(text, chip);
      if (!id) return finishBlock(s, "persons");
      if (!group) return goto(s, "personGroup", "Sorry, nochmal:");
      return continuePerson(applyInfo(s, id, { role: "kind", ageGroup: group, allergies: [], dislikes: [] }));
    }
    case "extras": {
      if (chip === "nein") return finishBlock(s, "extras");
      const names = s.draft.persons.map((p) => p.name).filter(Boolean);
      const items = a.recognized?.diet ?? extractDietItems(text, names);
      // "Nein, nichts" – aber nicht "Felix mag keine Pilze"
      if (items.length === 0 && yesNo(text) === false) return finishBlock(s, "extras");
      if (items.length === 0) return say(s, "Hab ich nicht ganz verstanden – sag z. B. „Ella mag keine Pilze“. Oder „Nein, alles gesagt“.");
      const unassigned = items.filter((i) => !i.person);
      let next = s;
      for (const item of items.filter((i) => i.person)) {
        const p = s.draft.persons.find((x) => x.name.toLowerCase() === item.person!.toLowerCase());
        if (p) next = applyDiet(next, [p.id], [item]);
      }
      const assigned = items.filter((i) => i.person);
      if (assigned.length) next = say(next, `Notiert ✓ ${dietText(assigned)}`);
      // Nur eine Person → betrifft sie
      if (unassigned.length && s.draft.persons.length === 1) {
        next = applyDiet(next, [s.draft.persons[0].id], unassigned);
        return say(say(next, `Notiert ✓ ${unassigned.map((i) => (i.kind === "Allergie" ? `Allergie ${i.term}` : `kein(e) ${i.term}`)).join(", ")}`), "Noch was?");
      }
      if (unassigned.length) return goto({ ...next, pendingDiet: unassigned.map(({ kind, term }) => ({ kind, term })) }, "extrasWho");
      return say(next, "Noch was?");
    }
    case "extrasWho": {
      const ids =
        chip === "alle" || /\balle\b/i.test(text)
          ? s.draft.persons.map((p) => p.id)
          : chip?.startsWith("p:")
            ? [chip.slice(2)]
            : s.draft.persons.filter((p) => new RegExp(`(?<![a-zäöüß])${p.name.toLowerCase()}(?![a-zäöüß])`).test(text.toLowerCase())).map((p) => p.id);
      if (ids.length === 0) return goto(s, "extrasWho", "Sorry, nochmal:");
      const who = ids.length === s.draft.persons.length ? "alle" : listJoin(ids.map((id) => personById(s, id)!.name));
      const next = applyDiet(s, ids, s.pendingDiet);
      const noted = say(
        { ...next, pendingDiet: [], step: "extras" },
        `Notiert ✓ ${dietText(s.pendingDiet.map((i) => ({ ...i, person: who })))}`,
      );
      return say(noted, "Noch was?");
    }
    case "warmWeekday": {
      const times = mealTimes(text);
      const weekday: MealTime | undefined = chip === "mittags" || chip === "abends" ? chip : (times.weekday ?? (times.weekend ? undefined : times.any));
      if (!weekday && !times.weekend) return goto(s, "warmWeekday", "Mittags oder abends?");
      s = { ...s, draft: { ...s.draft, warmMeal: { ...s.draft.warmMeal, weekday: weekday ?? s.draft.warmMeal.weekday } } };
      if (times.weekend) {
        s = { ...s, draft: { ...s.draft, warmMeal: { ...s.draft.warmMeal, weekend: times.weekend } } };
        return goto(say(s, warmText(s), { kind: "warm" }), "weekendStyle");
      }
      return goto(s, "warmWeekend");
    }
    case "warmWeekend": {
      const times = mealTimes(text);
      const weekend: MealTime =
        chip === "mittags" || chip === "abends"
          ? chip
          : chip === "same" || /genau|gleich|auch so|nein|nicht anders/i.test(text) || !times.any
            ? s.draft.warmMeal.weekday
            : times.any;
      s = { ...s, draft: { ...s.draft, warmMeal: { ...s.draft.warmMeal, weekend } } };
      return goto(say(s, warmText(s), { kind: "warm" }), "weekendStyle");
    }
    case "weekendStyle": {
      const t = text.toLowerCase();
      const style: WeekendStyle =
        chip === "frei" || chip === "locker" || chip === "normal"
          ? chip
          : /frei|nichts planen|in ruhe/.test(t)
            ? "frei"
            : /wie unter der woche|normal|planen|genauso/.test(t)
              ? "normal"
              : "locker";
      s = { ...s, draft: { ...s.draft, weekendStyle: style } };
      const reply =
        style === "frei"
          ? "Gebongt – am Wochenende halte ich mich raus 🏖"
          : style === "locker"
            ? "Schön locker 🌿 – höchstens eine Idee pro Tag, ganz ohne Erinnerungen."
            : "Alles klar – Wochenende plane ich wie unter der Woche 📅";
      return finishBlock(say(s, reply, { kind: "warm" }), "warm");
    }
    case "shoppingDay": {
      const day = chip && WEEKDAYS.includes(chip) ? chip : weekdaysIn(text)[0];
      if (!day) return goto(s, "shoppingDay", "Welcher Wochentag?");
      s = { ...s, draft: { ...s.draft, shoppingDay: day } };
      return finishBlock(say(s, `Alles klar – ich plane immer ab ${day}.`, { kind: "shopping" }), "shopping");
    }
    case "weekRules": {
      let meat: number, fish: number, veggie: number;
      const preset = RULE_PRESETS.find((r) => r.value === chip);
      if (preset) [meat, fish, veggie] = preset.value.split("-").map(Number);
      else {
        const c = extractWeekCounts(text);
        const onlyVeg = /\b(nur vegetarisch|kein fleisch|vegetarier|vegan)/i.test(text);
        meat = onlyVeg ? 0 : (c.meat ?? 2);
        fish = onlyVeg ? 0 : (c.fish ?? 1);
        veggie = c.veggie ?? Math.max(0, 7 - meat - fish);
      }
      // Höchstens 7 Tage – zuerst Veggie kürzen
      while (meat + fish + veggie > 7) {
        if (veggie > 0) veggie--;
        else if (fish > 0) fish--;
        else meat--;
      }
      s = { ...s, draft: { ...s.draft, weekRules: { ...s.draft.weekRules, meatDays: meat, fishDays: fish, vegetarianDays: veggie } } };
      return goto(s, "cheatDay");
    }
    case "cheatDay": {
      const day = chip && WEEKDAYS.includes(chip) ? chip : weekdaysIn(text)[0];
      const yes = chip === "nein" ? false : day ? true : yesNo(text);
      s = {
        ...s,
        draft: { ...s.draft, weekRules: { ...s.draft.weekRules, cheatDay: yes === true, cheatDayWeekday: yes ? (day ?? "Samstag") : "" } },
      };
      if (kids(s).length > 0) return goto(s, "wishDay");
      return finishBlock(say(s, rulesText(s), { kind: "rules" }), "rules");
    }
    case "wishDay": {
      const day = chip && WEEKDAYS.includes(chip) ? chip : weekdaysIn(text)[0];
      const yes = chip === "nein" ? false : day ? true : yesNo(text);
      s = { ...s, draft: { ...s.draft, wishDay: { ...s.draft.wishDay, enabled: yes === true, weekday: day ?? s.draft.wishDay.weekday } } };
      return finishBlock(say(s, rulesText(s), { kind: "rules" }), "rules");
    }
    case "done":
      return state;
  }
}

/** "Überspringen": aktuelle Frage mit sinnvollen Standardwerten beantworten */
export function skip(s: OnboardingState): OnboardingState {
  switch (s.step) {
    case "householdType":
      return answer(s, { chip: "familie" });
    case "helperName":
    case "helperNameCustom":
      return answer(s, { chip: "Lotte" });
    case "helperVoice":
      return answer(s, { chip: "weiblich" });
    case "household":
      return answer(s, { chip: "skip" });
    case "members": {
      // Neue Person beim Küchenhelfer: abbrechen
      if (s.mode === "addPerson") return { ...say(s, "Okay, dann ein andermal."), step: "done" };
      // Ohne Namen: eine erwachsene Person ohne Namen
      const person = createPerson("erwachsen");
      const next: OnboardingState = { ...s, draft: { ...s.draft, persons: [...s.draft.persons, person] }, known: { ...s.known, [person.id]: { role: true } } };
      return finishBlock(say(next, "Okay, dann erstmal ohne Namen."), "persons");
    }
    case "confirmNames":
      return answer(s, { chip: "ok" });
    case "personIntro":
      return answer(s, { chip: "weiter" });
    case "personRole":
      return answer(s, { chip: "erwachsen" });
    case "personGroup":
      return answer(s, { chip: "kitakind" });
    case "extras":
    case "extrasWho":
      return finishBlock({ ...s, pendingDiet: [] }, "extras");
    case "warmWeekday":
      return goto(s, "weekendStyle");
    case "warmWeekend":
      return answer(s, { chip: "same" });
    case "weekendStyle":
      return answer(s, { chip: "locker" });
    case "shoppingDay":
      return answer(s, { chip: "Montag" });
    case "weekRules":
      return answer(s, { chip: "2-1-4" });
    case "cheatDay":
    case "wishDay":
      return answer(s, { chip: "nein" });
    case "done":
      return s;
  }
}

function warmText(s: OnboardingState): string {
  const { weekday, weekend } = s.draft.warmMeal;
  return weekday === weekend
    ? `Notiert ✓ Warm ${solo(s) ? "isst du" : "esst ihr"} meistens ${MEAL_TIME_LABELS[weekday]}.`
    : `Notiert ✓ Unter der Woche ${MEAL_TIME_LABELS[weekday]}, am Wochenende ${MEAL_TIME_LABELS[weekend]}.`;
}

function rulesText(s: OnboardingState): string {
  const r = s.draft.weekRules;
  const parts = [`${r.meatDays}× Fleisch, ${r.fishDays}× Fisch, ${r.vegetarianDays}× Veggie`];
  parts.push(r.cheatDay ? `Cheat Day ${r.cheatDayWeekday.toLowerCase()}s` : "kein Cheat Day");
  if (kids(s).length) parts.push(s.draft.wishDay.enabled ? `Wunschtag ${s.draft.wishDay.weekday.toLowerCase()}s` : "kein Wunschtag");
  return `Notiert ✓ ${parts.join(", ")}.`;
}

function doneText(s: OnboardingState): string {
  const p = s.draft;
  const persons = p.persons.filter((x) => x.name.trim());
  if (s.mode === "addPerson") return "Alles notiert ✓ Willkommen in der Runde!";
  const who = persons.length ? listJoin(persons.map((x) => x.name)) : `${p.persons.length} Person${p.persons.length === 1 ? "" : "en"}`;
  const r = p.weekRules;
  const one = solo(s);
  const family = p.householdName ? (p.householdType === "wg" ? p.householdName : `Familie ${p.householdName}`) : "euch";
  const intro = one
    ? `Perfekt, ich kenne dich jetzt! 🎉 Kurz zusammengefasst: Ich bin ${p.helper.name} und kümmere mich um dich${persons.length ? `, ${who}` : ""}.`
    : `Perfekt, ich kenne euch jetzt! 🎉 Kurz zusammengefasst: Ich bin ${p.helper.name} und kümmere mich um ${family} – ${who}.`;
  const small = p.householdType === "single" || p.householdType === "paar";
  return [
    intro,
    `Warm ${one ? "isst du" : "esst ihr"} meistens ${MEAL_TIME_LABELS[p.warmMeal.weekday]}${p.warmMeal.weekend !== p.warmMeal.weekday ? ` (am Wochenende ${MEAL_TIME_LABELS[p.warmMeal.weekend]})` : ""}, eingekauft wird ${p.shoppingDay.toLowerCase()}s.`,
    `Pro Woche: ${r.meatDays}× Fleisch, ${r.fishDays}× Fisch, ${r.vegetarianDays}× Veggie${r.cheatDay ? `, Cheat Day ${r.cheatDayWeekday.toLowerCase()}s` : ""}.`,
    ...(small ? ["Ich plane kleine Mengen – und wo's passt, bewusst so, dass es für morgen reicht."] : []),
  ].join(" ");
}

/** Fertiges Profil aus dem Gespräch */
export function finalizeProfile(s: OnboardingState): HouseholdProfile {
  const persons = s.draft.persons.length ? s.draft.persons : [createPerson("erwachsen")];
  const adults = persons.filter((p) => p.role === "erwachsen").length;
  const kidCount = persons.filter((p) => p.role === "kind").length;
  return { ...s.draft, adults, kids: kidCount, persons: syncPersons(persons, adults, kidCount), householdType: fitHouseholdType(s.draft.householdType, persons) };
}

/** Familienkarte: Einträge mit Ziel zum Korrigieren */
export function familyCard(s: OnboardingState): { label: string; value: string; target: Target }[] {
  const p = s.draft;
  const rows: { label: string; value: string; target: Target }[] = [];
  const reached = (step: StepId) => BLOCKS.indexOf(BLOCK_OF[s.step]) > BLOCKS.indexOf(BLOCK_OF[step]) || s.step === "done";
  if (reached("householdType")) {
    const t = HOUSEHOLD_TYPES.find((x) => x.value === p.householdType);
    rows.push({ label: "Für wen", value: t ? `${t.emoji} ${t.label}` : "–", target: { kind: "type" } });
  }
  if (reached("helperName") || s.returnTo) rows.push({ label: "Küchenhilfe", value: p.helper.name, target: { kind: "helper" } });
  if ((reached("household") && blocksFor(s).includes("household")) || p.householdName) rows.push({ label: p.householdType === "wg" ? "WG" : "Familie", value: p.householdName || "–", target: { kind: "household" } });
  for (const person of p.persons) {
    const [name, ...details] = personSummary(person, p.persons).split(", ");
    rows.push({ label: name, value: details.join(", "), target: { kind: "person", id: person.id } });
  }
  if (reached("warmWeekday")) {
    const { weekday, weekend } = p.warmMeal;
    rows.push({ label: "Warm essen", value: weekday === weekend ? MEAL_TIME_LABELS[weekday] : `Mo–Fr ${MEAL_TIME_LABELS[weekday]}, Sa–So ${MEAL_TIME_LABELS[weekend]}`, target: { kind: "warm" } });
  }
  if (reached("shoppingDay")) rows.push({ label: "Einkauf", value: p.shoppingDay, target: { kind: "shopping" } });
  if (reached("weekRules")) {
    const r = p.weekRules;
    rows.push({ label: "Woche", value: `${r.meatDays}× Fleisch · ${r.fishDays}× Fisch · ${r.vegetarianDays}× Veggie${r.cheatDay ? ` · Cheat Day ${r.cheatDayWeekday}` : ""}`, target: { kind: "rules" } });
  }
  return rows;
}
