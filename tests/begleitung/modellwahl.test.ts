import { describe, expect, it, vi } from "vitest";
import { needsLargeModel, parseRequest, runAssistant, type CreateMessage } from "@/lib/begleitung/engine";
import { addUsage } from "@/lib/begleitung/usage";
import { profileFrom, startState } from "@/lib/einstellungen/welcome";

const req = (text: string, pending: unknown[] = []) =>
  parseRequest({ deviceId: "testgeraet-1", today: "2026-10-21", messages: [{ role: "user", text }], pending, data: { profile: profileFrom(startState()) } });

describe("Mia wählt das Modell: Haiku für Alltägliches, Sonnet für Großes", () => {
  it("kurze Alltagssätze → klein", () => {
    expect(needsLargeModel(req("Stell einen Timer auf 10 Minuten"))).toBe(false);
    expect(needsLargeModel(req("Milch auf die Liste"))).toBe(false);
    expect(needsLargeModel(req("Wie wird das Wetter morgen?"))).toBe(false);
  });

  it("Planen, Rezepte, Mails, lange Texte → gleich groß", () => {
    expect(needsLargeModel(req("Plan mir die Woche"))).toBe(true);
    expect(needsLargeModel(req("Mach mir ein Rezept für Linsensuppe"))).toBe(true);
    expect(needsLargeModel(req("Schreib eine Mail an die Kita"))).toBe(true);
    expect(needsLargeModel(req("x".repeat(300)))).toBe(true);
  });
});

/** Gefälschtes Modell: antwortet je Modellname mit Text oder einem Werkzeug */
function fake(script: Record<string, { tool?: string; text?: string }>): { create: CreateMessage; models: string[] } {
  const models: string[] = [];
  const create: CreateMessage = async (params) => {
    models.push(params.model as string);
    const step = script[params.model as string];
    const toolUsed = models.filter((m) => m === params.model).length > 1;
    const content = step.tool && !toolUsed ? [{ type: "tool_use", id: "t1", name: step.tool, input: {} }] : [{ type: "text", text: step.text ?? "Fertig." }];
    return { content, stop_reason: step.tool && !toolUsed ? "tool_use" : "end_turn", usage: { input_tokens: 1000, output_tokens: 100, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } as never;
  };
  return { create, models };
}

describe("Hochschalten", () => {
  const choice = { small: "claude-haiku-5-5", large: "claude-sonnet-5-5" };
  vi.spyOn(console, "info").mockImplementation(() => {});

  it("Haiku will ein Rezept erstellen → Sonnet übernimmt, die App setzt den Text zurück", async () => {
    const { create, models } = fake({ "claude-haiku-5-5": { tool: "rezept_erstellen" }, "claude-sonnet-5-5": { text: "Hier dein Rezept." } });
    const onRound = vi.fn();
    const r = await runAssistant(req("Hast du was mit Linsen?"), create, choice, { onRound });
    expect(models).toEqual(["claude-haiku-5-5", "claude-sonnet-5-5"]);
    expect(onRound).toHaveBeenCalled();
    expect(r.reply).toBe("Hier dein Rezept.");
    expect(r.usage).toMatchObject({ size: "gross", upgraded: true });
  });

  it("Alltägliches bleibt bei Haiku", async () => {
    const { create, models } = fake({ "claude-haiku-5-5": { text: "Timer läuft." }, "claude-sonnet-5-5": { text: "-" } });
    const r = await runAssistant(req("Danke dir!"), create, choice);
    expect(models).toEqual(["claude-haiku-5-5"]);
    expect(r.usage).toMatchObject({ size: "klein", upgraded: false });
    expect(r.usage?.micro).toBe(150); // 1000 × 0,1 + 100 × 0,5
  });

  it("fest eingestelltes Modell (LOTTE_MODEL) schaltet nie", async () => {
    const { create, models } = fake({ "claude-sonnet-5-5": { text: "Ok." } });
    await runAssistant(req("Danke"), create, "claude-sonnet-5-5");
    expect(models).toEqual(["claude-sonnet-5-5"]);
  });
});

describe("Verbrauch je Tag (nur Zahlen)", () => {
  it("zählt Anfragen, Größe, Hochschalten und Kosten; behält 62 Tage", () => {
    let s = addUsage(null, "2026-10-21", { size: "klein", upgraded: false, micro: 150 });
    s = addUsage(s, "2026-10-21", { size: "gross", upgraded: true, micro: 3000 });
    expect(s.days["2026-10-21"]).toEqual({ requests: 2, small: 1, large: 1, upgraded: 1, micro: 3150 });
    for (let i = 0; i < 70; i++) s = addUsage(s, `2027-01-${String((i % 28) + 1).padStart(2, "0")}`.replace(/-01-/, `-${String(Math.floor(i / 28) + 1).padStart(2, "0")}-`), { size: "klein", upgraded: false, micro: 1 });
    expect(Object.keys(s.days).length).toBeLessThanOrEqual(62);
  });
});
