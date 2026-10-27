import { describe, expect, it } from "vitest";
import { buildDays, dayAnswer, dayLook, sanitizeForecast, weatherTip, type Forecast, type ForecastDay, type ForecastHour } from "@/lib/wetter/forecast";
import { columnTone, dayExtras, dayParts, dayWords, isNight, skyFor, skyLine, sunTimes, weekSentence } from "@/lib/wetter/view";
import { fromBrightSky, fromOpenMeteo } from "@/lib/wetter/sources";

const DAY = "2026-10-24";

/** 24 Stunden; `wet` = Stunden mit echtem Regen (1 mm, 80 %), `sun` = Sonnenminuten je Tagesstunde */
function day(opts: { wet?: number[]; showerCode?: number[]; sun?: number; cloud?: number; mm?: number; prob?: number } = {}): ForecastHour[] {
  return Array.from({ length: 24 }, (_, hour) => {
    const wet = opts.wet?.includes(hour);
    return {
      date: DAY,
      hour,
      temp: 8 + (hour > 6 && hour < 16 ? hour - 6 : 2),
      code: wet ? 80 : opts.showerCode?.includes(hour) ? 80 : 2,
      rain: wet ? (opts.prob ?? 80) : opts.showerCode?.includes(hour) ? 55 : 20,
      gust: 20,
      mm: wet ? (opts.mm ?? 1) : 0,
      sun: hour >= 8 && hour <= 17 ? (opts.sun ?? 0) : 0,
      cloud: opts.cloud ?? 60,
    };
  });
}

describe("Ehrliche Tagesbeschreibung (aus den Stunden 7–21 Uhr)", () => {
  it("ein Schauer-Stündchen macht den Tag nicht zu „Regen“", () => {
    const look = dayLook(day({ wet: [14], sun: 15 }));
    expect(look.text).toBe("Schauer möglich");
    expect(look.text).not.toMatch(/^Regen/);
  });

  it("ein Schauer-Code ohne Menge zählt gar nicht (früher: schlimmster Code des Tages)", () => {
    expect(dayLook(day({ showerCode: [14], sun: 24 })).text).toBe("Sonne und Wolken");
  });

  it("5 nasse Stunden = „Regnerisch“", () => {
    expect(dayLook(day({ wet: [9, 10, 11, 15, 16] })).text).toBe("Regnerisch");
  });

  it("3 mm am Tag auch mit wenigen Stunden = „Regnerisch“", () => {
    expect(dayLook(day({ wet: [10, 11], mm: 2 })).text).toBe("Regnerisch");
  });

  it("Regen unter 50 % Wahrscheinlichkeit ist keine Regenstunde", () => {
    expect(dayLook(day({ wet: [10, 11, 12, 13, 14], prob: 40, sun: 30 })).wet).toBe(0);
  });

  it("0 mm + 7 Std. Sonne = „Sonnig“, 2–6 Std. = „Sonne und Wolken“, dichte Wolken = „Bedeckt“", () => {
    expect(dayLook(day({ sun: 42 })).text).toBe("Sonnig");
    expect(dayLook(day({ sun: 18 })).text).toBe("Sonne und Wolken");
    expect(dayLook(day({ sun: 0, cloud: 95 })).text).toBe("Bedeckt");
    expect(dayLook(day({ sun: 0, cloud: 60 })).text).toBe("Wolkig");
  });

  it("7-Tage-Zeile: Regenrisiko erst ab 30 %, Sonnenstunden nur, wenn welche da sind", () => {
    const [d] = buildDays(day({ wet: [14], sun: 6 }));
    expect(dayWords(d)).toMatch(/^Schauer möglich, \d+ bis \d+°$/);
    expect(dayExtras(d)).toEqual({ rain: "☂ 80 %", sun: "☀ 1 Std." });
    const [dry] = buildDays(day({ sun: 0 }));
    expect(dayExtras(dry)).toEqual({ rain: null, sun: null });
  });

  it("Morgens/Mittags/Abends nach derselben Regel", () => {
    const fc: Forecast = { place: "Eutin", fetchedAt: "", current: { temp: 10, code: 2 }, hours: day({ wet: [18], sun: 40 }), days: [] };
    const parts = dayParts(fc, DAY);
    expect(parts.find((p) => p.id === "mittags")?.text).toBe("Sonnig");
    expect(parts.find((p) => p.id === "abends")?.text).toBe("Schauer möglich");
    expect(parts.find((p) => p.id === "abends")?.tips.map((t) => t.text)).toContain("Schirm");
  });
});

