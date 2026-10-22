// Lotte: Werkzeuge für den Wochenplan (Bereich "essen") – Woche lesen,
// Gericht setzen, Platz leeren, doppelt kochen, verschieben, Vorgaben der
// Woche ändern und Essenswünsche merken. Schreib-Werkzeuge liefern nur
// Vorschläge mit "Übernehmen".

import { isNeverAgain } from "../essen/neverAgain";
import { guessDishCategory } from "../essen/dishCategory";
import { personLabel, WEEKDAYS, type Person } from "../einstellungen/profile";
import { formatWeekRange, planForWeek } from "../essen/weekPlan";
import { dietConflicts } from "./diet";
import { findSlot, weekOf, type ChangeOp, type WeekChanges } from "./ops";
import type { LotteTool } from "./registry";
import { category, CATEGORY_PROP, fail, findPersons, nextId, propose, str, toolInput, WEEK_PROP, weekStartOf, type Input } from "./tools";

const DAY_PROP = { type: "string", enum: WEEKDAYS, description: "Wochentag" } as const;

function day(v: unknown): string | null {
  return typeof v === "string" && WEEKDAYS.includes(v) ? v : null;
}

/** Kind über den Namen finden */
function findKid(persons: Person[], name: string): Person[] {
  return findPersons(
    persons.filter((p) => p.role === "kind"),
    name,
  );
}

const dateLabel = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.`;
};

export const PLAN_TOOLS = {
  woche_lesen: {
    area: "essen",
    definition: {
      name: "woche_lesen",
      description:
        "Liest eine Planungswoche: je Tag Datum, das eine Hauptgericht (oder frei mit Kategorie-Hinweis), ob doppelt gekocht wird, Reste vom Vortag, Notiz, Essenszeit und Personenzahl, dazu Ausflugstage, Cheat Day, Wunsch und die Vorgaben (Anzahl Fleisch/Veggie/Fisch-Tage). Bereits vorgeschlagene Änderungen sind schon enthalten. Vor jeder Änderung an einer Woche aufrufen.",
      input_schema: { type: "object", properties: { woche: WEEK_PROP }, required: ["woche"], additionalProperties: false },
    },
    run: (ctx, raw) => {
      const input = toolInput(raw);
      const { data } = ctx;
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
    },
  },
  gericht_setzen: {
    area: "essen",
    definition: {
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
    run: (ctx, raw) => {
      const input = toolInput(raw);
      const { data } = ctx;
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
    },
  },
  platz_leeren: {
    area: "essen",
    definition: {
      name: "platz_leeren",
      description: "Schlägt vor, das Hauptgericht eines Tages zu entfernen (auch Gerichte aus dem Wochen-Check).",
      input_schema: {
        type: "object",
        properties: { woche: WEEK_PROP, tag: DAY_PROP },
        required: ["woche", "tag"],
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      const input = toolInput(raw);
      const { data } = ctx;
      const weekStart = weekStartOf(ctx, input);
      const weekday = day(input.tag);
      if (!weekStart || !weekday) return fail("woche und tag angeben.");
      const slot = findSlot(weekOf(data, weekStart), weekday);
      if (!slot?.entry) return fail(`${weekday} ist schon frei.`);
      propose(ctx, { id: nextId(ctx), type: "clear_slot", slot: { weekStart, weekday } });
      return { content: `Vorgemerkt: ${weekday} leeren (${slot.entry.title}).` };
    },
  },
  doppelt_kochen: {
    area: "essen",
    definition: {
      name: "doppelt_kochen",
      description: "Schaltet für das Gericht eines Tages 'Doppelt kochen – Reste für morgen' an oder aus (doppelte Mengen, am Folgetag Reste als zweite Mahlzeit).",
      input_schema: {
        type: "object",
        properties: { woche: WEEK_PROP, tag: DAY_PROP, an: { type: "boolean" } },
        required: ["woche", "tag", "an"],
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      const input = toolInput(raw);
      const { data } = ctx;
      const weekStart = weekStartOf(ctx, input);
      const weekday = day(input.tag);
      if (!weekStart || !weekday || typeof input.an !== "boolean") return fail("woche, tag und an angeben.");
      const slot = findSlot(weekOf(data, weekStart), weekday);
      if (!slot?.entry) return fail(`${weekday} hat noch kein Gericht.`);
      propose(ctx, { id: nextId(ctx), type: "set_double", slot: { weekStart, weekday }, double: input.an });
      return { content: `Vorgemerkt: ${slot.entry.title} am ${weekday} ${input.an ? "doppelt kochen – Reste für morgen" : "nicht mehr doppelt kochen"}.` };
    },
  },
  gericht_verschieben: {
    area: "essen",
    definition: {
      name: "gericht_verschieben",
      description: "Schlägt vor, ein Gericht auf einen anderen Tag derselben Woche zu verschieben. Ist der Tag belegt, wird getauscht.",
      input_schema: {
        type: "object",
        properties: { woche: WEEK_PROP, von_tag: DAY_PROP, nach_tag: DAY_PROP },
        required: ["woche", "von_tag", "nach_tag"],
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      const input = toolInput(raw);
      const { data } = ctx;
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
    },
  },
  vorgaben_aendern: {
    area: "essen",
    definition: {
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
    run: (ctx, raw) => {
      const input = toolInput(raw);
      const { data } = ctx;
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
    },
  },
  wunsch_merken: {
    area: "essen",
    definition: {
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
    run: (ctx, raw) => {
      const input = toolInput(raw);
      const { data } = ctx;
      const who = str(input.person);
      const dish = str(input.gericht);
      if (!who || !dish) return fail("person und gericht angeben.");
      if (isNeverAgain(dish, data.profile.neverAgain)) return fail(`"${dish}" steht auf der Nie-wieder-Liste – freundlich nachfragen.`);
      const found = findPersons(data.profile.persons, who);
      const person = found.length === 1 ? found[0] : null;
      const label = person ? personLabel(person, data.profile.persons) : who;
      propose(ctx, { id: nextId(ctx), type: "add_wish", personId: person?.id ?? null, who: label, dish });
      return { content: `Vorgemerkt: Wunsch von ${label} – ${dish}.` };
    },
  },
} satisfies Record<string, LotteTool>;
