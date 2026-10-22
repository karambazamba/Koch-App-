// Gemeinsame Hilfen für die Werkzeug-Tests der Begleitung: ein kleiner
// Haushalt (Felix, Lisa, Mathis), eine Arbeitskopie und ein Aufruf über das
// Register – so wie die Engine die Werkzeuge ausführt. (Keine Test-Datei.)
import { createEntry } from "@/lib/core/entries";
import { createEmptyProfile, createPerson, type HouseholdProfile } from "@/lib/einstellungen/profile";
import type { AufgabeData, CalendarEntry, TerminData } from "@/lib/kalender/model";
import type { AssistantData } from "@/lib/begleitung/ops";
import type { ToolContext } from "@/lib/begleitung/tools";
import { runRegisteredTool } from "@/lib/begleitung/toolset";
import type { Recipe } from "@/lib/essen/cookbook";

/** Mittwoch, 21.10.2026 – Einkaufstag Montag */
export const HEUTE = "2026-10-21";
export const WOCHEN = { aktuell: "2026-10-19", naechste: "2026-10-26" };

export function haushalt(): HouseholdProfile {
  const base = createEmptyProfile();
  const felix = { ...createPerson("erwachsen"), id: "p-felix", name: "Felix" };
  const lisa = { ...createPerson("erwachsen"), id: "p-lisa", name: "Lisa", dislikes: ["Pilze"] };
  const mathis = { ...createPerson("kind"), id: "p-mathis", name: "Mathis", allergies: ["Nüsse"], age: 8 };
  return { ...base, householdName: "Müller", persons: [felix, lisa, mathis], adults: 2, kids: 1 };
}

export function rezept(id: string, title: string, zutaten: string[], extra: Partial<Recipe> = {}): Recipe {
  return {
    id,
    title,
    category: "vegetarisch",
    servings: 4,
    prepMinutes: 25,
    ingredients: zutaten.map((name, i) => ({ id: `${id}-${i}`, amount: 200, unit: "g", name })),
    steps: ["Wasser aufsetzen.", "Kochen."],
    note: "",
    source: "eigenes",
    ai: null,
    favorite: false,
    thumbsUp: 0,
    thumbsDown: 0,
    cookedCount: 0,
    lastCookedAt: null,
    known: true,
    kind: "kochen",
    oven: null,
    pan: "",
    kidSteps: [],
    machineSteps: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...extra,
  };
}

export function daten(extra: Partial<AssistantData> = {}): AssistantData {
  return { profile: haushalt(), weekPlans: {}, mealPlans: {}, recipes: {}, shopping: {}, ...extra };
}

export function kontext(extra: Partial<AssistantData> = {}, more: Partial<ToolContext> = {}): ToolContext {
  return { data: daten(extra), weeks: { ...WOCHEN }, ops: [], refs: {}, counter: 0, today: HEUTE, ...more };
}

/** Werkzeug über das Register ausführen (wie die Engine) */
export const rufe = (ctx: ToolContext, name: string, input: unknown = {}) => runRegisteredTool(ctx, name, input);

/** Letzte vorgemerkte Änderung */
export const letzte = (ctx: ToolContext) => ctx.ops[ctx.ops.length - 1];

export const termin = (data: Partial<TerminData> & { title: string; date: string; start: string }, raum: "familie" | "arbeit" = "familie") =>
  createEntry("termin", { reminder: "aus", ...data }, { raum }) as CalendarEntry;

export const aufgabe = (data: Partial<AufgabeData> & { title: string }) => createEntry("aufgabe", { reminder: "aus", ...data }, { raum: "familie" }) as CalendarEntry;
