// „Was los?“ (A-055) in der App: Baustein Standard an für Wohnorte in
// Ostholstein (selbst aus bleibt aus), Einstellungen v2 (Umkreis, Kategorien),
// Liste einmal je Tag laden, Eintragen (Raum Familie, Link, Rückgängig),
// Zettel an der Pinnwand, Freischalten durch Mia.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { memoryStorage } from "../helpers";
import { demoEvents } from "@/lib/region/demo";

vi.mock("react", () => ({
  useState: (init: unknown) => [typeof init === "function" ? (init as () => unknown)() : init, () => {}],
  useEffect: (fn: () => void | (() => void)) => void fn(),
  useSyncExternalStore: (_s: unknown, get: () => unknown) => get(),
}));

type Client = typeof import("@/lib/region/client");
let client: Client;
let local: Storage;
const MI = "2026-10-21";
const read = (key: string) => JSON.parse(local.getItem(key) ?? "null");
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(async () => {
  local = memoryStorage();
  (globalThis as { window?: unknown }).window = { localStorage: local, sessionStorage: memoryStorage(), addEventListener() {}, removeEventListener() {} };
  vi.resetModules();
  const { at } = await import("../helpers");
  at(`${MI}T10:30`);
  client = await import("@/lib/region/client");
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as { window?: unknown }).window;
});

describe("Baustein", () => {
  it("Standard an in Ostholstein (Wetter-Ort Eutin), sonst aus", () => {
    expect(client.wasLosAn([], [], "Eutin")).toBe(true);
    expect(client.wasLosAn([], [], "Hamburg")).toBe(false);
    expect(client.wasLosAn(["regiontipps"], [], "Hamburg")).toBe(true);
    expect(client.wasLosAn([], ["regiontipps"], "Eutin")).toBe(false);
    expect(client.wasLosAnJetzt()).toBe(true);
    local.setItem("wasgibts.wetterort", JSON.stringify({ version: 1, city: "Kiel" }));
    expect(client.wasLosAnJetzt()).toBe(false);
  });

  it("selbst ausgeschaltet bleibt aus – auch in Ostholstein; wieder an geht", () => {
    expect(client.setWasLos(false)).toBe(true);
    expect(client.wasLosAnJetzt()).toBe(false);
    expect(read("wasgibts.funktionen")).toMatchObject({ version: 8, aus: ["regiontipps"] });
    expect(client.setWasLos(false)).toBe(false);
    expect(client.setWasLos(true)).toBe(true);
    expect(client.wasLosAnJetzt()).toBe(true);
    expect(read("wasgibts.funktionen").aus).toEqual([]);
  });

  it("Mia nutzt es, obwohl aus: einschalten und sagen, wo es steht (einmal)", () => {
    local.setItem("wasgibts.wetterort", JSON.stringify({ version: 1, city: "Kiel" }));
    expect(client.wasLosFreischalten()).toBe("„Was los?“ findest du in den Einstellungen.");
    expect(client.wasLosAnJetzt()).toBe(true);
    expect(client.wasLosFreischalten()).toBeNull();
  });
});

describe("Einstellungen", () => {
  it("Umkreis 15 km, alle Kategorien; ändern und für Mia mitgeben", () => {
    expect(client.useWasLosEinstellungen()).toEqual({ umkreis: 15, kategorienAus: [] });
    client.setUmkreis(30);
    client.setKategorie("markt", false);
    client.setKategorie("markt", false);
    expect(read("wasgibts.regiontipps")).toMatchObject({ version: 2, umkreis: 30, kategorienAus: ["markt"] });
    expect(client.wasLosKontext()).toEqual({ ort: "Eutin", umkreis: 30, kategorienAus: ["markt"] });
    client.setKategorie("markt", true);
    expect(client.useWasLosEinstellungen().kategorienAus).toEqual([]);
  });

  it("alte Tipps-Einstellungen (v1) werden mitgenommen: eigener Ort bleibt, 20 km → 15, 40 km → 30", async () => {
    local.setItem("wasgibts.regiontipps", JSON.stringify({ version: 1, ort: "Malente", km: 40, kalender: true, gemerkt: ["a"], uebernommen: {}, jetztAus: null }));
    expect(client.useWasLosEinstellungen().umkreis).toBe(30);
    expect(client.wasLosKontext().ort).toBe("Malente");
    local.setItem("wasgibts.regiontipps", JSON.stringify({ version: 1, km: 20 }));
    expect(client.useWasLosEinstellungen().umkreis).toBe(15);
  });
});

