// Küchenhelfer: Werkzeuge für Claude. Lese-Werkzeuge antworten aus den
// mitgeschickten Daten, Schreib-Werkzeuge ändern NICHTS – sie merken eine
// Änderung für die Vorschau vor und wenden sie nur auf eine Arbeitskopie an,
// damit spätere Lese-Aufrufe den Vorschlag schon sehen.

import type Anthropic from "@anthropic-ai/sdk";
import { RECIPE_CATEGORIES, type RecipeCategory } from "../cookbook";
import { guessDishCategory } from "../dishCategory";
import type { SlotMeal } from "../mealPlan";
import { personLabel, WEEKDAYS, type Person } from "../profile";
import { SECTIONS, sectionFor, type Section } from "../shoppingList";
import { formatWeekRange, planForWeek } from "../weekPlan";
import { dietConflicts } from "./diet";
import {
  applyOps,
  findSlot,
  PLAN_RECIPE_PREFIX,
  weekOf,
  type AssistantData,
  type ChangeOp,
  type NewRecipe,
  type WeekChanges,
} from "./ops";

export type WeekChoice = "aktuell" | "naechste";

export type ToolContext = {
  /** Arbeitskopie inkl. aller bisher vorgeschlagenen Änderungen */
  data: AssistantData;
  weeks: Record<WeekChoice, string>;
  /** Vorschlag bisher (aus "Anpassen") und neu */
  ops: ChangeOp[];
  /** Neue Rezepte: ref → vorläufige ID in der Arbeitskopie */
  refs: Record<string, string>;
  counter: number;
};

export type ToolResult = { content: string; isError?: boolean };

const CATEGORY_VALUES = RECIPE_CATEGORIES.map((c) => c.value);
const WEEK_PROP = {
  type: "string",
  enum: ["aktuell", "naechste"],
  description: "Welche Planungswoche: die aktuelle oder die nächste",
} as const;
const DAY_PROP = { type: "string", enum: WEEKDAYS, description: "Wochentag" } as const;
const MEAL_PROP = { type: "string", enum: ["mittags", "abends"], description: "Mahlzeit" } as const;
const CATEGORY_PROP = { type: "string", enum: CATEGORY_VALUES } as const;

