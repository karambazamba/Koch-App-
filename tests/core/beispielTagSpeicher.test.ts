import { afterEach, describe, expect, it, vi } from "vitest";
import { atFresh, fakeBrowser, noBrowser, type FakeWindow } from "./fakeBrowser";

const KEY = "wasgibts.beispiel";
let win: FakeWindow;
const state = () => JSON.parse(win.localStorage.getItem(KEY) ?? "null");

async function load(local: Record<string, string> = {}) {
  win = fakeBrowser(local);
  vi.resetModules();
  await atFresh("2026-10-20T09:00");
  return import("@/lib/core/demo");
}

afterEach(() => noBrowser());

describe("Beispiel-Tag: Speicher", () => {
  it("startet mit allen Kacheln und 'App kennenlernen' abgehakt", async () => {
    const demo = await load();
    demo.startDemo();
    expect(state()).toEqual({ version: 1, since: "2026-10-20", cleared: [], done: ["beispiel:a1"], gone: [], asked: false });
    expect(demo.demoTiles(state(), "2026-10-20")).toEqual(["termine", "aufgaben", "pinnwand", "einkauf", "essen"]);
  });

  it("verschwindet nach 3 Tagen", async () => {
    const demo = await load();
    demo.startDemo();
    expect(demo.demoTiles(state(), "2026-10-22")).toHaveLength(5);
    expect(demo.demoTiles(state(), "2026-10-23")).toEqual([]);
    expect(demo.demoTiles(null, "2026-10-20")).toEqual([]);
  });

  it("eine Kachel mit Eigenem verliert ihre Beispiele für immer; 'Jetzt leeren' alle", async () => {
    const demo = await load();
    demo.startDemo();
    demo.clearDemoTile("termine");
    demo.clearDemoTile("termine");
    expect(state().cleared).toEqual(["termine"]);
    expect(demo.demoTiles(state(), "2026-10-20")).not.toContain("termine");
    demo.clearDemo();
    expect(demo.demoTiles(state(), "2026-10-20")).toEqual([]);
  });

  it("abhaken nur lokal, nochmal = doch nicht", async () => {
    const demo = await load();
    demo.startDemo();
    demo.toggleDemoDone("beispiel:a3");
    expect(state().done).toEqual(["beispiel:a1", "beispiel:a3"]);
    demo.toggleDemoDone("beispiel:a1");
    expect(state().done).toEqual(["beispiel:a3"]);
  });

  it("abgehakt verschwindet und lässt sich zurückholen", async () => {
    const demo = await load();
    demo.startDemo();
    const undo = demo.hideDemoItem("beispiel:a2");
    demo.hideDemoItem("beispiel:a2");
    expect(state().gone).toEqual(["beispiel:a2"]);
    undo();
    expect(state().gone).toEqual([]);
  });

  it("Frage 'Alle Beispiele entfernen?' nach eigenem Termin, nur einmal", async () => {
    const demo = await load();
    demo.startDemo();
    const tiles = () => demo.demoTiles(state(), "2026-10-20");
    expect(demo.askRemoveAll(state(), tiles())).toBe(false);
    demo.clearDemoTile("aufgaben");
    expect(demo.askRemoveAll(state(), tiles())).toBe(true);
    demo.markDemoAsked();
    demo.markDemoAsked();
    expect(state().asked).toBe(true);
    expect(demo.askRemoveAll(state(), tiles())).toBe(false);
    expect(demo.askRemoveAll(null, [])).toBe(false);
  });

  it("ohne Beispiel-Tag tun alle Änderungen nichts", async () => {
    const demo = await load();
    demo.clearDemoTile("termine");
    demo.clearDemo();
    demo.toggleDemoDone("x");
    demo.markDemoAsked();
    expect(demo.hideDemoItem("x")).toBeTypeOf("function");
    demo.hideDemoItem("x")();
    expect(win.localStorage.getItem(KEY)).toBeNull();
  });

  it("Zurückholen, nachdem der Beispiel-Tag schon geleert wurde, tut nichts", async () => {
    const demo = await load();
    demo.startDemo();
    const undo = demo.hideDemoItem("beispiel:a2");
    demo.clearDemoStore();
    undo();
    expect(win.localStorage.getItem(KEY)).toBeNull();
  });

  it("prüft gespeicherte Daten", async () => {
    const raw = { version: 1, since: "2026-10-19", cleared: ["termine", "kladde"], done: [1, "a"], gone: "x", asked: "ja" };
    const demo = await load({ [KEY]: JSON.stringify(raw) });
    demo.toggleDemoDone("b");
    expect(state()).toEqual({ version: 1, since: "2026-10-19", cleared: ["termine"], done: ["a", "b"], gone: [], asked: false });
    const other = await load({ [KEY]: JSON.stringify({ version: 1, since: 3 }) });
    other.clearDemo();
    expect(state()).toEqual({ version: 1, since: 3 });
    const wrong = await load({ [KEY]: JSON.stringify({ version: 2, since: "2026-10-19" }) });
    wrong.clearDemo();
    expect(state().version).toBe(2);
    const empty = await load({ [KEY]: JSON.stringify({ version: 1, since: "2026-10-19" }) });
    empty.toggleDemoDone("a");
    expect(state()).toMatchObject({ cleared: [], done: ["a"], gone: [] });
  });
});

describe("Beispiel-Tag: Tagesplan", () => {
  it("nur, was heute noch kommt – sonst der Tag morgen ab dem Morgen", async () => {
    const demo = await load();
    const morning = demo.demoEntries("2026-10-20", 9 * 60, "Mia");
    expect(morning.tomorrow).toBe(false);
    const termine = morning.entries.filter((e) => e.typ === "termin");
    expect(termine[0].data.title).toBe("Kaffeepause");
    expect(morning.entries.find((e) => e.id === "beispiel:a2")!.data.title).toBe("Mia etwas fragen");
    const late = demo.demoEntries("2026-10-20", 21 * 60, "Theo");
    expect(late.tomorrow).toBe(true);
    expect(late.date).toBe("2026-10-21");
    expect(late.entries.filter((e) => e.typ === "termin")).toHaveLength(9);
    // Wochen-Aufgaben am Montag dieser Woche
    expect(late.entries.find((e) => e.id === "beispiel:a4")!.data).toMatchObject({ week: "2026-10-19" });
    expect(demo.DEMO_SHOPS.map((s) => s.shop)).toEqual(["REWE", "EDEKA", "Lidl"]);
  });
});
