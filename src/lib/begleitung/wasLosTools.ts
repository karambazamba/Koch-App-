// Mia: „Was los?“ (A-055, Bereich "alltag"). Antwortet NUR aus den
// Veranstaltungen des Kreises Ostholstein (nie erfinden) – bis zu 3 als
// Karten unter der Antwort, jede mit „In den Kalender“. Quelle nennen. Nur
// angeboten, wenn die Quelle an ist (REGION_TIPPS_QUELLE ≠ aus). Ersetzt
// `tipps_suchen` (alte Tipps-Ebene, versteckt).

import { WEEKDAYS_SHORT_MO } from "@/lib/core/days";
import type { BegleitungTool } from "@/lib/begleitung/registry";
import type { Filter } from "@/lib/region/kategorien";
import { wochentag } from "@/lib/region/model";
import { wasLosTreffer } from "@/lib/region/frage";
import { erkenneOrt } from "@/lib/region/orte";
import { regionQuelle } from "@/lib/region/server";

const FILTER: Filter[] = ["alles", "kinder", "kultur", "draussen", "markt"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const WAS_LOS_TOOLS: BegleitungTool[] = [
  {
    area: "alltag",
    enabled: () => regionQuelle() !== "aus",
    definition: {
      name: "was_los",
      description:
        "Veranstaltungen in der Umgebung („Was los?“, Kalender des Kreises Ostholstein) für einen Zeitraum, optional gefiltert oder in einem Ort. Für 'Was ist los?', 'Was ist heute in Eutin los?', 'Was können wir am Wochenende mit den Kindern machen?'. Antworte NUR mit diesen Treffern (nichts erfinden), höchstens 3, kurz, und sag am Ende kurz 'Quelle: Kreis Ostholstein'. Die Karten haben einen Knopf 'In den Kalender' – nicht selbst eintragen. Ohne Treffer sag das ehrlich.",
      input_schema: {
        type: "object",
        properties: {
          von: { type: "string", description: "YYYY-MM-DD (aus der Datumsliste)" },
          bis: { type: "string", description: "YYYY-MM-DD, inklusive (höchstens 14 Tage voraus)" },
          filter: { type: "string", enum: FILTER, description: "kinder = für Kinder/Familie, kultur, draussen, markt; sonst alles" },
          ort: { type: "string", description: "Nur in diesem Ort (z. B. Malente), sonst weglassen" },
        },
        required: ["von", "bis"],
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as { von?: string; bis?: string; filter?: string; ort?: string };
      if (!ctx.regionEvents || !ctx.wasLosLage) return { content: "„Was los?“ gibt es gerade nicht. Sag das kurz und freundlich, ohne Technik-Wörter." };
      const von = DATE.test(input.von ?? "") ? input.von! : ctx.today;
      const bis = DATE.test(input.bis ?? "") && input.bis! >= von ? input.bis! : von;
      const filter = FILTER.includes(input.filter as Filter) ? (input.filter as Filter) : "alles";
      const ort = input.ort?.trim() ? erkenneOrt(input.ort) : null;
      const hits = wasLosTreffer(ctx.regionEvents, { von, bis, filter, ort }, ctx.wasLosLage);
      ctx.wasLosCards = hits;
      if (!hits.length) return { content: "Keine Veranstaltungen für diesen Zeitraum/Ort gefunden. Sag das ehrlich (nichts erfinden), z. B. „Da ist grad nichts eingetragen.“ Biete an, aufs Wochenende oder die nächsten zwei Wochen zu schauen." };
      return {
        content: [
          "Treffer (werden als Karten mit „In den Kalender“ angezeigt – nur diese nennen, Quelle: Kreis Ostholstein):",
          ...hits.map(({ event: e, tag }) => `- ${e.titel} · ${WEEKDAYS_SHORT_MO[wochentag(tag)]} ${tag} ${e.ganztags ? "ganztags" : e.beginn}${e.bis_datum ? ` (bis ${e.bis_datum})` : ""} · ${e.ort || e.gemeinde || "Ostholstein"}${e.kategorien.includes("kinder") ? " · für Kinder" : ""}${e.quelle === "demo" ? " · Beispiel" : ""}`),
        ].join("\n"),
      };
    },
  },
];
