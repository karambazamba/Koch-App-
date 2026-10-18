// Ohne Druck & spontan: Pause per Chat ("Wir sind ab Freitag eine Woche im
// Urlaub"), Ausflugs-Snacks aus dem Vorrat und drei schnelle Ideen unter
// 20 Minuten – funktioniert alles ohne Wochenplan und ohne KI.

import { germanNumber } from "./leftovers/ruleParser";
import type { Recipe, RecipeCategory } from "./cookbook";
import type { PantryItem } from "./pantry";
import { formatPantryItem, sameIngredient } from "./pantry";
import type { NeverAgainEntry, PauseSettings } from "./profile";
import { isNeverAgain } from "./ratings";
import { baseFromText, recipeBase, type BaseId } from "./bases";
import { guessDishCategory } from "./dishCategory";
import { sectionFor } from "./shoppingList";
import { WEEKDAYS } from "./profile";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plus = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
const weekdayIndex = (name: string) => WEEKDAYS.findIndex((w) => w.toLowerCase() === name.toLowerCase()); // Montag = 0
const jsToIndex = (d: Date) => (d.getDay() + 6) % 7;

/** Nächster solcher Wochentag ab `from` (heute zählt) */
function nextWeekday(from: Date, name: string, strictlyAfter = false): Date {
  const target = weekdayIndex(name);
  let diff = (target - jsToIndex(from) + 7) % 7;
  if (strictlyAfter && diff === 0) diff = 7;
  return plus(from, diff);
}

/** "24.10." / "24.10.2026" → Datum (ohne Jahr: nächstes Vorkommen) */
function dateFrom(text: string, today: Date): Date | null {
  const m = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})?/);
  if (!m) return null;
  const year = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : today.getFullYear();
  let d = new Date(year, Number(m[2]) - 1, Number(m[1]), 12);
  if (!m[3] && d < plus(today, -1)) d = new Date(year + 1, Number(m[2]) - 1, Number(m[1]), 12);
  return d;
}

const WD = "(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)";

/**
 * "Wir sind ab Freitag eine Woche im Urlaub" → Pause; "Wir sind wieder da"
 * → Pause beenden. Sonst null.
 */
export function parsePauseRequest(text: string, today: Date): { kind: "start"; pause: PauseSettings } | { kind: "end" } | null {
  const t = text.toLowerCase();
  if (/(wieder da|wieder zu hause|zurück aus dem urlaub|urlaub ist vorbei|pause beenden|pause vorbei)/.test(t)) return { kind: "end" };
  // "weg" nur mit "sind/fahren/fliegen" – "Wir müssen heute weg" ist keine Pause
  if (!/(urlaub|verreist|verreisen|pause|nicht da\b|nicht zu hause|ferien)/.test(t) && !/\b(sind|fahren|fliegen|tage?|wochen?|ab)\b.*\bweg\b/.test(t)) return null;

  // Beginn
  let from = today;
  const abWd = t.match(new RegExp(`ab\\s+(?:nächste[nm]?\\s+)?${WD}`));
  const abDate = t.match(/ab\s+(?:dem\s+)?(\d{1,2}\.\d{1,2}\.(?:\d{2,4})?)/);
  if (/ab morgen|morgen/.test(t)) from = plus(today, 1);
  else if (/übermorgen/.test(t)) from = plus(today, 2);
  else if (abDate) from = dateFrom(abDate[1], today) ?? today;
  else if (abWd) from = nextWeekday(today, abWd[1]);

  // Ende
  let until: Date | null = null;
  const bisWd = t.match(new RegExp(`bis\\s+(?:zum\\s+|nächste[nm]?\\s+)?${WD}`));
  const bisDate = t.match(/bis\s+(?:zum\s+)?(\d{1,2}\.\d{1,2}\.(?:\d{2,4})?)/);
  const dur = t.match(/(\d+|eine?n?|zwei|drei|vier)\s+(woche|wochen|tag|tage|tagen)/);
  if (bisDate) until = dateFrom(bisDate[1], today);
  else if (bisWd) until = nextWeekday(from, bisWd[1], true);
  else if (dur) {
    const word = dur[1];
    const n = /^\d+$/.test(word) ? Number(word) : /^ein/.test(word) ? 1 : (germanNumber(word) ?? 1);
    const daysCount = dur[2].startsWith("woche") ? n * 7 : n;
    until = plus(from, daysCount - 1);
  } else if (/(übers|über das|am) wochenende/.test(t)) {
    from = nextWeekday(today, "Samstag");
    until = plus(from, 1);
  }
  return { kind: "start", pause: { from: iso(from), until: until && until >= from ? iso(until) : null } };
}

