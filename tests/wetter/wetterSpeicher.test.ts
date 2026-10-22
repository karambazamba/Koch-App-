// Wetter in der App: Ort (`wasgibts.wetterort`), letzte Vorhersage
// (`wasgibts.wetterdaten`, offline „Stand 8:10“), Abruf höchstens alle
// 30 Minuten über /api/wetter, Standort → Stadt. fetch und React sind ersetzt.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { at, memoryStorage } from "../helpers";
import type { Forecast } from "@/lib/wetter/forecast";

// React-Hooks ohne Renderer: Zustand = Startwert, Effekte laufen sofort
const effects: (() => void)[] = [];
const setters: unknown[] = [];
vi.mock("react", () => ({
  useState: (init: unknown) => [typeof init === "function" ? (init as () => unknown)() : init, (v: unknown) => setters.push(v)],
  useEffect: (fn: () => void | (() => void)) => {
    const cleanup = fn();
    if (cleanup) effects.push(cleanup);
  },
  useSyncExternalStore: (_sub: unknown, get: () => unknown) => get(),
}));

import * as client from "@/lib/wetter/client";
let local: Storage;
let session: Storage;

const TODAY = "2026-10-22";

function forecast(place = "Eutin", fetchedAt = `${TODAY}T07:00:00.000Z`): Forecast {
  const hours = Array.from({ length: 24 }, (_, hour) => ({ date: TODAY, hour, temp: 10, code: 3, rain: 10, gust: 20, mm: 0, sun: 0, cloud: 90 }));
  return { place, fetchedAt, source: "dwd", current: { temp: 10, code: 3, measured: false, raining: false }, hours, days: [] };
}

const json = (body: unknown, ok = true) => ({ ok, json: async () => body }) as unknown as Response;

beforeEach(() => {
  at(`${TODAY}T09:00`); // = 07:00 UTC
  local = memoryStorage();
  session = memoryStorage();
  (globalThis as { window?: unknown }).window = { localStorage: local, sessionStorage: session, addEventListener() {}, removeEventListener() {} };
  effects.length = 0;
  setters.length = 0;
});

afterEach(() => {
  effects.forEach((c) => c());
  vi.unstubAllGlobals();
  vi.useRealTimers();
  delete (globalThis as { window?: unknown }).window;
});

describe("Wetter-Ort", () => {
  it("Standard Eutin; speichern kürzt auf 60 Zeichen, leer = Eutin", () => {
    expect(client.loadPlace()).toBe("Eutin");
    client.savePlace("  Malente ");
    expect(client.loadPlace()).toBe("Malente");
    expect(JSON.parse(local.getItem("wasgibts.wetterort")!)).toEqual({ version: 1, city: "Malente" });
    client.savePlace("x".repeat(80));
    expect(client.loadPlace()).toHaveLength(60);
    client.savePlace("   ");
    expect(client.loadPlace()).toBe("Eutin");
  });

  it("falsche oder fremde Versionen werden nicht übernommen", () => {
    local.setItem("wasgibts.wetterort", JSON.stringify({ version: 2, city: "Kiel" }));
    expect(client.loadPlace()).toBe("Eutin");
    local.setItem("wasgibts.wetterort", JSON.stringify({ version: 1, city: "" }));
    expect(client.loadPlace()).toBe("Eutin");
    local.setItem("wasgibts.wetterort", "kaputt{");
    expect(client.loadPlace()).toBe("Eutin");
  });

  it("usePlace liest denselben Speicher", () => {
    expect(client.usePlace()).toBe("Eutin");
    client.savePlace("Plön");
    expect(client.usePlace()).toBe("Plön");
  });
});

