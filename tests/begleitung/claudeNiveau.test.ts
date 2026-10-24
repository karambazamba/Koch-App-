// Mia auf Claude-Niveau – nie halbgar: offline merken und nachholen, kleine
// Dinge sofort mit „Rückgängig“ und „Mia hat schon …“, Fähigkeitsliste aus
// den Werkzeugen, „Kann ich noch nicht“ anonym, Prüfstand mit 124 Sätzen.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atFresh, fakeWindow } from "../helpers";
import { capabilities, cleanWish, WISH_TOOL } from "@/lib/begleitung/wishTools";
import { PRUEFSAETZE } from "@/lib/begleitung/pruefstand/saetze";
import { bewerte, quote, sentenceCount } from "@/lib/begleitung/pruefstand/bewerten";
import { pruefHaushalt } from "@/lib/begleitung/pruefstand/haushalt";
import { costSummary } from "@/lib/begleitung/usage";
import { isQuestion, isShortCommand } from "@/lib/begleitung/engine";
import { toolDefinitions } from "@/lib/begleitung/toolset";
import type { AssistantReply } from "@/lib/begleitung/protocol";
import type { ChangeOp } from "@/lib/begleitung/ops";

describe("Modellwahl (rein)", () => {
  it.each(["Milch auf die Liste", "Timer 10 Minuten", "Zahnarzt Do 16 Uhr", "Erinner mich morgen an den Müll"])("Kurzbefehl: %s", (t) => {
    expect(isShortCommand(t)).toBe(true);
  });
  it.each(["Wie lange muss ein Ei kochen?", "Plan mir die Woche, vegetarisch", "Was soll ich heute kochen", "Brot alle und Mathis hat Freitag Fußball und dann noch Zahnarzt, Friseur und Kita", "Danke dir!"])("nicht kurz: %s", (t) => {
    expect(isShortCommand(t)).toBe(false);
  });
  it("Fragen erkennen (effort medium)", () => {
    expect(isQuestion("Kann man Reis einfrieren?")).toBe(true);
    expect(isQuestion("Milch auf die Liste")).toBe(false);
  });
});

