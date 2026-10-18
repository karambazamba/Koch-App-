// Küchenhelfer: Tool-Schleife. Läuft nur auf dem Server; das Modell wird
// übergeben (echtes Claude oder Mock), damit beides denselben Weg nimmt.

import type Anthropic from "@anthropic-ai/sdk";
import { migrateProfile } from "../profile";
import { nextWeekStartFor, weekStartFor } from "../weekPlan";
import { applyOps, compactOps, type AssistantData, type ChangeOp } from "./ops";
import { contextText, identityPrompt, SYSTEM_PROMPT } from "./prompt";
import { LIMITS, type AssistantReply, type AssistantRequest, type ChatTurn } from "./protocol";
import { runTool, TOOLS, type ToolContext } from "./tools";

export type CreateMessage = (params: Anthropic.Beta.MessageCreateParamsNonStreaming) => Promise<Anthropic.Beta.BetaMessage>;

/** Grenzen pro Anfrage: Antwortlänge (inkl. Werkzeug-Eingaben wie Rezepte) und Runden */
export const ENGINE_LIMITS = { maxTokens: 3000, maxRounds: 6 };

export class AssistantInputError extends Error {}

const OP_TYPES = new Set(["set_meal", "set_double", "clear_slot", "move_meal", "update_week", "add_recipe", "add_shopping", "add_pantry", "add_wish", "add_appointment"]);

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
  };
  const pending = (Array.isArray(b.pending) ? b.pending : []).filter(
    (op): op is ChangeOp => Boolean(op) && typeof op === "object" && typeof op.id === "string" && OP_TYPES.has(op.type),
  );
  const tipsThisWeek = typeof b.tipsThisWeek === "number" && b.tipsThisWeek >= 0 ? Math.min(10, Math.round(b.tipsThisWeek)) : 0;
  return { deviceId: b.deviceId, today: b.today, messages, pending, data, tipsThisWeek };
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
      case "add_appointment":
        return `Termin ${op.date}: ${op.title}`;
    }
  });
  return `\n\nNoch nicht übernommener Vorschlag (in den Daten schon enthalten; auf Wunsch anpassen):\n${lines.join("\n")}`;
}

/** Nur Zahlen ins Server-Log (kein Inhalt) – zeigt, ob das Caching greift */
function logUsage(response: Anthropic.Beta.BetaMessage) {
  const u = response.usage;
  if (!u || response.model === "mock") return;
  console.info("Lotte Tokens", { ein: u.input_tokens, aus: u.output_tokens, cache_gelesen: u.cache_read_input_tokens ?? 0, cache_geschrieben: u.cache_creation_input_tokens ?? 0 });
}

export async function runAssistant(req: AssistantRequest, create: CreateMessage, model: string): Promise<AssistantReply> {
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
    { type: "text", text: contextText(req.data, req.today, weeks, req.tipsThisWeek) + pendingSummary(req.pending) },
  ];

  let reply = "";
  for (let round = 0; round < ENGINE_LIMITS.maxRounds; round++) {
    const response = await create({
      model,
      max_tokens: ENGINE_LIMITS.maxTokens,
      system,
      tools: TOOLS,
      messages,
      // Kurz und günstig: ohne Nachdenk-Schritt, geringer Aufwand
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
    });
    logUsage(response);

    if (response.stop_reason === "refusal") {
      reply = "Dabei kann ich leider nicht helfen. Frag mich gern etwas anderes rund ums Kochen und Planen.";
      break;
    }
    const content = cleanContent(response.content);
    const text = content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
    if (text) reply = text;
    messages.push({ role: "assistant", content });

    if (response.stop_reason === "pause_turn") continue;
    if (response.stop_reason !== "tool_use") {
      if (response.stop_reason === "max_tokens") reply = `${reply} …`.trim();
      break;
    }
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = content.flatMap((block) => {
      if (block.type !== "tool_use") return [];
      const result = runTool(ctx, block.name, block.input);
      return [{ type: "tool_result" as const, tool_use_id: block.id, content: result.content, is_error: result.isError }];
    });
    messages.push({ role: "user", content: results });
    if (round === ENGINE_LIMITS.maxRounds - 1) reply ||= "Das war mehr, als ich auf einmal schaffe – hier ist, was ich bisher vorgeschlagen habe.";
  }

  return { reply: reply || "Erledigt – schau dir den Vorschlag unten an.", ops: compactOps(ctx.ops) };
}