describe("Letzte Vorhersage und Abruf", () => {
  it("ohne gespeicherte Daten: Abruf über /api/wetter mit heute, gespeichert mit Ort und Abrufzeit", async () => {
    const fn = vi.fn(async () => json(forecast("eutin", "2020-01-01T00:00:00Z")));
    vi.stubGlobal("fetch", fn);
    const fc = await client.refreshForecast("Eutin");
    expect(fn).toHaveBeenCalledWith(`/api/wetter?ort=Eutin&heute=${TODAY}`);
    expect(fc?.place).toBe("eutin");
    const saved = client.loadForecast()!;
    expect(saved.place).toBe("Eutin");
    expect(saved.fetchedAt).toBe(`${TODAY}T07:00:00.000Z`);
  });

  it("frische Daten (unter 30 Min) für denselben Ort → kein Abruf; force holt neu", async () => {
    local.setItem("wasgibts.wetterdaten", JSON.stringify({ version: 1, forecast: forecast("Eutin", `${TODAY}T06:45:00.000Z`) }));
    const fn = vi.fn(async () => json(forecast()));
    vi.stubGlobal("fetch", fn);
    expect((await client.refreshForecast("EUTIN"))?.place).toBe("Eutin");
    expect(fn).not.toHaveBeenCalled();
    await client.refreshForecast("Eutin", true);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("alte Daten (über 30 Min) oder anderer Ort → neu holen", async () => {
    local.setItem("wasgibts.wetterdaten", JSON.stringify({ version: 1, forecast: forecast("Eutin", `${TODAY}T06:20:00.000Z`) }));
    const fn = vi.fn(async () => json(forecast()));
    vi.stubGlobal("fetch", fn);
    await client.refreshForecast("Eutin");
    await client.refreshForecast("Plön");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(client.loadForecast()?.place).toBe("Plön");
  });

  it("zwei gleichzeitige Abrufe teilen sich eine Anfrage", async () => {
    let release: (r: Response) => void = () => {};
    const fn = vi.fn(() => new Promise<Response>((r) => (release = r)));
    vi.stubGlobal("fetch", fn);
    const a = client.refreshForecast("Eutin");
    const b = client.refreshForecast("Eutin");
    release(json(forecast()));
    expect(await a).toEqual(await b);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("Testmodus: Szenario aus der Sitzung wird mitgeschickt", async () => {
    session.setItem("wasgibts.wetterszenario", "schnee");
    const fn = vi.fn(async () => json(forecast()));
    vi.stubGlobal("fetch", fn);
    await client.refreshForecast("Bad Segeberg");
    expect(fn).toHaveBeenCalledWith(`/api/wetter?ort=Bad%20Segeberg&heute=${TODAY}&szenario=schnee`);
  });

  it("ohne Sitzungsspeicher (privater Modus) geht es trotzdem", async () => {
    (globalThis as { window?: unknown }).window = {
      localStorage: local,
      get sessionStorage(): Storage {
        throw new Error("gesperrt");
      },
      addEventListener() {},
      removeEventListener() {},
    };
    const fn = vi.fn(async () => json(forecast()));
    vi.stubGlobal("fetch", fn);
    await client.refreshForecast("Eutin");
    expect(fn).toHaveBeenCalledWith(`/api/wetter?ort=Eutin&heute=${TODAY}`);
  });

  it("offline, Fehlerantwort oder Unsinn → null, die letzten Daten bleiben", async () => {
    const old = forecast("Eutin", `${TODAY}T05:00:00.000Z`);
    local.setItem("wasgibts.wetterdaten", JSON.stringify({ version: 1, forecast: old }));
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    expect(await client.refreshForecast("Eutin")).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => json({}, false)));
    expect(await client.refreshForecast("Eutin")).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => json({ unsinn: true })));
    expect(await client.refreshForecast("Eutin")).toBeNull();
    expect(client.loadForecast()?.fetchedAt).toBe(old.fetchedAt);
  });

  it("gespeicherte Daten in falscher Version oder kaputt → keine", () => {
    local.setItem("wasgibts.wetterdaten", JSON.stringify({ version: 2, forecast: forecast() }));
    expect(client.loadForecast()).toBeNull();
    local.setItem("wasgibts.wetterdaten", JSON.stringify({ version: 1, forecast: { place: 3 } }));
    expect(client.loadForecast()).toBeNull();
  });

  it("ältere Daten ohne neue Felder werden beim Lesen neu beschrieben (Tage aus den Stunden)", () => {
    const old = { ...forecast(), days: [{ date: TODAY, code: 61, max: 12, min: 4, rain: 90 }] };
    local.setItem("wasgibts.wetterdaten", JSON.stringify({ version: 1, forecast: old }));
    const fc = client.loadForecast()!;
    expect(fc.days).toHaveLength(1);
    expect(fc.days[0].text).toBe("Bedeckt");
  });
});

