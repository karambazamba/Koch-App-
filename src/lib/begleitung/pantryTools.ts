// Mia: Werkzeuge für „Im Haus“ (Bereich "essen", gehört zu 1.0) – „Hab
// Hähnchen gekauft“, „Hab noch Hack“, „Ich hab Chili eingefroren“ → rein;
// „Die Milch ist alle“ → raus und auf die Einkaufsliste (was schon draufsteht,
// nicht doppelt). Ohne Mengen (nur da / nicht da). Kleine, sichere Dinge: die
// App macht sie sofort, mit „Rückgängig“.

import { sectionFor } from "@/lib/einkauf/sections";
import { PANTRY_PLACES, placeFor, sameIngredient, type PantryPlace } from "@/lib/vorrat/pantry";
import type { BegleitungTool } from "@/lib/begleitung/registry";
import { fail, nextId, propose, str, toolInput, type Input } from "@/lib/begleitung/tools";

export const PANTRY_TOOLS = {
  vorrat_hinzufuegen: {
    area: "essen",
    definition: {
      name: "vorrat_hinzufuegen",
      description:
        "Legt Sachen nach „Im Haus“ (gekauft, eingefroren, übrig): 'Hab Hähnchen gekauft' → Hähnchen; 'Hab noch Hack' → Hack; 'Ich hab Chili eingefroren' → Chili, tiefkuehler. Ohne Mengen. Ort: kuehlschrank, schrank oder tiefkuehler; ohne Angabe wählt die App den naheliegenden. Nur, wenn der Baustein „Im Haus“ an ist; sonst antworte nur 'Kommt bald.'.",
      input_schema: {
        type: "object",
        properties: {
          sachen: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              properties: { name: { type: "string" }, ort: { type: "string", enum: PANTRY_PLACES.map((p) => p.value) } },
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
        propose(ctx, { id: nextId(ctx), type: "add_pantry", name: itemName, place });
        names.push(itemName);
      }
      if (names.length === 0) return fail("sachen mit name angeben.");
      return { content: `Im Haus (die App trägt es sofort ein): ${names.join(", ")}.` };
    },
  },
  vorrat_aufgebraucht: {
    area: "essen",
    definition: {
      name: "vorrat_aufgebraucht",
      description:
        "Nimmt Sachen aus „Im Haus“, weil sie alle sind, und setzt sie auf die Einkaufsliste der aktuellen Woche (nicht doppelt): 'Die Milch ist alle', 'Eier sind aufgebraucht' → namen ['Milch']. Nur, wenn jemand es so sagt – nie raten.",
      input_schema: {
        type: "object",
        properties: { namen: { type: "array", minItems: 1, items: { type: "string" } } },
        required: ["namen"],
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      const input = toolInput(raw);
      const names = (Array.isArray(input.namen) ? input.namen : []).map(str).filter(Boolean).slice(0, 20);
      if (!names.length) return fail("namen angeben.");
      const weekStart = ctx.weeks.aktuell;
      // Steht es schon auf der Liste (nicht abgehakt), nicht nochmal
      const onList = (name: string) => (ctx.data.shopping[weekStart]?.manual ?? []).some((m) => !m.done && sameIngredient(m.name, name));
      const toList: string[] = [];
      for (const name of names) {
        propose(ctx, { id: nextId(ctx), type: "use_pantry", name });
        if (onList(name)) continue;
        propose(ctx, { id: nextId(ctx), type: "add_shopping", weekStart, name, amount: "", section: sectionFor(name) });
        toList.push(name);
      }
      return { content: `Aufgebraucht (die App nimmt es sofort raus)${toList.length ? ` und auf der Einkaufsliste: ${toList.join(", ")}` : `: ${names.join(", ")} (stand schon auf der Liste)`}. Antworte kurz, z. B. „Steht auf der Liste.“` };
    },
  },
} satisfies Record<string, BegleitungTool>;
