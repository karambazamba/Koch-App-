import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { at } from "../helpers";
import { AssistantInputError, parseRequest, runAssistant, type CreateMessage } from "@/lib/begleitung/engine";
import type { ChangeOp } from "@/lib/begleitung/ops";
import { createNote } from "@/lib/notizen/model";
import { haushalt, termin } from "./werkzeugKontext";

vi.mock("@/lib/tipps/server", () => ({
  tipsMode: () => (process.env.TIPS_SOURCE === "demo" ? "demo" : "off"),
  tipsNear: vi.fn(async () => ({ source: "demo", ort: { name: "Eutin" }, tips: [] })),
}));

beforeEach(() => {
  at("2026-10-21T09:00");
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

type Block = { type: string; [k: string]: unknown };
type Step = { content: Block[]; stop?: string };

/** Gefälschtes Modell: liefert die Antworten der Reihe nach, merkt sich die Anfragen */
function modell(steps: Step[]) {
  const calls: { model: string; messages: unknown[]; system: { text: string }[]; tools: { name: string }[]; extra: Record<string, unknown> }[] = [];
  const create: CreateMessage = async (params, onText) => {
    const step = steps[Math.min(calls.length, steps.length - 1)];
    const { model, messages, system, tools, ...extra } = params as never as { model: string; messages: unknown[]; system: { text: string }[]; tools: { name: string }[] };
    calls.push({ model, messages: [...messages], system, tools, extra });
    for (const b of step.content) if (b.type === "text") onText?.(b.text as string);
    return { content: step.content, stop_reason: step.stop ?? "end_turn", usage: { input_tokens: 100, output_tokens: 10, cache_creation_input_tokens: 5, cache_read_input_tokens: 50 } } as never;
  };
  return { create, calls };
}
const text = (t: string): Block => ({ type: "text", text: t });
const tool = (name: string, input: unknown, id = `t-${name}`): Block => ({ type: "tool_use", id, name, input });

const anfrage = (msg: string, extra: Record<string, unknown> = {}, data: Record<string, unknown> = {}) =>
  parseRequest({ deviceId: "geraet-test-1", today: "2026-10-21", messages: [{ role: "user", text: msg }], pending: [], data: { profile: haushalt(), ...data }, ...extra });

describe("parseRequest prüft und kürzt", () => {
  it("lehnt kaputte Anfragen ab", () => {
    expect(() => parseRequest(null)).toThrow(AssistantInputError);
    expect(() => parseRequest({ deviceId: "x", today: "2026-10-21" })).toThrow(/Geräte-Kennung/);
    expect(() => parseRequest({ deviceId: "geraet-test-1", today: "heute" })).toThrow(/Datum/);
    expect(() => parseRequest({ deviceId: "geraet-test-1", today: "2026-10-21", messages: [{ role: "assistant", text: "Hi" }] })).toThrow(/Keine Frage/);
    expect(() => parseRequest({ deviceId: "geraet-test-1", today: "2026-10-21", messages: [{ role: "user", text: "Hi" }], data: {} })).toThrow(/Haushaltsprofil/);
  });

  it("übernimmt nur Gültiges", () => {
    const t = termin({ title: "Arzt", date: "2026-10-22", start: "09:00" });
    const note = createNote({ title: "WLAN", text: "x" });
    const req = parseRequest({
      deviceId: "geraet-test-1",
      today: "2026-10-21",
      clock: "08:15",
      tipsThisWeek: 42.4,
      stream: true,
      shoppingNames: ["Milch", 3, "x".repeat(100)],
      messages: [{ role: "system", text: "böse" }, { role: "user", text: "a".repeat(7000) }, null, { role: "assistant", text: "ok" }, { role: "user", text: "Danke" }],
      pending: [{ id: "1", type: "add_pin", text: "Hi" }, { id: "2", type: "hack" }, { type: "add_pin" }, null],
      data: {
        profile: haushalt(),
        weekPlans: "kaputt",
        pantry: [{ name: "Milch" }, { nope: 1 }, null],
        features: ["vorrat", 3],
        entries: [t, { id: "kaputt" }],
        notes: [note, {}],
        schnellnotiz: "s".repeat(5000),
        pinnwand: [{ author: "Lisa", text: "Hallo", at: 5 }, { text: "ohne Autor" }],
        timers: [{ name: "Nudeln", leftSec: "61.6", paused: true }, { leftSec: 3 }],
        stopwatch: { sec: -5, running: true },
        kochen: { dish: "Pasta", recipe: null, steps: ["A", 2], done: [0, "1"], active: true },
        tagesablauf: { jetzt: false },
        me: "p-felix",
      },
    });
    expect(req.messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(req.messages[0].text).toHaveLength(6000);
    expect(req.pending.map((p) => p.id)).toEqual(["1"]);
    expect(req.tipsThisWeek).toBe(10);
    expect(req.clock).toBe("08:15");
    expect(req.stream).toBe(true);
    expect(req.shoppingNames).toEqual(["Milch", "x".repeat(60)]);
    const d = req.data;
    expect(d.weekPlans).toEqual({});
    expect(d.pantry).toEqual([{ name: "Milch" }]);
    expect(d.features).toEqual(["vorrat"]);
    expect(d.entries?.map((e) => e.id)).toEqual([t.id]);
    expect(d.notes?.map((n) => n.id)).toEqual([note.id]);
    expect(d.schnellnotiz).toHaveLength(4000);
    expect(d.pinnwand).toEqual([{ author: "Lisa", text: "Hallo", at: "" }]);
    expect(d.timers).toEqual([{ name: "Nudeln", leftSec: 62, paused: true, done: false }]);
    expect(d.stopwatch).toEqual({ sec: 0, running: true });
    expect(d.kochen).toEqual({ dish: "Pasta", recipe: "", steps: ["A"], done: [0], active: true });
    expect(d.tagesablauf).toEqual({ jetzt: false, feierabendAb: "20:00", morgenBis: "10:00" });
    expect(d.wetterOrt).toBe("Eutin");
    expect(d.me).toBe("p-felix");
    const leer = anfrage("Hallo", { clock: "spät" });
    expect(leer.clock).toMatch(/^\d{2}:\d{2}$/);
    expect(leer.data.kochen).toBeNull();
    expect(leer.data.stopwatch).toBeNull();
    expect(leer.data.me).toBeNull();
  });
});

describe("runAssistant: Werkzeug-Schleife", () => {
  it("führt Werkzeuge aus, gibt Ergebnisse zurück und liefert Vorschlag, Mail und Knöpfe", async () => {
    const { create, calls } = modell([
      { content: [text("Moment …"), tool("termin_anlegen", { titel: "Zahnarzt", datum: "2026-10-22", start: "15:00" }), tool("mail_entwurf", { betreff: "Hi", text: "Hallo", anrede: "du" }), tool("antwort_knoepfe", { optionen: ["Ja", "Nein"] })], stop: "tool_use" },
      { content: [text("Steht bereit.")] },
    ]);
    const onRound = vi.fn();
    const onText = vi.fn();
    const r = await runAssistant(anfrage("Morgen 15 Uhr Zahnarzt"), create, "claude-sonnet-5-5", { onRound, onText });
    expect(r.reply).toBe("Steht bereit.");
    expect(r.ops.map((o) => o.type)).toEqual(["upsert_entry"]);
    expect(r.mail).toMatchObject({ subject: "Hi" });
    expect(r.chips).toEqual(["Ja", "Nein"]);
    expect(r.usage).toEqual({ size: "gross", upgraded: false, micro: expect.any(Number) });
    expect(onRound).toHaveBeenCalledTimes(1);
    expect(onText).toHaveBeenCalledWith("Moment …");
    // Zweite Runde bekommt die Werkzeug-Ergebnisse
    const results = (calls[1].messages[2] as { content: { tool_use_id: string; content: string }[] }).content;
    expect(results.map((x) => x.tool_use_id)).toEqual(["t-termin_anlegen", "t-mail_entwurf", "t-antwort_knoepfe"]);
    expect(results[0].content).toMatch(/Vorgemerkt/);
    // Sonnet: wenig Aufwand + serverseitiges Ausweichen; Systemanweisung mit Kontext
    expect(calls[0].extra).toMatchObject({ output_config: { effort: "low" }, fallbacks: "default" });
    expect(calls[0].system[0].text).toContain("Du heißt Mia");
    expect(calls[0].system[1].text).toContain("Heute: Mittwoch, 21. Oktober 2026");
  });

  it("Ablehnung beim großen Modell → freundlicher Satz; ohne Text → Standardsatz", async () => {
    const refusal = modell([{ content: [], stop: "refusal" }]);
    expect((await runAssistant(anfrage("Hm"), refusal.create, "claude-sonnet-5-5")).reply).toBe("Dabei kann ich leider nicht helfen. Frag mich gern etwas anderes.");
    const leer = modell([{ content: [] }]);
    expect((await runAssistant(anfrage("Hm"), leer.create, "claude-sonnet-5-5")).reply).toBe("Steht unten als Vorschlag.");
    const mailOnly = modell([{ content: [tool("mail_entwurf", { betreff: "A", text: "B", anrede: "sie" })], stop: "tool_use" }, { content: [] }]);
    expect((await runAssistant(anfrage("Hm"), mailOnly.create, "claude-sonnet-5-5")).reply).toBe("Hier mein Vorschlag:");
  });

  it("Ablehnung beim kleinen Modell schaltet hoch", async () => {
    let n = 0;
    const create: CreateMessage = async (params) => {
      n++;
      const haiku = /haiku/.test(params.model as string);
      return { content: haiku ? [] : [text("Gern.")], stop_reason: haiku ? "refusal" : "end_turn", usage: { input_tokens: 1, output_tokens: 1 } } as never;
    };
    const r = await runAssistant(anfrage("Timer 10 Minuten"), create, { small: "claude-haiku-5-5", large: "claude-sonnet-5-5" });
    expect(n).toBe(2);
    expect(r).toMatchObject({ reply: "Gern.", usage: { size: "gross", upgraded: true } });
  });

  it("abgeschnitten: Text mit …, Werkzeug wird nicht ausgeführt", async () => {
    const { create } = modell([{ content: [text("Ich plane"), tool("pinnwand_schreiben", { text: "x" })], stop: "max_tokens" }]);
    const r = await runAssistant(anfrage("Hallo"), create, "claude-sonnet-5-5");
    expect(r.reply).toBe("Ich plane …");
    expect(r.ops).toEqual([]);
  });

  it("pause_turn läuft weiter; nach 6 Runden kommt ein Zwischenstand", async () => {
    const paused = modell([{ content: [text("…")], stop: "pause_turn" }, { content: [text("Fertig.")] }]);
    expect((await runAssistant(anfrage("Hallo"), paused.create, "claude-sonnet-5-5")).reply).toBe("Fertig.");
    const endlos = modell([{ content: [tool("rueckgaengig", {})], stop: "tool_use" }]);
    const r = await runAssistant(anfrage("Hallo"), endlos.create, "claude-sonnet-5-5");
    expect(endlos.calls).toHaveLength(6);
    expect(r.reply).toBe("Das war mehr, als ich auf einmal schaffe. Hier ist, was ich bisher hab.");
  });

  it("nach einem Ausweich-Wechsel zählen nur Werkzeuge ab dem Wechsel", async () => {
    const { create, calls } = modell([
      { content: [{ type: "thinking", thinking: "x", signature: "s" }, tool("pinnwand_schreiben", { text: "alt" }, "a"), { type: "fallback" }, tool("pinnwand_schreiben", { text: "neu" }, "b")], stop: "tool_use" },
      { content: [text("Ok.")] },
    ]);
    const r = await runAssistant(anfrage("Hallo"), create, "claude-sonnet-5-5");
    expect(r.ops).toMatchObject([{ type: "add_pin", text: "neu" }]);
    const assistant = calls[1].messages[1] as { content: Block[] };
    expect(assistant.content.map((b) => b.type)).toEqual(["fallback", "tool_use"]);
  });

  it("Haiku: ohne Aufwand-Einstellung; unbekanntes Modell = Kosten unbekannt", async () => {
    const { create, calls } = modell([{ content: [text("Ok.")] }]);
    const r = await runAssistant(anfrage("Danke"), create, "claude-haiku-5-5");
    expect(calls[0].extra).not.toHaveProperty("output_config");
    expect(r.usage).toMatchObject({ size: "klein" });
    const anders = await runAssistant(anfrage("Danke"), modell([{ content: [text("Ok.")] }]).create, "irgendein-modell");
    expect(anders.usage?.micro).toBeNull();
    const mock = await runAssistant(anfrage("Danke"), modell([{ content: [text("Ok.")] }]).create, "mock");
    expect(mock.usage).toBeUndefined();
  });

  it("Wetterfrage holt die Vorhersage vorab (Testmodus ohne Netz)", async () => {
    vi.stubEnv("WETTER_MOCK", "1");
    const { create } = modell([{ content: [tool("wetter_abfragen", {})], stop: "tool_use" }, { content: [text("Nimm einen Schirm mit.")] }]);
    const r = await runAssistant(anfrage("Brauch ich heute einen Schirm?"), create, "claude-sonnet-5-5");
    expect(r.reply).toBe("Nimm einen Schirm mit.");
  });

  it("Tipp-Frage holt Tipps vorab, wenn eine Quelle läuft", async () => {
    vi.stubEnv("TIPS_SOURCE", "demo");
    const { create, calls } = modell([{ content: [tool("tipps_suchen", { von: "2026-10-24", bis: "2026-10-25" })], stop: "tool_use" }, { content: [text("Leider nichts.")] }]);
    await runAssistant(anfrage("Was ist am Wochenende los?"), create, "claude-sonnet-5-5");
    const result = (calls[1].messages[2] as { content: { content: string }[] }).content[0].content;
    expect(result).toMatch(/Keine Tipps/);
  });
});

describe("Offener Vorschlag", () => {
  it("wird weitergeführt, zusammengefasst und an die Systemanweisung gehängt", async () => {
    const pending: ChangeOp[] = [
      { id: "op-x-3", type: "set_meal", slot: { weekStart: "2026-10-19", weekday: "Montag" }, dish: { kind: "text", title: "Pizza", category: null }, double: true },
      { id: "op-x-4", type: "set_double", slot: { weekStart: "2026-10-19", weekday: "Montag" }, double: false },
      { id: "op-x-5", type: "clear_slot", slot: { weekStart: "2026-10-19", weekday: "Dienstag" } },
      { id: "op-x-6", type: "move_meal", from: { weekStart: "2026-10-19", weekday: "Montag" }, to: { weekStart: "2026-10-19", weekday: "Freitag" } },
      { id: "op-x-7", type: "update_week", weekStart: "2026-10-19", changes: { meatDays: 1 } },
      { id: "op-x-8", type: "add_recipe", recipe: { ref: "rezept-12", title: "Brot", category: "vegetarisch", servings: 2, prepMinutes: 60, ingredients: [], steps: ["Backen"], note: "" } },
      { id: "op-x-9", type: "add_shopping", weekStart: "2026-10-19", name: "Milch", amount: "", section: "kuehlregal" },
      { id: "op-x-10", type: "add_pantry", name: "Chili", place: "tiefkuehler" },
      { id: "op-x-11", type: "add_wish", personId: null, who: "Mathis", dish: "Pfannkuchen" },
      { id: "op-x-12", type: "remove_shopping", weekStart: "2026-10-19", names: ["Brot"] },
      { id: "op-x-13", type: "clear_shopping", weekStart: "2026-10-19" },
      { id: "op-x-14", type: "clear_week", weekStart: "2026-10-26" },
      { id: "op-x-15", type: "home", change: { tile: "wetter", action: "klein" } },
      { id: "op-x-16", type: "undo_last" },
      { id: "op-x-17", type: "set_persons", slot: { weekStart: "2026-10-19", weekday: "Freitag" }, persons: null },
      { id: "op-x-18", type: "set_pause", pause: { from: "2026-11-01", until: null } },
      { id: "op-x-19", type: "set_pause", pause: null },
      { id: "op-x-20", type: "app_command", text: "Mach dunkel" },
      { id: "op-x-21", type: "set_feature", feature: "vorrat", on: true },
      { id: "op-x-22", type: "upsert_entry", entry: termin({ title: "Arzt", date: "2026-10-22", start: "09:00" }), isNew: true },
      { id: "op-x-23", type: "remove_entry", entryId: "e", title: "Kino", onlyDate: "2026-10-24" },
      { id: "op-x-24", type: "done_entry", entryId: "e", title: "Müll", date: "2026-10-21" },
      { id: "op-x-25", type: "move_entry", entryId: "e", title: "Sport", date: "2026-10-21", to: "2026-10-22", time: "18:00" },
      { id: "op-x-26", type: "upsert_note", note: createNote({ title: "Idee" }), isNew: false, change: "+ x" },
      { id: "op-x-27", type: "remove_note", noteId: "n", title: "Alt" },
      { id: "op-x-28", type: "set_schnellnotiz", text: "", change: "leer" },
      { id: "op-x-29", type: "add_pin", text: "Hallo" },
    ];
    const req = anfrage("Lieber Freitag", { pending });
    const { create, calls } = modell([{ content: [tool("pinnwand_schreiben", { text: "Neu" })], stop: "tool_use" }, { content: [text("Angepasst.")] }]);
    const r = await runAssistant(req, create, { small: "claude-haiku-5-5", large: "claude-sonnet-5-5" });
    expect(calls[0].model).toBe("claude-sonnet-5-5"); // offener Vorschlag → groß
    const summary = calls[0].system[1].text;
    for (const s of ["Montag: Pizza (doppelt)", "Montag: nicht doppelt", "Dienstag: leeren", "Montag → Freitag", 'Vorgaben: {"meatDays":1}', "Neues Rezept: Brot", "Einkaufsliste: Milch", "Vorrat: Chili", "Wunsch: Mathis – Pfannkuchen", "Von der Einkaufsliste: Brot", "Einkaufsliste leeren", "Wochenplan ab 2026-10-26 leeren", "Startseite: wetter klein", "Letzte Änderung zurücknehmen", "Freitag: für alle Personen", "Pause 2026-11-01 bis offen", "Pause beenden", "In der App: Mach dunkel", "Baustein vorrat an", "Neu (termin): Arzt", "Löschen: Kino (nur 2026-10-24)", "Erledigt: Müll", "Verschieben: Sport → 2026-10-22 18:00", "Notiz ändern: Idee (+ x)", "Notiz löschen: Alt", "Schnellnotiz: leer", "Pinnwand: Hallo"]) {
      expect(summary).toContain(s);
    }
    // Neue Kennungen zählen hinter den bisherigen weiter
    const neu = r.ops.find((o) => o.type === "add_pin" && o.text === "Neu");
    expect(neu?.id).toMatch(/-30$/);
    expect(r.reply).toBe("Angepasst.");
  });
});
