// Ohne Druck & spontan: Pause per Chat ("Wir sind ab Freitag eine Woche im
// Urlaub"), Ausflugs-Snacks aus dem Vorrat und drei schnelle Ideen unter
// 20 Minuten – funktioniert alles ohne Wochenplan und ohne KI.

import { germanNumber } from "@/lib/essen/leftovers/ruleParser";
import type { Recipe, RecipeCategory } from "@/lib/essen/cookbook";
import type { PantryItem } from "@/lib/vorrat/pantry";
import type { NeverAgainEntry, PauseSettings } from "@/lib/einstellungen/profile";
import { isNeverAgain } from "@/lib/essen/neverAgain";
import { baseFromText, recipeBase, type BaseId } from "@/lib/essen/bases";
import { guessDishCategory } from "@/lib/essen/dishCategory";
import { sectionFor } from "@/lib/einkauf/shoppingList";
import { WEEKDAYS } from "@/lib/einstellungen/profile";
import { AT_HOME, DISHES, matchStock, realStock } from "@/lib/essen/dishIdeas";

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
  // Nur eine echte Abwesenheit der ganzen Familie mit Zeitangabe: "Urlaub", "verreist",
  // "Ferien" oder "sind/fahren … weg" plus "ab …"/"bis …"/Dauer. "Heute sind wir nur zu
  // zweit", "die Kinder sind nicht da" oder ein bloßes "Pause" sind KEINE Pause.
  if (/\bnur (zu )?(zweit|dritt|viert|\d)|\bweniger\b|portion|personen|rezept/.test(t)) return null;
  const absent = /(urlaub|verreist|verreisen|ferien|pause machen|eine pause)/.test(t) || /\b(wir|alle)\b.*\b(sind|fahren|fliegen)\b.*\bweg\b/.test(t);
  const when = /\b(ab|bis|vom|woche|wochen|tage|tagen|wochenende|morgen|übermorgen)\b|\d{1,2}\./.test(t);
  if (!absent || !when) return null;

  // Beginn
  let from = today;
  const abWd = t.match(new RegExp(`ab\\s+(?:nächste[nm]?\\s+)?${WD}`));
  const abDate = t.match(/ab\s+(?:dem\s+)?(\d{1,2}\.\d{1,2}\.(?:\d{2,4})?)/);
  // "übermorgen" zuerst – es enthält "morgen"
  if (/übermorgen/.test(t)) from = plus(today, 2);
  else if (/morgen/.test(t)) from = plus(today, 1);
  else if (abDate) from = dateFrom(abDate[1], today) ?? today;
  // "Ab Montag" an einem Montag = nächste Woche
  else if (abWd) from = nextWeekday(today, abWd[1], true);

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
const shortDate = (isoDate: string) => SHORT.format(new Date(`${isoDate}T12:00:00`));

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
  const items = pantry.filter((p) => SNACKY.test(p.name) || sectionFor(p.name) === "brot").map((p) => p.name).slice(0, 5);
  if (items.length === 0) return "Im Vorrat ist gerade nichts Passendes – Brezeln, Obst und Wasser gehen immer. Gute Fahrt! 🚗";
  return `Im Haus passt: ${items.join(", ")}. Dazu Wasser – und gute Fahrt! 🚗`;
}

// --- Drei schnelle Ideen -----------------------------------------------------------

