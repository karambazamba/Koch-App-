// Wetter-Regeln ohne Netz: Wetterlage, ehrliche Tage, EIN Tipp, Antworten für
// Mia, Prüfen der Server-Daten, Fragen erkennen, Seite (Tageszeiten, Satz,
// bester Tag, Himmel, Wochensatz) und die beiden Quellen-Formate.
import { describe, expect, it } from "vitest";
import {
  buildDays,
  dayAnswer,
  dayLook,
  isRainy,
  sanitizeForecast,
  todayRange,
  umbrellaAnswer,
  weatherKind,
  weatherQuestion,
  weatherTip,
  type Forecast,
  type ForecastHour,
} from "@/lib/wetter/forecast";
import { bestOutdoorDay, columnTone, dayExtras, dayParts, daySentence, dayWords, isNight, skyFor, skyLine, sunTimes, weatherGroup, weatherStartTab, weekSentence } from "@/lib/wetter/view";
import { fromBrightSky, fromOpenMeteo } from "@/lib/wetter/sources";

const TODAY = "2026-10-22"; // Donnerstag

const hour = (h: number, o: Partial<ForecastHour> = {}, date = TODAY): ForecastHour => ({ date, hour: h, temp: 10, code: 3, rain: 10, gust: 20, mm: 0, sun: 0, cloud: 60, ...o });
const day24 = (o: (h: number) => Partial<ForecastHour> = () => ({}), date = TODAY) => Array.from({ length: 24 }, (_, h) => hour(h, o(h), date));
const plus = (n: number) => {
  const d = new Date(`${TODAY}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const fcOf = (hours: ForecastHour[], current: Partial<Forecast["current"]> = {}): Forecast => ({ place: "Eutin", fetchedAt: `${TODAY}T07:00:00Z`, current: { temp: 10, code: 3, ...current }, hours, days: buildDays(hours) });
const WET = { mm: 1, rain: 80, code: 61 };

describe("Wetterlage aus dem WMO-Code", () => {
  it("alle Gruppen", () => {
    const cases: [number, string][] = [[0, "klar"], [2, "heiter"], [3, "wolkig"], [45, "nebel"], [53, "niesel"], [63, "regen"], [81, "schauer"], [75, "schnee"], [86, "schnee"], [96, "gewitter"], [30, "wolkig"]];
    for (const [code, kind] of cases) expect(weatherKind(code).kind).toBe(kind);
    expect(weatherGroup(0)).toBe("sonnig");
    expect(weatherGroup(71)).toBe("schnee");
    expect(weatherGroup(95)).toBe("gewitter");
    expect(weatherGroup(51)).toBe("regen");
    expect(weatherGroup(45)).toBe("bewoelkt");
  });

  it("ehrliche Regenstunde: ≥ 0,2 mm UND ≥ 50 %", () => {
    expect(isRainy(hour(9, { mm: 0.2, rain: 50 }))).toBe(true);
    expect(isRainy(hour(9, { mm: 0.19, rain: 99 }))).toBe(false);
    expect(isRainy(hour(9, { mm: 5, rain: 49 }))).toBe(false);
    expect(isRainy(hour(9, { code: 65, mm: 0, rain: 90 }))).toBe(false);
  });
});

describe("Ehrliche Tage", () => {
  it("Schnee und Gewitter nur ab echter Stunde", () => {
    expect(dayLook(day24((h) => (h === 12 ? { code: 73, mm: 0.5, rain: 70 } : {}))).text).toBe("Schnee");
    expect(dayLook(day24((h) => (h === 12 ? { code: 73, mm: 0, rain: 70 } : {}))).text).not.toBe("Schnee");
    expect(dayLook(day24((h) => (h === 12 ? { code: 95, mm: 2, rain: 90 } : {}))).text).toBe("Gewitter");
  });

  it("Nebel, wenn die Hälfte der Stunden neblig ist; leere Tagesstunden nehmen alle", () => {
    expect(dayLook(day24(() => ({ code: 45, cloud: 50 }))).text).toBe("Neblig");
    expect(dayLook([hour(2, { sun: 0, cloud: 30 })]).text).toBe("Wolkig");
    expect(dayLook(day24(() => ({ cloud: 95 })), false).text).toBe("Bedeckt");
  });

  it("Tage nur mit mindestens 12 Stunden; Regenrisiko aus den Tagesstunden", () => {
    const hours = [...day24((h) => ({ rain: h === 3 ? 95 : 20 })), ...Array.from({ length: 6 }, (_, h) => hour(h, {}, plus(1)))];
    const days = buildDays(hours);
    expect(days).toHaveLength(1);
    expect(days[0].rain).toBe(20);
    const night = buildDays(Array.from({ length: 12 }, (_, h) => hour(h + 22 > 23 ? h - 2 : h + 22, { rain: 40 })));
    expect(night[0].rain).toBe(40);
  });
});

describe("EIN Tipp für heute", () => {
  it("Regen zur Termin-Zeit mit gekürztem Titel; Termine vor jetzt zählen nicht", () => {
    const fc = fcOf(day24((h) => (h >= 15 && h <= 17 ? WET : {})));
    const long = "Elternabend in der Grundschule am See";
    expect(weatherTip(fc, TODAY, 9 * 60, [{ title: "Früh", time: "08:00" }, { title: long, time: "16:00" }, { title: "ohne Zeit", time: "" }])).toBe(`☂️ Ab 15 Uhr Regen – Schirm für ${long.slice(0, 23)}…`);
    expect(weatherTip(fc, TODAY, 9 * 60, [{ title: "Sport", time: "19:00" }])).toBe("☂️ Ab 15 Uhr Regen");
  });

  it("„Gerade“ nur, wenn die Station Regen misst – auch ohne Regenstunde in der Vorhersage", () => {
    const fc = fcOf(day24(), { raining: true });
    expect(weatherTip(fc, TODAY, 10 * 60, [{ title: "Bäcker", time: "10:30" }])).toBe("☂️ Gerade Regen – Schirm für Bäcker");
    expect(umbrellaAnswer(fc, TODAY, 10 * 60)).toBe("Ja, gerade regnet es in Eutin – Schirm lohnt sich ☂️");
  });

  it("Frost morgens (nur vor 11 Uhr), Sturm, Hitze (vor 18 Uhr), Wind – sonst nichts", () => {
    const frost = fcOf(day24((h) => ({ temp: h === 7 ? -1 : 4 })));
    expect(weatherTip(frost, TODAY, 8 * 60)).toBe("Heute früh glatt ❄️");
    expect(weatherTip(frost, TODAY, 12 * 60)).toBeNull();
    expect(weatherTip(fcOf(day24(() => ({ gust: 83 }))), TODAY, 9 * 60)).toBe("Sturmböen bis 85 km/h 🌬️");
    const hot = fcOf(day24((h) => ({ temp: h === 15 ? 27 : 20 })));
    expect(weatherTip(hot, TODAY, 9 * 60)).toBe("Sonnencreme einpacken ☀️");
    expect(weatherTip(hot, TODAY, 18 * 60)).toBeNull();
    expect(weatherTip(fcOf(day24(() => ({ gust: 52 }))), TODAY, 9 * 60)).toBe("Windig – Böen bis 50 km/h 🌬️");
    expect(weatherTip(fcOf(day24()), TODAY, 9 * 60)).toBeNull();
  });

  it("Tief/Hoch: aus dem Tag, sonst aus den Stunden, sonst nichts", () => {
    expect(todayRange(fcOf(day24((h) => ({ temp: h }))), TODAY)).toEqual({ min: 0, max: 23 });
    const few: Forecast = { ...fcOf([hour(8, { temp: 3.4 }), hour(9, { temp: 6.6 })]) };
    expect(few.days).toEqual([]);
    expect(todayRange(few, TODAY)).toEqual({ min: 3, max: 7 });
    expect(todayRange(few, plus(1))).toBeNull();
  });
});

describe("Antworten für Mia", () => {
  it("Tag mit Regen, eher trocken, mit Sonne, unbekannter Tag", () => {
    const wet = fcOf(day24((h) => (h >= 10 && h <= 14 ? WET : {})));
    expect(dayAnswer(wet, TODAY, "Heute")).toBe("Heute in Eutin: Regnerisch, 10 bis 10 °C. Regenrisiko 80 % – lieber einen Schirm mitnehmen ☂️");
    const dryish = fcOf(day24((h) => ({ rain: h === 12 ? 35 : 10, sun: 20 })));
    expect(dayAnswer(dryish, TODAY, "Morgen")).toBe("Morgen in Eutin: Sonne und Wolken, 10 bis 10 °C. Regenrisiko 35 %, eher trocken. Etwa 5 Std. Sonne.");
    expect(dayAnswer(dryish, plus(3), "Am Sonntag")).toBeNull();
  });

  it("Schirm: trocken, ein paar Schauer, richtig Regen", () => {
    expect(umbrellaAnswer(fcOf(day24()), TODAY, 9 * 60)).toBe("Heute bleibt es trocken in Eutin – kein Schirm nötig ☀️");
    expect(umbrellaAnswer(fcOf(day24((h) => (h === 16 ? WET : {}))), TODAY, 9 * 60)).toBe("Ab 16 Uhr sind Schauer möglich in Eutin – ein Schirm schadet nicht ☂️");
    expect(umbrellaAnswer(fcOf(day24((h) => (h >= 12 ? WET : {}))), TODAY, 9 * 60)).toBe("Ja, ab 12 Uhr regnet es in Eutin – Schirm lohnt sich ☂️");
  });

  it("Wetterfragen erkennen: heute, morgen, übermorgen, Wochentag, Schirm – sonst nichts", () => {
    expect(weatherQuestion("Wie wird das Wetter?", TODAY)).toEqual({ date: TODAY, label: "Heute", umbrella: false });
    expect(weatherQuestion("Wie wird das Wetter morgen?", TODAY)?.date).toBe(plus(1));
    // Fehler bis v0.47: \b vor „ü“ greift in JS nicht – „übermorgen“ wurde zu „Heute“
    expect(weatherQuestion("Wie wird das Wetter übermorgen?", TODAY)).toEqual({ date: plus(2), label: "Übermorgen", umbrella: false });
    expect(weatherQuestion("Brauch ich übermorgen einen Schirm?", TODAY)?.date).toBe(plus(2));
    expect(weatherQuestion("Wie wird das Wetter am Samstag?", TODAY)).toEqual({ date: plus(2), label: "Am Samstag", umbrella: false });
    expect(weatherQuestion("Wetter am Donnerstag?", TODAY)?.date).toBe(plus(7));
    expect(weatherQuestion("Brauch ich heute einen Schirm?", TODAY)?.umbrella).toBe(true);
    expect(weatherQuestion("Was gibt's heute zu essen?", TODAY)).toBeNull();
  });
});

describe("Server-Daten prüfen", () => {
  it("Unsinn → null", () => {
    expect(sanitizeForecast(null)).toBeNull();
    expect(sanitizeForecast("x")).toBeNull();
    expect(sanitizeForecast({ place: "Eutin", hours: [], days: [] })).toBeNull();
  });

  it("Zahlen werden geprüft, Quelle nur bekannte, Ort gekürzt, fehlende Zeit = 1970", () => {
    const fc = sanitizeForecast({ place: "E".repeat(80), source: "fremd", current: { temp: "warm", code: 3, measured: "ja", raining: true }, hours: [null, { date: TODAY, hour: 9, temp: NaN }], days: [{ date: TODAY, code: 0, max: 12, min: 4, rain: 5 }, null] })!;
    expect(fc.place).toHaveLength(60);
    expect(fc.source).toBeUndefined();
    expect(fc.fetchedAt).toBe(new Date(0).toISOString());
    expect(fc.current).toEqual({ temp: 0, code: 3, measured: false, raining: true });
    expect(fc.hours).toEqual([{ date: TODAY, hour: 9, temp: 0, code: 0, rain: 0, gust: 0, mm: 0, sun: 0, cloud: 0 }]);
    expect(fc.days).toEqual([{ date: TODAY, code: 0, text: "Sonnig", max: 12, min: 4, rain: 5, mm: 0, sun: 0, wet: 0 }]);
    expect(sanitizeForecast({ ...fc, source: "icon" })!.source).toBe("icon");
  });
});

describe("Wetter-Seite", () => {
  it("Tageszeiten mit Tipp-Chips (Schirm nur bei echter Regenstunde)", () => {
    const fc = fcOf(day24((h) => (h < 11 ? { temp: -1, gust: 60 } : h < 17 ? { ...WET, temp: 3 } : { temp: 27, code: 95, mm: 2, rain: 90 })));
    const parts = dayParts(fc, TODAY);
    expect(parts.map((p) => p.id)).toEqual(["morgens", "mittags", "abends"]);
    expect(parts[0].tips).toEqual(["❄️ Glatt", "🌬️ Windig"]);
    expect(parts[1].tips).toEqual(["☂️ Schirm", "🧣 Warm anziehen"]);
    expect(parts[2].tips).toEqual(["⚡ Lieber drinnen", "🧴 Sonnencreme"]);
    expect(dayParts(fcOf([hour(8)]), TODAY)).toHaveLength(1);
    expect(dayParts(fc, plus(1))).toEqual([]);
  });

  it("Zeile, Zusätze und Satz zum Tag", () => {
    const fc = fcOf(day24((h) => ({ temp: h / 2, ...(h >= 14 && h <= 15 ? WET : {}) })));
    const d = fc.days[0];
    expect(dayWords(d)).toBe("Schauer möglich, 0 bis 12°");
    expect(dayWords({ ...d, text: "" })).toBe("Schauer, 0 bis 12°");
    expect(dayExtras({ ...d, rain: 20, sun: 0.4 })).toEqual({ rain: null, sun: null });
    expect(dayExtras({ ...d, rain: 30, sun: 2.6 })).toEqual({ rain: "☂ 30 %", sun: "☀ 3 Std." });
    expect(skyLine({ ...d, sun: 0 }, "Heute")).toBe("Heute 0 bis 12° · ☂ 80 %");
    expect(skyLine({ ...d, rain: 0, sun: 0 })).toBe("0 bis 12°");
    expect(daySentence(fc, TODAY, [{ title: "Kinderarzt", time: "15:10" }])).toBe("Zu Kinderarzt um 15 Uhr regnet es – Schirm mit.");
    expect(daySentence(fc, TODAY, [{ title: "Elternabend", time: "19:00" }])).toBe("Für Elternabend bleibt es trocken.");
    expect(daySentence(fc, TODAY)).toBe("Ab 14 Uhr Schauer möglich, 0 bis 12°.");
    expect(daySentence(fc, TODAY, [], 16)).toBe("Schauer möglich, 0 bis 12°.");
    expect(daySentence(fcOf(day24((h) => (h >= 8 ? WET : {}))), TODAY)).toBe("Ab 8 Uhr Regen, 10 bis 10°.");
    expect(daySentence(fc, plus(5))).toBeNull();
  });

  it("bester Tag für draußen – nie bei Regen oder Gewitter", () => {
    const hours = [
      ...day24((h) => (h >= 9 && h <= 14 ? WET : {}), TODAY),
      ...day24(() => ({ sun: 40, temp: 19, rain: 10 }), plus(1)),
      ...day24(() => ({ temp: 20, cloud: 90 }), plus(2)),
    ];
    expect(bestOutdoorDay(fcOf(hours), TODAY)?.date).toBe(plus(1));
    expect(bestOutdoorDay(fcOf(day24(() => WET)), TODAY)).toBeNull();
    expect(weatherStartTab(17 * 60 + 59)).toBe("heute");
    expect(weatherStartTab(18 * 60)).toBe("morgen");
  });

  it("Himmel und Säulen je Lage", () => {
    expect([0, 3, 61, 95, 73, 45].map((c) => skyFor(c))).toEqual(["sonne", "wolken", "regen", "gewitter", "schnee", "wolken"]);
    expect(skyFor(0, true)).toBe("nacht");
    const base = fcOf(day24()).days[0];
    expect(columnTone({ ...base, code: 95 })).toBe("regen");
    expect(columnTone({ ...base, code: 0 })).toBe("sonne");
    expect(columnTone({ ...base, code: 3 })).toBe("wolken");
  });

  it("Sonnenzeiten mit Sommer- und Winterzeit", () => {
    const summer = sunTimes("2026-06-21");
    const winter = sunTimes("2026-12-21");
    expect(summer.set - summer.rise).toBeGreaterThan(winter.set - winter.rise);
    expect(winter.rise).toBeGreaterThan(8 * 60);
    expect(isNight("2026-12-21", 7 * 60)).toBe(true);
    expect(isNight("2026-12-21", 12 * 60)).toBe(false);
  });

  it("Wochensatz: alle Fälle", () => {
    const week = (wet: boolean[], o: { sun?: number; touch?: boolean } = {}) =>
      fcOf(wet.flatMap((w, i) => day24((h) => (w ? (h >= 8 && h <= 12 ? WET : {}) : { sun: o.sun ?? 0, ...(o.touch && i === 0 && h === 10 ? { mm: 0.3, rain: 60 } : {}) }), plus(i))));
    expect(weekSentence(week([false, false]), TODAY)).toBeNull();
    expect(weekSentence(week([false, false, false, false]), TODAY)?.text).toBe("Die ganze Woche trocken – gut für draußen.");
    expect(weekSentence(week([false, false, false], { touch: true }), TODAY)?.text).toBe("Fast die ganze Woche trocken – gut für draußen.");
    // Do Fr Sa So …: Sa+So nass, ohne Sonne
    expect(weekSentence(week([false, false, true, true, false]), TODAY)).toEqual({ text: "Wochenende eher nass. Gut für drinnen.", tone: "regen" });
    expect(weekSentence(week([true, false, false, false]), TODAY)?.text).toBe("Ab morgen wird’s freundlicher.");
    expect(weekSentence(week([true, true, false, false]), TODAY)?.text).toBe("Ab Samstag wird’s freundlicher.");
    expect(weekSentence(week([false, true, false, false, true]), TODAY)?.text).toBe("Zum Wochenende wird’s trocken – gut für draußen.");
    expect(weekSentence(week([false, false, false, true, true, true]), TODAY)?.text).toBe("Bis Samstag trocken, danach wird’s nasser.");
    expect(weekSentence(week([true, true, true]), TODAY)?.text).toBe("Eine nasse Woche – gemütlich drinnen und mit Schirm raus.");
    const mixed = weekSentence(week([true, false, true, false, true, true], { sun: 40 }), TODAY)!;
    expect(mixed.text).toBe("Wechselhaft – am besten für draußen: morgen.");
    expect(mixed.tone).toBe("regen");
  });
});

describe("Quellen-Formate", () => {
  const row = (ts: string, o: Record<string, unknown> = {}) => ({ timestamp: ts, temperature: 9, precipitation: 0, cloud_cover: 50, ...o });

  it("Bright-Sky-Zustände → Codes; doppelte Stunde (Zeitumstellung) nur einmal", () => {
    const rows = [
      row("2026-10-25T00:00:00+02:00", { condition: "thunderstorm" }),
      row("2026-10-25T01:00:00+02:00", { condition: "snow" }),
      row("2026-10-25T02:00:00+02:00", { icon: "hail" }),
      row("2026-10-25T02:00:00+01:00", { icon: "sleet" }),
      row("2026-10-25T03:00:00+01:00", { condition: "fog" }),
      row("2026-10-25T04:00:00+01:00", { icon: "clear-night" }),
      row("2026-10-25T05:00:00+01:00", { icon: "partly-cloudy-day" }),
      row("2026-10-25T06:00:00+01:00", { icon: "cloudy" }),
      row("2026-10-25T07:00:00+01:00", { icon: "wind", cloud_cover: 10 }),
      row("2026-10-25T08:00:00+01:00", { icon: "wind", cloud_cover: 50 }),
      row("2026-10-25T09:00:00+01:00", { icon: "wind", cloud_cover: 90 }),
      row("2026-10-25T10:00:00+01:00", { icon: "wind", cloud_cover: null, precipitation: 0.4, precipitation_probability_6h: 30 }),
      row("2026-10-25T11:00:00+01:00", { precipitation: 0.4, sunshine: 75 }),
      { temperature: 3 },
    ];
    const fc = fromBrightSky({ weather: rows }, null, "Eutin", "2026-10-25T10:30:00Z")!;
    expect(fc.hours.map((h) => h.code)).toEqual([95, 73, 67, 45, 0, 2, 3, 0, 2, 3, 3, 2]);
    expect(fc.hours[10].rain).toBe(30);
    expect(fc.hours[11].rain).toBe(50);
    expect(fc.hours[11].sun).toBe(60);
    expect(fc.current.measured).toBe(false);
    expect(fc.current.temp).toBe(9);
    expect(fromBrightSky({ weather: [] }, null, "Eutin", "x")).toBeNull();
    expect(fromBrightSky(null, null, "Eutin", "x")).toBeNull();
  });

  it("Station ohne Temperatur zählt nicht; leichter Niesel = misst Regen", () => {
    const rows = [row(`${TODAY}T09:00:00+02:00`)];
    const nowIso = `${TODAY}T07:10:00Z`;
    const station = (w: Record<string, unknown>) => fromBrightSky({ weather: rows }, { weather: { timestamp: `${TODAY}T09:00:00+02:00`, ...w }, sources: [{ distance: 1000 }] }, "Eutin", nowIso)!.current;
    expect(station({ temperature: null }).measured).toBe(false);
    expect(station({ temperature: 8, precipitation_30: 0.1, icon: "cloudy" })).toEqual({ temp: 8, code: 3, measured: true, raining: true });
    expect(station({ temperature: 8, icon: "cloudy" }).raining).toBe(false);
  });

  it("Open-Meteo: ohne Stunden null, ohne „current“ die aktuelle Stunde", () => {
    expect(fromOpenMeteo({}, "Eutin", "x")).toBeNull();
    expect(fromOpenMeteo({ hourly: { time: [] } }, "Eutin", "x")).toBeNull();
    const fc = fromOpenMeteo({ hourly: { time: [`${TODAY}T09:00`, `${TODAY}T10:00`], temperature_2m: [5, 6], precipitation: [0.3, null] } }, "Eutin", `${TODAY}T08:00:00Z`)!;
    expect(fc.current).toEqual({ temp: 6, code: 3, measured: false, raining: false });
    expect(fc.hours[0]).toMatchObject({ code: 3, rain: 50, mm: 0.3, sun: 0, cloud: 0 });
    expect(fc.hours[1]).toMatchObject({ rain: 0, mm: 0 });
  });
});