describe("Wetter-Tipp und Mia nur bei echter Regenstunde", () => {
  const fc = (hours: ForecastHour[], raining = false): Forecast => ({ place: "Eutin", fetchedAt: "", current: { temp: 10, code: 2, raining }, hours, days: buildDays(hours) });

  it("„Ab 15 Uhr Regen“ nur mit echter Regenstunde", () => {
    expect(weatherTip(fc(day({ wet: [15] })), DAY, 10 * 60)).toBe("☂️ Ab 15 Uhr Regen");
    expect(weatherTip(fc(day({ showerCode: [15] })), DAY, 10 * 60)).toBeNull();
  });

  it("„Gerade Regen“ nur, wenn die Station gerade Regen misst", () => {
    expect(weatherTip(fc(day({ wet: [10, 16] })), DAY, 10 * 60)).toBe("☂️ Ab 16 Uhr Regen");
    expect(weatherTip(fc(day({ wet: [10, 16] }), true), DAY, 10 * 60)).toBe("☂️ Gerade Regen");
  });

  it("Mia antwortet mit denselben Texten", () => {
    const f = fc(day({ sun: 42 }));
    expect(dayAnswer(f, DAY, "Am Samstag")).toMatch(/^Am Samstag in Eutin: Sonnig, \d+ bis \d+ °C\. Etwa 7 Std\. Sonne\.$/);
  });
});

describe("Quellen: Bright Sky (DWD) und Open-Meteo (ICON) im gleichen Format", () => {
  const NOW = "2026-10-24T10:30:00Z"; // 12:30 Uhr in Berlin
  const brightRows = Array.from({ length: 24 }, (_, hour) => ({
    timestamp: `${DAY}T${String(hour).padStart(2, "0")}:00:00+02:00`,
    temperature: 10 + hour / 4,
    precipitation: hour === 14 ? 0.6 : 0,
    precipitation_probability: hour === 14 ? 70 : 10,
    sunshine: hour >= 9 && hour <= 13 ? 40 : 0,
    cloud_cover: 55,
    wind_gust_speed: 25,
    condition: hour === 14 ? "rain" : "dry",
    icon: hour === 14 ? "rain" : "partly-cloudy-day",
  }));
  const station = (minutesAgo: number, km: number, mm = 0) => ({
    weather: { timestamp: new Date(Date.parse(NOW) - minutesAgo * 60000).toISOString(), temperature: 11.4, precipitation_60: mm, cloud_cover: 80, condition: mm ? "rain" : "dry", icon: "cloudy" },
    sources: [{ distance: km * 1000 }],
  });

  it("Bright Sky: Stunden, Tage aus den Stunden, Station frisch und nah = Messung", () => {
    const f = fromBrightSky({ weather: brightRows }, station(20, 8, 0.4), "Eutin", NOW)!;
    expect(f.source).toBe("dwd");
    expect(f.hours).toHaveLength(24);
    expect(f.hours[14]).toMatchObject({ hour: 14, mm: 0.6, rain: 70, code: 61 });
    expect(f.days[0].text).toBe("Schauer möglich");
    expect(f.current).toMatchObject({ temp: 11.4, measured: true, raining: true });
  });

  it("Station veraltet oder zu weit weg → Vorhersage der aktuellen Stunde", () => {
    const old = fromBrightSky({ weather: brightRows }, station(120, 8), "Eutin", NOW)!;
    expect(old.current).toMatchObject({ measured: false, raining: false, temp: 13 });
    const far = fromBrightSky({ weather: brightRows }, station(10, 40), "Eutin", NOW)!;
    expect(far.current.measured).toBe(false);
  });

  it("Fallback Open-Meteo (DWD ICON) → gleiches Format", () => {
    const om = {
      current: { temperature_2m: 12, weather_code: 2 },
      hourly: {
        time: brightRows.map((r) => r.timestamp.slice(0, 16)),
        temperature_2m: brightRows.map((r) => r.temperature),
        weather_code: brightRows.map((r) => (r.condition === "rain" ? 61 : 2)),
        precipitation: brightRows.map((r) => r.precipitation),
        precipitation_probability: brightRows.map((r) => r.precipitation_probability),
        sunshine_duration: brightRows.map((r) => r.sunshine * 60),
        cloud_cover: brightRows.map((r) => r.cloud_cover),
        wind_gusts_10m: brightRows.map((r) => r.wind_gust_speed),
      },
    };
    const f = fromOpenMeteo(om, "Eutin", NOW)!;
    const b = fromBrightSky({ weather: brightRows }, null, "Eutin", NOW)!;
    expect(f.source).toBe("icon");
    expect(Object.keys(f.hours[0]).sort()).toEqual(Object.keys(b.hours[0]).sort());
    expect(f.days[0]).toMatchObject({ text: b.days[0].text, sun: b.days[0].sun, mm: b.days[0].mm });
  });

  it("ältere gespeicherte Daten ohne Beschreibung bleiben lesbar", () => {
    const old = { place: "Eutin", fetchedAt: NOW, current: { temp: 9, code: 61 }, hours: day().map((h) => ({ date: h.date, hour: h.hour, temp: h.temp, code: h.code, rain: h.rain, gust: h.gust })), days: [{ date: DAY, code: 61, max: 12, min: 5, rain: 90 }] };
    const f = sanitizeForecast(old)!;
    expect(f.days[0].text).toBeTruthy();
    expect(f.days[0].wet).toBe(0);
  });
});

