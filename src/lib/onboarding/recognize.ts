// Kennenlernen: Regel-Erkennung freier Antworten (ohne KI). Die KI-Variante
// liefert dieselben Strukturen (siehe ./ai.ts) – austauschbar.

import { recognizeFood } from "../leftovers/foods";
import { germanNumber } from "../leftovers/ruleParser";
import { COMMON_ALLERGIES, WEEKDAYS, type KidAgeGroup, type MealTime, type PersonRole, type WeekdayLunch } from "../profile";

export type PersonInfo = {
  role?: PersonRole;
  age?: number;
  ageGroup?: KidAgeGroup;
  lunch?: WeekdayLunch;
  allergies: string[];
  dislikes: string[];
};

export type NameHint = { name: string; role?: PersonRole; age?: number };

export type DietItem = { person: string | null; kind: "Allergie" | "mag nicht"; term: string };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// --- Füllwörter (Spracheingabe) -------------------------------------------------

// Wortgrenzen selbst prüfen – \b kennt in JavaScript keine Umlaute
const SPEECH_FILLERS = /(?<![a-zäöüß])(ähm|äh+|öhm|öh+|hm+|mhm|also|halt|eigentlich|irgendwie|sozusagen|quasi)(?![a-zäöüß])[,]?\s*/gi;

/** Typische Füllwörter gesprochener Antworten entfernen */
export function cleanSpeech(text: string): string {
  return text.replace(SPEECH_FILLERS, "").replace(/\s{2,}/g, " ").trim();
}

// --- Zahlen, Ja/Nein, Wochentage, Zeiten ---------------------------------------

/** Erste Zahl im Text (Ziffern oder Zahlwort) */
export function firstNumber(text: string): number | null {
  for (const word of text.toLowerCase().split(/[^a-zäöüß0-9]+/).filter(Boolean)) {
    if (/^\d{1,3}$/.test(word)) return Number(word);
    const n = germanNumber(word);
    if (n !== null && Number.isInteger(n) && n > 0 && !["ein", "eine", "einen", "einer", "einem"].includes(word)) return n;
  }
  return null;
}

export function yesNo(text: string): boolean | null {
  const t = text.toLowerCase();
  if (/\b(nein|nö|ne|nee|kein|keine|lieber nicht|nicht nötig|brauchen wir nicht)\b/.test(t)) return false;
  if (/\b(ja|jo|jep|gern|gerne|klar|okay|ok|genau|unbedingt|auf jeden fall|sicher)\b/.test(t)) return true;
  return null;
}

const SHORT_DAYS: Record<string, string> = { mo: "Montag", di: "Dienstag", mi: "Mittwoch", do: "Donnerstag", fr: "Freitag", sa: "Samstag", so: "Sonntag" };

/** Alle genannten Wochentage in Reihenfolge ("samstags", "Sa" …) */
export function weekdaysIn(text: string): string[] {
  const found: string[] = [];
  const re = /\b(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)s?\b|\b(mo|di|mi|do|fr|sa|so)\b\.?/gi;
  for (const m of text.matchAll(re)) {
    const day = m[1] ? cap(m[1].toLowerCase()) : SHORT_DAYS[m[2].toLowerCase()];
    if (day && WEEKDAYS.includes(day) && !found.includes(day)) found.push(day);
  }
  return found;
}

/** "unter der Woche abends, am Wochenende mittags" → beides; sonst eine Zeit */
export function mealTimes(text: string): { weekday?: MealTime; weekend?: MealTime; any?: MealTime } {
  const t = text.toLowerCase();
  const timeIn = (s: string): MealTime | undefined => (/mittag/.test(s) ? "mittags" : /abend/.test(s) ? "abends" : undefined);
  const weekendPart = t.match(/(wochenende|samstag|sonntag|sa\b|so\b)[^,.;]*/)?.[0] ?? "";
  const weekdayPart = t.match(/(unter der woche|wochentag|werktag|mo\s*[–-]\s*fr|montag bis freitag)[^,.;]*/)?.[0] ?? "";
  return { weekday: timeIn(weekdayPart), weekend: timeIn(weekendPart), any: timeIn(t) };
}

// --- Namen ---------------------------------------------------------------------

const ADULT_WORDS = /^(ich|mama|mami|mutter|papa|papi|vater|oma|omi|opa|opi|mann|frau|ehemann|ehefrau|partner|partnerin|freund|freundin|erwachsen|erwachsene|erwachsener|tante|onkel|schwiegermutter|schwiegervater)$/;
const KID_WORDS = /^(kind|kinder|sohn|söhne|tochter|töchter|baby|babys|kleine|kleiner|kleinen|zwillinge|enkel|enkelin|enkelkind|nachwuchs|kids|jungs|mädchen|junge)$/;

