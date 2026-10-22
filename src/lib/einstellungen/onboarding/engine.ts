// Neue Person(en) im Gespräch mit der Begleitung ("X wohnt jetzt bei uns"):
// Namen bestätigen, jede Person kurz vorstellen (Rolle, bei Kindern Gruppe).
// Alles hier ist rein (ohne Speicher/Oberfläche). Freie Antworten erkennt
// ./recognize.ts (Regeln) bzw. ./ai.ts (KI). Das erste Kennenlernen ist
// `einstellungen/welcome.ts`.

import { DEFAULT_HELPER, KID_AGE_GROUP_LABELS, createPerson, fitHouseholdType, personLabel, syncPersons, usualLunch, type HouseholdProfile, type KidAgeGroup, type Person, type PersonRole } from "@/lib/einstellungen/profile";
import { extractNames, extractPersonInfo, type DietItem, type NameHint, type PersonInfo } from "@/lib/einstellungen/onboarding/recognize";

export type StepId = "members" | "confirmNames" | "personIntro" | "personRole" | "personGroup" | "done";

/** Was ein antippbarer Eintrag korrigiert */
type Target = { kind: "names" } | { kind: "person"; id: string };

type ChatMessage = { id: string; from: "helper" | "user"; text: string; target?: Target };

type Chip = { label: string; value: string; primary?: boolean };

/** Name beim Bestätigen; `id` = schon angelegte Person */
type NameEntry = NameHint & { id?: string };

type Known = { role?: boolean; group?: boolean; lunch?: boolean };

export type OnboardingState = {
  version: 1;
  /** Nur noch: später neue Person(en) per Begleitung */
  mode: "addPerson";
  step: StepId;
  draft: HouseholdProfile;
  names: NameEntry[];
  /** Personen, die noch vorgestellt werden */
  queue: string[];
  personId: string | null;
  known: Record<string, Known>;
  /** Beim Korrigieren: danach hierhin zurück */
  returnTo: StepId | null;
  messages: ChatMessage[];
  counter: number;
};

/** Von der KI erkannte Struktur (ersetzt die Regel-Erkennung) */
export type Recognized = { names?: NameHint[]; person?: PersonInfo; diet?: DietItem[] };

type Answer = { text?: string; chip?: string; recognized?: Recognized };

type Block = "members" | "persons" | "done";
const BLOCKS: Block[] = ["members", "persons", "done"];

const BLOCK_OF: Record<StepId, Block> = {
  members: "members",
  confirmNames: "members",
  personIntro: "persons",
  personRole: "persons",
  personGroup: "persons",
  done: "done",
};

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


const personById = (s: OnboardingState, id: string | null) => s.draft.persons.find((p) => p.id === id);

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
function personSummary(p: Person, persons: Person[]): string {
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
  switch (step) {
    case "members":
      return "Wie heißt die neue Person?";
    case "confirmNames":
      return "Hab ich alle richtig geschrieben?";
    case "personIntro":
      return `Erzähl mir kurz was über ${name}.`;
    case "personRole":
      return `Ist ${name} erwachsen oder ein Kind?`;
    case "personGroup":
      return `Ist ${name} noch zu Hause oder in der Krippe, in der Kita oder in der Schule?`;
    case "done":
      return "";
  }
}

/** Antwort-Chips zur aktuellen Frage */
export function chipsFor(s: OnboardingState): Chip[] {
  switch (s.step) {
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
    case "done":
      return [{ label: "Fertig ✓", value: "fertig", primary: true }];
    default:
      return [];
  }
}

export function placeholderFor(s: OnboardingState): string {
  switch (s.step) {
    case "members":
      return "z. B. Oma Rosi";
    case "confirmNames":
      return "Noch jemand? Einfach dazuschreiben";
    case "personIntro":
      return "z. B. 7, Schulkind, mag keine Pilze";
    default:
      return "Antworten oder Chip antippen …";
  }
}

/** Für welche Schritte eine KI-Erkennung lohnt (freie Antworten) */
export function aiKindFor(step: StepId): "names" | "person" | null {
  if (step === "members" || step === "confirmNames") return "names";
  if (step === "personIntro") return "person";
  return null;
}

// --- Ablauf --------------------------------------------------------------------

