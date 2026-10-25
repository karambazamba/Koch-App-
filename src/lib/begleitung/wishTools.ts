// Ehrlich über Fähigkeiten (Auftrag „Mia auf Claude-Niveau“): Was Mia kann,
// steht im Prompt automatisch aus den angemeldeten Werkzeugen (`capabilities`).
// Fragt jemand etwas, das es nicht gibt, sagt Mia „Kann ich noch nicht.“ und
// meldet den Wunsch über `kann_ich_noch_nicht` – der Server zählt ihn anonym
// (Tabelle mia_wuensche: nur Text + Datum, keine Person, kein Haushalt).

import type Anthropic from "@anthropic-ai/sdk";
import type { BegleitungTool } from "@/lib/begleitung/registry";
import type { ToolContext, ToolResult } from "@/lib/begleitung/tools";
import { LAUNCH_AUS, bausteinOf, type Feature } from "@/lib/core/features";

/** Wunsch kurz und ohne Namen/Zahlen-Folgen speichern (max. 120 Zeichen) */
export function cleanWish(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const t = text
    .replace(/\S+@\S+/g, "…")
    .replace(/\d{4,}/g, "…")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return t.length >= 3 ? t : null;
}

export const WISH_TOOL: BegleitungTool = {
  area: "alltag",
  definition: {
    name: "kann_ich_noch_nicht",
    description:
      "Wenn jemand etwas möchte, das keines deiner Werkzeuge kann (z. B. 'Bestell mir Pizza', 'Ruf Oma an'): rufe das auf und antworte nur 'Kann ich noch nicht.' (plus höchstens einen Satz, was stattdessen geht). Nicht für allgemeine Fragen – die beantwortest du selbst.",
    input_schema: {
      type: "object",
      properties: { wunsch: { type: "string", description: "Der Wunsch in wenigen Worten, ohne Namen (z. B. 'Pizza bestellen')" } },
      required: ["wunsch"],
      additionalProperties: false,
    },
  },
  run: (ctx, raw) => {
    const wish = cleanWish((raw as { wunsch?: unknown } | null)?.wunsch);
    if (wish) ctx.wishes = [...(ctx.wishes ?? []), wish].slice(0, 3);
    return { content: "Notiert. Antworte nur „Kann ich noch nicht.“ und höchstens einen Satz, was stattdessen geht." };
  },
};

/** „Das kannst du“ – aus den Werkzeugen (erster Satz je Beschreibung), nichts darüber hinaus */
export function capabilities(tools: Anthropic.Beta.BetaTool[]): string {
  const lines = tools
    .filter((t) => t.name !== WISH_TOOL.definition.name)
    .map((t) => `${t.name}: ${(t.description ?? "").split(/(?<=[.!?])\s/)[0].slice(0, 140)}`);
  return `Das kannst du (nur das, aus deinen Werkzeugen): ${lines.join(" | ")}. Alles andere: allgemeine Fragen (Kochen, Haushalt, Umrechnen, Kinder, Wissen) beantwortest du kurz und richtig selbst, bei Unsicherheit ehrlich. Aktionen, die es hier nicht gibt: kann_ich_noch_nicht und „Kann ich noch nicht.“ – nie etwas versprechen, das die App nicht kann, nie „Dafür bin ich nicht da“.`;
}

/**
 * Launch 1.0: Bausteine mit Kennzeichen „später“ (`LAUNCH_AUS`) schaltet Mia
 * nie ein und schreibt nicht hinein – wer ihn schon nutzt, behält ihn. Sonst
 * „Kommt bald.“ und der Wunsch wird anonym gezählt wie bei „Kann ich noch nicht.“
 */
export function spaeter(ctx: ToolContext, feature: Feature): ToolResult | null {
  if (!LAUNCH_AUS.includes(feature) || (ctx.data.features ?? []).includes(feature)) return null;
  const wish = cleanWish(bausteinOf(feature)?.name ?? feature);
  if (wish) ctx.wishes = [...(ctx.wishes ?? []), wish].slice(0, 3);
  return { content: "Gibt es in dieser Version noch nicht. Antworte nur „Kommt bald.“ – nichts einschalten, nichts anbieten." };
}