describe("Standort → Ort", () => {
  const geo = (pos: unknown) => ({ geolocation: { getCurrentPosition: (ok: (p: unknown) => void, fail: () => void) => (pos ? ok(pos) : fail()) } });
  const POS = { coords: { latitude: 54.13761, longitude: 10.61812 } };

  it("ohne Ortung im Browser → null", async () => {
    vi.stubGlobal("navigator", {});
    expect(await client.placeFromLocation()).toBeNull();
    vi.stubGlobal("navigator", undefined);
    expect(await client.placeFromLocation()).toBeNull();
  });

  it("abgelehnt → null, ohne Abruf", async () => {
    vi.stubGlobal("navigator", geo(null));
    const fn = vi.fn();
    vi.stubGlobal("fetch", fn);
    expect(await client.placeFromLocation()).toBeNull();
    expect(fn).not.toHaveBeenCalled();
  });

  it("nur grob gerundete Koordinaten gehen an den Server, zurück kommt nur die Stadt", async () => {
    vi.stubGlobal("navigator", geo(POS));
    const fn = vi.fn(async () => json({ ort: "Eutin" }));
    vi.stubGlobal("fetch", fn);
    expect(await client.placeFromLocation()).toBe("Eutin");
    expect(fn).toHaveBeenCalledWith("/api/wetter?lat=54.14&lon=10.62");
  });

  it("Server ohne Ort, Fehler oder offline → null", async () => {
    vi.stubGlobal("navigator", geo(POS));
    vi.stubGlobal("fetch", vi.fn(async () => json({})));
    expect(await client.placeFromLocation()).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => json({}, false)));
    expect(await client.placeFromLocation()).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    expect(await client.placeFromLocation()).toBeNull();
  });
});

describe("useForecast (Kachel)", () => {
  it("frische Daten: nicht veraltet, kein Fehler; Abruf alle 30 Min", async () => {
    vi.useFakeTimers();
    local.setItem("wasgibts.wetterdaten", JSON.stringify({ version: 1, forecast: forecast("Eutin", `${TODAY}T06:50:00.000Z`) }));
    const fn = vi.fn(async () => json(forecast()));
    vi.stubGlobal("fetch", fn);
    const r = client.useForecast();
    expect(r).toMatchObject({ stale: false, failed: false, place: "Eutin" });
    expect(r.forecast?.place).toBe("Eutin");
    expect(fn).not.toHaveBeenCalled();
    at(`${TODAY}T09:40`);
    await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    expect(fn).toHaveBeenCalledTimes(1);
    effects.forEach((c) => c());
    effects.length = 0;
    await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("Daten für einen anderen Ort zählen nicht; alte Daten = „Stand …“", async () => {
    local.setItem("wasgibts.wetterdaten", JSON.stringify({ version: 1, forecast: forecast("Kiel") }));
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    expect(client.useForecast().forecast).toBeNull();
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(setters).toContain(true);

    local.setItem("wasgibts.wetterdaten", JSON.stringify({ version: 1, forecast: forecast("Eutin", `${TODAY}T05:00:00.000Z`) }));
    const r = client.useForecast();
    expect(r.stale).toBe(true);
    expect(r.failed).toBe(false);
  });
});
