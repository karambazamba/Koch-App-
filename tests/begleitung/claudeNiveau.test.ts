// Mia auf Claude-Niveau – nie halbgar: offline merken und nachholen, kleine
// Dinge sofort mit „Rückgängig“ und „Mia hat schon …“, Fähigkeitsliste aus
// den Werkzeugen, „Kann ich noch nicht“ anonym, Prüfstand mit 132 Sätzen.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atFresh, fakeWindow } from "../helpers";
import { capabilities, cleanWish, WISH_TOOL } from "@/lib/begleitung/wishTools";
import { PRUEFSAETZE } from "@/lib/begleitung/pruefstand/saetze";
import { bewerte, quote, sentenceCount } from "@/lib/begleitung/pruefstand/bewerten";
import { pruefHaushalt, pruefWetter } from "@/lib/begleitung/pruefstand/haushalt";
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
  it("132 Sätze, alle verschieden, jede Gruppe dabei", () => {
    expect(PRUEFSAETZE).toHaveLength(132);
    expect(new Set(PRUEFSAETZE.map((s) => s.text)).size).toBe(132);
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
    const r = bewerte(termin, chatty, 10_000);
    expect(r.ok).toBe(false);
    expect(r.gruende).toEqual(expect.arrayContaining(["mehr als 2 Sätze", "Floskel", "Gedanken- oder Spiegelstrich", "langsam (10 s)"]));
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

describe("Prüfstand auf 95 % (Auftrag „Prüfstand auf 95 %“)", () => {
  const satz = (text: string) => PRUEFSAETZE.find((s) => s.text === text)!;
  const op = (type: string) => ({ id: "1", type }) as unknown as ChangeOp;

  it("„später“ in 1.0: Vorrat zeigen und Wochenplan löschen → „Kommt bald.“ ohne Aktion", () => {
    for (const text of ["Zeig mir den Vorrat", "Lösch den Wochenplan"]) {
      expect(bewerte(satz(text), { reply: "Kommt bald.", ops: [] }, 2000).ok).toBe(true);
      expect(bewerte(satz(text), { reply: "Kommt bald.", ops: [op("set_feature")] }, 2000).ok).toBe(false);
    }
  });

  it("Tausch mit vergangenem Montag: Rückfrage zählt, Tausch auch", () => {
    const tausch = satz("Tausch Montag und Mittwoch");
    expect(bewerte(tausch, { reply: "Montag ist schon vorbei. Nächste Woche tauschen?", ops: [] }, 2000).ok).toBe(true);
    expect(bewerte(tausch, { reply: "Getauscht.", ops: [op("move_meal")] }, 2000).ok).toBe(true);
  });

  it("Linsensuppe: Rezept anlegen, Rezepte einschalten ist erlaubt", () => {
    expect(bewerte(satz("Kannst du ein Rezept für Linsensuppe anlegen?"), { reply: "Liegt bereit.", ops: [op("add_recipe"), op("set_feature")] }, 2000).ok).toBe(true);
  });

  it("„Eier sind alle“ → direkt auf die Liste", () => {
    expect(bewerte(satz("Eier sind alle"), { reply: "Eier sind drauf.", ops: [op("add_shopping")] }, 2000).ok).toBe(true);
  });
});

describe("Prüfstand fair (Auftrag „Prüfstand fair + Mia knapper“)", () => {
  it("Satzzähler: Daten, Abkürzungen und Uhrzeiten sind kein Satzende", () => {
    expect(sentenceCount("Klassenfahrt vom 9. bis 13. November, steht drin.")).toBe(1);
    expect(sentenceCount("Am 25.10. um 14.30 Uhr Zahnarzt. Steht drin.")).toBe(2);
    expect(sentenceCount("Mi. 1.11. passt, ca. 20 Min. Steht drin.")).toBe(2);
    expect(sentenceCount("Z. B. Brot und Butter, bzw. Müsli. Ist drauf.")).toBe(2);
    expect(sentenceCount("Machen wir so. Morgen gibt’s Pizza.")).toBe(2);
  });

  it("Ratgeber bis 3 Sätze, Aktion bis 2; höchstens eine Rückfrage", () => {
    const frage = PRUEFSAETZE.find((s) => s.text === "Kann man Reis einfrieren?")!;
    const drei = "Ja, gut abgekühlt in Portionen. Hält etwa drei Monate. Zum Auftauen kurz erhitzen.";
    expect(bewerte(frage, { reply: drei, ops: [] }, 2000).ok).toBe(true);
    const termin = PRUEFSAETZE.find((s) => s.text === "Morgen um 9 Steuerberater")!;
    const op = { id: "1", type: "upsert_entry", isNew: true, entry: { typ: "termin", data: { title: "Steuerberater", date: "2026-10-22", start: "09:00" } } } as unknown as ChangeOp;
    expect(bewerte(termin, { reply: drei, ops: [op] }, 2000).gruende).toContain("mehr als 2 Sätze");
    expect(bewerte(termin, { reply: "Steht drin. Soll ich erinnern? Und den Ordner raussuchen?", ops: [op] }, 2000).gruende).toContain("mehr als eine Rückfrage");
  });

  it("Alternativen: Ideen + Frage ohne Aktion, Kalender vorlesen, „steht schon drin“", () => {
    const paprika = PRUEFSAETZE.find((s) => s.text.startsWith("Wir haben noch Paprika"))!;
    expect(bewerte(paprika, { reply: "Paprika-Reis-Pfanne oder gefüllte Paprika. Soll ich eins für heute eintragen?", ops: [] }, 3000).ok).toBe(true);
    const doppelt = PRUEFSAETZE.find((s) => s.text === "Trag den Zahnarzt Donnerstag 16 Uhr ein")!;
    expect(bewerte(doppelt, { reply: "Der steht schon drin, Do 16 Uhr.", ops: [] }, 2000).ok).toBe(true);
    expect(bewerte(PRUEFSAETZE.find((s) => s.text === "Lies mir den Kalender vor")!, { reply: "Heute Zahnarzt nicht, morgen 16 Uhr Zahnarzt.", ops: [] }, 2000).ok).toBe(true);
  });

  it("Mehrtägig: bis-Tag wird geprüft", () => {
    const fahrt = PRUEFSAETZE.find((s) => s.text === "Klassenfahrt 9. bis 13. Nov")!;
    const op = (endDate?: string) => ({ id: "1", type: "upsert_entry", isNew: true, entry: { typ: "termin", data: { title: "Klassenfahrt", date: "2026-11-09", start: "", ...(endDate ? { endDate } : {}) } } }) as unknown as ChangeOp;
    expect(bewerte(fahrt, { reply: "Steht drin.", ops: [op("2026-11-13")] }, 2000).ok).toBe(true);
    expect(bewerte(fahrt, { reply: "Steht drin.", ops: [op()] }, 2000).gruende[0]).toMatch(/^bis 2026-11-13/);
  });

  it("Tempo: Warnung ab 6 s, Fehler erst ab 10 s; Oberfläche erklären und menschliche Gefühle sind Fehler", () => {
    const satz = PRUEFSAETZE.find((s) => s.text === "Ich bin müde")!;
    const r = bewerte(satz, { reply: "Dann mach heute langsam. Soll ich das Abendessen übernehmen?", ops: [] }, 7000);
    expect(r.ok).toBe(true);
    expect(r.warnung).toBe("etwas langsam (7 s)");
    expect(bewerte(satz, { reply: "Dann mach heute langsam.", ops: [] }, 10_500).gruende).toContain("langsam (10.5 s)");
    expect(bewerte(satz, { reply: "Das kenn ich. Mach langsam.", ops: [] }, 1000).gruende).toContain("tut so, als wäre sie ein Mensch");
    expect(bewerte(satz, { reply: "Mit „Übernehmen“ kommt es in den Plan.", ops: [] }, 1000).gruende).toContain("erklärt die Oberfläche");
  });

  it("Ausgangslage je Satz: ohne Zahnarzt, mit Turnen, Plan, Kochmodus", () => {
    expect(pruefHaushalt(["ohne-zahnarzt"]).entries?.some((e) => e.data.title === "Zahnarzt")).toBe(false);
    expect(pruefHaushalt().entries?.some((e) => e.data.title === "Zahnarzt")).toBe(true);
    expect(pruefHaushalt(["turnen"]).entries?.find((e) => e.data.title === "Turnen")?.data.date).toBe("2026-10-23");
    expect(Object.values(pruefHaushalt(["plan"]).mealPlans).flatMap((w) => Object.keys(w))).toHaveLength(5);
    expect(pruefHaushalt(["kochmodus"]).kochen?.active).toBe(true);
    expect(PRUEFSAETZE.find((s) => s.text === "Zahnarzt Donnerstag 16 Uhr")?.lage).toEqual(["ohne-zahnarzt"]);
    expect(pruefWetter().place).toBeTruthy();
  });
});