/** Wörter, die keine Vornamen sind */
const NOT_NAMES = new Set([
  "ich", "wir", "du", "er", "sie", "es", "und", "oder", "mit", "mein", "meine", "meiner", "meinem", "meinen", "unser", "unsere", "unserer",
  "unseren", "die", "der", "das", "den", "dem", "ein", "eine", "einer", "auch", "noch", "sind", "bin", "ist", "heiße", "heißt", "heißen",
  "also", "familie", "jahre", "jahr", "alt", "plus", "sowie", "dann", "klar", "genau", "ja", "nein", "bei", "uns", "essen", "isst", "esse",
  "außerdem", "zusammen", "alle", "allen", "hund", "katze", "haustier", "schule", "kita", "kindergarten", "krippe", "arbeit", "büro",
  "zuhause", "hause", "woche", "wochenende", "das", "wäre", "wären", "hier", "da", "manchmal", "immer", "meistens", "natürlich", "so",
  "halt", "okay", "gut", "noch", "nicht", "kein", "keine", "mag", "mögen", "allergisch", "gegen", "aus", "von", "für", "zur", "zum",
  ...WEEKDAYS.map((d) => d.toLowerCase()),
]);

/**
 * Namen aus einer Antwort wie "Ich bin Lisa, mein Mann Felix und unsere
 * Kinder Mattis (7) und Ella" – mit Rollen- und Altershinweisen.
 */
