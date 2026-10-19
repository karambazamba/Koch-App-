// Lotte kann alles, was man selbst in der App kann: Startseite anpassen,
// Wochenplan ansehen/ändern/löschen, Einkaufsliste ansehen/leeren/Einträge
// entfernen und die letzte Änderung zurücknehmen. Wie immer nur als
// Vorschlag mit "Übernehmen".

import { HOME_TILES, type HomeAction, type HomeTileId } from "../core/homeLayout";
import { WEEKDAYS } from "../einstellungen/profile";
import { buildShoppingList } from "../einkauf/shoppingList";
import { formatWeekRange } from "../essen/weekPlan";
import { weekOf } from "./ops";
import type { LotteTool } from "./registry";
import { nextId, propose, runTool, type ToolContext, type ToolResult } from "./tools";

type Input = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const fail = (content: string): ToolResult => ({ content, isError: true });
const WEEK_PROP = { type: "string", enum: ["aktuell", "naechste"], description: "Welche Planungswoche (Standard: die Planungswoche aus dem Kontext)" } as const;
const ACTIONS: HomeAction[] = ["zeigen", "ausblenden", "kompakt", "ausfuehrlich", "hoch", "runter", "nach_oben", "nach_unten"];

const weekStartOf = (ctx: ToolContext, v: unknown) => (v === "naechste" ? ctx.weeks.naechste : ctx.weeks.aktuell);

export const HOME_TOOLS: LotteTool[] = [
  {
    area: "alltag",
    definition: {
      name: "startseite_anpassen",
      description:
        "Passt die Startseite an: eine Kachel zeigen, ausblenden, kompakt oder ausführlich machen oder verschieben. Z. B. 'Mach die Einkaufsliste wieder klein' → kachel einkauf, aktion kompakt; 'Nimm die Einkaufsliste von der Startseite' → ausblenden. Ausblenden löscht nichts.",
      input_schema: {
        type: "object",
        properties: {
          kachel: { type: "string", enum: HOME_TILES.map((t) => t.id), description: "termine = Termine & Aufgaben, essen, einkauf, morgen = Vorschau morgen" },
          aktion: { type: "string", enum: ACTIONS },
        },
        required: ["kachel", "aktion"],
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as Input;
      const tile = str(input.kachel) as HomeTileId;
      const action = str(input.aktion) as HomeAction;
      if (!HOME_TILES.some((t) => t.id === tile) || !ACTIONS.includes(action)) return fail("kachel und aktion angeben.");
      propose(ctx, { id: nextId(ctx), type: "home", change: { tile, action } });
      return { content: `Vorgemerkt: Startseite – ${tile} ${action}.` };
    },
  },
  {
    area: "essen",
    definition: {
      name: "wochenplan_anzeigen",
      description: "Liest den Wochenplan (Gericht je Tag). Die Familie sieht ihn in der App unter Essen (rechte Seite) – das kurz sagen.",
      input_schema: { type: "object", properties: { woche: WEEK_PROP }, additionalProperties: false },
    },
    run: (ctx, raw) => runTool(ctx, "woche_lesen", { woche: (raw as Input | null)?.woche === "naechste" ? "naechste" : "aktuell" }),
  },
  {
    area: "essen",
    definition: {
      name: "wochenplan_aendern",
      description: "Ändert den Wochenplan an einem Tag: gericht (freier Text) oder rezept_id setzen, oder leeren=true. Für mehrere Tage mehrfach aufrufen.",
      input_schema: {
        type: "object",
        properties: { woche: WEEK_PROP, tag: { type: "string", enum: WEEKDAYS }, gericht: { type: "string" }, rezept_id: { type: "string" }, leeren: { type: "boolean" } },
        required: ["tag"],
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as Input;
      const woche = input.woche === "naechste" ? "naechste" : "aktuell";
      if (input.leeren === true) return runTool(ctx, "platz_leeren", { woche, tag: input.tag });
      return runTool(ctx, "gericht_setzen", { woche, tag: input.tag, ...(input.rezept_id ? { rezept_id: input.rezept_id } : { gericht: input.gericht }) });
    },
  },
  {
    area: "essen",
    definition: {
      name: "wochenplan_loeschen",
      description: "Leert den ganzen Wochenplan einer Woche (alle Gerichte weg, Rezepte bleiben im Kochbuch). Z. B. 'Lösch den Wochenplan wieder'.",
      input_schema: { type: "object", properties: { woche: WEEK_PROP }, additionalProperties: false },
    },
    run: (ctx, raw) => {
      const weekStart = weekStartOf(ctx, (raw as Input | null)?.woche);
      propose(ctx, { id: nextId(ctx), type: "clear_week", weekStart });
      return { content: `Vorgemerkt: Wochenplan ${formatWeekRange(weekStart)} leeren.` };
    },
  },
  {
    area: "einkauf",
    definition: {
      name: "einkaufsliste_anzeigen",
      description: "Liest die Einkaufsliste einer Woche: Artikel mit Menge, wofür (Gericht/Tag) und ob abgehakt.",
      input_schema: { type: "object", properties: { woche: WEEK_PROP }, additionalProperties: false },
    },
    run: (ctx, raw) => {
      const weekStart = weekStartOf(ctx, (raw as Input | null)?.woche);
      const list = buildShoppingList(weekOf(ctx.data, weekStart), ctx.data.recipes, ctx.data.shopping[weekStart]);
      const items = list.items.filter((i) => !i.hidden);
      return {
        content: JSON.stringify({
          zeitraum: formatWeekRange(weekStart),
          artikel: items.map((i) => ({ name: i.name, menge: i.amount, fuer: [...i.dishes, ...i.days].join(", "), abgehakt: i.checked })),
        }),
      };
    },
  },
  {
    area: "einkauf",
    definition: {
      name: "einkaufsliste_leeren",
      description: "Leert die Einkaufsliste einer Woche (eigene Artikel weg, Zutaten aus Gerichten als 'haben wir' ausgeblendet).",
      input_schema: { type: "object", properties: { woche: WEEK_PROP }, additionalProperties: false },
    },
    run: (ctx, raw) => {
      const weekStart = weekStartOf(ctx, (raw as Input | null)?.woche);
      propose(ctx, { id: nextId(ctx), type: "clear_shopping", weekStart });
      return { content: "Vorgemerkt: Einkaufsliste leeren." };
    },
  },
  {
    area: "einkauf",
    definition: {
      name: "einkaufsliste_entfernen",
      description: "Nimmt einzelne Artikel von der Einkaufsliste ('Nimm Milch von der Liste').",
      input_schema: { type: "object", properties: { woche: WEEK_PROP, artikel: { type: "array", items: { type: "string" }, minItems: 1 } }, required: ["artikel"], additionalProperties: false },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as Input;
      const names = (Array.isArray(input.artikel) ? input.artikel : []).map(str).filter(Boolean);
      if (!names.length) return fail("artikel angeben.");
      propose(ctx, { id: nextId(ctx), type: "remove_shopping", weekStart: weekStartOf(ctx, input.woche), names });
      return { content: `Vorgemerkt: ${names.join(", ")} von der Liste nehmen.` };
    },
  },
  {
    area: "alltag",
    definition: {
      name: "rueckgaengig",
      description: "Nimmt die letzte übernommene Änderung zurück ('Mach das rückgängig'). Nichts sonst dazu vorschlagen.",
      input_schema: { type: "object", properties: {}, additionalProperties: false },
    },
    run: (ctx) => {
      propose(ctx, { id: nextId(ctx), type: "undo_last" });
      return { content: "Vorgemerkt: letzte Änderung zurücknehmen." };
    },
  },
];