const SHORT = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "numeric" });
export const shortDate = (isoDate: string) => SHORT.format(new Date(`${isoDate}T12:00:00`));

/** "Pause von Fr., 23.10. bis Do., 29.10." */
export function pauseLabel(pause: PauseSettings): string {
  return pause.until ? `von ${shortDate(pause.from)} bis ${shortDate(pause.until)}` : `ab ${shortDate(pause.from)}`;
}

// --- Ausflugs-Snacks -------------------------------------------------------------

export function isSnackRequest(text: string): boolean {
  return /(was nehmen wir mit|was können wir mitnehmen|snacks?\b.*(ausflug|unterwegs|fahrt)|(ausflug|unterwegs|losfahren|fahren .*los|spontan los).*(mit|snack|essen))/i.test(text);
}

const SNACKY = /apfel|äpfel|banane|birne|traube|mandarine|clementine|beere|möhre|karotte|gurke|paprika|tomate|kohlrabi|käse|brot|brötchen|brezel|laugen|nüsse|mandel|rosine|cracker|kekse|joghurt|riegel|wasser|saft|ei(er)?$/i;

/** Snacks aus dem Vorrat für unterwegs */
export function snackReply(pantry: PantryItem[]): string {
  const items = pantry.filter((p) => SNACKY.test(p.name) || sectionFor(p.name) === "brot").map(formatPantryItem).slice(0, 5);
  if (items.length === 0) return "Im Vorrat ist gerade nichts Passendes – Brezeln, Obst und Wasser gehen immer. Gute Fahrt! 🚗";
  return `Aus dem Vorrat passt: ${items.join(", ")}. Dazu Wasser – und gute Fahrt! 🚗`;
}

// --- Drei schnelle Ideen -----------------------------------------------------------

export function isQuickRequest(text: string): boolean {
  return /(erst um \d|spät (heim|nach hause|zu hause)|keine zeit|schnell (was|etwas)|was schnelles|unter 20|20 min)/i.test(text);
}

const QUICK_FALLBACK = ["Rührei mit Brot", "Nudeln mit Pesto", "Wraps mit Gemüse", "Ofen-Baguette", "Tomatensuppe mit Toast"];

/** Drei Ideen unter 20 Minuten: zuerst aus dem Kochbuch, sonst einfache Klassiker */
export function quickIdeas(recipes: Record<string, Recipe>, neverAgain: NeverAgainEntry[]): string[] {
  const fromBook = Object.values(recipes)
    .filter((r) => r.prepMinutes !== null && r.prepMinutes <= 20 && !isNeverAgain(r.title, neverAgain))
    .sort((a, b) => b.thumbsUp - a.thumbsUp || (a.prepMinutes ?? 0) - (b.prepMinutes ?? 0))
    .map((r) => r.title);
  const ideas = [...fromBook, ...QUICK_FALLBACK.filter((f) => !isNeverAgain(f, neverAgain))];
  // Gleiche Gerichte (Kochbuch + Klassiker) nur einmal
  return ideas.filter((t, i) => ideas.findIndex((o) => o.toLowerCase() === t.toLowerCase()) === i).slice(0, 3);
}

/** Verderbliches im Vorrat (für "vor der Pause aufbrauchen") */
export function perishables(pantry: PantryItem[]): string[] {
  return pantry.filter((p) => ["obst-gemuese", "kuehlregal", "fleisch-fisch", "brot"].includes(sectionFor(p.name))).map((p) => p.name).slice(0, 4);
}

// --- Spontan kochen: mit dem, was da ist ------------------------------------------