export const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "woche_lesen",
    description:
      "Liest eine Planungswoche: Tage mit Datum, Plätze (mittags/abends) mit eingetragenem Gericht, Kategorie-Hinweisen, Ausflugstagen, Cheat Day, Wunsch und die Vorgaben (Anzahl Fleisch/Veggie/Fisch-Tage). Bereits vorgeschlagene Änderungen sind schon enthalten. Vor jeder Änderung an einer Woche aufrufen.",
    input_schema: { type: "object", properties: { woche: WEEK_PROP }, required: ["woche"], additionalProperties: false },
  },
  {
    name: "kochbuch_durchsuchen",
    description:
      "Sucht im Kochbuch der Familie nach Titel oder Zutat, optional nach Kategorie. Liefert Rezept-IDs, Titel, Kategorie, Portionen und Zutaten. Für 'meine/unsere Rezepte' immer hier suchen; nie Rezept-IDs erfinden.",
    input_schema: {
      type: "object",
      properties: {
        suche: { type: "string", description: "Suchbegriff (leer = alle)" },
        kategorie: CATEGORY_PROP,
      },
      additionalProperties: false,
    },
  },
  {
    name: "gericht_setzen",
    description:
      "Schlägt ein Gericht für einen Platz vor (ersetzt, was dort steht). Genau eine Quelle angeben: rezept_id (aus dem Kochbuch), neues_rezept (ref aus rezept_erstellen) oder gericht (freier Text, z. B. 'Pizza vom Italiener').",
    input_schema: {
      type: "object",
      properties: {
        woche: WEEK_PROP,
        tag: DAY_PROP,
        mahlzeit: MEAL_PROP,
        rezept_id: { type: "string" },
        neues_rezept: { type: "string", description: "ref aus rezept_erstellen" },
        gericht: { type: "string", description: "Freier Text, nur wenn es kein Rezept gibt" },
        kategorie: { ...CATEGORY_PROP, description: "Nur bei freiem Text, wenn eindeutig" },
      },
      required: ["woche", "tag", "mahlzeit"],
      additionalProperties: false,
    },
  },
  {
    name: "platz_leeren",
    description: "Schlägt vor, einen Platz zu leeren (auch Gerichte aus dem Wochen-Check).",
    input_schema: {
      type: "object",
      properties: { woche: WEEK_PROP, tag: DAY_PROP, mahlzeit: MEAL_PROP },
      required: ["woche", "tag", "mahlzeit"],
      additionalProperties: false,
    },
  },
  {
    name: "gericht_verschieben",
    description: "Schlägt vor, ein Gericht auf einen anderen Platz derselben Woche zu verschieben. Ist das Ziel belegt, wird getauscht.",
    input_schema: {
      type: "object",
      properties: {
        woche: WEEK_PROP,
        von_tag: DAY_PROP,
        von_mahlzeit: MEAL_PROP,
        nach_tag: DAY_PROP,
        nach_mahlzeit: MEAL_PROP,
      },
      required: ["woche", "von_tag", "von_mahlzeit", "nach_tag", "nach_mahlzeit"],
      additionalProperties: false,
    },
  },
  {
    name: "vorgaben_aendern",
    description:
      "Schlägt Änderungen an den Vorgaben einer Woche vor (Wochen-Check): Anzahl Fleisch-/Veggie-/Fisch-Tage, Cheat Day, Ausflugstage (ganze Liste), Wunsch eines Kindes (z. B. 'Mattis wünscht sich Sonntag Milchreis') oder Wunsch entfernen. Nur angegebene Felder ändern sich.",
    input_schema: {
      type: "object",
      properties: {
        woche: WEEK_PROP,
        fleisch_tage: { type: "integer", minimum: 0, maximum: 7 },
        veggie_tage: { type: "integer", minimum: 0, maximum: 7 },
        fisch_tage: { type: "integer", minimum: 0, maximum: 7 },
        cheat_day: { type: "boolean" },
        cheat_day_tag: { type: "string", enum: [...WEEKDAYS, ""] },
        ausflugstage: { type: "array", items: DAY_PROP },
        wunsch: {
          type: "object",
          properties: {
            kind: { type: "string", description: "Name des Kindes" },
            gericht: { type: "string" },
            tag: DAY_PROP,
            mahlzeit: MEAL_PROP,
          },
          required: ["kind", "gericht", "tag", "mahlzeit"],
          additionalProperties: false,
        },
        wunsch_entfernen: { type: "boolean" },
      },
      required: ["woche"],
      additionalProperties: false,
    },
  },
  {
    name: "rezept_erstellen",
    description:
      "Erstellt ein neues, vollständiges Rezept (KI-Rezept) – Zutaten mit Mengen für die angegebene Personenzahl und Zubereitungsschritte. Allergien und 'mag nicht' aller Personen werden geprüft; bei Treffern wird abgelehnt. Gibt eine ref zurück, die du bei gericht_setzen als neues_rezept nutzt. fuer_plan=false nur, wenn das Rezept ohne Platz ins Kochbuch soll.",
    input_schema: {
      type: "object",
      properties: {
        titel: { type: "string" },
        kategorie: CATEGORY_PROP,
        portionen: { type: "integer", minimum: 1, maximum: 20 },
        zubereitungszeit_min: { type: "integer", minimum: 1, maximum: 600 },
        zutaten: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              menge: { type: ["number", "null"] },
              einheit: { type: "string", description: "g, kg, ml, l, EL, TL, Stück, Prise, Dose, Bund, Packung oder leer" },
              name: { type: "string" },
            },
            required: ["menge", "einheit", "name"],
            additionalProperties: false,
          },
        },
        schritte: { type: "array", minItems: 1, items: { type: "string" } },
        notiz: { type: "string" },
        fuer_plan: { type: "boolean" },
      },
      required: ["titel", "kategorie", "portionen", "zubereitungszeit_min", "zutaten", "schritte", "fuer_plan"],
      additionalProperties: false,
    },
  },
  {
    name: "einkaufsliste_hinzufuegen",
    description: "Schlägt Artikel für die Einkaufsliste einer Woche vor.",
    input_schema: {
      type: "object",
      properties: {
        woche: WEEK_PROP,
        artikel: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              menge: { type: "string", description: "z. B. '2 Pck.', leer erlaubt" },
              abteilung: { type: "string", enum: SECTIONS.map((s) => s.value) },
            },
            required: ["name"],
            additionalProperties: false,
          },
        },
      },
      required: ["woche", "artikel"],
      additionalProperties: false,
    },
  },
];