function goto(s: OnboardingState, step: StepId, prefix = ""): OnboardingState {
  const next = { ...s, step };
  if (step === "done") return say(next, "Alles notiert ✓ Willkommen in der Runde!");
  const q = question(next, step);
  return q ? say(next, prefix ? `${prefix} ${q}` : q) : next;
}

function startBlock(s: OnboardingState, block: Block, prefix = ""): OnboardingState {
  switch (block) {
    case "members":
      return goto(s, "members", prefix);
    case "persons": {
      if (s.queue.length === 0) return finishBlock(s, "persons");
      const [first, ...rest] = s.queue;
      return goto({ ...s, personId: first, queue: rest }, "personIntro", prefix);
    }
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
    return goto(cleared, back, "Weiter geht’s:");
  }
  return startBlock(s, BLOCKS[BLOCKS.indexOf(block) + 1] ?? "done");
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
  if (s.step === "done") return s;
  const base = { ...s, returnTo: s.returnTo ?? s.step };
  switch (target.kind) {
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
  const before = s.draft.persons;
  const known = { ...s.known };
  const created: string[] = [];
  let persons = before.map((p) => {
    const entry = s.names.find((n) => n.id === p.id);
    return entry ? { ...p, name: entry.name } : p;
  });
  for (const n of s.names.filter((x) => !x.id)) {
    const person = createPerson(n.role ?? "erwachsen");
    person.name = n.name;
    if (n.age !== undefined) {
      person.age = n.role === "kind" || n.age < 18 ? n.age : null;
      if (person.role === "kind") person.ageGroup = n.age < 3 ? "kleinkind" : n.age < 6 ? "kitakind" : "schulkind";
    }
    known[person.id] = { role: Boolean(n.role), group: person.role === "kind" && n.age !== undefined };
    created.push(person.id);
    persons = [...persons, person];
  }
  return { ...s, known, names: [], draft: { ...s.draft, persons }, queue: [...s.queue, ...created] };
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


// --- Antworten -----------------------------------------------------------------

/** Eine Antwort (Text, Chip oder KI-Erkennung) verarbeiten */
export function answer(state: OnboardingState, a: Answer): OnboardingState {
  const text = (a.text ?? "").trim();
  const chipLabel = a.chip ? chipsFor(state).find((c) => c.value === a.chip)?.label : undefined;
  const s = heard(state, chipLabel ?? text);
  const chip = a.chip;

  switch (state.step) {
    case "members": {
      const helper = s.draft.helper.name.toLowerCase();
      const existing = new Set(s.draft.persons.map((p) => p.name.toLowerCase()));
      const names = (a.recognized?.names ?? extractNames(text)).filter(
        (n) => n.name.toLowerCase() !== helper && !existing.has(n.name.toLowerCase()),
      );
      if (names.length === 0) return say(s, "Hm, da hab ich keinen Namen rausgehört. Sag mir einfach den Vornamen.");
      return goto({ ...s, names: [...s.names, ...names] }, "confirmNames");
    }
    case "confirmNames": {
      if (chip === "ok") {
        if (s.names.length === 0) return goto(s, "members");
        return finishBlock(say(applyNames(s), "Prima! 👍", { kind: "names" }), "members");
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
    case "done":
      return state;
  }
}

/** "Überspringen": aktuelle Frage mit sinnvollen Standardwerten beantworten */
export function skip(s: OnboardingState): OnboardingState {
  switch (s.step) {
    case "members":
      return { ...say(s, "Okay, dann ein andermal."), step: "done" };
    case "confirmNames":
      return answer(s, { chip: "ok" });
    case "personIntro":
      return answer(s, { chip: "weiter" });
    case "personRole":
      return answer(s, { chip: "erwachsen" });
    case "personGroup":
      return answer(s, { chip: "kitakind" });
    case "done":
      return s;
  }
}

/** Fertiges Profil aus dem Gespräch */
export function finalizeProfile(s: OnboardingState): HouseholdProfile {
  const persons = s.draft.persons.length ? s.draft.persons : [createPerson("erwachsen")];
  const adults = persons.filter((p) => p.role === "erwachsen").length;
  const kidCount = persons.filter((p) => p.role === "kind").length;
  return { ...s.draft, adults, kids: kidCount, persons: syncPersons(persons, adults, kidCount), householdType: fitHouseholdType(s.draft.householdType, persons) };
}