describe("Wetter-Seite v0.47: Himmel und Wochensatz", () => {
  // Woche ab Mittwoch 21.10.2026 (Sa = 24., So = 25.)
  const WED = "2026-10-21";
  const fd = (date: string, o: Partial<ForecastDay> = {}): ForecastDay => ({ date, code: 2, text: "Sonne und Wolken", max: 12, min: 6, rain: 10, mm: 0, sun: 3, wet: 0, ...o });
  const wet = (date: string, sun = 0): ForecastDay => fd(date, { code: 61, text: "Regnerisch", rain: 85, mm: 6, wet: 5, sun });
  const dates = ["2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27"];
  const fc = (days: ForecastDay[]): Forecast => ({ place: "Eutin", fetchedAt: "", current: { temp: 9, code: 2 }, hours: [], days });

  it("nasses Wochenende – mit dem Sonnenfenster", () => {
    const days = dates.map((d) => (d === "2026-10-24" ? wet(d) : d === "2026-10-25" ? wet(d, 2) : fd(d)));
    expect(weekSentence(fc(days), WED)).toEqual({ text: "Wochenende eher nass. Am Sonntag gibt’s zwischendurch 2 Std. Sonne.", tone: "regen" });
  });

  it("trockene Woche", () => {
    expect(weekSentence(fc(dates.map((d) => fd(d))), WED)).toEqual({ text: "Die ganze Woche trocken. Gut für draußen.", tone: "sonne" });
  });

  it("Besserung ab einem Tag (und ab morgen)", () => {
    const ab = (n: number) => fc(dates.map((d, i) => (i < n ? wet(d) : fd(d))));
    expect(weekSentence(ab(3), WED)?.text).toBe("Ab Samstag wird’s freundlicher.");
    expect(weekSentence(ab(1), WED)?.text).toBe("Ab morgen wird’s freundlicher.");
  });

  it("ohne Druck-Wörter, nie Panik", () => {
    const variants = [dates.map((d) => wet(d)), dates.map((d, i) => (i % 2 ? wet(d) : fd(d))), dates.map((d, i) => (i > 3 ? wet(d) : fd(d)))];
    for (const v of variants) {
      const s = weekSentence(fc(v), WED)!.text;
      expect(s).not.toMatch(/fehlt|offen|überfällig|verpasst|musst|solltest|vergiss|Warnung|Achtung|Unwetter/i);
      expect(s.split(/[.!?](\s|$)/).filter((x) => x && x.trim()).length).toBeLessThanOrEqual(2);
    }
  });

  it("Himmel-Verlauf je Lage, nachts Nachtblau", () => {
    expect(skyFor(0)).toBe("sonne");
    expect(skyFor(2)).toBe("sonne");
    expect(skyFor(3)).toBe("wolken");
    expect(skyFor(45)).toBe("wolken");
    expect(skyFor(61)).toBe("regen");
    expect(skyFor(80)).toBe("regen");
    expect(skyFor(95)).toBe("gewitter");
    expect(skyFor(73)).toBe("schnee");
    expect(skyFor(0, true)).toBe("nacht");
    expect(skyFor(61, true)).toBe("nacht");
  });

  it("Nacht nach Sonnenauf- und -untergang (Eutin, Oktober ≈ 8:00 / 18:00)", () => {
    const { rise, set } = sunTimes(WED);
    expect(rise).toBeGreaterThan(7 * 60 + 30);
    expect(rise).toBeLessThan(8 * 60 + 30);
    expect(set).toBeGreaterThan(17 * 60 + 45);
    expect(set).toBeLessThan(18 * 60 + 45);
    expect(isNight(WED, 6 * 60 + 50)).toBe(true);
    expect(isNight(WED, 12 * 60)).toBe(false);
    expect(isNight("2026-06-21", 21 * 60 + 30)).toBe(false);
    expect(isNight(WED, 21 * 60)).toBe(true);
  });

  it("Zeile unter dem Zustand und Säulen-Farbe", () => {
    expect(skyLine(fd(WED, { min: 9, max: 12, rain: 39, sun: 3 }), "Heute")).toBe("Heute 9 bis 12° · ☂ 39 % · ☀ 3 Std.");
    expect(skyLine(fd(WED, { rain: 20, sun: 0 }))).toBe("6 bis 12°");
    expect(columnTone(fd(WED, { code: 0 }))).toBe("sonne");
    expect(columnTone(fd(WED, { code: 3 }))).toBe("wolken");
    expect(columnTone(wet(WED))).toBe("regen");
  });
});
