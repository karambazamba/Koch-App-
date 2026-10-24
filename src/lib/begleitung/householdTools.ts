// Wer zum Haushalt gehört: „Ich bin Felix, wir sind Lisa und drei Kinder“ →
// Vorschlag (Op `set_household`) mit „Übernehmen“. Ohne KI erkennt dasselbe
// `parseHouseholdIntro` (Regeln im Chat und Testmodus).

import { householdIntroFrom, householdIntroSummary } from "@/lib/einstellungen/householdIntro";
import type { BegleitungTool } from "@/lib/begleitung/registry";
import { nextId, propose } from "@/lib/begleitung/tools";

/** Person aus dem Haushalt per Name (ohne Name: die erste Person = ich) */
const personByName = (ctx: Parameters<BegleitungTool["run"]>[0], name: unknown) => {
  const n = typeof name === "string" ? name.trim().toLowerCase() : "";
  const persons = ctx.data.profile.persons;
  return (n && persons.find((p) => p.name.trim().toLowerCase() === n)) || (!n || /^(ich|mir|mich)$/.test(n) ? persons[0] : undefined);
};

export const HOUSEHOLD_TOOLS: BegleitungTool[] = [
  {
    area: "alltag",
    definition: {
      name: "vorliebe_merken",
      description:
        "„Merk dir: Lisa mag keine Pilze“, „Mathis isst wieder Tomaten“: trägt es direkt im Profil der Person ein (sofort, mit Rückgängig, keine Einstellungen öffnen). Danach nur „Gemerkt.“ antworten. Allergien nicht hierüber.",
      input_schema: {
        type: "object",
        properties: {
          person: { type: "string", description: "Vorname aus dem Haushalt (ohne Name: ich)" },
          sachen: { type: "array", items: { type: "string" }, description: "Zutaten/Gerichte, z. B. ['Pilze']" },
          mag: { type: "boolean", description: "true = mag es wieder (aus „mag nicht“ entfernen), sonst false" },
        },
        required: ["sachen"],
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      const input = (raw as { person?: unknown; sachen?: unknown; mag?: unknown } | null) ?? {};
      const person = personByName(ctx, input.person);
      if (!person) return { content: "Die Person gibt es im Haushalt nicht – kurz nachfragen, wen du meinst.", isError: true };
      const sachen = (Array.isArray(input.sachen) ? input.sachen : []).filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 8);
      if (!sachen.length) return { content: "Was genau? Nichts eingetragen.", isError: true };
      for (const term of sachen) propose(ctx, { id: nextId(ctx), type: "set_dislike", personId: person.id, who: person.name || "Ich", term: term.trim().slice(0, 40), mag: input.mag === true });
      return { content: `Gemerkt (sofort, mit Rückgängig). Antworte nur „Gemerkt.“` };
    },
  },
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
