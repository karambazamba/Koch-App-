// Küchenhelfer: Grundlagen der Werkzeuge für Claude. Lese-Werkzeuge antworten
// aus den mitgeschickten Daten, Schreib-Werkzeuge ändern NICHTS – sie merken
// eine Änderung für die Vorschau vor und wenden sie nur auf eine Arbeitskopie
// an, damit spätere Lese-Aufrufe den Vorschlag schon sehen. Die Werkzeuge
// selbst stehen je Bereich in eigenen Dateien (planTools, cookbookTools,
// shoppingTools, pantryTools, calendarTools …), angemeldet in toolset.ts.

import type { Forecast } from "@/lib/wetter/forecast";
import type { TipView } from "@/lib/tipps/model";
import type { MailDraft } from "@/lib/begleitung/mail";
import { RECIPE_CATEGORIES, type RecipeCategory } from "@/lib/essen/cookbook";
import { WEEKDAYS, type Person } from "@/lib/einstellungen/profile";
import { addDays } from "@/lib/essen/weekPlan";
import { applyOps, type AssistantData, type ChangeOp } from "@/lib/begleitung/ops";

type WeekChoice = "aktuell" | "naechste";

export type ToolContext = {
  /** Arbeitskopie inkl. aller bisher vorgeschlagenen Änderungen */
  data: AssistantData;
  weeks: Record<WeekChoice, string>;
  /** Vorschlag bisher (aus "Anpassen") und neu */
  ops: ChangeOp[];
  /** Neue Rezepte: ref → vorläufige ID in der Arbeitskopie */
  refs: Record<string, string>;
  counter: number;
  /** Heute auf dem Gerät, "YYYY-MM-DD" (für Termine) */
  today: string;
  /** Mail-Entwurf für die Karte im Chat (`mail_entwurf`) */
  mail?: MailDraft;
  /** Antwort-Knöpfe unter der Nachricht (`antwort_knoepfe`) */
  chips?: string[];
  /** Wettervorhersage für den Wetter-Ort (vorab geholt, wenn nach dem Wetter gefragt wird) */
  forecast?: Forecast | null;
  /** Tipps aus der Region im Umkreis (vorab geholt, wenn danach gefragt wird; null = keine Quelle) */
  regionTips?: TipView[] | null;
  /** Bis zu 3 Tipps als Karten unter der Antwort (`tipps_suchen`) */
  tipCards?: TipView[];
};

export type ToolResult = { content: string; isError?: boolean };

// --- Gemeinsame Schema-Bausteine ------------------------------------------------

const CATEGORY_VALUES = RECIPE_CATEGORIES.map((c) => c.value);
export const WEEK_PROP = {
  type: "string",
  enum: ["aktuell", "naechste"],
  description: "Welche Planungswoche: die aktuelle oder die nächste",
} as const;
export const CATEGORY_PROP = { type: "string", enum: CATEGORY_VALUES } as const;

// --- Hilfen -----------------------------------------------------------------------

export type Input = Record<string, unknown>;
export const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
export const fail = (content: string): ToolResult => ({ content, isError: true });
/** Eingabe des Modells als Objekt (sonst leer) */
export const toolInput = (raw: unknown) => (raw && typeof raw === "object" ? raw : {}) as Input;

export function weekStartOf(ctx: ToolContext, input: Input): string | null {
  const w = input.woche;
  return w === "aktuell" || w === "naechste" ? ctx.weeks[w] : null;
}
export function category(v: unknown): RecipeCategory | null {
  return CATEGORY_VALUES.includes(v as RecipeCategory) ? (v as RecipeCategory) : null;
}

export function propose(ctx: ToolContext, op: ChangeOp) {
  ctx.ops.push(op);
  const result = applyOps(ctx.data, [op], { refs: ctx.refs });
  ctx.data = result.data;
  ctx.refs = result.refs;
}
export const nextId = (ctx: ToolContext) => `op-${Date.now().toString(36)}-${++ctx.counter}`;

/** Editierdistanz für Namen ("Mathis" ≈ "Mattis") */
function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** Person über den Namen finden – auch bei leichter Abweichung (Spracheingabe) */
export function findPersons(persons: Person[], name: string): Person[] {
  const n = name.trim().toLowerCase();
  const exact = persons.filter((k) => k.name.trim().toLowerCase() === n || k.id === name);
  if (exact.length > 0) return exact;
  return persons.filter((k) => k.name.trim() && distance(k.name.trim().toLowerCase(), n) <= 2);
}

/** Nächstes Datum (ab heute) für "heute", "morgen" oder einen Wochentag */
export function dateForDay(today: string, tag: string): string | null {
  if (tag === "heute") return today;
  if (tag === "morgen") return addDays(today, 1);
  const index = WEEKDAYS.indexOf(tag);
  if (index < 0) return null;
  // WEEKDAYS beginnt mit Montag; getUTCDay: 0 = Sonntag
  const current = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(today, (index - current + 7) % 7);
}
