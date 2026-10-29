// Tipps aus der Region auf dem Server: Schalter TIPS_SOURCE (off | demo |
// tldb), bekannte Orte ohne Netz, sonst Geocoding des Wetters, 6-Stunden-
// Speicher, täglicher Abruf – und die beiden Quellen. Kein echtes Netz.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoTips, DemoTipSource } from "@/lib/tipps/sources/demo";
import { TldbTipSource, toTip } from "@/lib/tipps/sources/tldb";
import { SCHLESWIG_HOLSTEIN } from "@/lib/tipps/sources/types";
import { openLicense } from "@/lib/tipps/model";

// Alte Tipps-Ebene ist seit A-055 versteckt (nicht gelöscht) – hier eingeschaltet geprüft
vi.mock("@/lib/tipps/alt", () => ({ ALTE_TIPPS: true }));

type Server = typeof import("@/lib/tipps/server");
let server: Server;
/** Demo-Quelle aus derselben Modul-Runde wie der Server (zum Mitzählen der Abrufe) */
let FreshDemo: typeof DemoTipSource;

const WED = "2026-10-21"; // Mittwoch

async function fresh(iso = `${WED}T09:00`) {
  vi.resetModules();
  const { at } = await import("../helpers");
  at(iso);
  server = await import("@/lib/tipps/server");
  FreshDemo = (await import("@/lib/tipps/sources/demo")).DemoTipSource;
}

const json = (body: unknown, ok = true) => ({ ok, json: async () => body }) as unknown as Response;

