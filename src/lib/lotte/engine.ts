// Lotte: Tool-Schleife. Läuft nur auf dem Server; das Modell wird übergeben
// (echtes Claude oder Mock), damit beides denselben Weg nimmt. Antworttext
// kommt Stück für Stück über `onText` (Streaming), am Ende die fertige
// Antwort samt Vorschlag.

import type Anthropic from "@anthropic-ai/sdk";
import { migrateProfile } from "../einstellungen/profile";
import { nextWeekStartFor, weekStartFor } from "../essen/weekPlan";
import { applyOps, compactOps, type AssistantData, type ChangeOp } from "./ops";
import { contextText, identityPrompt, SYSTEM_PROMPT } from "./prompt";
import { LIMITS, type AssistantReply, type AssistantRequest, type ChatTurn } from "./protocol";
import type { ToolContext } from "./tools";
import { runRegisteredTool, toolDefinitions } from "./toolset";
import { berlinTime } from "../core/now";
import { sanitizeEntry, type CalendarEntry } from "../aufgaben/model";
import { sanitizeHome } from "../core/homeLayout";
import { sanitizeMailStyle } from "./mail";

/** Eine Modell-Anfrage; `onText` bekommt den Antworttext Stück für Stück */
export type CreateMessage = (params: Anthropic.Beta.MessageCreateParamsNonStreaming, onText?: (delta: string) => void) => Promise<Anthropic.Beta.BetaMessage>;

/** Grenzen pro Anfrage: Antwortlänge (inkl. Nachdenken und Werkzeug-Eingaben wie Rezepte) und Runden */
export const ENGINE_LIMITS = { maxTokens: 8000, maxRounds: 6 };

/** Preise je 1 Mio. Tokens in US-Dollar (Eingabe, Ausgabe, Cache schreiben, Cache lesen) – nur fürs Protokoll */
const PRICES: Record<string, { in: number; out: number; write: number; read: number }> = {
  "claude-sonnet-5-5": { in: 2, out: 10, write: 2.5, read: 0.2 },
  "claude-haiku-5-5": { in: 0.1, out: 0.5, write: 0.125, read: 0.01 },
};

/** Modelle mit serverseitigem Ausweichen bei einer Ablehnung (nur Claude API) */
const FALLBACK_MODELS = /^claude-(sonnet-5-5|opus-5-5|opus-5|fable-5-1)$/;

/** Ereignisse während der Antwort (für das Streaming zur App) */
export type EngineEvents = { onText?: (delta: string) => void; onRound?: () => void };

export class AssistantInputError extends Error {}

const OP_TYPES = new Set(["set_meal", "set_double", "clear_slot", "move_meal", "update_week", "add_recipe", "add_shopping", "add_pantry", "add_wish", "upsert_entry", "remove_entry", "done_entry", "move_entry", "remove_shopping", "clear_shopping", "clear_week", "home", "undo_last", "set_persons", "set_pause", "app_command", "set_feature"]);

/** Anfrage prüfen und auf das Nötige kürzen */
export function parseRequest(body: unknown): AssistantRequest {
  if (!body || typeof body !== "object") throw new AssistantInputError("Leere Anfrage.");
  const b = body as Partial<AssistantRequest>;
  if (typeof b.deviceId !== "string" || !/^[\w-]{8,64}$/.test(b.deviceId)) throw new AssistantInputError("Geräte-Kennung nicht erkannt.");
  if (typeof b.today !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.today)) throw new AssistantInputError("Datum nicht erkannt.");
  const messages = (Array.isArray(b.messages) ? b.messages : [])
    .filter((m): m is ChatTurn => Boolean(m) && (m.role === "user" || m.role === "assistant") && typeof m.text === "string")
    .map((m) => ({ role: m.role, text: m.text.slice(0, LIMITS.messageChars) }))
    .slice(-LIMITS.historyTurns);
  if (messages.length === 0 || messages[messages.length - 1].role !== "user" || !messages[messages.length - 1].text.trim()) {
    throw new AssistantInputError("Keine Frage gestellt.");
  }
  const profile = migrateProfile(b.data?.profile);
  if (!profile) throw new AssistantInputError("Bitte zuerst das Haushaltsprofil anlegen.");
  const obj = <T,>(v: unknown, fallback: T): T => (v && typeof v === "object" ? (v as T) : fallback);
  const data: AssistantData = {
    profile,
    weekPlans: obj(b.data?.weekPlans, {}),
    mealPlans: obj(b.data?.mealPlans, {}),
    recipes: obj(b.data?.recipes, {}),
    shopping: obj(b.data?.shopping, {}),
    pantry: (Array.isArray(b.data?.pantry) ? b.data.pantry : [])
      .filter((p) => Boolean(p) && typeof p === "object" && typeof p.name === "string")
      .slice(0, 80),
    home: sanitizeHome(b.data?.home),
    features: (Array.isArray(b.data?.features) ? b.data.features : []).filter((f): f is string => typeof f === "string").slice(0, 30),
    entries: (Array.isArray(b.data?.entries) ? b.data.entries : []).map(sanitizeEntry).filter((e): e is CalendarEntry => e !== null).slice(0, 400),
    mail: sanitizeMailStyle(b.data?.mail),
  };
  const pending = (Array.isArray(b.pending) ? b.pending : []).filter(
    (op): op is ChangeOp => Boolean(op) && typeof op === "object" && typeof op.id === "string" && OP_TYPES.has(op.type),
  );
  const tipsThisWeek = typeof b.tipsThisWeek === "number" && b.tipsThisWeek >= 0 ? Math.min(10, Math.round(b.tipsThisWeek)) : 0;
  const clock = typeof b.clock === "string" && /^\d{2}:\d{2}$/.test(b.clock) ? b.clock : berlinTime().clock;
  const shoppingNames = (Array.isArray(b.shoppingNames) ? b.shoppingNames : []).filter((n): n is string => typeof n === "string").map((n) => n.slice(0, 60)).slice(0, 80);
  return { deviceId: b.deviceId, today: b.today, messages, pending, data, tipsThisWeek, clock, shoppingNames, stream: b.stream === true };
}

