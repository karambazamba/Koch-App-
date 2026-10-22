// Wer zum Haushalt gehört: „Ich bin Felix, wir sind Lisa und drei Kinder“ →
// Vorschlag (Op `set_household`) mit „Übernehmen“. Ohne KI erkennt dasselbe
// `parseHouseholdIntro` (Regeln im Chat und Testmodus).

import { householdIntroFrom, householdIntroSummary } from "@/lib/einstellungen/householdIntro";
import type { BegleitungTool } from "@/lib/begleitung/registry";
import { nextId, propose } from "@/lib/begleitung/tools";

export const HOUSEHOLD_TOOLS: BegleitungTool[] = [
  {
    area: "alltag",
    definition: {
      name: "haushalt_vorstellen",
      description:
        "Jemand stellt sich oder den Haushalt vor ('Ich bin Felix, wir sind Lisa und drei Kinder', 'Ich wohne allein'). Trägt den eigenen Namen, weitere Erwachsene und Kinder ein (Vorschlag mit 'Übernehmen'). Schon eingetragene Personen bleiben. Nur angeben, was gesagt wurde.",
      input_schema: {
        type: "object",
        properties: {
          ich: { type: "string", description: "Eigener Vorname" },
          erwachsene: { type: "array", items: { type: "string" }, description: "Vornamen weiterer Erwachsener" },
          kinder: { type: "array", items: { type: "string" }, description: "Vornamen der Kinder" },
          weitere_kinder: { type: "number", description: "Kinder ohne genannten Namen (bei 'drei Kinder' ohne Namen: 3)" },
          allein: { type: "boolean", description: "Lebt allein" },
        },
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      const intro = householdIntroFrom((raw as Record<string, unknown> | null) ?? {});
      if (!intro) return { content: "Da war kein Name und niemand aus dem Haushalt dabei – nichts zu ändern." };
      propose(ctx, { id: nextId(ctx), type: "set_household", intro });
      return { content: `Vorgemerkt (mit "Übernehmen"): ${householdIntroSummary(intro, ctx.data.profile)}. Antworte kurz und herzlich, z. B. 'Schön, euch kennenzulernen!'` };
    },
  },
];