/** Filter-Chips; "basis:<id>" = nur mit dieser Basis (mehrere = eine davon) */
export type SpontanFilter = "schnell" | "reste" | "einkauf" | `basis:${BaseId}`;

export const SPONTAN_FILTERS: { value: SpontanFilter; label: string }[] = [
  { value: "schnell", label: "⚡ unter 20 Min" },
  { value: "reste", label: "♻️ Reste zuerst" },
  { value: "einkauf", label: "🛒 1 Sache darf fehlen" },
];

export type SpontanIdea = {
  /** Rezept-ID, "k:<Titel>" für einen Klassiker, "f:<Name>" für ein Fertigprodukt aus dem Vorrat */
  id: string;
  title: string;
  minutes: number | null;
  category: RecipeCategory | null;
  recipeId?: string;
  /** Genutzte Sachen aus dem Vorrat */
  uses: string[];
  /** Was noch geholt werden müsste (höchstens 1, nur mit Filter) */
  extra: string[];
};

/** Hat man meistens im Haus – zählt nicht als Einkauf */
const AT_HOME = /^(salz|pfeffer|öl|olivenöl|rapsöl|wasser|zucker|mehl|essig|butter|brühe|gemüsebrühe|gewürze?|zwiebeln?|knoblauch|knoblauchzehen?|tomatenmark|senf|ketchup|kräuter|petersilie|schnittlauch|paprikapulver|currypulver|curry|muskat|oregano|basilikum|thymian|zimt|backpulver|honig|sojasoße|sojasauce|lorbeer\w*)$/i;

/** Einfache Klassiker, die oft mit dem gehen, was da ist */
const CLASSICS: { title: string; minutes: number; needs: string[]; category: RecipeCategory }[] = [
  { title: "Rührei mit Brot", minutes: 10, needs: ["Eier", "Brot"], category: "vegetarisch" },
  { title: "Käsebrot mit Rohkost", minutes: 10, needs: ["Brot", "Käse"], category: "vegetarisch" },
  { title: "Grießbrei", minutes: 10, needs: ["Grieß", "Milch"], category: "vegetarisch" },
  { title: "Nudeln mit Pesto", minutes: 15, needs: ["Nudeln", "Pesto"], category: "vegetarisch" },
  { title: "Omelett mit Gemüse", minutes: 15, needs: ["Eier", "Paprika"], category: "vegetarisch" },
  { title: "Wraps mit Gemüse", minutes: 15, needs: ["Wraps", "Paprika"], category: "vegetarisch" },
  { title: "Ofen-Baguette", minutes: 15, needs: ["Baguette", "Käse"], category: "vegetarisch" },
  { title: "Tomatensuppe mit Toast", minutes: 15, needs: ["Tomaten", "Toast"], category: "vegetarisch" },
  { title: "Nudeln mit Tomatensoße", minutes: 20, needs: ["Nudeln", "Tomaten"], category: "vegetarisch" },
  { title: "Pfannkuchen", minutes: 20, needs: ["Eier", "Milch"], category: "vegetarisch" },
  { title: "Gemüsepfanne mit Reis", minutes: 25, needs: ["Reis", "Möhren"], category: "vegetarisch" },
  { title: "Bratkartoffeln mit Spiegelei", minutes: 25, needs: ["Kartoffeln", "Eier"], category: "vegetarisch" },
  { title: "Kartoffelsuppe", minutes: 30, needs: ["Kartoffeln", "Möhren"], category: "vegetarisch" },
  { title: "Milchreis", minutes: 30, needs: ["Reis", "Milch"], category: "vegetarisch" },
];

/** Fertigprodukte im Vorrat – sind selbst schon eine Idee (Minuten grob) */
const READY: { words: RegExp; minutes: number }[] = [
  { words: /pizza|flammkuchen/i, minutes: 15 },
  { words: /fischstäbchen|chicken nuggets|nuggets|kroketten|pommes|rösti/i, minutes: 20 },
  { words: /maultasche|tortellini|ravioli|gnocchi|schupfnudel/i, minutes: 10 },
  { words: /fertig|tütensuppe|dosensuppe|ravioli in|eintopf.*dose|tk-|tiefkühl.*(gericht|pfanne)|gemüsepfanne tk|lasagne tk|tk lasagne/i, minutes: 15 },
];