/** Nach einer Ausweich-Antwort (fallback) nur den Teil ab dem letzten Wechsel weitergeben */
function cleanContent(content: Anthropic.Beta.BetaContentBlock[]): Anthropic.Beta.BetaContentBlock[] {
  const last = content.map((b) => b.type).lastIndexOf("fallback");
  if (last < 0) return content;
  return content.filter(
    (b, i) => i > last || !(b.type === "thinking" || b.type === "redacted_thinking" || b.type === "tool_use"),
  );
}

function pendingSummary(ops: ChangeOp[]): string {
  if (ops.length === 0) return "";
  const lines = ops.map((op) => {
    switch (op.type) {
      case "set_meal":
        return `${op.slot.weekday}: ${op.dish.title}${op.double ? " (doppelt)" : ""}`;
      case "set_double":
        return `${op.slot.weekday}: ${op.double ? "doppelt kochen" : "nicht doppelt"}`;
      case "clear_slot":
        return `${op.slot.weekday}: leeren`;
      case "move_meal":
        return `${op.from.weekday} → ${op.to.weekday}`;
      case "update_week":
        return `Vorgaben: ${JSON.stringify(op.changes)}`;
      case "add_recipe":
        return `Neues Rezept: ${op.recipe.title}`;
      case "add_shopping":
        return `Einkaufsliste: ${op.name}`;
      case "add_pantry":
        return `Vorrat: ${op.name}`;
      case "add_wish":
        return `Wunsch: ${op.who} – ${op.dish}`;
      case "remove_shopping":
        return `Von der Einkaufsliste: ${op.names.join(", ")}`;
      case "clear_shopping":
        return "Einkaufsliste leeren";
      case "clear_week":
        return `Wochenplan ab ${op.weekStart} leeren`;
      case "home":
        return `Startseite: ${op.change.tile} ${op.change.action}`;
      case "undo_last":
        return "Letzte Änderung zurücknehmen";
      case "set_persons":
        return `${op.slot.weekday}: für ${op.persons ?? "alle"} Personen`;
      case "set_pause":
        return op.pause ? `Pause ${op.pause.from} bis ${op.pause.until ?? "offen"}` : "Pause beenden";
      case "app_command":
        return `In der App: ${op.text}`;
      case "set_feature":
        return `Baustein ${op.feature} ${op.on ? "an" : "aus"}`;
      case "upsert_entry":
        return `${op.isNew ? "Neu" : "Ändern"} (${op.entry.typ}): ${op.entry.data.title}`;
      case "remove_entry":
        return `Löschen: ${op.title}${op.onlyDate ? ` (nur ${op.onlyDate})` : ""}`;
      case "done_entry":
        return `Erledigt: ${op.title}`;
      case "move_entry":
        return `Verschieben: ${op.title} → ${op.to}${op.time ? ` ${op.time}` : ""}`;
    }
  });
  return `\n\nNoch nicht übernommener Vorschlag (in den Daten schon enthalten; auf Wunsch anpassen):\n${lines.join("\n")}`;
}

type Usage = { in: number; out: number; write: number; read: number; rounds: number };