export function isQuickRequest(text: string): boolean {
  return /(erst um \d|spät (heim|nach hause|zu hause)|keine zeit|schnell (was|etwas)|was schnelles|heute schnelles|(etwas|was) schnelles|schnelle (idee|sachen|gerichte)|unter 20|20 min)/i.test(text);
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
  { value: "einkauf", label: "🛒 1 Sache darf auf die Liste" },
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

/** Hat man meistens im Haus – zählt nicht als Einkauf (gemeinsam in dishIdeas.ts) */
export { AT_HOME };

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


/**
 * Drei Ideen mit dem, was da ist (Vorrat, Gekauftes, eben Gesagtes): Kochbuch,
 * Klassiker und Fertigprodukte. Zuerst die, die am meisten davon nutzen, dann
 * mit wenig Fehlendem, dann die schnellsten (mit "⚡" schnellste zuerst).
 * Reicht es ohne Einkauf nicht für drei, dürfen 1–2 Kleinigkeiten fehlen
 * (werden genannt). Leerer Vorrat → Gerichte mit Grundzutaten.
 */
export function spontanIdeas(
  recipes: Record<string, Recipe>,
  pantry: PantryItem[],
  filters: SpontanFilter[],
  neverAgain: NeverAgainEntry[],
  /** Schon gezeigte Ideen ("Andere Ideen" – keine Wiederholung) */
  exclude: string[] = [],
): SpontanIdea[] {
  const top = rankedSpontanIdeas(recipes, pantry, filters, neverAgain).filter((i) => !exclude.includes(i.id)).slice(0, 3);
  // Die drei besten – angezeigt schnellste zuerst (mit "Reste zuerst" die mit den meisten Resten)
  return filters.includes("reste") ? top : [...top].sort((a, b) => (a.minutes ?? 999) - (b.minutes ?? 999));
}

/** Alle passenden Ideen, beste zuerst (Grundlage für spontanIdeas) */
function rankedSpontanIdeas(
  recipes: Record<string, Recipe>,
  pantry: PantryItem[],
  filters: SpontanFilter[],
  neverAgain: NeverAgainEntry[],
): SpontanIdea[] {
  const fast = filters.includes("schnell");
  const allowed = filters.includes("einkauf") ? 1 : 0;
  const bases = filters.filter((f) => f.startsWith("basis:")).map((f) => f.slice(6) as BaseId);
  const byTime = (a: SpontanIdea, b: SpontanIdea) => (a.minutes ?? 999) - (b.minutes ?? 999);
  const byStock = (a: SpontanIdea, b: SpontanIdea) => b.uses.length - a.uses.length || a.extra.length - b.extra.length || byTime(a, b);
  const baseOf = (i: SpontanIdea) => (i.recipeId && recipes[i.recipeId] ? recipeBase(recipes[i.recipeId]) : baseFromText(i.title));
  const allowedIdea = (i: SpontanIdea) =>
    !isNeverAgain(i.title, neverAgain) &&
    (!fast || (i.minutes !== null && i.minutes <= 20)) &&
    (bases.length === 0 || bases.includes(baseOf(i) as BaseId));
  const stock = realStock(pantry);

  if (stock.length === 0) {
    // Leerer Vorrat: zuerst, was mit Grundzutaten meistens geht, dann der Rest
    const pool = [...DISHES.filter((d) => d.usual).sort((a, b) => a.minutes - b.minutes), ...DISHES.filter((d) => !d.usual && !d.season)];
    return pool
      .map((c) => ({ id: `k:${c.title}`, title: c.title, minutes: c.minutes, category: c.category, uses: [], extra: c.needs.filter((n) => !AT_HOME.test(n)) }))
      .filter(allowedIdea);
  }

  const check = (names: string[]) => {
    const { uses, needs } = matchStock(names, stock);
    return { uses, extra: needs };
  };
  const fromBook: SpontanIdea[] = Object.values(recipes)
    .filter((r) => r.kind !== "backen")
    .map((r) => ({ id: r.id, title: r.title, minutes: r.prepMinutes, category: r.category, recipeId: r.id, ...check(r.ingredients.map((i) => i.name)) }));
  const classics: SpontanIdea[] = DISHES.map((c) => ({ id: `k:${c.title}`, title: c.title, minutes: c.minutes, category: c.category, ...check(c.needs) }));
  // Fertigprodukte aus dem Vorrat (Tiefkühlpizza, Maultaschen …) zählen mit
  const ready: SpontanIdea[] = stock
    .filter((p) => readyMinutes(p.name) !== null)
    .map((p) => ({ id: `f:${p.name}`, title: p.name, minutes: readyMinutes(p.name), category: guessDishCategory(p.name), uses: [p.name], extra: [] }));
  const all = [...fromBook, ...classics, ...ready].filter((i) => i.uses.length > 0 && allowedIdea(i));
  const order = fast ? (a: SpontanIdea, b: SpontanIdea) => byTime(a, b) || byStock(a, b) : byStock;
  const unique = (list: SpontanIdea[]) => list.filter((i, n) => list.findIndex((o) => o.title.toLowerCase() === i.title.toLowerCase()) === n);
  const strict = unique(all.filter((i) => i.extra.length <= allowed).sort(order));
  // Danach (auch für "Andere Ideen"): 1–2 Kleinigkeiten dürfen fehlen
  const more = unique(all.filter((i) => i.extra.length > allowed && i.extra.length <= 2).sort(byStock)).filter(
    (i) => !strict.some((s) => s.title.toLowerCase() === i.title.toLowerCase()),
  );
  if (strict.length + more.length > 0) return [...strict, ...more];
  // Nie ohne Ideen: passende Gerichte, auch wenn mehr dafür nötig ist (wird genannt)
  return unique(
    [...fromBook, ...classics]
      .filter(allowedIdea)
      .sort((a, b) => a.extra.length - b.extra.length || byTime(a, b)),
  );
}

/**
 * Filter aus dem Gesagten: "Was Schnelles mit Nudeln" → ⚡ + Nudeln,
 * "Reste zuerst", "darf was fehlen". Leer, wenn nichts davon vorkommt.
 */
export function filtersFromText(text: string): SpontanFilter[] {
  const t = text.toLowerCase();
  const filters: SpontanFilter[] = [];
  if (/\bschnell(es|e|er)?\b|unter 20|fix\b|zack/.test(t)) filters.push("schnell");
  if (/\breste\b.*\bzuerst\b|\bmit (den )?resten\b|\breste verwerten\b/.test(t)) filters.push("reste");
  if (/darf (was|etwas|eine sache) fehlen|einkaufen (ist )?ok|kurz einkaufen/.test(t)) filters.push("einkauf");
  for (const id of ["kartoffeln", "reis", "nudeln", "brot", "salat"] as const) {
    const words = { kartoffeln: /kartoffel/, reis: /\breis\b/, nudeln: /nudel|pasta|spaghetti/, brot: /\bbrot\b|stulle/, salat: /\bsalat\b/ }[id];
    if (words.test(t)) filters.push(`basis:${id}`);
  }
  return filters;
}

/** Klingt wie "Ideen, aber bitte so": "Was Schnelles mit Nudeln", "Lieber was mit Reis", "Nur schnelle Sachen" */
export function isIdeaFilterRequest(text: string): boolean {
  const t = text.trim();
  return t.length <= 60 && filtersFromText(t).length > 0 && /^(was|etwas|irgendwas|lieber|nur|bitte|mit|und)\b/i.test(t) && !/einkaufsliste|auf die liste|vorrat|plan|woche|morgen|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag/i.test(t);
}
