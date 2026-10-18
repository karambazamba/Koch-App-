// Ohne Druck & spontan: Pause per Chat ("Wir sind ab Freitag eine Woche im
// Urlaub"), Ausflugs-Snacks aus dem Vorrat und drei schnelle Ideen unter
// 20 Minuten – funktioniert alles ohne Wochenplan und ohne KI.

import { germanNumber } from "./leftovers/ruleParser";
import type { Recipe } from "./cookbook";
import type { PantryItem } from "./pantry";
import { formatPantryItem } from "./pantry";
import type { NeverAgainEntry, PauseSettings } from "./profile";
import { isNeverAgain } from "./ratings";
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