/** Nur Zahlen ins Server-Log (nie Inhalte): Tokens und grobe Kosten der ganzen Anfrage */
function logUsage(model: string, u: Usage) {
  if (model === "mock") return;
  const price = PRICES[model];
  const dollar = price ? (u.in * price.in + u.out * price.out + u.write * price.write + u.read * price.read) / 1_000_000 : null;
  console.info("Lotte Tokens", { modell: model, runden: u.rounds, ein: u.in, aus: u.out, cache_gelesen: u.read, cache_geschrieben: u.write, kosten_usd: dollar === null ? "?" : dollar.toFixed(5) });
}

export async function runAssistant(req: AssistantRequest, create: CreateMessage, model: string, events: EngineEvents = {}): Promise<AssistantReply> {
  const today = new Date(`${req.today}T12:00:00`);
  const shoppingDay = req.data.profile.shoppingDay || "Montag";
  const weeks = { aktuell: weekStartFor(today, shoppingDay), naechste: nextWeekStartFor(today, shoppingDay) };

  // Arbeitskopie mit dem bisherigen Vorschlag
  const start = applyOps(req.data, req.pending);
  const numbers = req.pending.flatMap((op) => [op.id, op.type === "add_recipe" ? op.recipe.ref : ""].map((s) => Number(s.match(/(\d+)$/)?.[1] ?? 0)));
  const ctx: ToolContext = { data: start.data, weeks, ops: [...req.pending], refs: start.refs, counter: Math.max(0, ...numbers), today: req.today };

  const messages: Anthropic.Beta.BetaMessageParam[] = req.messages.map((m) => ({ role: m.role, content: m.text }));
  if (messages[0].role !== "user") messages.shift();

  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    // Name/Ton und Arbeitsweise ändern sich selten → gecacht; Kontext pro Anfrage
    { type: "text", text: `${identityPrompt(req.data.profile)}\n\n${SYSTEM_PROMPT}`, cache_control: { type: "ephemeral" } },
    { type: "text", text: contextText(req.data, req.today, weeks, req.tipsThisWeek, { clock: req.clock, shopping: req.shoppingNames }) + pendingSummary(req.pending) },
  ];

  const usage: Usage = { in: 0, out: 0, write: 0, read: 0, rounds: 0 };
  let reply = "";
  for (let round = 0; round < ENGINE_LIMITS.maxRounds; round++) {
    if (round > 0) events.onRound?.();
    const params: Anthropic.Beta.MessageCreateParamsNonStreaming = {
      model,
      max_tokens: ENGINE_LIMITS.maxTokens,
      system,
      tools: toolDefinitions(),
      messages,
      // Schnell und günstig fürs Gespräch: Nachdenken nur bei Bedarf (adaptiv), geringer Aufwand
      output_config: { effort: "low" },
      // Lehnt das Modell ab, springt serverseitig ein Ersatzmodell ein (nur Claude API)
      ...(FALLBACK_MODELS.test(model) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    };
    const response = await create(params, events.onText);
    const u = response.usage;
    if (u) {
      usage.in += u.input_tokens;
      usage.out += u.output_tokens;
      usage.write += u.cache_creation_input_tokens ?? 0;
      usage.read += u.cache_read_input_tokens ?? 0;
    }
    usage.rounds++;

    if (response.stop_reason === "refusal") {
      reply = "Dabei kann ich leider nicht helfen. Frag mich gern etwas anderes.";
      break;
    }
    const content = cleanContent(response.content);
    const text = content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
    if (text) reply = text;
    messages.push({ role: "assistant", content });

    if (response.stop_reason === "pause_turn") continue;
    // Abgeschnitten (auch mitten in einer Werkzeug-Eingabe): nichts davon ausführen
    if (response.stop_reason !== "tool_use") {
      if (response.stop_reason === "max_tokens") reply = `${reply} …`.trim();
      break;
    }
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = content.flatMap((block) => {
      if (block.type !== "tool_use") return [];
      const result = runRegisteredTool(ctx, block.name, block.input);
      return [{ type: "tool_result" as const, tool_use_id: block.id, content: result.content, is_error: result.isError }];
    });
    messages.push({ role: "user", content: results });
    if (round === ENGINE_LIMITS.maxRounds - 1) reply ||= "Das war mehr, als ich auf einmal schaffe – hier ist, was ich bisher vorgeschlagen habe.";
  }

  logUsage(model, usage);
  const extras = { ...(ctx.mail ? { mail: ctx.mail } : {}), ...(ctx.chips?.length ? { chips: ctx.chips } : {}) };
  return { reply: reply || (ctx.mail ? "Hier mein Vorschlag:" : "Erledigt – schau dir den Vorschlag unten an."), ops: compactOps(ctx.ops), ...extras };
}
