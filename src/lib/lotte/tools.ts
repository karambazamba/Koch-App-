// Küchenhelfer: Werkzeuge für Claude. Lese-Werkzeuge antworten aus den
// mitgeschickten Daten, Schreib-Werkzeuge ändern NICHTS – sie merken eine
// Änderung für die Vorschau vor und wenden sie nur auf eine Arbeitskopie an,
// damit spätere Lese-Aufrufe den Vorschlag schon sehen.

import type { MailDraft } from "./mail";
import { recipeBase } from "../essen/bases";
import { isNeverAgain } from "../essen/ratings";
import type Anthropic from "@anthropic-ai/sdk";
import { RECIPE_CATEGORIES, type RecipeCategory } from "../essen/cookbook";
import { guessDishCategory } from "../essen/dishCategory";
import { recipeIsKnown } from "../essen/dishStatus";
import { PANTRY_PLACES, placeFor, type PantryPlace } from "../essen/pantry";
import { personLabel, WEEKDAYS, type Person } from "../einstellungen/profile";
import { SECTIONS, sectionFor, type Section } from "../einkauf/shoppingList";
import { addDays, formatWeekRange, planForWeek } from "../essen/weekPlan";
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
  /** Heute auf dem Gerät, "YYYY-MM-DD" (für Termine) */
  today: string;
  /** Mail-Entwurf für die Karte im Chat (`mail_entwurf`) */
  mail?: MailDraft;
  /** Antwort-Knöpfe unter der Nachricht (`antwort_knoepfe`) */
  chips?: string[];
};

export type ToolResult = { content: string; isError?: boolean };

const CATEGORY_VALUES = RECIPE_CATEGORIES.map((c) => c.value);
const WEEK_PROP = {
  type: "string",
  enum: ["aktuell", "naechste"],
  description: "Welche Planungswoche: die aktuelle oder die nächste",
} as const;
const DAY_PROP = { type: "string", enum: WEEKDAYS, description: "Wochentag" } as const;
const CATEGORY_PROP = { type: "string", enum: CATEGORY_VALUES } as const;