describe("Offline: merken und nachholen", () => {
  beforeEach(async () => {
    vi.resetModules();
    fakeWindow();
    await atFresh("2026-10-21T10:30");
  });

  it("gemerkt, ohne Doppelte, höchstens 5, nach 24 Std. weg", async () => {
    const q = await import("@/lib/begleitung/nachholen");
    q.queueForLater("Milch auf die Liste");
    q.queueForLater("Milch auf die Liste");
    q.queueForLater("Zahnarzt Do 16 Uhr");
    expect(q.takeQueued()).toEqual(["Milch auf die Liste", "Zahnarzt Do 16 Uhr"]);
    expect(q.takeQueued()).toEqual([]);
    for (let i = 0; i < 7; i++) q.queueForLater(`Satz ${i}`);
    expect(q.takeQueued()).toHaveLength(5);
    q.queueForLater("alt");
    await atFresh("2026-10-22T11:00");
    expect(q.takeQueued()).toEqual([]);
  });

  it("App: offline → Satz merken; online → Bühne holt ihn nach; Fehler einmal still wiederholt", () => {
    const ask = readFileSync("src/components/begleitung/useAskAssistant.ts", "utf8");
    expect(ask).toMatch(/if \(why === "offline"\) queueForLater\(said\)/);
    expect(ask).toMatch(/e\.reason === "fehler"[\s\S]*return send\(history/);
    const helper = readFileSync("src/components/begleitung/KitchenHelper.tsx", "utf8");
    expect(helper).toMatch(/window\.addEventListener\("online", replay\)/);
    expect(readFileSync("src/lib/begleitung/client.ts", "utf8")).not.toContain("nicht verstanden.");
  });
});

describe("Machen statt fragen", () => {
  beforeEach(async () => {
    vi.resetModules();
    fakeWindow();
    await atFresh("2026-10-21T10:30");
  });

  it("nur kleine, sichere Dinge sofort – Wochenplan, Rezept, Löschen bleiben Vorschlag", async () => {
    const { isSafeOp } = await import("@/lib/begleitung/miaDone");
    const op = (o: Record<string, unknown>) => ({ id: "x", ...o }) as unknown as ChangeOp;
    expect(isSafeOp(op({ type: "add_shopping", name: "Milch" }))).toBe(true);
    expect(isSafeOp(op({ type: "add_pin", text: "Bin um 18 Uhr da" }))).toBe(true);
    expect(isSafeOp(op({ type: "upsert_entry", isNew: true, entry: {} }))).toBe(true);
    expect(isSafeOp(op({ type: "upsert_entry", isNew: false, entry: {} }))).toBe(false);
    expect(isSafeOp(op({ type: "set_meal" }))).toBe(false);
    expect(isSafeOp(op({ type: "add_recipe" }))).toBe(false);
    expect(isSafeOp(op({ type: "remove_entry" }))).toBe(false);
    expect(isSafeOp(op({ type: "clear_shopping" }))).toBe(false);
  });

  it("„Mia hat schon …“: heute gemerkt, Rückgängig nimmt alle Zeilen einer Antwort zurück", async () => {
    const m = await import("@/lib/begleitung/miaDone");
    const undo = vi.fn();
    m.noteMiaDone([{ id: "1", type: "add_shopping", weekStart: "2026-10-19", name: "Milch", amount: "", section: "kuehl" } as unknown as ChangeOp, { id: "2", type: "add_pin", text: "Hallo" } as ChangeOp], undo);
    const items = m.miaDoneOn("2026-10-21");
    expect(items.map((i) => i.text)).toEqual(["Milch auf die Liste", "Nachricht an die Pinnwand"]);
    expect(items[0].href).toBe("/einkaufsliste");
    m.miaDoneUndo(items[0].id)!();
    expect(undo).toHaveBeenCalledTimes(1);
    expect(m.miaDoneOn("2026-10-21")).toEqual([]);
    expect(m.miaDoneUndo(items[1].id)).toBeNull();
  });

  it("Chat: sofort erledigt mit „Rückgängig“ 10 s; „Dein Tag“ zeigt „Mia hat schon …“", () => {
    expect(readFileSync("src/components/begleitung/useAskAssistant.ts", "utf8")).toMatch(/result\.ops\.every\(isSafeOp\)/);
    expect(readFileSync("src/components/begleitung/ChatTurnItem.tsx", "utf8")).toMatch(/const QUICK_UNDO_MS = 10_000;/);
    const tag = readFileSync("src/components/heute/DeinTag.tsx", "utf8");
    expect(tag).toContain("{helperName(null)} hat schon …");
    expect(tag).toMatch(/items\.length > 2 && !all/);
  });
});

describe("Ehrlich über Fähigkeiten", () => {
  it("Fähigkeitsliste kommt aus den angemeldeten Werkzeugen", () => {
    const tools = toolDefinitions();
    const text = capabilities(tools);
    for (const name of ["einkaufsliste_hinzufuegen", "termin_anlegen", "mail_entwurf"]) expect(text).toContain(name);
    expect(text).not.toContain("kann_ich_noch_nicht:");
    expect(text).toContain("Kann ich noch nicht.");
    expect(readFileSync("src/lib/begleitung/engine.ts", "utf8")).toMatch(/capabilities\(toolDefinitions\(\)\)/);
  });

  it("„Kann ich noch nicht“: Wunsch anonym (ohne Mail-Adressen und lange Zahlen), nie an die App", () => {
    expect(cleanWish("Pizza bei luigi@example.com bestellen 0451123456")).toBe("Pizza bei … bestellen …");
    expect(cleanWish("x")).toBeNull();
    const ctx = { wishes: undefined } as { wishes?: string[] };
    WISH_TOOL.run(ctx as never, { wunsch: "Pizza bestellen" });
    expect(ctx.wishes).toEqual(["Pizza bestellen"]);
    const route = readFileSync("src/app/api/lotte/route.ts", "utf8");
    expect(route).toMatch(/const \{ wishes, \.\.\.result \} = await runAssistant/);
    expect(route).not.toMatch(/wishes: result\.wishes/);
  });

  it("Tageslimit freundlich", async () => {
    const { unavailableText } = await import("@/lib/begleitung/client");
    expect(unavailableText("limit")).toBe("Für heute hab ich genug geredet. Listen und Termine gehen natürlich weiter.");
  });
});

describe("Prüfstand", () => {
  it("124 Sätze, alle verschieden, jede Gruppe dabei", () => {
    expect(PRUEFSAETZE).toHaveLength(124);
    expect(new Set(PRUEFSAETZE.map((s) => s.text)).size).toBe(124);
    expect(PRUEFSAETZE.filter((s) => s.ops.length === 0).length).toBeGreaterThanOrEqual(20);
    expect(PRUEFSAETZE.filter((s) => s.ops.includes("kann_nicht")).length).toBeGreaterThanOrEqual(3);
    expect(pruefHaushalt().profile.persons.map((p) => p.name)).toEqual(["Felix", "Lisa", "Mathis"]);
  });

  it("bewertet Aktion, Daten, Länge, Floskeln und Striche", () => {
    const termin = PRUEFSAETZE.find((s) => s.text === "Zahnarzt Donnerstag 16 Uhr")!;
    const good: AssistantReply = { reply: "Do 16 Uhr Zahnarzt, steht drin.", ops: [{ id: "1", type: "upsert_entry", isNew: true, entry: { typ: "termin", data: { title: "Zahnarzt", date: "2026-10-22", start: "16:00" } } } as unknown as ChangeOp] };
    expect(bewerte(termin, good, 1200).ok).toBe(true);
    const wrongTime = { ...good, ops: [{ ...good.ops[0], entry: { typ: "termin", data: { title: "Zahnarzt", date: "2026-10-22", start: "15:00" } } } as unknown as ChangeOp] };
    expect(bewerte(termin, wrongTime, 1200).gruende).toContain("Uhrzeit 16:00 nicht getroffen (15:00)");
    const chatty: AssistantReply = { reply: "Natürlich! Ich habe den Termin eingetragen – Donnerstag. Gern geschehen! Wenn du noch etwas brauchst, sag Bescheid.", ops: good.ops };
    const r = bewerte(termin, chatty, 9000);
    expect(r.ok).toBe(false);
    expect(r.gruende).toEqual(expect.arrayContaining(["mehr als 2 Sätze", "Floskel", "Gedanken- oder Spiegelstrich", "langsam (9 s)"]));
    expect(quote([bewerte(termin, good, 1), r])).toBe(50);
    expect(sentenceCount("Ist drauf.")).toBe(1);
    const nein = PRUEFSAETZE.find((s) => s.text === "Bestell mir eine Pizza")!;
    expect(bewerte(nein, { reply: "Kann ich noch nicht.", ops: [], wishes: ["Pizza bestellen"] }, 900).ok).toBe(true);
  });

  it("Frist einer Aufgabe zählt als Datum (Fehler: `due` wurde übersehen)", () => {
    const satz = PRUEFSAETZE.find((s) => s.text === "Kita-Formular bis Freitag abgeben")!;
    const reply: AssistantReply = { reply: "Steht drin.", ops: [{ id: "1", type: "upsert_entry", isNew: true, entry: { typ: "aufgabe", data: { title: "Kita-Formular abgeben", due: "2026-10-23" } } } as unknown as ChangeOp] };
    expect(bewerte(satz, reply, 900).ok).toBe(true);
  });

  it("Route geschützt (eigenes Geheimnis, zeitkonstant), Schlüssel bleibt auf dem Server", () => {
    const route = readFileSync("src/app/api/pruefstand/route.ts", "utf8");
    expect(route).toMatch(/process\.env\.PRUEFSTAND_SECRET \|\| process\.env\.CRON_SECRET/);
    expect(route).toMatch(/if \(!allowed\(request\)\) return Response\.json\(\{ error: "zugang" \}, \{ status: 401 \}\)/);
    expect(route).not.toMatch(/console\.\w+\([^)]*(satz\.text|antwort|reply)/);
  });
});

describe("KI-Kosten letzte 7 Tage", () => {
  it("summiert nur die letzten 7 Tage", () => {
    const state = { version: 1 as const, days: { "2026-10-14": { requests: 9, small: 9, large: 0, upgraded: 0, micro: 9_000_000, zeichen: 0, sekunden: 0 }, "2026-10-15": { requests: 2, small: 1, large: 1, upgraded: 1, micro: 1_500_000, zeichen: 0, sekunden: 0 }, "2026-10-21": { requests: 3, small: 2, large: 1, upgraded: 0, micro: 500_000, zeichen: 300, sekunden: 12 } } };
    expect(costSummary(state, "2026-10-21")).toEqual({ requests: 5, small: 3, large: 2, upgraded: 1, zeichen: 300, sekunden: 12, usd: 2 });
  });

  it("Seite „Für Entwickler“ liest „heute“ erst im Browser (Build brach beim Vorrendern ab)", () => {
    const src = readFileSync("src/components/einstellungen/settings/AdminView.tsx", "utf8");
    expect(src).toContain("useToday()");
    expect(src).not.toMatch(/todayIso\(\)/);
  });
});
