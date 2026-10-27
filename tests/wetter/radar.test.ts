// Wetter „jetzt“ genauer: „Gerade Regen“ nur, wenn das DWD-Regenradar am Ort
// JETZT Niederschlag zeigt; hört es auf → „Regen hat aufgehört“; Radar fehlt
// → wie bisher. Station nur ≤ 10 km und ≤ 40 Min alt.
import { describe, expect, it } from "vitest";
import { fromBrightSky, fromRadar } from "@/lib/wetter/sources";

const NOW = "2026-10-22T08:00:00.000Z"; // 10:00 Berlin
const rows = (rainHour: number | null = null) =>
  Array.from({ length: 24 }, (_, hour) => ({
    timestamp: `2026-10-22T${String(hour).padStart(2, "0")}:00:00+02:00`,
    temperature: 10,
    condition: hour === rainHour ? "rain" : "dry",
    icon: hour === rainHour ? "rain" : "cloudy",
    precipitation: hour === rainHour ? 1 : 0,
    precipitation_probability: hour === rainHour ? 80 : 10,
    sunshine: 0,
    cloud_cover: 90,
    wind_gust_speed: 10,
  }));

/** Radar: Werte je 5 Minuten (0,01 mm) an der Stelle des Orts, letzter = jetzt */
const radar = (values: number[]) => ({
  latlon_position: { x: 1.4, y: 1.2 },
  radar: values.map((v, i) => ({
    timestamp: new Date(Date.parse(NOW) - (values.length - 1 - i) * 5 * 60_000).toISOString(),
    precipitation_5: [
      [0, 0, 0],
      [0, v, 0],
      [0, 0, 0],
    ],
  })),
});
const station = (o: { mm?: number; km?: number; ageMin?: number; condition?: string } = {}) => ({
  weather: { timestamp: new Date(Date.parse(NOW) - (o.ageMin ?? 10) * 60_000).toISOString(), temperature: 9.4, precipitation_60: o.mm ?? 0, condition: o.condition ?? "dry", icon: "cloudy", cloud_cover: 90 },
  sources: [{ distance: (o.km ?? 5) * 1000 }],
});

describe("Radar am Ort", () => {
  it("liest nur die Zelle des Orts", () => {
    expect(fromRadar(radar([0, 0, 5]), NOW)).toEqual({ now: true, recent: false });
    expect(fromRadar(radar([5, 3, 0]), NOW)).toEqual({ now: false, recent: true });
    expect(fromRadar(radar([0, 0, 1]), NOW)).toEqual({ now: false, recent: false });
    expect(fromRadar(null, NOW)).toBeNull();
    expect(fromRadar({ radar: [] }, NOW)).toBeNull();
  });

  it("Regen fängt an: Radar zeigt jetzt Regen, auch wenn die Stunde trocken ist", () => {
    const f = fromBrightSky({ weather: rows() }, station(), "Eutin", NOW, fromRadar(radar([0, 0, 8]), NOW))!;
    expect(f.current.raining).toBe(true);
    expect([61, 67, 73, 95]).toContain(f.current.code);
  });

  it("Regen hört auf: Station hat in der Stunde Regen gesammelt, Radar ist jetzt trocken", () => {
    const f = fromBrightSky({ weather: rows(10) }, station({ mm: 1.2, condition: "rain" }), "Eutin", NOW, fromRadar(radar([9, 6, 0]), NOW))!;
    expect(f.current.raining).toBe(false);
    expect(f.current.stopped).toBe(true);
    expect([61, 67, 73, 95]).not.toContain(f.current.code);
  });

  it("Radar fehlt: wie bisher (Station), ohne Fehler", () => {
    const f = fromBrightSky({ weather: rows() }, station({ mm: 1.2, condition: "rain" }), "Eutin", NOW, null)!;
    expect(f.current.raining).toBe(true);
    expect(f.current.stopped).toBeUndefined();
  });

  it("Station nur ≤ 10 km und ≤ 40 Minuten alt, sonst Vorhersage der Stunde", () => {
    expect(fromBrightSky({ weather: rows() }, station({ km: 8, ageMin: 30 }), "Eutin", NOW)!.current).toMatchObject({ temp: 9.4, measured: true });
    expect(fromBrightSky({ weather: rows() }, station({ km: 12 }), "Eutin", NOW)!.current).toMatchObject({ temp: 10, measured: false });
    expect(fromBrightSky({ weather: rows() }, station({ ageMin: 45 }), "Eutin", NOW)!.current).toMatchObject({ temp: 10, measured: false });
  });
});