// --- Hilfen -----------------------------------------------------------------------

type Input = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const fail = (content: string): ToolResult => ({ content, isError: true });

function weekStartOf(ctx: ToolContext, input: Input): string | null {
  const w = input.woche;
  return w === "aktuell" || w === "naechste" ? ctx.weeks[w] : null;
}
function meal(v: unknown): SlotMeal | null {
  return v === "mittags" || v === "abends" ? v : null;
}
function day(v: unknown): string | null {
  return typeof v === "string" && WEEKDAYS.includes(v) ? v : null;
}
function category(v: unknown): RecipeCategory | null {
  return CATEGORY_VALUES.includes(v as RecipeCategory) ? (v as RecipeCategory) : null;
}

function propose(ctx: ToolContext, op: ChangeOp) {
  ctx.ops.push(op);
  const result = applyOps(ctx.data, [op], { refs: ctx.refs });
  ctx.data = result.data;
  ctx.refs = result.refs;
}
const nextId = (ctx: ToolContext) => `op-${Date.now().toString(36)}-${++ctx.counter}`;

/** Editierdistanz für Namen ("Mathis" ≈ "Mattis") */
function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** Kind über den Namen finden – auch bei leichter Abweichung (Spracheingabe) */
export function findKid(persons: Person[], name: string): Person[] {
  const kids = persons.filter((p) => p.role === "kind");
  const n = name.trim().toLowerCase();
  const exact = kids.filter((k) => k.name.trim().toLowerCase() === n || k.id === name);
  if (exact.length > 0) return exact;
  return kids.filter((k) => k.name.trim() && distance(k.name.trim().toLowerCase(), n) <= 2);
}