describe("Liste laden", () => {
  it("einmal je Tag, unbekannte Quelle = aus, kaputte Einträge fallen weg", async () => {
    const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ quelle: "demo", events: [...demoEvents(MI), { id: "x" }], status: null }) }) as unknown as Response);
    vi.stubGlobal("fetch", fetch);
    expect(client.useWasLosDaten()).toBeUndefined();
    await flush();
    const d = client.useWasLosDaten()!;
    expect(d.quelle).toBe("demo");
    expect(d.events).toHaveLength(demoEvents(MI).length);
    await client.ladeWasLos(MI);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]).toEqual([`/api/region?heute=${MI}`]);
    // Im Umkreis (15 km um Eutin): Heiligenhafen fällt weg
    expect(client.useWasLosListe()!.events.map((e) => e.id)).not.toContain("demo-hafenfest");
    expect(client.useWasLosSichtbar()).toBe(true);
  });

  it("offline: aus, nichts Kaputtes", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    expect(await client.ladeWasLos(MI)).toEqual({ quelle: "aus", events: [], status: null, failed: true });
    expect(client.useWasLosSichtbar()).toBe(false);
  });
});

describe("Aktionen", () => {
  const nw = demoEvents(MI).find((e) => e.id === "demo-nachtwaechter")!;

  it("In den Kalender: Familientermin mit Ort und Link, gemerkt, Rückgängig", async () => {
    const r = client.inDenKalender(nw)!;
    const e = read("wasgibts.eintraege").entries.find((x: { id: string }) => x.id === r.entry.id);
    expect(e).toMatchObject({ typ: "termin", raum: "familie" });
    expect(e.data).toMatchObject({ title: "Nachtwächter-Rundgang", date: "2026-10-24", start: "17:00", place: "Treffpunkt Tourist-Info, Markt 19, Eutin", link: nw.link });
    expect(client.istEingetragen(nw.id)).toBe(true);
    r.undo();
    expect(read("wasgibts.eintraege").entries.some((x: { id: string }) => x.id === r.entry.id)).toBe(false);
    expect(client.istEingetragen(nw.id)).toBe(false);
  });

  it("Mehrtägiges ab heute, ganztags ohne Uhrzeit", () => {
    const lang = demoEvents("2026-10-10").find((e) => e.id === "demo-fotografien")!;
    const r = client.inDenKalender(lang)!;
    expect(r.entry.data).toMatchObject({ date: MI, start: "", endDate: "2026-10-30" });
  });

  it("An die Pinnwand: „Sa 17:00 Nachtwächter-Rundgang · Wer kommt mit?“ (mit Rückgängig)", async () => {
    expect(client.anDiePinnwand(nw, "Felix")).toBe(true);
    const msgs = read("wasgibts.pinnwand").messages;
    expect(msgs[0].data).toMatchObject({ text: "Sa 17:00 Nachtwächter-Rundgang · Wer kommt mit?", author: "Felix" });
    const { undoLast } = await import("@/lib/core/undo");
    expect(undoLast()).toBe("Zettel an der Pinnwand");
    expect(read("wasgibts.pinnwand").messages).toHaveLength(0);
  });
});

describe("Mia schaltet „Was los?“ (volle Kontrolle)", () => {
  it("baustein_aus/baustein_an kennen „Was los?“; Übernehmen nutzt „aus bleibt aus“", async () => {
    const { toolDefinitions } = await import("@/lib/begleitung/toolset");
    const aus = toolDefinitions().find((d) => d.name === "baustein_aus")!;
    expect(JSON.stringify(aus.input_schema)).toContain("regiontipps");
    const { readFileSync } = await import("node:fs");
    expect(readFileSync("src/lib/begleitung/client.ts", "utf8")).toMatch(/op\.feature === "regiontipps" \? setWasLos\(op\.on\)/);
  });
});
