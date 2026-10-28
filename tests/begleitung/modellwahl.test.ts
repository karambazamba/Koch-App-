import { describe, expect, it, vi } from "vitest";
import { parseRequest, runAssistant, type CreateMessage } from "@/lib/begleitung/engine";
import { needsLargeModel } from "@/lib/begleitung/modellwahl";
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

  // Auftrag „Mia schneller und flüssiger“: kein „erst Haiku, dann Sonnet“ mehr
  it("kein Doppelaufruf: Haiku nutzt ein großes Werkzeug selbst, ohne Sonnet", async () => {
    const { create, models } = fake({ "claude-haiku-5-5": { tool: "rezept_erstellen", text: "Steht bereit." }, "claude-sonnet-5-5": { text: "-" } });
    const r = await runAssistant(req("Linsensuppe am Freitag"), create, choice);
    expect(models).toEqual(["claude-haiku-5-5", "claude-haiku-5-5"]);
    expect(r.usage).toMatchObject({ size: "klein", upgraded: false });
  });

  it("kein Doppelaufruf: unsichere Haiku-Antwort bleibt (keine zweite Chance mehr)", async () => {
    const { create, models } = fake({ "claude-haiku-5-5": { text: "Meinst du heute oder morgen?" }, "claude-sonnet-5-5": { text: "-" } });
    await runAssistant(req("Zahnarzt Do"), create, choice);
    expect(models).toEqual(["claude-haiku-5-5"]);
  });

  it("Klarer Kurzbefehl bleibt bei Haiku", async () => {
    const { create, models } = fake({ "claude-haiku-5-5": { text: "Ist drauf." }, "claude-sonnet-5-5": { text: "-" } });
    const r = await runAssistant(req("Milch auf die Liste"), create, choice);
    expect(models).toEqual(["claude-haiku-5-5"]);
    expect(r.usage).toMatchObject({ size: "klein", upgraded: false });
    expect(r.usage?.micro).toBe(150); // 1000 × 0,1 + 100 × 0,5
  });

  it("Haiku ist Standard für Alltagsfragen", async () => {
    for (const q of ["Hab ich morgen Nachmittag Zeit?", "Wie wird das Wetter morgen?", "Was steht auf der Einkaufsliste?", "Wie lange muss ein Ei kochen"]) {
      const { create, models } = fake({ "claude-haiku-5-5": { text: "Ok." }, "claude-sonnet-5-5": { text: "-" } });
      await runAssistant(req(q), create, choice);
      expect(models, q).toEqual(["claude-haiku-5-5"]);
    }
  });

  it("Planen, Rezepte, Ideen, Ratschläge gehen gleich an Sonnet", async () => {
    for (const q of ["Hey, was koche ich heute?", "Hast du Ideen mit Linsen?", "Plan mir die Woche", "Warum wird mein Brot nicht fluffig?"]) {
      const { create, models } = fake({ "claude-haiku-5-5": { text: "x" }, "claude-sonnet-5-5": { text: "Ok." } });
      await runAssistant(req(q), create, choice);
      expect(models, q).toEqual(["claude-sonnet-5-5"]);
    }
  });

  // Ton-Feinschliff: kurze Alltagsantworten (Danke, Gruß, „Bin platt“) übernimmt das kleine Modell
  it("Plaudern („Danke dir!“, „Moin“, „Bin total platt“) bleibt bei Haiku", async () => {
    for (const q of ["Danke dir!", "Moin", "Bin total platt", "Wie geht’s dir?"]) {
      const { create, models } = fake({ "claude-haiku-5-5": { text: "Gern." }, "claude-sonnet-5-5": { text: "-" } });
      await runAssistant(req(q), create, choice);
      expect(models, q).toEqual(["claude-haiku-5-5"]);
    }
  });

  it("Kontext: „Passt“ im laufenden Planen → Sonnet; nach einer Termin-Rückfrage → Haiku", async () => {
    const turns = (first: string, ask: string) => parseRequest({ deviceId: "testgeraet-1", today: "2026-10-21", messages: [{ role: "user", text: first }, { role: "assistant", text: ask }, { role: "user", text: "Passt" }], pending: [], data: { profile: profileFrom(startState()) } });
    const plan = fake({ "claude-haiku-5-5": { text: "x" }, "claude-sonnet-5-5": { text: "Steht bereit." } });
    await runAssistant(turns("Plan mir die Woche", "Vegetarisch?"), plan.create, choice);
    expect(plan.models).toEqual(["claude-sonnet-5-5"]);
    const termin = fake({ "claude-haiku-5-5": { text: "Steht drin." }, "claude-sonnet-5-5": { text: "-" } });
    await runAssistant(turns("Zahnarzt Donnerstag", "Um wie viel Uhr?"), termin.create, choice);
    expect(termin.models).toEqual(["claude-haiku-5-5"]);
  });

  it("echter Fehler beim kleinen Modell (KI-Fehler) → einmal das große; Tageslimit nicht", async () => {
    const models: string[] = [];
    const create: CreateMessage = async (params) => {
      models.push(params.model as string);
      if (/haiku/.test(params.model as string)) throw Object.assign(new Error("überlastet"), { status: 529 });
      return { content: [{ type: "text", text: "Steht drin." }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } } as never;
    };
    const r = await runAssistant(req("Milch auf die Liste"), create, choice);
    expect(models).toEqual(["claude-haiku-5-5", "claude-sonnet-5-5"]);
    expect(r.usage).toMatchObject({ size: "gross", upgraded: true });
    const limit: CreateMessage = async () => {
      throw Object.assign(new Error("limit"), { status: 429 });
    };
    await expect(runAssistant(req("Milch auf die Liste"), limit, choice)).rejects.toThrow("limit");
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
    expect(s.days["2026-10-21"]).toEqual({ requests: 2, small: 1, large: 1, upgraded: 1, micro: 3150, zeichen: 0, sekunden: 0 });
    for (let i = 0; i < 70; i++) s = addUsage(s, `2027-01-${String((i % 28) + 1).padStart(2, "0")}`.replace(/-01-/, `-${String(Math.floor(i / 28) + 1).padStart(2, "0")}-`), { size: "klein", upgraded: false, micro: 1 });
    expect(Object.keys(s.days).length).toBeLessThanOrEqual(62);
  });
});
