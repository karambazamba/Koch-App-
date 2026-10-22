// Lotte: Werkzeug für den Vorrat (Bereich "essen") – Sachen in Kühlschrank,
// Tiefkühler oder Vorratsschrank eintragen ("Ich hab 4 Portionen Chili
// eingefroren"). Nur als Vorschlag mit "Übernehmen".

import { PANTRY_PLACES, placeFor, type PantryPlace } from "@/lib/vorrat/pantry";
import type { BegleitungTool } from "@/lib/begleitung/registry";
import { fail, nextId, propose, str, toolInput, type Input } from "@/lib/begleitung/tools";

export const PANTRY_TOOLS = {
  vorrat_hinzufuegen: {
    area: "essen",
    definition: {
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
    run: (ctx, raw) => {
      const input = toolInput(raw);
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
    },
  },
} satisfies Record<string, BegleitungTool>;
