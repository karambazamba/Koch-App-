// Lotte: Tipps aus der Region (Bereich "alltag"). Antwortet NUR aus den
// geladenen Tipps (nie erfinden) – bis zu 3 als Karten unter der Antwort.
// Eintragen geht über termin_anlegen (Vorschlag + Übernehmen). Nur angeboten,
// wenn auf dem Server eine Quelle läuft (TIPS_SOURCE ≠ off).

import { WEEKDAYS_SHORT_MO } from "@/lib/core/days";
import type { BegleitungTool } from "@/lib/begleitung/registry";
import { tipsMode } from "@/lib/tipps/server";
import { answerTips } from "@/lib/tipps/model";
import type { TipFilter } from "@/lib/tipps/categories";

const FILTERS: TipFilter[] = ["kinder", "regen", "draussen", "kostenlos", "musik", "maerkte", "sport"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY = WEEKDAYS_SHORT_MO;
const weekday = (iso: string) => (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;

export const TIP_TOOLS: BegleitungTool[] = [
  {
    area: "alltag",
    enabled: () => tipsMode() !== "off",
    definition: {
      name: "tipps_suchen",
      description:
        "Veranstaltungen in der Nähe (Tipps aus der Region: Märkte, Kinderkino, Konzerte …) für einen Zeitraum, optional gefiltert. Für 'Was ist am Wochenende los?', 'Was können wir bei Regen mit den Kindern machen?', 'Gibt's heute was in Malente?'. Antworte NUR mit diesen Treffern (nichts erfinden), höchstens 3, kurz, und frag am Ende: 'Soll ich einen davon eintragen?'. Ohne Treffer sag das ehrlich. Eintragen = termin_anlegen mit Titel, Datum, Uhrzeit und Ort des Tipps.",
      input_schema: {
        type: "object",
        properties: {
          von: { type: "string", description: "YYYY-MM-DD (aus der Datumsliste)" },
          bis: { type: "string", description: "YYYY-MM-DD, inklusive" },
          filter: { type: "array", items: { type: "string", enum: FILTERS }, description: "kinder = für Kinder, regen = drinnen, draussen, kostenlos, musik, maerkte, sport" },
          ort: { type: "string", description: "Nur in diesem Ort (z. B. Malente), sonst weglassen" },
        },
        required: ["von", "bis"],
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as { von?: string; bis?: string; filter?: string[]; ort?: string };
      if (!ctx.regionTips) return { content: "Tipps aus der Region gibt es gerade nicht – sag das kurz und freundlich, ohne Technik-Wörter." };
      const von = DATE.test(input.von ?? "") ? input.von! : ctx.today;
      const bis = DATE.test(input.bis ?? "") ? input.bis! : von;
      const filters = (input.filter ?? []).filter((f): f is TipFilter => FILTERS.includes(f as TipFilter));
      const hits = answerTips(ctx.regionTips, { von, bis, filters, ort: input.ort?.trim() || null });
      ctx.tipCards = hits;
      if (!hits.length) return { content: "Keine Tipps für diesen Zeitraum/Ort gefunden. Sag das ehrlich (nichts erfinden) und biete an, den Umkreis unter Einstellungen → Tipps aus der Region zu vergrößern." };
      return {
        content: [
          "Treffer (werden als Karten angezeigt – nur diese nennen):",
          ...hits.map((t) => `- ${t.titel} · ${DAY[weekday(t.beginn.slice(0, 10))]} ${t.beginn.slice(0, 10)} ${t.ganztags ? "ganztägig" : t.beginn.slice(11, 16)} · ${t.ort_name} (${Math.round(t.km)} km)${t.fuer_kinder ? " · für Kinder" : ""}${t.drinnen ? " · drinnen" : t.drinnen === false ? " · draußen" : ""}${t.kostenlos ? " · kostenlos" : ""}${t.karamba ? " · von KARAMBA" : ""}${t.quelle === "demo" ? " · Beispiel" : ""}`),
        ].join("\n"),
      };
    },
  },
];
