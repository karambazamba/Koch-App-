// Wochencheck (Tafel 36): Werkzeug woche_eintragen, Testmodus, Einträge,
// Jetzt-Karte und Stoppwort beim langen Zuhören.
import { beforeEach, describe, expect, it } from "vitest";
import { at, fakeWindow, jetztInput, noBrowser } from "../helpers";
import { createEntry } from "@/lib/core/entries";
import { sanitizeEntry, type CalendarEntry } from "@/lib/kalender/model";
import { isWeekCheckRequest, itemFromEntry, weekCheckKey, weekEntries, type WeekItem } from "@/lib/kalender/wochencheck";
import { stripStopWord } from "@/lib/begleitung/useSpeechInput";
import { isWeekCheck } from "@/lib/begleitung/engine";
import { jetztTopics } from "@/lib/heute/jetztTopics";
import { loadJetzt, weekCheckDone } from "@/lib/heute/jetztStore";
import { kontext, rufe } from "../begleitung/werkzeugKontext";
import { ask, context } from "../begleitung/testmodusHilfen";

beforeEach(() => at("2026-10-21T09:00"));

const make = (typ: "termin" | "aufgabe", d: Record<string, unknown>, raum: "familie" | "arbeit") => sanitizeEntry(createEntry(typ, d, { raum }) as CalendarEntry);
const item = (over: Partial<WeekItem>): WeekItem => ({ id: "x", art: "termin", raum: "familie", title: "Kino", who: [], ...over });

describe("Werkzeug woche_eintragen", () => {
  it("schlägt alle Punkte auf einmal vor – Privat, Sport, ohne Uhrzeit, Aufgabe mit Frist", () => {
    const ctx = kontext();
    const r = rufe(ctx, "woche_eintragen", {
      punkte: [
        { art: "termin", titel: "Elternabend", datum: "2026-10-27", start: "19:30" },
        { art: "termin", titel: "Steuerberater", datum: "2026-10-28", start: "9:00", raum: "privat" },
        { art: "sport", titel: "Laufen", datum: "2026-10-29", start: "18:00", dauer_min: 45, vorschlag: "trocken" },
        { art: "termin", titel: "Mathis: Spiel", datum: "2026-10-31", personen: ["Mathis"] },
        { art: "aufgabe", titel: "Paket zur Post", frist: "2026-10-30" },
        { art: "aufgabe", titel: "Fenster putzen" },
        { art: "termin", titel: "" },
      ],
    });
    expect(r.content).toMatch(/^Vorgemerkt \(6\)/);
    const ops = ctx.ops.flatMap((o) => (o.type === "upsert_entry" ? [o] : []));
    expect(ops).toHaveLength(6);
    const [eltern, steuer, lauf, spiel, paket, fenster] = ops;
    expect(eltern.entry.data).toMatchObject({ start: "19:30", end: "21:30", reminder: "30" });
    expect(steuer.entry).toMatchObject({ raum: "arbeit", data: { label: "Privat" } });
    expect(lauf.entry.data).toMatchObject({ label: "Sport", end: "18:45" });
    expect(lauf.hint).toBe("trocken");
    expect(spiel.entry.data).toMatchObject({ start: "", reminder: "aus", who: ["p-mathis"] });
    expect(paket.entry.data).toMatchObject({ due: "2026-10-30" });
    // Alles ist heute (Tafel 103): ohne Tag für heute
    expect(fenster.entry.data).toMatchObject({ date: "2026-10-21" });
    expect((fenster.entry.data as { week?: string }).week).toBeUndefined();

    // zurück in „Deine Woche“
    const items = ops.map((o, i) => itemFromEntry(o.entry, `k${i}`, o.hint));
    expect(items.map((i) => [i.art, i.raum])).toEqual([["termin", "familie"], ["termin", "privat"], ["sport", "familie"], ["termin", "familie"], ["aufgabe", "familie"], ["aufgabe", "familie"]]);
    expect(items[0].minutes).toBe(120);
    expect(items[2].suggestion).toBe("trocken");
    expect(items[3].question).toEqual(["10:00", "14:00", "weiß noch nicht"]);
  });

  it("ohne Punkte freundlich als Fehler", () => {
    expect(rufe(kontext(), "woche_eintragen", { punkte: [] }).isError).toBe(true);
  });

  it("Wochencheck-Nachricht bekommt viel Platz (maxTokens)", () => {
    expect(isWeekCheck({ messages: [{ role: "user", text: "[Wochencheck] Montag Kino" }] })).toBe(true);
    expect(isWeekCheck({ messages: [{ role: "user", text: "Montag Kino" }] })).toBe(false);
  });
});

