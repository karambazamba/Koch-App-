// Mia: Werkzeuge für „Im Haus“ (Bereich "essen") – „Hab Hähnchen gekauft“,
// „Ich hab Chili eingefroren“ → rein; „Die Milch ist alle“ → raus. Ohne
// Mengen (nur da / nicht da). Kleine, sichere Dinge: die App macht sie
// sofort, mit „Rückgängig“.

import { PANTRY_PLACES, placeFor, type PantryPlace } from "@/lib/vorrat/pantry";
import type { BegleitungTool } from "@/lib/begleitung/registry";
import { fail, nextId, propose, str, toolInput, type Input } from "@/lib/begleitung/tools";
import { spaeter } from "@/lib/begleitung/wishTools";

export const PANTRY_TOOLS = {
  vorrat_hinzufuegen: {
    area: "essen",
    definition: {
      name: "vorrat_hinzufuegen",
      description:
        "Legt Sachen nach „Im Haus“ (gekauft, eingefroren, übrig): 'Hab Hähnchen gekauft' → Hähnchen; 'Ich hab Chili eingefroren' → Chili, tiefkuehler. Ohne Mengen. Ort: kuehlschrank, schrank oder tiefkuehler; ohne Angabe wählt die App den naheliegenden.",
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
      // Launch 1.0: „Im Haus“ ist „später“ (wer es nutzt, behält es)
      const later = spaeter(ctx, "vorrat");
      if (later) return later;
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
      description: "Nimmt Sachen aus „Im Haus“, weil sie alle sind: 'Die Milch ist alle', 'Eier sind aufgebraucht' → namen ['Milch']. Nur, wenn jemand es so sagt – nie raten.",
      input_schema: {
        type: "object",
        properties: { namen: { type: "array", minItems: 1, items: { type: "string" } } },
        required: ["namen"],
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      // Launch 1.0: „Im Haus“ ist „später“ (wer es nutzt, behält es)
      const later = spaeter(ctx, "vorrat");
      if (later) return later;
      const input = toolInput(raw);
      const names = (Array.isArray(input.namen) ? input.namen : []).map(str).filter(Boolean).slice(0, 20);
      if (!names.length) return fail("namen angeben.");
      for (const name of names) propose(ctx, { id: nextId(ctx), type: "use_pantry", name });
      return { content: `Aufgebraucht (die App nimmt es sofort raus): ${names.join(", ")}.` };
    },
  },
} satisfies Record<string, BegleitungTool>;
