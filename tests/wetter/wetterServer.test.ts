// Wetter-Server: Testmodus-Szenarien, Bright Sky (DWD) mit Ausweichen auf
// Open-Meteo, 30-Minuten-Speicher, Geocoding und Standort → Stadt.
// Kein echtes Netz: `fetch` ist immer ersetzt.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Server = typeof import("@/lib/wetter/server");
let server: Server;

const TODAY = "2026-10-22";
const TOMORROW = "2026-10-23";

/** Bright-Sky-Zeilen für heute und morgen; `wet` = Stunden mit Regen */
function brightSkyRows(opts: { wet?: number[]; mm?: number; prob?: number | null } = {}) {
  return [TODAY, TOMORROW].flatMap((date) =>
    Array.from({ length: 24 }, (_, hour) => {
      const wet = date === TODAY && (opts.wet ?? []).includes(hour);
      return {
        timestamp: `${date}T${String(hour).padStart(2, "0")}:00:00+02:00`,
        temperature: 8 + hour / 4,
        condition: wet ? "rain" : "dry",
        icon: wet ? "rain" : "cloudy",
        precipitation: wet ? (opts.mm ?? 1) : 0,
        precipitation_probability: wet ? (opts.prob === undefined ? 80 : opts.prob) : 10,
        sunshine: 0,
        cloud_cover: 90,
        wind_gust_speed: 20,
      };
    }),
  );
}

