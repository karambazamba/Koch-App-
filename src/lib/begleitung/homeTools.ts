// Lotte kann alles, was man selbst in der App kann: Startseite anpassen,
// Wochenplan ansehen/ändern/löschen, Einkaufsliste ansehen/leeren/Einträge
// entfernen und die letzte Änderung zurücknehmen. Wie immer nur als
// Vorschlag mit "Übernehmen".

import { spaeter } from "@/lib/begleitung/wishTools";
import { HOME_ACTIONS, HOME_TILES, type HomeAction, type HomeTileId } from "@/lib/core/homeLayout";
import { WEEKDAYS } from "@/lib/einstellungen/profile";
import { buildShoppingList } from "@/lib/einkauf/shoppingList";
import { formatWeekRange } from "@/lib/essen/weekPlan";
import { weekOf } from "@/lib/begleitung/ops";
import type { BegleitungTool } from "@/lib/begleitung/registry";
import { dateForDay, nextId, propose, type ToolContext, type ToolResult } from "@/lib/begleitung/tools";
import { PLAN_TOOLS } from "@/lib/begleitung/planTools";
import { findDate } from "@/lib/kalender/parse";
import { BAUSTEINE } from "@/lib/core/features";

type Input = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const fail = (content: string): ToolResult => ({ content, isError: true });
const WEEK_PROP = { type: "string", enum: ["aktuell", "naechste"], description: "Welche Planungswoche (Standard: die Planungswoche aus dem Kontext)" } as const;
const ACTIONS: HomeAction[] = HOME_ACTIONS;

const weekStartOf = (ctx: ToolContext, v: unknown) => (v === "naechste" ? ctx.weeks.naechste : ctx.weeks.aktuell);

/** Datum aus "heute"/"morgen"/Wochentag/YYYY-MM-DD/freiem Text */
function dateOf(ctx: ToolContext, v: unknown): string | null {
  const t = str(v);
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  return dateForDay(ctx.today, t) ?? findDate(t, ctx.today)?.date ?? null;
}

/** Tag (Planungswoche + Wochentag) zu einem Datum, falls in dieser oder der nächsten Woche */
function slotFor(ctx: ToolContext, date: string) {
  for (const weekStart of [ctx.weeks.aktuell, ctx.weeks.naechste]) {
    const day = weekOf(ctx.data, weekStart).days.find((d) => d.date === date);
    if (day) return { weekStart, day };
  }
  return null;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(n < 10 ? 1 : 0).replace(".", ","));

const bausteinTool = (on: boolean): BegleitungTool => ({
  area: "alltag",
  definition: {
    name: on ? "baustein_an" : "baustein_aus",
    description: on
      ? "Schaltet einen Baustein ein (zusätzliche Funktion, z. B. 'Zeig mir den Vorrat' wenn der Vorrat aus ist). Sag danach kurz, wo er steht."
      : "Schaltet einen Baustein aus ('Ich brauche die Tipps nicht'). Daten bleiben erhalten.",
    input_schema: {
      type: "object",
      properties: { baustein: { type: "string", enum: BAUSTEINE.map((b) => b.feature), description: BAUSTEINE.map((b) => `${b.feature} = ${b.name}`).join(", ") } },
      required: ["baustein"],
      additionalProperties: false,
    },
  },
  run: (ctx, raw) => {
    const feature = str((raw as Input | null)?.baustein);
    const b = BAUSTEINE.find((x) => x.feature === feature);
    if (!b) return fail("baustein angeben.");
    // Launch 1.0: „später“-Bausteine nie einschalten → „Kommt bald.“
    const later = on ? spaeter(ctx, b.feature) : null;
    if (later) return later;
    if ((ctx.data.features ?? []).includes(feature) === on) return { content: `${b.name} ist schon ${on ? "an" : "aus"}.` };
    propose(ctx, { id: nextId(ctx), type: "set_feature", feature, on });
    return { content: `Vorgemerkt: ${b.name} ${on ? "einschalten" : "ausschalten"}.${on ? ` ${b.where}` : ""}` };
  },
});