const dateLabel = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.`;
};

// --- Ausführen ----------------------------------------------------------------

export function runTool(ctx: ToolContext, name: string, raw: unknown): ToolResult {
  const input = (raw && typeof raw === "object" ? raw : {}) as Input;
  const { data } = ctx;
  switch (name) {
    case "woche_lesen": {
      const weekStart = weekStartOf(ctx, input);
      if (!weekStart) return fail("woche muss 'aktuell' oder 'naechste' sein.");
      const week = weekOf(data, weekStart);
      const plan = planForWeek(data.weekPlans, weekStart);
      return {
        content: JSON.stringify({
          woche: input.woche,
          zeitraum: formatWeekRange(weekStart),
          vorgaben_aus_wochen_check: Boolean(plan),
          ziel: { fleisch: week.counts.fleisch.target, veggie: week.counts.vegetarisch.target, fisch: week.counts.fisch.target },
          geplant: { fleisch: week.counts.fleisch.planned, veggie: week.counts.vegetarisch.planned, fisch: week.counts.fisch.planned },
          wunsch: plan?.wish ?? null,
          tage: week.days.map((d) => ({
            tag: d.weekday,
            datum: dateLabel(d.date),
            ausflug: d.away || undefined,
            cheat_day: d.cheat || undefined,
            plaetze: d.away
              ? []
              : d.slots.map((s) => ({
                  mahlzeit: s.meal,
                  gericht: s.entry?.title ?? null,
                  kategorie: s.entry?.category ?? undefined,
                  rezept_id: s.entry?.recipeId,
                  herkunft: s.entry ? { eigen: "eingetragen", fest: "fest (Wochen-Check)", wunsch: "Wunsch" }[s.entry.origin] : undefined,
                  hinweis: !s.entry && s.hint ? s.hint : undefined,
                })),
          })),
        }),
      };
    }

    case "kochbuch_durchsuchen": {
      const q = str(input.suche).toLowerCase();
      const cat = category(input.kategorie);
      const list = Object.values(data.recipes)
        .filter((r) => !cat || r.category === cat)
        .filter((r) => !q || r.title.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.toLowerCase().includes(q)))
        .slice(0, 40)
        .map((r) => ({
          rezept_id: r.id,
          titel: r.title,
          kategorie: r.category,
          portionen: r.servings,
          zutaten: r.ingredients.map((i) => i.name).join(", "),
          favorit: r.favorite || undefined,
          gekocht: r.cookedCount || undefined,
        }));
      return { content: JSON.stringify({ treffer: list.length, rezepte: list }) };
    }

    case "gericht_setzen": {
      const weekStart = weekStartOf(ctx, input);
      const weekday = day(input.tag);
      const m = meal(input.mahlzeit);
      if (!weekStart || !weekday || !m) return fail("woche, tag und mahlzeit angeben.");
      const week = weekOf(data, weekStart);
      if (week.days.find((d) => d.weekday === weekday)?.away) {
        return fail(`${weekday} ist ein Ausflugstag. Erst mit vorgaben_aendern den Ausflug entfernen oder einen anderen Tag wählen.`);
      }
      const slot = { weekStart, weekday, meal: m };
      const sources = [input.rezept_id, input.neues_rezept, input.gericht].filter((v) => str(v)).length;
      if (sources !== 1) return fail("Genau eine Quelle angeben: rezept_id, neues_rezept oder gericht.");
      let warning = "";
      if (str(input.rezept_id)) {
        const recipe = data.recipes[str(input.rezept_id)];
        if (!recipe) return fail("Unbekannte rezept_id – erst mit kochbuch_durchsuchen suchen.");
        const conflicts = dietConflicts(recipe.title, recipe.ingredients.map((i) => i.name), data.profile.persons);
        if (conflicts.length > 0) {
          warning = ` Achtung, bitte erwähnen: ${conflicts.map((c) => `${c.person} – ${c.kind} ${c.term} (${c.found})`).join("; ")}.`;
        }
        propose(ctx, {
          id: nextId(ctx),
          type: "set_meal",
          slot,
          dish: { kind: "recipe", recipeId: recipe.id, title: recipe.title, category: recipe.category },
        });
        return { content: `Vorgemerkt: ${weekday} ${m} – ${recipe.title}.${warning}` };
      }
      if (str(input.neues_rezept)) {
        const ref = str(input.neues_rezept);
        const created = ctx.ops.find((op): op is Extract<ChangeOp, { type: "add_recipe" }> => op.type === "add_recipe" && op.recipe.ref === ref);
        if (!created) return fail("Unbekannte ref – erst rezept_erstellen aufrufen.");
        propose(ctx, {
          id: nextId(ctx),
          type: "set_meal",
          slot,
          dish: { kind: "new_recipe", ref, title: created.recipe.title, category: created.recipe.category },
        });
        return { content: `Vorgemerkt: ${weekday} ${m} – ${created.recipe.title} (neues Rezept).` };
      }
      const title = str(input.gericht);
      const cat = category(input.kategorie) ?? guessDishCategory(title, Object.values(data.recipes));
      propose(ctx, { id: nextId(ctx), type: "set_meal", slot, dish: { kind: "text", title, category: cat } });
      return { content: `Vorgemerkt: ${weekday} ${m} – ${title}.` };
    }

    case "platz_leeren": {
      const weekStart = weekStartOf(ctx, input);
      const weekday = day(input.tag);
      const m = meal(input.mahlzeit);
      if (!weekStart || !weekday || !m) return fail("woche, tag und mahlzeit angeben.");
      const slot = findSlot(weekOf(data, weekStart), weekday, m);
      if (!slot?.entry) return fail(`${weekday} ${m} ist schon leer.`);
      propose(ctx, { id: nextId(ctx), type: "clear_slot", slot: { weekStart, weekday, meal: m } });
      return { content: `Vorgemerkt: ${weekday} ${m} leeren (${slot.entry.title}).` };
    }

    case "gericht_verschieben": {
      const weekStart = weekStartOf(ctx, input);
      const fromDay = day(input.von_tag);
      const fromMeal = meal(input.von_mahlzeit);
      const toDay = day(input.nach_tag);
      const toMeal = meal(input.nach_mahlzeit);
      if (!weekStart || !fromDay || !fromMeal || !toDay || !toMeal) return fail("Alle Angaben zu von/nach nötig.");
      const week = weekOf(data, weekStart);
      const from = findSlot(week, fromDay, fromMeal);
      if (!from?.entry) return fail(`${fromDay} ${fromMeal} ist leer – nichts zu verschieben.`);
      if (week.days.find((d) => d.weekday === toDay)?.away) return fail(`${toDay} ist ein Ausflugstag.`);
      const to = findSlot(week, toDay, toMeal);
      propose(ctx, {
        id: nextId(ctx),
        type: "move_meal",
        from: { weekStart, weekday: fromDay, meal: fromMeal },
        to: { weekStart, weekday: toDay, meal: toMeal },
      });
      return {
        content: to?.entry
          ? `Vorgemerkt: ${from.entry.title} und ${to.entry.title} tauschen.`
          : `Vorgemerkt: ${from.entry.title} auf ${toDay} ${toMeal} verschieben.`,
      };
    }

    case "vorgaben_aendern": {
      const weekStart = weekStartOf(ctx, input);
      if (!weekStart) return fail("woche angeben.");
      const changes: WeekChanges = {};
      const count = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 7 ? v : undefined);
      if (input.fleisch_tage !== undefined) changes.meatDays = count(input.fleisch_tage);
      if (input.veggie_tage !== undefined) changes.vegetarianDays = count(input.veggie_tage);
      if (input.fisch_tage !== undefined) changes.fishDays = count(input.fisch_tage);
      for (const k of ["meatDays", "vegetarianDays", "fishDays"] as const) if (changes[k] === undefined) delete changes[k];
      if (typeof input.cheat_day === "boolean") changes.cheatDay = input.cheat_day;
      if (typeof input.cheat_day_tag === "string" && (input.cheat_day_tag === "" || day(input.cheat_day_tag))) {
        changes.cheatDayWeekday = input.cheat_day_tag;
        if (input.cheat_day_tag) changes.cheatDay = true;
      }
      if (Array.isArray(input.ausflugstage)) {
        changes.awayDays = [...new Set(input.ausflugstage.map(day).filter((d): d is string => Boolean(d)))];
      }
      if (input.wunsch_entfernen === true) changes.wish = null;
      if (input.wunsch && typeof input.wunsch === "object") {
        const w = input.wunsch as Input;
        const kids = findKid(data.profile.persons, str(w.kind));
        const weekday = day(w.tag);
        const m = meal(w.mahlzeit);
        if (kids.length === 0) {
          const names = data.profile.persons.filter((p) => p.role === "kind").map((p) => personLabel(p, data.profile.persons));
          return fail(`Kein Kind namens "${str(w.kind)}". Kinder im Profil: ${names.join(", ") || "keine"}. Nachfragen.`);
        }
        if (kids.length > 1) return fail(`Name nicht eindeutig (${kids.map((k) => k.name).join(", ")}). Nachfragen.`);
        if (!weekday || !m) return fail("Für den Wunsch tag und mahlzeit angeben.");
        changes.wish = { kidId: kids[0].id, text: str(w.gericht), weekday, meal: m };
      }
      const current = weekOf(data, weekStart).counts;
      const total =
        (changes.meatDays ?? current.fleisch.target) + (changes.vegetarianDays ?? current.vegetarisch.target) + (changes.fishDays ?? current.fisch.target);
      if (total > 7) return fail(`Zusammen ${total} Tage – mehr als 7. Andere Anzahl verringern.`);
      if (Object.keys(changes).length === 0) return fail("Keine Änderung angegeben.");
      propose(ctx, { id: nextId(ctx), type: "update_week", weekStart, changes });
      return { content: `Vorgemerkt: Vorgaben geändert (${Object.keys(changes).join(", ")}).` };
    }

    case "rezept_erstellen": {
      const title = str(input.titel);
      const cat = category(input.kategorie);
      const zutaten = Array.isArray(input.zutaten) ? (input.zutaten as Input[]) : [];
      const schritte = Array.isArray(input.schritte) ? input.schritte.map(str).filter(Boolean) : [];
      if (!title || !cat || zutaten.length === 0 || schritte.length === 0) {
        return fail("Vollständiges Rezept nötig: titel, kategorie, zutaten, schritte.");
      }
      const ingredients = zutaten
        .map((z) => ({
          amount: typeof z.menge === "number" && z.menge > 0 ? z.menge : null,
          unit: str(z.einheit),
          name: str(z.name),
        }))
        .filter((z) => z.name);
      const conflicts = dietConflicts(title, ingredients.map((i) => i.name), data.profile.persons);
      if (conflicts.length > 0) {
        return fail(
          `Abgelehnt – verstößt gegen: ${conflicts.map((c) => `${c.person}: ${c.kind} "${c.term}" (gefunden: ${c.found})`).join("; ")}. Rezept ohne diese Zutaten neu erstellen.`,
        );
      }
      const forPlan = input.fuer_plan !== false;
      const recipe: NewRecipe = {
        ref: `${forPlan ? PLAN_RECIPE_PREFIX : "rezept-"}${++ctx.counter}`,
        title,
        category: cat,
        servings: typeof input.portionen === "number" ? Math.round(input.portionen) : data.profile.persons.length,
        prepMinutes: typeof input.zubereitungszeit_min === "number" ? Math.round(input.zubereitungszeit_min) : null,
        ingredients,
        steps: schritte,
        note: str(input.notiz),
      };
      propose(ctx, { id: nextId(ctx), type: "add_recipe", recipe });
      return { content: `Rezept vorgemerkt, ref: ${recipe.ref}` };
    }

    case "einkaufsliste_hinzufuegen": {
      const weekStart = weekStartOf(ctx, input);
      const artikel = Array.isArray(input.artikel) ? (input.artikel as Input[]) : [];
      if (!weekStart || artikel.length === 0) return fail("woche und artikel angeben.");
      const names: string[] = [];
      for (const a of artikel.slice(0, 30)) {
        const itemName = str(a.name);
        if (!itemName) continue;
        const section = SECTIONS.some((s) => s.value === a.abteilung) ? (a.abteilung as Section) : sectionFor(itemName);
        propose(ctx, { id: nextId(ctx), type: "add_shopping", weekStart, name: itemName, amount: str(a.menge), section });
        names.push(itemName);
      }
      return { content: `Vorgemerkt für die Einkaufsliste: ${names.join(", ")}.` };
    }

    default:
      return fail(`Unbekanntes Werkzeug ${name}.`);
  }
}