function openMeteo() {
  const time = [TODAY, TOMORROW].flatMap((d) => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, "0")}:00`));
  return {
    hourly: {
      time,
      temperature_2m: time.map(() => 11),
      weather_code: time.map(() => 0),
      precipitation: time.map(() => 0),
      precipitation_probability: time.map(() => 0),
      sunshine_duration: time.map(() => 3600),
      cloud_cover: time.map(() => 5),
      wind_gusts_10m: time.map(() => 10),
    },
    current: { temperature_2m: 12.5, weather_code: 1 },
  };
}

const json = (body: unknown, ok = true) => ({ ok, json: async () => body }) as unknown as Response;

type Routes = { geo?: unknown; weather?: unknown; current?: unknown; icon?: unknown; reverse?: unknown };

/** fetch-Ersatz: je Dienst eine Antwort (Response), "fail" = Netzfehler */
function stubFetch(r: Routes) {
  const calls: string[] = [];
  const answer = (v: unknown) => (v === "fail" ? Promise.reject(new Error("offline")) : Promise.resolve(v as Response));
  const fn = vi.fn((url: string) => {
    calls.push(url);
    if (url.includes("geocoding-api")) return answer(r.geo ?? json({ results: [{ name: "Eutin", latitude: 54.14, longitude: 10.62 }] }));
    if (url.includes("brightsky.dev/weather")) return answer(r.weather ?? json({ weather: brightSkyRows() }));
    if (url.includes("current_weather")) return answer(r.current ?? json(null, false));
    if (url.includes("api.open-meteo.com")) return answer(r.icon ?? json(openMeteo()));
    if (url.includes("nominatim")) return answer(r.reverse ?? json({ address: { city: "Eutin" } }));
    return Promise.reject(new Error(`unerwartet: ${url}`));
  });
  vi.stubGlobal("fetch", fn);
  return calls;
}

/** Frische Module (leerer Speicher); die Zeit über at() aus derselben Modul-Runde */
async function fresh() {
  vi.resetModules();
  const { at } = await import("../helpers");
  at(`${TODAY}T09:00`);
  server = await import("@/lib/wetter/server");
}

beforeEach(async () => {
  vi.unstubAllEnvs();
  await fresh();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Testmodus (WETTER_MOCK=1) – ohne Netz", () => {
  beforeEach(() => {
    vi.stubEnv("WETTER_MOCK", "1");
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("kein Netz im Testmodus"))));
  });

  it("Regen 15–18 Uhr heute, 7 Tage, Quelle „mock“, Ort Standard Eutin", async () => {
    expect(server.weatherMock()).toBe(true);
    const fc = (await server.fetchForecast("  "))!;
    expect(fc.place).toBe("Eutin");
    expect(fc.source).toBe("mock");
    expect(fc.days).toHaveLength(7);
    expect(fc.days[0].date).toBe(TODAY);
    const wetHours = fc.hours.filter((h) => h.date === TODAY && h.mm >= 0.2 && h.rain >= 50).map((h) => h.hour);
    expect(wetHours).toEqual([15, 16, 17, 18]);
    expect(fc.days[0].text).toBe("Regnerisch");
    expect(fc.current.measured).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("jedes Szenario hat seine ehrliche Tagesbeschreibung", async () => {
    const text = async (s: string) => (await server.fetchForecast("Eutin", s))!.days[0].text;
    expect(await text("schnee")).toBe("Schnee");
    expect(await text("gewitter")).toBe("Gewitter");
    expect(await text("klar")).toBe("Sonnig");
    expect(await text("sturm")).toBe("Stürmisch");
    expect(await text("frost")).toBe("Bedeckt");
    expect(await text("wolkig")).toBe("Bedeckt");
    const heiss = (await server.fetchForecast("Eutin", "heiss"))!;
    expect(heiss.days[0].text).toBe("Sonnig");
    expect(heiss.days[0].max).toBeGreaterThanOrEqual(25);
    const frost = (await server.fetchForecast("Eutin", "frost"))!;
    expect(frost.days[0].min).toBeLessThan(0);
  });

  it("unbekanntes Szenario = Regen; `heute` setzt den Tag, ungültiges Datum wird ignoriert", async () => {
    const fc = (await server.fetchForecast("Plön", "quatsch", "2026-12-01"))!;
    expect(fc.place).toBe("Plön");
    expect(fc.days[0].date).toBe("2026-12-01");
    expect(fc.days[0].text).toBe("Regnerisch");
    const bad = (await server.fetchForecast("Plön", undefined, "morgen"))!;
    expect(bad.days[0].date).toBe(TODAY);
  });

  it("Folgetage: Montag-artiger Regentag, dann ruhiger, ein Schauer am Tag 5", async () => {
    const fc = (await server.fetchForecast("Eutin", "regen"))!;
    expect(fc.days[1].text).toBe("Regnerisch");
    expect(fc.days[4].text).toBe("Sonnig");
    expect(fc.days[5].text).toBe("Schauer möglich");
  });

  it("Standort im Testmodus = Eutin (ohne Nominatim)", async () => {
    expect(await server.placeFromCoords(53.5, 10)).toBe("Eutin");
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("Echter Abruf (fetch ersetzt)", () => {
  it("Geocoding: Treffer, kein Treffer, Fehler", async () => {
    stubFetch({});
    expect(await server.geocode("Eutin")).toEqual({ name: "Eutin", lat: 54.14, lon: 10.62 });
    stubFetch({ geo: json({ results: [] }) });
    expect(await server.geocode("Nirgendwo")).toBeNull();
    stubFetch({ geo: json({}, false) });
    expect(await server.geocode("Eutin")).toBeNull();
  });

  it("der Ortsname wird in der Adresse kodiert", async () => {
    const calls = stubFetch({});
    await server.geocode("Bad Malente-Gremsmühlen");
    expect(calls[0]).toContain(encodeURIComponent("Bad Malente-Gremsmühlen"));
  });

  it("Bright Sky (DWD) ist die Hauptquelle – mit Messung der nahen Station", async () => {
    const calls = stubFetch({
      weather: json({ weather: brightSkyRows({ wet: [15, 16] }) }),
      current: json({ weather: { timestamp: `${TODAY}T08:40:00+02:00`, temperature: 7.3, condition: "rain", icon: "rain", precipitation_10: 0.3, cloud_cover: 100 }, sources: [{ distance: 4000 }] }),
    });
    const fc = (await server.fetchForecast("Eutin"))!;
    expect(fc.source).toBe("dwd");
    expect(fc.place).toBe("Eutin");
    expect(fc.current).toEqual({ temp: 7.3, code: 61, measured: true, raining: true });
    expect(fc.days.map((d) => d.date)).toEqual([TODAY, TOMORROW]);
    expect(fc.days[0].text).toBe("Schauer möglich");
    expect(calls.some((u) => u.includes(`date=${TODAY}`) && u.includes("last_date=2026-10-29"))).toBe(true);
    expect(calls.some((u) => u.includes("//api.open-meteo.com"))).toBe(false);
  });

  it("EHRLICHE REGEL: Regen unter 50 % oder unter 0,2 mm ist keine Regenstunde", async () => {
    stubFetch({ weather: json({ weather: brightSkyRows({ wet: [10, 11, 12, 13, 14], prob: 40 }) }) });
    const low = (await server.fetchForecast("Eutin"))!;
    expect(low.days[0].wet).toBe(0);
    expect(low.days[0].text).not.toMatch(/Regen|Schauer/);

    await fresh();
    stubFetch({ weather: json({ weather: brightSkyRows({ wet: [10, 11, 12, 13, 14], mm: 0.1 }) }) });
    const drizzle = (await server.fetchForecast("Eutin"))!;
    expect(drizzle.days[0].wet).toBe(0);

    await fresh();
    stubFetch({ weather: json({ weather: brightSkyRows({ wet: [10, 11, 12, 13, 14] }) }) });
    const real = (await server.fetchForecast("Eutin"))!;
    expect(real.days[0].wet).toBe(5);
    expect(real.days[0].text).toBe("Regnerisch");
  });

  it("Station-Abruf scheitert → Vorhersage der aktuellen Stunde", async () => {
    stubFetch({ current: "fail" });
    const fc = (await server.fetchForecast("Eutin"))!;
    expect(fc.source).toBe("dwd");
    expect(fc.current.measured).toBe(false);
    expect(fc.current.temp).toBe(8 + 9 / 4);
  });

  it("Station antwortet mit kaputtem JSON → Vorhersage", async () => {
    stubFetch({ current: { ok: true, json: async () => Promise.reject(new Error("kaputt")) } });
    const fc = (await server.fetchForecast("Eutin"))!;
    expect(fc.current.measured).toBe(false);
  });

  it("Bright Sky antwortet nicht ok → Ausweichen auf Open-Meteo (DWD ICON)", async () => {
    const calls = stubFetch({ weather: json({}, false) });
    const fc = (await server.fetchForecast("Eutin"))!;
    expect(fc.source).toBe("icon");
    expect(fc.current).toEqual({ temp: 12.5, code: 1, measured: false, raining: false });
    expect(fc.days[0].text).toBe("Sonnig");
    const icon = calls.find((u) => u.includes("//api.open-meteo.com"))!;
    expect(icon).toContain("models=icon_seamless");
    expect(icon).toContain("timezone=Europe%2FBerlin");
  });

  it("Bright Sky Netzfehler oder leere Daten → Open-Meteo", async () => {
    stubFetch({ weather: "fail" });
    expect((await server.fetchForecast("Eutin"))!.source).toBe("icon");
    await fresh();
    stubFetch({ weather: json({ weather: [] }) });
    expect((await server.fetchForecast("Eutin"))!.source).toBe("icon");
  });

  it("beide Dienste weg → null (die App zeigt dann die letzten Daten)", async () => {
    stubFetch({ weather: json({}, false), icon: json({}, false) });
    expect(await server.fetchForecast("Eutin")).toBeNull();
    stubFetch({ weather: "fail", icon: "fail" });
    expect(await server.fetchForecast("Eutin")).toBeNull();
  });

  it("Ort nicht gefunden → null, ohne Wetterabruf", async () => {
    const calls = stubFetch({ geo: json({ results: [] }) });
    expect(await server.fetchForecast("Atlantis")).toBeNull();
    expect(calls.some((u) => u.includes("brightsky"))).toBe(false);
  });

  it("10 Minuten zwischengespeichert (Ort ohne Groß/Klein/Leerzeichen), danach frisch", async () => {
    let clock = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => clock);
    const calls = stubFetch({});
    const first = await server.fetchForecast("Eutin");
    const n = calls.length;
    expect(await server.fetchForecast(" eutin ")).toBe(first);
    expect(calls.length).toBe(n);
    clock += 9 * 60 * 1000;
    await server.fetchForecast("EUTIN");
    expect(calls.length).toBe(n);
    clock += 2 * 60 * 1000;
    const again = await server.fetchForecast("Eutin");
    expect(calls.length).toBeGreaterThan(n);
    expect(again).not.toBe(first);
  });

  it("ein Fehlschlag wird nicht gespeichert", async () => {
    stubFetch({ weather: "fail", icon: "fail" });
    expect(await server.fetchForecast("Eutin")).toBeNull();
    stubFetch({});
    expect((await server.fetchForecast("Eutin"))!.source).toBe("dwd");
  });
});

describe("Standort → Stadtname (Nominatim)", () => {
  it("Stadt, sonst Kleinstadt, Dorf oder Gemeinde", async () => {
    const calls = stubFetch({});
    expect(await server.placeFromCoords(54.14, 10.62)).toBe("Eutin");
    expect(calls[0]).toContain("lat=54.14");
    expect(calls[0]).toContain("lon=10.62");
    stubFetch({ reverse: json({ address: { town: "Malente" } }) });
    expect(await server.placeFromCoords(54.17, 10.56)).toBe("Malente");
    stubFetch({ reverse: json({ address: { village: "Süsel" } }) });
    expect(await server.placeFromCoords(54.08, 10.7)).toBe("Süsel");
    stubFetch({ reverse: json({ address: { municipality: "Ratekau" } }) });
    expect(await server.placeFromCoords(53.95, 10.73)).toBe("Ratekau");
  });

  it("ohne Adresse oder bei Fehler → null", async () => {
    stubFetch({ reverse: json({}) });
    expect(await server.placeFromCoords(0, 0)).toBeNull();
    stubFetch({ reverse: json({ address: { country: "Deutschland" } }) });
    expect(await server.placeFromCoords(0, 0)).toBeNull();
    stubFetch({ reverse: json({}, false) });
    expect(await server.placeFromCoords(0, 0)).toBeNull();
  });
});