export const HOME_TOOLS: BegleitungTool[] = [
  bausteinTool(true),
  bausteinTool(false),
  {
    area: "essen",
    definition: {
      name: "portionen_anpassen",
      description:
        "Rechnet das Gericht eines Tages (Standard: heute) auf eine andere Personenzahl um – NUR für diesen Tag: Zutaten und Einkaufsliste passen sich an, Familie, Rezept und Plan bleiben unverändert. Für 'Wir sind heute nur zu zweit' oder 'Rechne das Rezept auf 2 Personen um'. Das ist NIE eine Pause. Liefert die umgerechneten Zutaten. Mit rezept_id nur umrechnen (ohne Tag).",
      input_schema: {
        type: "object",
        properties: {
          personen: { type: "integer", minimum: 1, maximum: 30 },
          tag: { type: "string", description: "heute (Standard), morgen, Wochentag oder YYYY-MM-DD" },
          rezept_id: { type: "string", description: "Nur umrechnen, ohne den Tag zu ändern" },
        },
        required: ["personen"],
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as Input;
      const persons = typeof input.personen === "number" ? Math.max(1, Math.min(30, Math.round(input.personen))) : 0;
      if (!persons) return fail("personen angeben.");
      const scaled = (recipeId: string) => {
        const r = ctx.data.recipes[recipeId];
        if (!r) return null;
        const f = persons / (r.servings || persons);
        return `${r.title} für ${persons} (statt ${r.servings}): ${r.ingredients.map((i) => [i.amount !== null ? fmt(i.amount * f) : "", i.unit, i.name].filter(Boolean).join(" ")).join(", ")}`;
      };
      const recipeId = str(input.rezept_id);
      if (recipeId) return scaled(recipeId) ? { content: scaled(recipeId)! } : fail("Rezept nicht gefunden – kochbuch_durchsuchen nutzen.");
      const date = dateOf(ctx, input.tag) ?? ctx.today;
      const found = slotFor(ctx, date);
      const entry = found?.day.slot.entry;
      if (!found || !entry || entry.stored.kind === "wish") return fail("An dem Tag steht kein Gericht im Plan – frag kurz nach, welches Rezept gemeint ist (oder rezept_id angeben).");
      propose(ctx, { id: nextId(ctx), type: "set_persons", slot: { weekStart: found.weekStart, weekday: found.day.weekday }, persons });
      const list = entry.recipeId ? scaled(entry.recipeId) : null;
      return { content: `Vorgemerkt: ${entry.title} am ${found.day.weekday} nur für ${persons} Personen.${list ? ` ${list}` : " (freies Gericht ohne Zutatenliste)"}` };
    },
  },
  {
    area: "alltag",
    definition: {
      name: "pause_setzen",
      description:
        "Trägt eine echte Abwesenheit ein (Urlaub, verreist, ganze Familie weg): an diesen Tagen wird nichts geplant und nichts eingekauft. NUR wenn klar ist, dass alle weg sind und ab wann – nie für 'heute sind wir weniger' (dafür portionen_anpassen). Ohne klares Ende: nachfragen.",
      input_schema: {
        type: "object",
        properties: { von: { type: "string", description: "YYYY-MM-DD" }, bis: { type: "string", description: "YYYY-MM-DD (letzter Tag)" } },
        required: ["von", "bis"],
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as Input;
      const from = dateOf(ctx, input.von);
      const until = dateOf(ctx, input.bis);
      if (!from || !until || until < from) return fail("von und bis als Datum angeben (bis nicht vor von).");
      propose(ctx, { id: nextId(ctx), type: "set_pause", pause: { from, until } });
      return { content: `Vorgemerkt: Pause vom ${from} bis ${until}.` };
    },
  },
  {
    area: "alltag",
    definition: {
      name: "pause_beenden",
      description: "Beendet eine eingetragene Pause ('Wir sind wieder da').",
      input_schema: { type: "object", properties: {}, additionalProperties: false },
    },
    run: (ctx) => {
      if (!ctx.data.profile.pause) return { content: "Es ist gar keine Pause eingetragen." };
      propose(ctx, { id: nextId(ctx), type: "set_pause", pause: null });
      return { content: "Vorgemerkt: Pause beenden." };
    },
  },
  {
    area: "alltag",
    definition: {
      name: "app_befehl",
      description:
        "Für Bedienung der App, für die es kein eigenes Werkzeug gibt: Ansicht/Farben (hell/dunkel; Startseite 'Mach die Startseite schlichter' bzw. 'wieder farbig'), Vorlesen, Einstellungen (z. B. 'Jonne isst jetzt vegetarisch', 'Lisa mag keine Pilze', 'Melde dich seltener'), eine neue Person ('Oma wohnt jetzt bei uns'), eigene Produkte ('Wir nehmen immer Alsan statt Butter'), Termine aus Google/Apple übernehmen ('Kalender übernehmen' – öffnet die Seite dafür), Seiten öffnen. text = der Wunsch als kurzer, klarer Satz. Die App führt ihn nach 'Übernehmen' selbst aus.",
      input_schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"], additionalProperties: false },
    },
    run: (ctx, raw) => {
      const text = str((raw as Input | null)?.text).slice(0, 200);
      if (!text) return fail("text angeben.");
      propose(ctx, { id: nextId(ctx), type: "app_command", text });
      return { content: `Vorgemerkt: „${text}“ in der App ausführen.` };
    },
  },
  {
    area: "alltag",
    definition: {
      name: "startseite_anpassen",
      description:
        "Passt die Startseite an: Kachel zeigen (landet an ihrem Standard-Platz), ausblenden, Größe klein/mittel/gross (S/M/L) oder verschieben (hoch, runter, nach_oben, nach_unten); 'standard' = Reihenfolge und Größen wie am Anfang (kachel egal). Z. B. 'Pinnwand ganz nach oben' → pinnwand, nach_oben; 'Wetter klein machen' → wetter, klein; 'Nimm das Wetter weg' → wetter, ausblenden; 'Startseite wie am Anfang' → standard. Zum Bearbeiten-Modus selbst: app_befehl 'Startseite bearbeiten'. Ausblenden löscht nichts.",
      input_schema: {
        type: "object",
        properties: {
          kachel: { type: "string", enum: HOME_TILES.map((t) => t.id), description: "pinnwand, termine, aufgaben, wetter, essen, einkauf, notizen (neueste und angeheftete Notizen), vorrat, morgen = Vorschau morgen" },
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
    run: (ctx, raw) => PLAN_TOOLS.woche_lesen.run(ctx, { woche: (raw as Input | null)?.woche === "naechste" ? "naechste" : "aktuell" }),
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
      if (input.leeren === true) return PLAN_TOOLS.platz_leeren.run(ctx, { woche, tag: input.tag });
      return PLAN_TOOLS.gericht_setzen.run(ctx, { woche, tag: input.tag, ...(input.rezept_id ? { rezept_id: input.rezept_id } : { gericht: input.gericht }) });
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
      const later = spaeter(ctx, "wochenplan");
      if (later) return later;
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
