// Lottes Werkzeuge als erweiterbares Register: Jeder Bereich (Essen,
// Einkauf, später Termine, Aufgaben, Erinnerungen) meldet seine Werkzeuge
// hier an. Die Engine fragt nur das Register – neue Bereiche brauchen keine
// Änderung an der Tool-Schleife. Schreib-Werkzeuge liefern weiterhin nur
// Vorschläge (ChangeOps), die die Familie mit "Übernehmen" bestätigt.

import type Anthropic from "@anthropic-ai/sdk";
import type { ToolContext, ToolResult } from "./tools";

export type ToolArea = "essen" | "einkauf" | "alltag" | "post";

export type LotteTool = {
  area: ToolArea;
  definition: Anthropic.Beta.BetaTool;
  run: (ctx: ToolContext, input: unknown) => ToolResult;
  /** Nur anbieten, wenn das gilt (z. B. Tipps nur mit laufender Quelle) */
  enabled?: () => boolean;
};

const registry = new Map<string, LotteTool>();

/** Werkzeug anmelden (gleicher Name ersetzt das alte) */
export function registerTool(tool: LotteTool) {
  registry.set(tool.definition.name, tool);
}

/** Alle Definitionen in fester Reihenfolge (wichtig fürs Prompt-Caching) */
export function toolDefinitions(): Anthropic.Beta.BetaTool[] {
  return [...registry.values()].filter((t) => !t.enabled || t.enabled()).map((t) => t.definition);
}

/** Werkzeug ausführen; Unbekanntes und Fehler werden freundlich gemeldet, nie geworfen */
export function runRegisteredTool(ctx: ToolContext, name: string, input: unknown): ToolResult {
  const tool = registry.get(name);
  if (!tool) return { content: `Unbekanntes Werkzeug: ${name}`, isError: true };
  try {
    return tool.run(ctx, input);
  } catch {
    return { content: "Das hat gerade nicht geklappt – bitte anders versuchen.", isError: true };
  }
}
