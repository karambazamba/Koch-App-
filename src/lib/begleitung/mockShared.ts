// Testmodus: Antworten im Format der Claude-API bauen (Text bzw. Werkzeug-Aufrufe)

import type Anthropic from "@anthropic-ai/sdk";

export type ToolUse = { name: string; input: Record<string, unknown>; id?: string };

function message(content: Anthropic.Beta.BetaContentBlock[], stop: "end_turn" | "tool_use"): Anthropic.Beta.BetaMessage {
  return {
    id: `mock_${Date.now()}`,
    type: "message",
    role: "assistant",
    model: "mock",
    content,
    stop_reason: stop,
    stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0 },
  } as unknown as Anthropic.Beta.BetaMessage;
}
export const text = (t: string) => message([{ type: "text", text: t, citations: null } as Anthropic.Beta.BetaTextBlock], "end_turn");
let seq = 0;
export const tools = (uses: ToolUse[]) =>
  message(
    uses.map((u) => ({ type: "tool_use", id: u.id ?? `mock_tool_${++seq}`, name: u.name, input: u.input }) as Anthropic.Beta.BetaToolUseBlock),
    "tool_use",
  );