export function extractNames(text: string): NameHint[] {
  const words = [...text.matchAll(/[A-Za-zÄÖÜäöüßéèáàëï][A-Za-zÄÖÜäöüßéèáàëï'-]*|\d{1,2}/g)].map((m) => m[0]);
  const anyCapital = words.some((w) => /^[A-ZÄÖÜ]/.test(w) && !NOT_NAMES.has(w.toLowerCase()));
  const result: NameHint[] = [];
  let context: PersonRole | undefined;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const lower = w.toLowerCase();
    if (ADULT_WORDS.test(lower)) {
      context = "erwachsen";
      continue;
    }
    if (KID_WORDS.test(lower)) {
      context = "kind";
      continue;
    }
    if (/^\d+$/.test(w)) {
      const last = result[result.length - 1];
      if (last && last.age === undefined && words[i - 1] === last.name) {
        last.age = Number(w);
        if (last.age < 18) last.role = "kind";
      }
      continue;
    }
    if (NOT_NAMES.has(lower) || ADULT_WORDS.test(lower) || KID_WORDS.test(lower)) continue;
    if (anyCapital && !/^[A-ZÄÖÜ]/.test(w)) continue;
    if (w.length < 2) continue;
    // Lebensmittel sind keine Namen ("Pizza")
    const food = recognizeFood(w);
    if (food.known && food.match?.exact) continue;
    const name = cap(w);
    if (result.some((r) => r.name.toLowerCase() === name.toLowerCase())) continue;
    result.push({ name, role: context });
  }
  return result;
}

// --- Angaben zu einer Person -------------------------------------------------------

const ALLERGY_CANON: [RegExp, string][] = [
  [/^gluten|^weizen/, "Gluten"],
  [/^laktose|^milchzucker|^milch/, "Laktose"],
  [/^erdnu/, "Erdnüsse"],
  [/n(u|ü)(ss|ß)|^mandel|^cashew|^pistazie/, "Nüsse"],
  [/^ei(er)?$|^hühnerei/, "Ei"],
  [/^meeresfr|^garnele|^krabbe|^muschel|^shrimp/, "Meeresfrüchte"],
  [/^fisch/, "Fisch"],
  [/^soja/, "Soja"],
  [/^sellerie/, "Sellerie"],
  [/^senf/, "Senf"],
  [/^sesam/, "Sesam"],
];

function canonicalAllergy(term: string): string {
  const t = term.toLowerCase();
  return ALLERGY_CANON.find(([re]) => re.test(t))?.[1] ?? cap(term);
}

/** "keine Pilze und keine Zwiebeln" → ["Pilze", "Zwiebeln"] */
function terms(fragment: string): string[] {
  return fragment
    .split(/,|\bund\b|\boder\b|\bsowie\b|\/|\bauch\b/i)
    .map((s) => s.replace(/\b(kein|keine|keinen|keiner|keinem|so|gar|wirklich|überhaupt|nicht|gern|gerne|sehr|leider|mehr|richtig)\b/gi, "").trim())
    .map((s) => s.replace(/^(die|der|das|den)\s+/i, "").trim())
    .filter((s) => s.length > 1 && s.split(/\s+/).length <= 3)
    .map(cap);
}

const STOP_AT = "(?=[.;!?]|\\bund (?:ist|isst|mag|hat|geht|wird)|\\baber\\b|$)";

export function extractDiet(text: string): { allergies: string[]; dislikes: string[] } {
  const allergies: string[] = [];
  const dislikes: string[] = [];
  const add = (list: string[], items: string[]) => items.forEach((i) => !list.some((x) => x.toLowerCase() === i.toLowerCase()) && list.push(i));
  const t = text.replace(/\s+/g, " ");
  // Allergien
  for (const m of t.matchAll(new RegExp(`allergi\\w*\\s+(?:gegen|auf)\\s+(.+?)${STOP_AT}`, "gi"))) add(allergies, terms(m[1]).map(canonicalAllergy));
  for (const m of t.matchAll(new RegExp(`(?:verträgt|verträgst|vertragen)\\s+(?:kein\\w*\\s+)?(.+?)(?:\\s+nicht)?${STOP_AT}`, "gi"))) add(allergies, terms(m[1]).map(canonicalAllergy));
  for (const m of t.matchAll(/(\w+?)[-\s]?(?:allergie|unverträglichkeit|intoleranz)\b/gi)) {
    if (!/^(eine|keine|die|ne|hat)$/i.test(m[1])) add(allergies, [canonicalAllergy(m[1])]);
  }
  for (const m of t.matchAll(/\b(laktose|gluten)\s*(?:frei|intolerant|unverträglich)/gi)) add(allergies, [canonicalAllergy(m[1])]);
  // Mag nicht
  for (const m of t.matchAll(new RegExp(`(?:mag|mögen|isst|essen|hasst|hassen|verabscheut)\\s+(?:gar\\s+|überhaupt\\s+)?kein\\w*\\s+(.+?)${STOP_AT}`, "gi"))) add(dislikes, terms(m[1]));
  for (const m of t.matchAll(new RegExp(`(?:mag|mögen)\\s+(?!kein)(.+?)\\s+(?:gar\\s+|überhaupt\\s+)?nicht${STOP_AT}`, "gi"))) add(dislikes, terms(m[1]));
  for (const m of t.matchAll(new RegExp(`(?:hasst|hassen)\\s+(?!kein)(.+?)${STOP_AT}`, "gi"))) add(dislikes, terms(m[1]));
  // Allergene nicht doppelt als "mag nicht"
  return { allergies, dislikes: dislikes.filter((d) => !allergies.some((a) => a.toLowerCase() === d.toLowerCase())) };
}

/** Rolle, Alter, Gruppe, Mittagessen, Allergien und Abneigungen aus einer Vorstellung */
export function extractPersonInfo(text: string): PersonInfo {
  const t = ` ${text.toLowerCase()} `;
  const info: PersonInfo = { ...extractDiet(text) };
  const words = t.split(/[^a-zäöüß0-9]+/).filter(Boolean);

  // Alter: "7", "7 Jahre", "sieben Jahre alt"
  const ageMatch = t.match(/\b(\d{1,2})\s*(?:jahre?|j\b|jährig)/) ?? t.match(/\bist\s+(\d{1,2})\b/) ?? t.match(/^\s*(\d{1,2})\b/);
  if (ageMatch) info.age = Number(ageMatch[1]);
  else {
    const w = t.match(/\b([a-zäöüß]+)\s+jahre?\b/);
    const n = w ? germanNumber(w[1]) : null;
    if (n && Number.isInteger(n)) info.age = n;
  }

  // Rolle
  if (words.some((w) => ADULT_WORDS.test(w)) || /\b(arbeitet|arbeite|büro|homeoffice|beruf|job|rentner|rentnerin)\b/.test(t)) info.role = "erwachsen";
  if (words.some((w) => KID_WORDS.test(w)) || /\b(kita|kindergarten|krippe|schule|schulkind|klasse|grundschule|gymnasium|hort)\b/.test(t)) info.role = "kind";
  if (info.age !== undefined) info.role = info.age < 18 ? "kind" : "erwachsen";

  // Gruppe bei Kindern
  if (info.role === "kind") {
    if (/\b(krippe|baby|kleinkind|tagesmutter)\b/.test(t)) info.ageGroup = "kleinkind";
    else if (/\b(kita|kindergarten)\b/.test(t)) info.ageGroup = "kitakind";
    else if (/\b(schule|schulkind|klasse|grundschule|gymnasium|realschule|gesamtschule)\b/.test(t)) info.ageGroup = "schulkind";
    else if (info.age !== undefined) info.ageGroup = info.age < 3 ? "kleinkind" : info.age < 6 ? "kitakind" : "schulkind";
  }

  // Mittagessen unter der Woche
  if (/\b(manchmal|ab und zu|mal so|teils|unterschiedlich)\b/.test(t) && /mittag|essen|isst/.test(t)) info.lunch = "manchmal";
  else if (/\b(zu hause|zuhause|daheim|homeoffice)\b/.test(t)) info.lunch = "zuhause";
  else if (/\b(auswärts|kantine|mensa|in der schule|in der kita|im kindergarten|im hort|bei der arbeit|im büro|auf der arbeit)\b/.test(t)) info.lunch = "auswaerts";
  return info;
}

/** Allergien/Abneigungen mehreren Personen zuordnen ("Ella mag keine Pilze, Felix ist allergisch gegen Nüsse") */
export function extractDietItems(text: string, names: string[]): DietItem[] {
  const lower = text.toLowerCase();
  const marks = names
    .flatMap((n) =>
      [...lower.matchAll(new RegExp(`(?<![a-zäöüß])${n.toLowerCase()}(?![a-zäöüß])`, "g"))].map((m) => ({ name: n, at: m.index ?? 0 })),
    )
    .sort((a, b) => a.at - b.at);
  const segments = marks.length
    ? marks.map((m, i) => ({ person: m.name as string | null, text: text.slice(m.at, marks[i + 1]?.at ?? text.length) }))
    : [{ person: null, text }];
  return segments.flatMap((s) => {
    const d = extractDiet(s.text);
    return [
      ...d.allergies.map((term) => ({ person: s.person, kind: "Allergie" as const, term })),
      ...d.dislikes.map((term) => ({ person: s.person, kind: "mag nicht" as const, term })),
    ];
  });
}

/** "Nenn mich Oma Hilde" → "Oma Hilde" */
export function extractHelperName(text: string): string {
  return cap(
    text
      .replace(/^(nenn|nenne)\s+(dich|mich)\s+/i, "")
      .replace(/^(du\s+heißt|du\s+sollst\s+heißen|heiß|heiße|wie wäre es mit|vielleicht|wie wär's mit)\s+/i, "")
      .replace(/[.!?"„“]/g, "")
      .trim(),
  );
}

/** "Wir sind die Müllers" → "Müller" */
export function extractHouseholdName(text: string): string {
  let t = text.replace(/[.!?"„“]/g, "").trim();
  t = t.replace(/^(wir\s+sind|wir\s+heißen|das\s+sind|hier\s+sind)\s+/i, "").replace(/^(familie)\s+/i, "");
  const plural = t.match(/^die\s+([A-ZÄÖÜ][a-zäöüß]+)s$/);
  if (plural) return plural[1];
  return cap(t.replace(/^(die|der)\s+/i, "").replace(/^familie\s+/i, ""));
}

/** "3 mal Fleisch, 1 Fisch" → Zahlen; fehlende Zahlen bleiben leer */
export function extractWeekCounts(text: string): { meat?: number; fish?: number; veggie?: number } {
  const t = text.toLowerCase();
  // "einmal", "zweimal" → 1, 2
  const num = (w: string) => (/^\d$/.test(w) ? Number(w) : germanNumber(w.replace(/mal$/, "") === "ein" ? "eins" : w.replace(/mal$/, "")));
  const near = (key: string) => {
    const before = t.match(new RegExp(`(\\d|[a-zäöüß]+)\\s*(?:mal|x|×)?\\s*(?:die woche\\s*)?${key}`));
    const after = t.match(new RegExp(`${key}\\w*\\s*(\\d|[a-zäöüß]+)\\s*(?:mal|x|×)`));
    for (const m of [before, after]) {
      const n = m ? num(m[1]) : null;
      if (n !== null && n >= 0 && n <= 7) return n;
    }
    return undefined;
  };
  return { meat: near("fleisch"), fish: near("fisch"), veggie: near("veg") };
}

export const ALLERGY_CHIPS = COMMON_ALLERGIES;

// --- Neue Person beim Küchenhelfer ---------------------------------------------

const ADD_PERSON =
  /(neue[rns]? (person|mitesser\w*|familienmitglied)|wohnt (jetzt |ab jetzt |seit \w+ )?(auch )?bei uns|zieht (bei uns )?ein|isst (ab jetzt|jetzt|ab sofort|künftig|neuerdings) (auch )?(bei uns )?mit|(person|kind|jemand\w*|mitesser\w*) (hinzufügen|dazu)|füg\w* .*(person|familie|haushalt|profil)|dazugekommen|zuwachs|(ist|wurde) geboren)/i;
const NOT_PERSON = /einkauf|liste|rezept|kochbuch|wochenplan|gericht/i;

/** "Oma Rosi wohnt jetzt bei uns" → neue Person im Haushalt? */
export function isAddPersonRequest(text: string): boolean {
  return ADD_PERSON.test(text) && !NOT_PERSON.test(text);
}