beforeEach(async () => {
  vi.unstubAllEnvs();
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("kein Netz"))));
  await fresh();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Schalter TIPS_SOURCE", () => {
  it("Standard off; nur demo/tldb gelten (Groß/Klein und Leerzeichen egal)", () => {
    expect(server.tipsMode()).toBe("off");
    vi.stubEnv("TIPS_SOURCE", " DEMO ");
    expect(server.tipsMode()).toBe("demo");
    vi.stubEnv("TIPS_SOURCE", "tldb");
    expect(server.tipsMode()).toBe("tldb");
    vi.stubEnv("TIPS_SOURCE", "irgendwas");
    expect(server.tipsMode()).toBe("off");
  });

  it("off: nirgends etwas – ohne Abruf", async () => {
    expect(await server.tipsNear({ ort: "Eutin", km: 20, von: WED, bis: "2026-10-31" })).toEqual({ source: "off", ort: null, tips: [] });
    expect(await server.refreshTips()).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("Demo-Quelle über den Server", () => {
  beforeEach(() => vi.stubEnv("TIPS_SOURCE", "demo"));

  it("bekannter Ort ohne Netz, Umkreis, nach Beginn sortiert, Entfernung dabei", async () => {
    const a = await server.tipsNear({ ort: " Eutin ", km: 10, von: WED, bis: "2026-10-27", today: WED });
    expect(a.source).toBe("demo");
    expect(a.ort).toEqual({ name: "Eutin", lat: 54.1376, lng: 10.6181 });
    expect(a.tips.length).toBeGreaterThan(3);
    expect(a.tips.every((t) => t.km <= 10)).toBe(true);
    expect(a.tips.map((t) => t.beginn)).toEqual([...a.tips.map((t) => t.beginn)].sort());
    expect(a.tips.every((t) => t.beginn.slice(0, 10) >= WED && t.beginn.slice(0, 10) <= "2026-10-27")).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("Ortsnamen-Varianten (Bad Malente-Gremsmühlen = Malente)", async () => {
    const a = await server.tipsNear({ ort: "Bad Malente-Gremsmühlen", km: 5, von: WED, bis: "2026-10-27", today: WED });
    expect(a.ort?.name).toBe("Malente");
  });

  it("KARAMBA nie bevorzugt: nur bei gleicher Startzeit vorn, sonst nach Zeit", async () => {
    const { tips } = await server.tipsNear({ ort: "Eutin", km: 40, von: WED, bis: "2026-10-27", today: WED });
    const k = tips.findIndex((t) => t.karamba);
    expect(k).toBeGreaterThanOrEqual(0);
    expect(tips[k].veranstalter).toBe("KARAMBA Eis");
    for (let i = 0; i < tips.length - 1; i++) {
      if (tips[i].karamba) expect(tips[i].beginn <= tips[i + 1].beginn).toBe(true);
      if (tips[i + 1].karamba) expect(tips[i].beginn < tips[i + 1].beginn).toBe(true);
    }
    expect(tips.slice(0, k).every((t) => t.beginn < tips[k].beginn)).toBe(true);
  });

  it("unbekannter Ort: Geocoding des Wetters; nicht gefunden → leer, aber Quelle genannt", async () => {
    const fn = vi.fn(async (url: string) => (url.includes("Ahrensb") ? json({ results: [{ name: "Ahrensbök", latitude: 53.99, longitude: 10.57 }] }) : json({ results: [] })));
    vi.stubGlobal("fetch", fn);
    const hit = await server.tipsNear({ ort: "Ahrensbök", km: 20, von: WED, bis: "2026-10-27", today: WED });
    expect(hit.ort).toEqual({ name: "Ahrensbök", lat: 53.99, lng: 10.57 });
    expect(hit.tips.length).toBeGreaterThan(0);
    expect(await server.tipsNear({ ort: "Atlantis", km: 20, von: WED, bis: WED })).toEqual({ source: "demo", ort: null, tips: [] });
  });

  it("Wetter-Testmodus: unbekannte Orte ohne Netz → leer", async () => {
    vi.stubEnv("WETTER_MOCK", "1");
    expect((await server.tipsNear({ ort: "Ahrensbök", km: 20, von: WED, bis: WED })).ort).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("6 Stunden zwischengespeichert, danach neu – je Zeitraum und Tag eigener Eintrag", async () => {
    let clock = 5_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => clock);
    const spy = vi.spyOn(FreshDemo.prototype, "fetchRange");
    const q = { ort: "Eutin", km: 20, von: WED, bis: "2026-10-27", today: WED };
    await server.tipsNear(q);
    await server.tipsNear(q);
    expect(spy).toHaveBeenCalledTimes(1);
    clock += 5 * 60 * 60 * 1000;
    await server.tipsNear(q);
    expect(spy).toHaveBeenCalledTimes(1);
    clock += 2 * 60 * 60 * 1000;
    await server.tipsNear(q);
    expect(spy).toHaveBeenCalledTimes(2);
    await server.tipsNear({ ...q, bis: "2026-10-28" });
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("der Speicher bleibt klein (höchstens 50 Zeiträume)", async () => {
    const spy = vi.spyOn(FreshDemo.prototype, "fetchRange");
    for (let i = 0; i < 52; i++) await server.tipsNear({ ort: "Eutin", km: 20, von: WED, bis: `2026-11-${String((i % 28) + 1).padStart(2, "0")}`, today: i < 28 ? WED : "2026-10-22" });
    expect(spy).toHaveBeenCalledTimes(52);
    // der älteste Eintrag ist rausgefallen → wird neu geholt
    await server.tipsNear({ ort: "Eutin", km: 20, von: WED, bis: "2026-11-01", today: WED });
    expect(spy).toHaveBeenCalledTimes(53);
  });

  it("ohne `today` gilt heute (Berlin); täglicher Abruf = 21 Tage, leert den Speicher", async () => {
    const spy = vi.spyOn(FreshDemo.prototype, "fetchRange");
    const a = await server.tipsNear({ ort: "Eutin", km: 40, von: WED, bis: "2026-11-11" });
    expect(a.tips.length).toBeGreaterThan(0);
    const n = await server.refreshTips();
    expect(n).toBe(demoTips(WED).filter((t) => t.beginn.slice(0, 10) <= "2026-11-11").length);
    expect(spy.mock.calls.at(-1)?.slice(0, 2)).toEqual([WED, "2026-11-11"]);
    await server.tipsNear({ ort: "Eutin", km: 40, von: WED, bis: "2026-11-11" });
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe("TLDB-Quelle (Gerüst)", () => {
  it("ohne Zugang leer – über den Server und direkt", async () => {
    vi.stubEnv("TIPS_SOURCE", "tldb");
    const a = await server.tipsNear({ ort: "Kiel", km: 20, von: WED, bis: WED, today: WED });
    expect(a).toEqual({ source: "tldb", ort: { name: "Kiel", lat: 54.3233, lng: 10.1228 }, tips: [] });
    expect(await new TldbTipSource(undefined, undefined).fetchRange(WED, WED, SCHLESWIG_HOLSTEIN)).toEqual([]);
  });

  it("mit Zugang (noch kein Abruf gebaut) leer; Umwandeln liefert noch nichts", async () => {
    const src = new TldbTipSource("https://example.invalid/api", "test-zugang");
    expect(src.id).toBe("tldb");
    expect(await src.fetchRange(WED, WED, SCHLESWIG_HOLSTEIN)).toEqual([]);
    expect(toTip({ id: 1 }, `${WED}T06:00:00Z`)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("Demo-Quelle direkt", () => {
  it("immer gleich für denselben Tag, alle als „demo“, nur offene Lizenzen", () => {
    const a = demoTips(WED);
    expect(a).toEqual(demoTips(WED));
    expect(a.length).toBeGreaterThanOrEqual(15);
    expect(a.every((t) => t.quelle === "demo" && t.id.startsWith("demo:"))).toBe(true);
    expect(a.every((t) => openLicense(t.lizenz))).toBe(true);
    expect(a.filter((t) => t.veranstalter?.startsWith("KARAMBA"))).toHaveLength(1);
    expect(a.every((t) => t.bild_url === null)).toBe(true);
  });

  it("Termine ab heute: nächster passender Wochentag, „week“ eine Woche später, ganztags ohne Zeit", () => {
    const a = demoTips(WED);
    const by = (id: string) => a.find((t) => t.quelle_id === id)!;
    expect(by("markt-mi").beginn).toBe(`${WED}T08:00`);
    expect(by("markt-mi").ende).toBe(`${WED}T13:00`);
    expect(by("kinderkino").beginn).toBe("2026-10-24T15:00");
    expect(by("vorlesen").beginn).toBe("2026-10-27T16:00");
    expect(by("herbstmarkt").beginn).toBe("2026-10-31T11:00");
    expect(by("basteln").beginn).toBe("2026-10-28T15:00");
    expect(by("indoor")).toMatchObject({ ganztags: true, beginn: "2026-10-25T00:00", ende: null });
    expect(by("markt-sa").preis_text).toBe("Eintritt frei");
    expect(by("herbstkonzert").preis_text).toBe("12 €, ermäßigt 8 €");
    expect(by("kinderkino")).toMatchObject({ lizenz: "CC BY 4.0", urheber: "Beispiel-Veranstalter", alter_ab: 6, fuer_kinder: true });
    expect(by("lauftreff")).toMatchObject({ lizenz: "CC0 1.0", urheber: null, alter_ab: null, fuer_kinder: false });
  });

  it("Zeitraum und Gebiet filtern", async () => {
    const src = new DemoTipSource(WED);
    expect(src.id).toBe("demo");
    const sat = await src.fetchRange("2026-10-24", "2026-10-24", SCHLESWIG_HOLSTEIN);
    expect(sat.length).toBeGreaterThan(0);
    expect(sat.every((t) => t.beginn.startsWith("2026-10-24"))).toBe(true);
    expect(await src.fetchRange(WED, "2026-11-30", { name: "Bayern", bbox: [47, 9, 50, 13] })).toEqual([]);
  });
});
