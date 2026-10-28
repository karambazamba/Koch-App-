// Lotte: Werkzeuge fürs Kochbuch (Bereich "essen") – im Kochbuch der Familie
// suchen und neue, vollständige Rezepte vorschlagen (Allergien, "mag nicht"
// und die Nie-wieder-Liste werden streng geprüft).

import { recipeBase } from "@/lib/essen/bases";
import { isNeverAgain } from "@/lib/essen/neverAgain";
import { recipeIsKnown } from "@/lib/essen/dishStatus";
import { dietConflicts } from "@/lib/begleitung/diet";
import { kurzVonMia } from "@/lib/essen/kurz/mia";
import { PLAN_RECIPE_PREFIX, type NewRecipe } from "@/lib/begleitung/ops";
import type { BegleitungTool } from "@/lib/begleitung/registry";
import { category, CATEGORY_PROP, fail, nextId, propose, str, toolInput, type Input } from "@/lib/begleitung/tools";

export const COOKBOOK_TOOLS = {
  kochbuch_durchsuchen: {
    area: "essen",
    definition: {
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
    run: (ctx, raw) => {
      const input = toolInput(raw);
      const { data } = ctx;
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
    },
  },
  rezept_erstellen: {
    area: "essen",
    definition: {
      name: "rezept_erstellen",
      description:
        "Erstellt ein neues, vollständiges Rezept (KI-Rezept) – Zutaten mit Mengen für die angegebene Personenzahl (siehe 'personen' des Tages in woche_lesen) und Zubereitungsschritte, dazu die Schnellanleitung (kurz). Allergien und 'mag nicht' aller Personen werden geprüft; bei Treffern wird abgelehnt. Gibt eine ref zurück, die du bei gericht_setzen als neues_rezept nutzt. fuer_plan=false nur, wenn das Rezept ohne Platz ins Kochbuch soll ('Nur das Rezept, ohne Tag' = Vorschau in der App: genau einmal, fuer_plan=false, nichts eintragen).",
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
          kurz: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
            description: "Schnellanleitung: genauso viele Einträge wie schritte, je Schritt eine Zeile mit höchstens 8 Wörtern, ohne Punkt, Zeiten als „10 Min“ (z. B. „Tomaten dazu, 10 Min köcheln“).",
          },
          notiz: { type: "string" },
          fuer_plan: { type: "boolean" },
        },
        required: ["titel", "kategorie", "portionen", "zubereitungszeit_min", "zutaten", "schritte", "kurz", "fuer_plan"],
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      const input = toolInput(raw);
      const { data } = ctx;
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
      const kurz = kurzVonMia(input.kurz, schritte.length);
      const recipe: NewRecipe = {
        ref: `${forPlan ? PLAN_RECIPE_PREFIX : "rezept-"}${++ctx.counter}`,
        title,
        category: cat,
        servings: typeof input.portionen === "number" ? Math.round(input.portionen) : data.profile.persons.length,
        prepMinutes: typeof input.zubereitungszeit_min === "number" ? Math.round(input.zubereitungszeit_min) : null,
        ingredients,
        steps: schritte,
        ...(kurz ? { shortSteps: kurz } : {}),
        note: str(input.notiz),
      };
      propose(ctx, { id: nextId(ctx), type: "add_recipe", recipe });
      return { content: `Rezept vorgemerkt, ref: ${recipe.ref}` };
    },
  },
} satisfies Record<string, BegleitungTool>;