function readyMinutes(name: string): number | null {
  return READY.find((r) => r.words.test(name))?.minutes ?? null;
}

/** Ohne Vorrat: schnelle Klassiker, die meistens gehen */
const USUALLY_THERE = ["Rührei mit Brot", "Nudeln mit Tomatensoße", "Pfannkuchen", "Käsebrot mit Rohkost", "Nudeln mit Pesto"];

/**
 * Drei Ideen mit dem, was da ist: Kochbuch und Klassiker, ohne Einkauf
 * (Filter "einkauf": eine Sache darf fehlen), schnellste zuerst bzw. mit
 * "reste" die mit den meisten Resten. Leerer Vorrat → Klassiker, die meistens
 * gehen.
 */
export function spontanIdeas(
  recipes: Record<string, Recipe>,
  pantry: PantryItem[],
  filters: SpontanFilter[],
  neverAgain: NeverAgainEntry[],
): SpontanIdea[] {
  const fast = filters.includes("schnell");
  const allowed = filters.includes("einkauf") ? 1 : 0;
  const bases = filters.filter((f) => f.startsWith("basis:")).map((f) => f.slice(6) as BaseId);
  const byTime = (a: SpontanIdea, b: SpontanIdea) => (a.minutes ?? 999) - (b.minutes ?? 999);
  const baseOf = (i: SpontanIdea) => (i.recipeId && recipes[i.recipeId] ? recipeBase(recipes[i.recipeId]) : baseFromText(i.title));
  const allowedIdea = (i: SpontanIdea) =>
    !isNeverAgain(i.title, neverAgain) &&
    (!fast || (i.minutes !== null && i.minutes <= 20)) &&
    (bases.length === 0 || bases.includes(baseOf(i) as BaseId));

  if (pantry.length === 0) {
    const pool = bases.length ? CLASSICS : CLASSICS.filter((c) => USUALLY_THERE.includes(c.title));
    return pool
      .map((c) => ({ id: `k:${c.title}`, title: c.title, minutes: c.minutes, category: c.category, uses: [], extra: [] }))
      .filter(allowedIdea)
      .sort(byTime)
      .slice(0, 3);
  }

  const check = (names: string[]) => {
    const needed = names.filter((n) => n.trim() && !AT_HOME.test(n.trim()));
    const uses = pantry.filter((p) => needed.some((n) => sameIngredient(n, p.name))).map((p) => p.name);
    const extra = needed.filter((n) => !pantry.some((p) => sameIngredient(n, p.name)));
    return { uses, extra };
  };
  const fromBook: SpontanIdea[] = Object.values(recipes).map((r) => ({
    id: r.id,
    title: r.title,
    minutes: r.prepMinutes,
    category: r.category,
    recipeId: r.id,
    ...check(r.ingredients.map((i) => i.name)),
  }));
  const classics: SpontanIdea[] = CLASSICS.map((c) => ({ id: `k:${c.title}`, title: c.title, minutes: c.minutes, category: c.category, ...check(c.needs) }));
  // Fertigprodukte aus dem Vorrat (Tiefkühlpizza, Maultaschen …) zählen mit
  const ready: SpontanIdea[] = pantry
    .filter((p) => readyMinutes(p.name) !== null)
    .map((p) => ({ id: `f:${p.name}`, title: p.name, minutes: readyMinutes(p.name), category: guessDishCategory(p.name), uses: [p.name], extra: [] }));
  const ideas = [...fromBook, ...classics, ...ready].filter((i) => i.uses.length > 0 && i.extra.length <= allowed && allowedIdea(i));
  const sorted = filters.includes("reste")
    ? ideas.sort((a, b) => b.uses.length - a.uses.length || byTime(a, b))
    : ideas.sort((a, b) => byTime(a, b) || b.uses.length - a.uses.length);
  // Gleiche Titel (Kochbuch + Klassiker) nur einmal
  return sorted.filter((i, n) => sorted.findIndex((o) => o.title.toLowerCase() === i.title.toLowerCase()) === n).slice(0, 3);
}