export const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "woche_lesen",
    description:
      "Liest eine Planungswoche: je Tag Datum, das eine Hauptgericht (oder frei mit Kategorie-Hinweis), ob doppelt gekocht wird, Reste vom Vortag, Notiz, Essenszeit und Personenzahl, dazu Ausflugstage, Cheat Day, Wunsch und die Vorgaben (Anzahl Fleisch/Veggie/Fisch-Tage). Bereits vorgeschlagene Änderungen sind schon enthalten. Vor jeder Änderung an einer Woche aufrufen.",
    input_schema: { type: "object", properties: { woche: WEEK_PROP }, required: ["woche"], additionalProperties: false },
  },
  {
    name: "kochbuch_durchsuchen",
    description:
      "Sucht im Kochbuch der Familie nach Titel oder Zutat, optional nach Kategorie. Liefert Rezept-IDs, Titel, Kategorie, Portionen, Zutaten, Zubereitungszeit (minuten) und ob die Familie das Gericht kennt (bekannt). Für 'meine/unsere Rezepte' immer hier suchen; nie Rezept-IDs erfinden.",
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
      "Schlägt das Hauptgericht für einen Tag vor (ersetzt, was dort steht). Genau eine Quelle angeben: rezept_id (aus dem Kochbuch), neues_rezept (ref aus rezept_erstellen) oder gericht (freier Text, z. B. 'Pizza vom Italiener'). doppelt_kochen=true: doppelte Menge, am nächsten Tag gibt es die Reste.",
    input_schema: {
      type: "object",
      properties: {
        woche: WEEK_PROP,
        tag: DAY_PROP,
        rezept_id: { type: "string" },
        neues_rezept: { type: "string", description: "ref aus rezept_erstellen" },
        gericht: { type: "string", description: "Freier Text, nur wenn es kein Rezept gibt" },
        kategorie: { ...CATEGORY_PROP, description: "Nur bei freiem Text, wenn eindeutig" },
        doppelt_kochen: { type: "boolean" },
      },
      required: ["woche", "tag"],
      additionalProperties: false,
    },
  },
  {
    name: "platz_leeren",
    description: "Schlägt vor, das Hauptgericht eines Tages zu entfernen (auch Gerichte aus dem Wochen-Check).",
    input_schema: {
      type: "object",
      properties: { woche: WEEK_PROP, tag: DAY_PROP },
      required: ["woche", "tag"],
      additionalProperties: false,
    },
  },
  {
    name: "doppelt_kochen",
    description: "Schaltet für das Gericht eines Tages 'Doppelt kochen – Reste für morgen' an oder aus (doppelte Mengen, am Folgetag Reste als zweite Mahlzeit).",
    input_schema: {
      type: "object",
      properties: { woche: WEEK_PROP, tag: DAY_PROP, an: { type: "boolean" } },
      required: ["woche", "tag", "an"],
      additionalProperties: false,
    },
  },
  {
    name: "gericht_verschieben",
    description: "Schlägt vor, ein Gericht auf einen anderen Tag derselben Woche zu verschieben. Ist der Tag belegt, wird getauscht.",
    input_schema: {
      type: "object",
      properties: { woche: WEEK_PROP, von_tag: DAY_PROP, nach_tag: DAY_PROP },
      required: ["woche", "von_tag", "nach_tag"],
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
          },
          required: ["kind", "gericht", "tag"],
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
      "Erstellt ein neues, vollständiges Rezept (KI-Rezept) – Zutaten mit Mengen für die angegebene Personenzahl (siehe 'personen' des Tages in woche_lesen) und Zubereitungsschritte. Allergien und 'mag nicht' aller Personen werden geprüft; bei Treffern wird abgelehnt. Gibt eine ref zurück, die du bei gericht_setzen als neues_rezept nutzt. fuer_plan=false nur, wenn das Rezept ohne Platz ins Kochbuch soll.",
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
    description:
      "Schlägt Artikel für die Einkaufsliste einer Woche vor. Zutaten für Gerichte im Wochenplan kommen automatisch auf die Liste – hier nur Zusätzliches. fuer_tag (heute, morgen oder Wochentag) und gericht merken, wofür der Artikel ist; Artikel für heute stehen oben unter \"Für heute\".",
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
              fuer_tag: { type: "string", enum: ["heute", "morgen", ...WEEKDAYS], description: "Für welchen Tag (optional)" },
              gericht: { type: "string", description: "Für welches Gericht (optional)" },
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
  {
    name: "vorrat_hinzufuegen",
    description:
      "Schlägt vor, Sachen in den Vorrat einzutragen (z. B. 'Ich hab 4 Portionen Chili eingefroren' → Chili, 4, Portionen, tiefkuehler). Ort: kuehlschrank, tiefkuehler oder schrank (Vorratsschrank); ohne Angabe wählt die App den naheliegenden.",
    input_schema: {
      type: "object",
      properties: {
        sachen: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              menge: { type: ["number", "null"] },
              einheit: { type: "string", description: "z. B. g, Portionen, Becher; leer = Stück" },
              ort: { type: "string", enum: PANTRY_PLACES.map((p) => p.value) },
            },
            required: ["name"],
            additionalProperties: false,
          },
        },
      },
      required: ["sachen"],
      additionalProperties: false,
    },
  },
  {
    name: "wunsch_merken",
    description:
      "Merkt einen Essenswunsch ohne festen Tag ('Mathis wünscht sich Pfannkuchen'). Er steht dann ganz oben bei den Ideen für heute. Mit festem Tag in einer geplanten Woche stattdessen vorgaben_aendern mit wunsch.",
    input_schema: {
      type: "object",
      properties: {
        person: { type: "string", description: "Name der Person, die sich das wünscht" },
        gericht: { type: "string" },
      },
      required: ["person", "gericht"],
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
function day(v: unknown): string | null {
  return typeof v === "string" && WEEKDAYS.includes(v) ? v : null;
}
function category(v: unknown): RecipeCategory | null {
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

/** Kind über den Namen finden */
export function findKid(persons: Person[], name: string): Person[] {
  return findPersons(
    persons.filter((p) => p.role === "kind"),
    name,
  );
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
            ausflug: (d.away && !d.paused) || undefined,
            pause: d.paused || undefined,
            wochenende: d.weekend ?? undefined,
            cheat_day: d.cheat || undefined,
            essenszeit: d.mealTime,
            personen: d.persons ?? undefined,
            gericht: d.away ? undefined : (d.slot.entry?.title ?? null),
            kategorie: d.slot.entry?.category ?? undefined,
            rezept_id: d.slot.entry?.recipeId,
            herkunft: d.slot.entry ? { eigen: "eingetragen", fest: "fest (Wochen-Check)", wunsch: "Wunsch" }[d.slot.entry.origin] : undefined,
            doppelt_kochen: d.slot.entry?.double || undefined,
            reste_vom_vortag: d.leftovers ?? undefined,
            notiz: d.note || undefined,
            hinweis: !d.away && !d.slot.entry && d.slot.hint ? d.slot.hint : undefined,
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
          bekannt: recipeIsKnown(r),
          minuten: r.prepMinutes ?? undefined,
          gekocht: r.cookedCount || undefined,
          daumen_hoch: r.thumbsUp || undefined,
          basis: recipeBase(r) ?? undefined,
        }));
      return { content: JSON.stringify({ treffer: list.length, rezepte: list }) };
    }

    case "gericht_setzen": {
      const weekStart = weekStartOf(ctx, input);
      const weekday = day(input.tag);
      if (!weekStart || !weekday) return fail("woche und tag angeben.");
      const week = weekOf(data, weekStart);
      if (week.days.find((d) => d.weekday === weekday)?.away) {
        return fail(`${weekday} ist ein Ausflugstag. Erst mit vorgaben_aendern den Ausflug entfernen oder einen anderen Tag wählen.`);
      }
      const slot = { weekStart, weekday };
      const double = input.doppelt_kochen === true ? { double: true } : {};
      const doubleNote = input.doppelt_kochen === true ? " (doppelt – Reste für morgen)" : "";
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
          ...double,
        });
        return { content: `Vorgemerkt: ${weekday} – ${recipe.title}${doubleNote}.${warning}` };
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
          ...double,
        });
        return { content: `Vorgemerkt: ${weekday} – ${created.recipe.title} (neues Rezept)${doubleNote}.` };
      }
      const title = str(input.gericht);
      if (isNeverAgain(title, data.profile.neverAgain)) return fail(`"${title}" steht auf der Nie-wieder-Liste – etwas anderes wählen.`);
      const cat = category(input.kategorie) ?? guessDishCategory(title, Object.values(data.recipes));
      propose(ctx, { id: nextId(ctx), type: "set_meal", slot, dish: { kind: "text", title, category: cat }, ...double });
      return { content: `Vorgemerkt: ${weekday} – ${title}${doubleNote}.` };
    }

    case "platz_leeren": {
      const weekStart = weekStartOf(ctx, input);
      const weekday = day(input.tag);
      if (!weekStart || !weekday) return fail("woche und tag angeben.");
      const slot = findSlot(weekOf(data, weekStart), weekday);
      if (!slot?.entry) return fail(`${weekday} ist schon frei.`);
      propose(ctx, { id: nextId(ctx), type: "clear_slot", slot: { weekStart, weekday } });
      return { content: `Vorgemerkt: ${weekday} leeren (${slot.entry.title}).` };
    }

    case "doppelt_kochen": {
      const weekStart = weekStartOf(ctx, input);
      const weekday = day(input.tag);
      if (!weekStart || !weekday || typeof input.an !== "boolean") return fail("woche, tag und an angeben.");
      const slot = findSlot(weekOf(data, weekStart), weekday);
      if (!slot?.entry) return fail(`${weekday} hat noch kein Gericht.`);
      propose(ctx, { id: nextId(ctx), type: "set_double", slot: { weekStart, weekday }, double: input.an });
      return { content: `Vorgemerkt: ${slot.entry.title} am ${weekday} ${input.an ? "doppelt kochen – Reste für morgen" : "nicht mehr doppelt kochen"}.` };
    }

    case "gericht_verschieben": {
      const weekStart = weekStartOf(ctx, input);
      const fromDay = day(input.von_tag);
      const toDay = day(input.nach_tag);
      if (!weekStart || !fromDay || !toDay) return fail("woche, von_tag und nach_tag angeben.");
      const week = weekOf(data, weekStart);
      const from = findSlot(week, fromDay);
      if (!from?.entry) return fail(`${fromDay} ist frei – nichts zu verschieben.`);
      if (week.days.find((d) => d.weekday === toDay)?.away) return fail(`${toDay} ist ein Ausflugstag.`);
      const to = findSlot(week, toDay);
      propose(ctx, {
        id: nextId(ctx),
        type: "move_meal",
        from: { weekStart, weekday: fromDay },
        to: { weekStart, weekday: toDay },
      });
      return {
        content: to?.entry
          ? `Vorgemerkt: ${from.entry.title} und ${to.entry.title} tauschen.`
          : `Vorgemerkt: ${from.entry.title} auf ${toDay} verschieben.`,
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
        if (kids.length === 0) {
          const names = data.profile.persons.filter((p) => p.role === "kind").map((p) => personLabel(p, data.profile.persons));
          return fail(`Kein Kind namens "${str(w.kind)}". Kinder im Profil: ${names.join(", ") || "keine"}. Nachfragen.`);
        }
        if (kids.length > 1) return fail(`Name nicht eindeutig (${kids.map((k) => k.name).join(", ")}). Nachfragen.`);
        if (!weekday) return fail("Für den Wunsch den tag angeben.");
        changes.wish = { kidId: kids[0].id, text: str(w.gericht), weekday };
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
      if (isNeverAgain(title, data.profile.neverAgain)) {
        return fail(`Abgelehnt – "${title}" steht auf der Nie-wieder-Liste. Etwas deutlich anderes erstellen.`);
      }
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
        const forDay = str(a.fuer_tag) ? dateForDay(ctx.today, str(a.fuer_tag)) : null;
        const day = forDay ? WEEKDAYS[(new Date(`${forDay}T00:00:00Z`).getUTCDay() + 6) % 7] : undefined;
        propose(ctx, { id: nextId(ctx), type: "add_shopping", weekStart, name: itemName, amount: str(a.menge), section, ...(day ? { day } : {}), ...(str(a.gericht) ? { dish: str(a.gericht) } : {}) });
        names.push(itemName);
      }
      return { content: `Vorgemerkt für die Einkaufsliste: ${names.join(", ")}.` };
    }

    case "vorrat_hinzufuegen": {
      const sachen = Array.isArray(input.sachen) ? (input.sachen as Input[]) : [];
      const names: string[] = [];
      for (const item of sachen.slice(0, 20)) {
        const itemName = str(item.name);
        if (!itemName) continue;
        const place = PANTRY_PLACES.some((p) => p.value === item.ort) ? (item.ort as PantryPlace) : placeFor(itemName);
        const amount = typeof item.menge === "number" && item.menge > 0 ? item.menge : null;
        propose(ctx, { id: nextId(ctx), type: "add_pantry", name: itemName, amount, unit: str(item.einheit), place });
        names.push(itemName);
      }
      if (names.length === 0) return fail("sachen mit name angeben.");
      return { content: `Vorgemerkt für den Vorrat: ${names.join(", ")}.` };
    }

    case "wunsch_merken": {
      const who = str(input.person);
      const dish = str(input.gericht);
      if (!who || !dish) return fail("person und gericht angeben.");
      if (isNeverAgain(dish, data.profile.neverAgain)) return fail(`"${dish}" steht auf der Nie-wieder-Liste – freundlich nachfragen.`);
      const found = findPersons(data.profile.persons, who);
      const person = found.length === 1 ? found[0] : null;
      const label = person ? personLabel(person, data.profile.persons) : who;
      propose(ctx, { id: nextId(ctx), type: "add_wish", personId: person?.id ?? null, who: label, dish });
      return { content: `Vorgemerkt: Wunsch von ${label} – ${dish}.` };
    }

    default:
      return fail(`Unbekanntes Werkzeug ${name}.`);
  }
}
