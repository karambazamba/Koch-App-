// Auftrag „Mia schneller und flüssiger“: eine Runde bei kleinen Werkzeugen,
// Prüfung nach dem Sofort-Weg, schlanker Kontext (−40 % bei Alltagsfragen),
// Tempo-Messung (nur Zahlen, Median der letzten 20).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { at, fakeWindow } from "../helpers";
import { parseRequest, runAssistant, type CreateMessage } from "@/lib/begleitung/engine";
import { SOFORT_OK } from "@/lib/begleitung/sofortOk";
import { kurzBestaetigbar, kurzeBestaetigung } from "@/lib/begleitung/bestaetigung";
import { contextText } from "@/lib/begleitung/prompt";
import { kontextThemen } from "@/lib/begleitung/kontextThemen";
import { clearTempo, migrateTempo, tempoBeginn, tempoMarke, tempoModell, tempoSofort, tempoUebersicht, type TempoMessung } from "@/lib/begleitung/tempo";
import type { ChangeOp } from "@/lib/begleitung/ops";
import { alltagsHaushalt, ALLTAGSFRAGEN, EINKAUFSLISTE } from "./tempoHaushalt";
import { haushalt, HEUTE, termin, WOCHEN } from "./werkzeugKontext";

beforeEach(() => {
  at("2026-10-21T10:30");
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

type Block = { type: string; [k: string]: unknown };
function modell(steps: { content: Block[]; stop?: string }[]) {
  const calls: { model: string; system: { text: string }[] }[] = [];
  const create: CreateMessage = async (params) => {
    const step = steps[Math.min(calls.length, steps.length - 1)];
    calls.push({ model: params.model as string, system: params.system as { text: string }[] });
    return { content: step.content, stop_reason: step.stop ?? "end_turn", usage: { input_tokens: 10, output_tokens: 1 } } as never;
  };
  return { create, calls };
}
const tool = (name: string, input: unknown, id = `t-${name}`): Block => ({ type: "tool_use", id, name, input });
const anfrage = (msg: string, extra: Record<string, unknown> = {}) => parseRequest({ deviceId: "geraet-test-1", today: HEUTE, messages: [{ role: "user", text: msg }], pending: [], data: { profile: haushalt() }, ...extra });
const choice = { small: "claude-haiku-5-5", large: "claude-sonnet-5-5" };

describe("Eine Runde: kleine, sichere Werkzeuge ohne zweite Modell-Runde", () => {
  it.each([
    ["Milch auf die Liste", tool("einkaufsliste_hinzufuegen", { woche: "aktuell", artikel: [{ name: "Milch" }] }), "Is drauf."],
    ["Zahnarzt Do 16 Uhr", tool("termin_anlegen", { titel: "Zahnarzt", datum: "2026-10-22", start: "16:00" }), "Morgen 16 Uhr Zahnarzt, steht drin."],
    ["Elternabend Freitag 19:30", tool("termin_anlegen", { titel: "Elternabend", datum: "2026-10-23", start: "19:30" }), "Fr 19:30 Elternabend, steht drin."],
    ["Steuer machen", tool("aufgabe_anlegen", { titel: "Steuer machen" }), "Steht drin."],
    ["Erinner mich morgen um 8 an den Müll", tool("aufgabe_anlegen", { titel: "Müll", tag: "2026-10-22", uhrzeit: "08:00", erinnerung: "15" }), "Mach ich."],
    ["Timer 10 Minuten", tool("timer_stellen", { minuten: 10, name: "Nudeln" }), "Läuft."],
    ["Notier WLAN", tool("notiz_anlegen", { titel: "WLAN", text: "x" }), "Notiert."],
    ["Pinnwand: Bin um 8 da", tool("pinnwand_schreiben", { text: "Bin um 8 da" }), "Hängt an der Pinnwand."],
  ])("%s → ein Aufruf, „%s“", async (msg, block, reply) => {
    const { create, calls } = modell([{ content: [block], stop: "tool_use" }, { content: [{ type: "text", text: "zweite Runde" }] }]);
    const r = await runAssistant(anfrage(msg), create, choice);
    expect(calls).toHaveLength(1);
    expect(r.reply).toBe(reply);
    expect(r.ops).toHaveLength(1);
  });

  it("eigener Text des Modells vor dem Werkzeug bleibt die Antwort", async () => {
    const { create, calls } = modell([{ content: [{ type: "text", text: "Mach ich." }, tool("timer_stellen", { minuten: 5 })], stop: "tool_use" }]);
    expect((await runAssistant(anfrage("Timer 5 Minuten"), create, choice)).reply).toBe("Mach ich.");
    expect(calls).toHaveLength(1);
  });

  it("Vorschlag, Fehler, großes oder lesendes Werkzeug, offener Vorschlag → normale zweite Runde", async () => {
    const zwei = async (block: Block[], extra: Record<string, unknown> = {}) => {
      const { create, calls } = modell([{ content: block, stop: "tool_use" }, { content: [{ type: "text", text: "Fertig." }] }]);
      await runAssistant(anfrage("Sachen fürs Frühstück", extra), create, choice);
      return calls.length;
    };
    expect(await zwei([tool("einkaufsliste_hinzufuegen", { woche: "aktuell", nur_vorschlag: true, artikel: [{ name: "Brötchen" }] })])).toBe(2);
    expect(await zwei([tool("termin_anlegen", { titel: "Zahnarzt" })])).toBe(2);
    expect(await zwei([tool("einkaufsliste_hinzufuegen", { woche: "aktuell", artikel: [{ name: "Milch" }] }), tool("tag_anzeigen", {})])).toBe(2);
    const pending: ChangeOp[] = [{ id: "op-x-1", type: "add_pin", text: "Hallo" }];
    expect(await zwei([tool("pinnwand_schreiben", { text: "Neu" })], { pending })).toBe(2);
  });

  it("Bestätigung: mehrere Arten = „Steht drin.“, mehrere Artikel, Termin weit weg", () => {
    const shop = (name: string): ChangeOp => ({ id: name, type: "add_shopping", weekStart: WOCHEN.aktuell, name, amount: "", section: "sonstiges" });
    expect(kurzeBestaetigung([shop("Milch"), shop("Brot")], HEUTE)).toBe("Steht alles drauf.");
    expect(kurzeBestaetigung([shop("Milch"), { id: "p", type: "add_pin", text: "x" }], HEUTE)).toBe("Steht drin.");
    expect(kurzeBestaetigung([{ id: "t", type: "upsert_entry", isNew: true, entry: termin({ title: "Kur", date: "2026-11-30", start: "09:00" }) }], HEUTE)).toBe("30.11. 9 Uhr Kur, steht drin.");
    expect(kurzeBestaetigung([{ id: "t", type: "upsert_entry", isNew: true, entry: termin({ title: "Kino", date: HEUTE, start: "20:15" }) }], HEUTE)).toBe("Heute 20:15 Kino, steht drin.");
    expect(kurzBestaetigbar([{ id: "x", type: "remove_entry", entryId: "e", title: "Kino" }])).toBe(false);
    expect(kurzBestaetigbar([])).toBe(false);
  });
});

describe("Prüfung nach dem Sofort-Weg", () => {
  it("geht an das kleine Modell, der Kontext sagt, was die App schon gemacht hat", async () => {
    const { create, calls } = modell([{ content: [{ type: "text", text: SOFORT_OK }] }]);
    const r = await runAssistant(anfrage("Plan mir die Woche", { sofort: "Einkaufsliste: Milch" }), create, choice);
    expect(calls[0].model).toBe("claude-haiku-5-5");
    expect(calls[0].system[1].text).toContain("Die App hat die letzte Nachricht schon selbst erledigt (ohne dich): Einkaufsliste: Milch.");
    expect(r).toMatchObject({ reply: "OK", ops: [] });
    expect(anfrage("x", { sofort: "  " }).sofort).toBeUndefined();
  });
});

describe("Kontext schlanker: nur, was die Nachricht braucht", () => {
  const themen = (text: string, before: { role: "user" | "assistant"; text: string }[] = []) => kontextThemen({ messages: [...before, { role: "user", text }], pending: [] });

  it("erkennt Themen; ohne Thema, mit offenem Vorschlag oder Wochencheck: alles", () => {
    expect([...themen("Milch auf die Liste")!]).toContain("einkauf");
    expect([...themen("Zahnarzt Donnerstag 16 Uhr")!]).toEqual(["kalender"]);
    expect([...themen("Danke dir")!]).toEqual([]);
    expect(themen("Wer bist du eigentlich")).toBeNull();
    expect(themen("[Wochencheck] Montag Kino")).toBeNull();
    expect(kontextThemen({ messages: [{ role: "user", text: "Lieber Freitag" }], pending: [{ id: "a", type: "add_pin", text: "x" }] })).toBeNull();
    // Rückfrage: „Passt“ gehört zum Thema davor
    expect([...themen("Um 16 Uhr", [{ role: "user", text: "Zahnarzt Donnerstag" }, { role: "assistant", text: "Um wie viel Uhr?" }])!]).toContain("kalender");
    // Essen bringt den Vorrat mit
    expect([...themen("Was gibt’s heute?")!]).toEqual(expect.arrayContaining(["essen", "vorrat"]));
  });

  it("Einkauf ohne Termine, Termin ohne Einkauf; Allergien bleiben immer", () => {
    const d = alltagsHaushalt();
    const ctx = (text: string) => contextText(d, HEUTE, WOCHEN, 0, { clock: "10:30", shopping: EINKAUFSLISTE, themen: themen(text) });
    expect(ctx("Milch auf die Liste")).toContain("Einkaufsliste (steht schon drauf): Brot");
    expect(ctx("Milch auf die Liste")).not.toContain("Zahnarzt Mathis");
    expect(ctx("Zahnarzt Donnerstag 16 Uhr")).toContain("Zahnarzt Mathis");
    expect(ctx("Zahnarzt Donnerstag 16 Uhr")).not.toContain("Einkaufsliste");
    for (const q of ALLTAGSFRAGEN) expect(ctx(q), q).toContain("ALLERGIE: Nüsse");
    // Laufender Timer steht immer drin („Wie lange noch?“)
    const mitTimer = contextText({ ...d, timers: [{ name: "Nudeln", leftSec: 300, paused: false, done: false }] }, HEUTE, WOCHEN, 0, { themen: themen("Wie lange noch") ?? new Set() });
    expect(mitTimer).toContain("Timer: Nudeln");
  });

  it("Ziel −40 % Eingabe-Tokens (nicht gecachter Teil) bei Alltagsfragen", () => {
    const d = alltagsHaushalt();
    const opts = { clock: "10:30", shopping: EINKAUFSLISTE };
    const voll = contextText(d, HEUTE, WOCHEN, 0, opts);
    let vorher = 0;
    let nachher = 0;
    for (const q of ALLTAGSFRAGEN) {
      vorher += voll.length + q.length;
      nachher += contextText(d, HEUTE, WOCHEN, 0, { ...opts, themen: themen(q) }).length + q.length;
    }
    expect(nachher / vorher).toBeLessThan(0.6);
  });
});

describe("Tempo messen (nur Zahlen, nur Gerät)", () => {
  beforeEach(() => fakeWindow());

  it("eine Messung je Gespräch; mit Vorlesen erst nach dem ersten Satz gespeichert", () => {
    clearTempo();
    tempoBeginn({ sprache: true, letztesWortAm: 0, liest: true }, 1200);
    tempoMarke("server", 1500);
    tempoModell(380.4);
    tempoMarke("token", 1900);
    tempoMarke("token", 2500); // nur das erste zählt
    tempoMarke("fertig", 2600);
    tempoMarke("satz", 2100);
    tempoBeginn({ sprache: false }, 5000);
    tempoSofort();
    tempoMarke("fertig", 5040);
    tempoBeginn({ sprache: false }, 9000); // speichert das vorige
    const gespeichert = migrateTempo(JSON.parse(window.localStorage.getItem("wasgibts.tempo")!))!.messungen;
    expect(gespeichert).toEqual([
      { weg: "ki", sprache: true, stille: 1200, server: 300, modell: 380, token: 700, satz: 900, fertig: 1400 },
      { weg: "sofort", sprache: false, fertig: 40, token: 40 },
    ]);
  });

  it("ohne Vorlesen sofort gespeichert", () => {
    clearTempo();
    tempoBeginn({ sprache: true, letztesWortAm: 100 }, 1300);
    tempoMarke("fertig", 1500);
    expect(JSON.parse(window.localStorage.getItem("wasgibts.tempo")!).messungen).toEqual([{ weg: "ki", sprache: true, stille: 1200, fertig: 200, token: 200 }]);
  });

  it("Median der letzten 20, Reaktion = Stille + erstes Wort bzw. erster Satz; kaputte Werte fallen weg", () => {
    const m = (stille: number, token: number, satz?: number): TempoMessung => ({ weg: "ki", sprache: true, stille, token, ...(satz ? { satz } : {}) });
    const t = tempoUebersicht([m(1200, 400, 300), m(1200, 800), m(1300, 600), { weg: "sofort", sprache: false, fertig: 20, token: 20 }]);
    expect(t).toMatchObject({ anzahl: 4, sofort: 1, stille: 1200, token: 500, satz: 300, reaktion: 1900, server: null });
    expect(migrateTempo({ version: 1, messungen: [{ weg: "x", sprache: "ja", stille: -1, token: "1", fertig: 99.6 }, null] })).toEqual({ version: 1, messungen: [{ weg: "ki", sprache: false, fertig: 100 }] });
    expect(migrateTempo({ version: 2 })).toBeNull();
    expect(tempoUebersicht([]).reaktion).toBeNull();
  });
});