describe("Testmodus: Beispiel von Tafel 36", () => {
  it("ruft woche_eintragen mit allen Punkten auf und meldet sich danach kurz", async () => {
    const r = await ask(context(), "[Wochencheck] Dienstag haben wir Elternabend, halb acht. Mittwoch muss ich das Paket zur Post bringen. Donnerstag 10 Uhr Meeting mit dem Lieferanten. Samstag hat Jonne ein Spiel.");
    expect(r.uses.map((u) => u.name)).toEqual(["woche_eintragen"]);
    const punkte = r.uses[0].input.punkte as { titel: string; raum: string; start?: string; personen?: string[] }[];
    expect(punkte.map((p) => [p.titel, p.raum, p.start ?? null])).toEqual([
      ["Elternabend", "familie", "19:30"],
      ["Paket Post bringen", "familie", null],
      ["Meeting mit Lieferanten", "arbeit", "10:00"],
      ["Jonne: Spiel", "familie", null],
    ]);
    expect(punkte[3].personen).toEqual(["Jonne"]);
  });
});

describe("Übernehmen: Punkte → Einträge", () => {
  it("Privat = nur für mich mit Etikett, schon Eingetragenes bleibt weg, Aufgabe ohne Tag = Woche", () => {
    const out = weekEntries(
      [
        item({ title: "Arzt", raum: "privat", date: "2026-10-22", time: "08:30", minutes: 30 }),
        item({ title: "Doppelt", already: true, date: "2026-10-22" }),
        item({ title: "Spiel", date: "2026-10-24", who: ["p-mathis"] }),
        item({ art: "aufgabe", title: "Fenster" }),
        item({ art: "sport", title: "Laufen", date: "2026-10-23", time: "07:00" }),
      ],
      "2026-10-21",
      make,
    );
    expect(out.map((e) => [e.typ, e.raum, e.data.title, e.data.label ?? null])).toEqual([
      ["termin", "arbeit", "Arzt", "Privat"],
      ["termin", "familie", "Spiel", null],
      ["aufgabe", "familie", "Fenster", null],
      ["termin", "familie", "Laufen", "Sport"],
    ]);
    expect(out[0].data).toMatchObject({ start: "08:30", end: "09:00", reminder: "30" });
    expect(out[1].data).toMatchObject({ start: "", reminder: "aus", who: ["p-mathis"] });
    expect(out[2].data).toMatchObject({ date: "2026-10-21" });
  });

  it("Aufgaben ohne Tag gehören zu heute – auch am Sonntag (wandern still mit)", () => {
    expect(weekEntries([item({ art: "aufgabe", title: "Fenster" })], "2026-10-25", make)[0].data).toMatchObject({ date: "2026-10-25" });
  });
});

describe("Einstiege", () => {
  it("Mia versteht die Bitte um einen Wochencheck", () => {
    for (const t of ["Wochencheck", "Lass uns die Woche durchgehen", "Ich lese dir den Kalender vor", "wochen-check bitte"]) expect(isWeekCheckRequest(t)).toBe(true);
    for (const t of ["Was gibt’s diese Woche?", "Wochenplan machen"]) expect(isWeekCheckRequest(t)).toBe(false);
  });

  it("Jetzt-Karte: Montag ganztags, Sonntag erst ab 17 Uhr (für die neue Woche)", () => {
    expect(weekCheckKey("2026-10-26", 8 * 60)).toBe("2026-10-26");
    expect(weekCheckKey("2026-10-25", 16 * 60)).toBeNull();
    expect(weekCheckKey("2026-10-25", 17 * 60)).toBe("2026-10-26");
    expect(weekCheckKey("2026-10-27", 10 * 60)).toBeNull();
  });

  it("Thema „Kurzer Wochencheck?“ – nicht nachts, ✕ = diese Woche nicht mehr", () => {
    const base = jetztInput(600, { today: "2026-10-26", tomorrow: { label: "Morgen · Di", date: "2026-10-27", items: [] } });
    const t = jetztTopics({ ...base, weekCheck: "2026-10-26" })[0];
    expect(t).toMatchObject({ kind: "wochencheck", title: "Kurzer Wochencheck?", detail: "Sag einfach alles, ich sortiere.", target: { action: "wochencheck" } });
    expect(jetztTopics({ ...base, weekCheck: "2026-10-26", minutes: 23 * 60 }).some((x) => x.kind === "wochencheck")).toBe(false);

    fakeWindow({ "wasgibts.jetzt": JSON.stringify({ version: 1, on: true, day: "", hidden: [], weights: {}, weekOff: 3 }) });
    try {
      expect(loadJetzt().weekOff).toBeUndefined();
      const undo = weekCheckDone("2026-10-26");
      expect(loadJetzt().weekOff).toBe("2026-10-26");
      undo();
      expect(loadJetzt().weekOff).toBeUndefined();
    } finally {
      noBrowser();
    }
  });
});

describe("Langes Zuhören", () => {
  it("„fertig“ oder „das war’s“ am Ende beendet, das Wort bleibt draußen", () => {
    expect(stripStopWord("Dienstag Elternabend, fertig.")).toEqual({ text: "Dienstag Elternabend", stop: true });
    expect(stripStopWord("Mittwoch Post. Das war’s!")).toEqual({ text: "Mittwoch Post", stop: true });
    expect(stripStopWord("Bin fertig mit dem Bericht am Freitag")).toEqual({ text: "Bin fertig mit dem Bericht am Freitag", stop: false });
  });
});
