// Wind (Tafel 87): neun Stufen nach Beaufort (Grenzen), Windsack-Aussehen,
// Böen ab 60, Richtung als Vektor-Mittel, 8 Kürzel, Tageswert nur aus 7–21
// Uhr, ältere Daten ohne Wind, gleiche Wörter für Seite und Mia.
import { describe, expect, it } from "vitest";
import { buildDays, sanitizeForecast, weatherQuestion, type ForecastHour } from "@/lib/wetter/forecast";
import { dirFrom, dirLong, dirShort, gustText, stormForPlan, meanDirection, WIND_STUFEN, windAnswer, windLevel, windLine, windLong, windLook, windOf, windShort, windSpoken, windWord, windWords, windZeigen } from "@/lib/wetter/wind";

const hour = (h: number, wind?: number, dir?: number, gust = 0): ForecastHour => ({ date: "2026-10-23", hour: h, temp: 10, code: 3, rain: 0, gust, mm: 0, sun: 0, cloud: 80, ...(wind === undefined ? {} : { wind }), ...(dir === undefined ? {} : { dir }) });

describe("Windstufen nach Tafel 87 (Mittelwind, Beaufort)", () => {
  it.each([
    [0, "kaum", "Kaum Wind"],
    [11, "kaum", "Kaum Wind"],
    [12, "leicht", "Leichter Wind"],
    [19, "leicht", "Leichter Wind"],
    [20, "maessig", "Mäßiger Wind"],
    [28, "maessig", "Mäßiger Wind"],
    [29, "frisch", "Frischer Wind"],
    [38, "frisch", "Frischer Wind"],
    [39, "lebhaft", "Lebhafter Wind"],
    [49, "lebhaft", "Lebhafter Wind"],
    [50, "stark", "Starker Wind"],
    [61, "stark", "Starker Wind"],
    [62, "stuermisch", "Stürmischer Wind"],
    [74, "stuermisch", "Stürmischer Wind"],
    [75, "sturm", "Sturm"],
    [102, "sturm", "Sturm"],
    [103, "orkan", "Orkanartiger Wind"],
    [140, "orkan", "Orkanartiger Wind"],
  ] as const)("%i km/h → %s („%s“)", (speed, level, word) => {
    expect(windLevel(speed)).toBe(level);
    expect(windWord(windLevel(speed))).toBe(word);
  });

  it("gerundet wie angezeigt (11,6 → 12 = Leichter Wind), neun Stufen, Böen ändern die Stufe nicht", () => {
    expect(windLevel(11.4)).toBe("kaum");
    expect(windLevel(11.6)).toBe("leicht");
    expect(WIND_STUFEN.map((s) => s.ab)).toEqual([0, 12, 20, 29, 39, 50, 62, 75, 103]);
    expect(windLine({ speed: 10, gust: 70, dir: null }).wort).toBe("Kaum Wind");
  });

  it("Windsack: Striche ab „Lebhaft“, warm ab „Stürmisch“, rot ab „Sturm“", () => {
    expect(windLook("frisch")).toEqual({ striche: 0, ton: null, rot: false });
    expect(windLook("lebhaft")).toEqual({ striche: 1, ton: null, rot: false });
    expect(windLook("stark")).toEqual({ striche: 1, ton: null, rot: false });
    expect(windLook("stuermisch")).toEqual({ striche: 2, ton: "warm", rot: false });
    expect(windLook("sturm")).toEqual({ striche: 3, ton: "sturm", rot: true });
    expect(windLook("orkan")).toEqual({ striche: 4, ton: "sturm", rot: true });
  });
});

describe("Böen-Zusatz ab 60 km/h", () => {
  it("59 nein, 60 ja – auch wenn der Mittelwind niedriger ist", () => {
    expect(gustText({ speed: 32, gust: 59, dir: 270 })).toBeNull();
    expect(gustText({ speed: 32, gust: 60, dir: 270 })).toBe("Böen 60");
    expect(windLine({ speed: 32, gust: 85, dir: 270 })).toEqual({ wort: "Frischer Wind", zahl: "32 km/h aus West", boeen: "Böen 85" });
    expect(windLine({ speed: 32, gust: 45, dir: 270 }).boeen).toBeNull();
  });
});

describe("Windrichtung", () => {
  it("350° + 10° = Nord (Vektor, nicht Durchschnitt der Gradzahlen)", () => {
    expect(meanDirection([{ speed: 10, dir: 350 }, { speed: 10, dir: 10 }])).toBe(0);
    expect(dirShort(meanDirection([{ speed: 10, dir: 350 }, { speed: 10, dir: 10 }])!)).toBe("N");
    // gewichtet nach Stärke: der starke Westwind gewinnt
    expect(dirShort(meanDirection([{ speed: 30, dir: 270 }, { speed: 5, dir: 90 }])!)).toBe("W");
    expect(meanDirection([])).toBeNull();
  });

  it("0–360° auf 8 Kürzel, Grenzen bei 22,5°", () => {
    expect([0, 22, 23, 45, 67, 68, 90, 135, 180, 225, 270, 315, 337, 338, 360].map(dirShort)).toEqual(["N", "N", "NO", "NO", "NO", "O", "O", "SO", "S", "SW", "W", "NW", "NW", "N", "N"]);
    expect(dirLong(270)).toBe("West");
    expect(dirFrom(270)).toBe("aus Westen");
    expect(dirLong(-90)).toBe("West");
  });
});

describe("Tageswert und Tageszeiten", () => {
  it("nur aus 7–21 Uhr: höchste Windstärke, stärkste Böe, Richtung", () => {
    const hs = [hour(3, 60, 90, 90), hour(8, 12, 260, 20), hour(14, 28, 280, 45), hour(20, 18, 270, 30), hour(23, 50, 90, 80)];
    expect(windOf(hs, true)).toEqual({ speed: 28, gust: 45, dir: 273 });
    // ganzer Tag aus den Stunden gebaut (mindestens 12 Stunden)
    const day = Array.from({ length: 24 }, (_, h) => hour(h, h >= 7 && h <= 21 ? 22 : 60, 270, 30));
    expect(buildDays(day)[0].wind).toEqual({ speed: 22, gust: 30, dir: 270 });
  });

  it("alte Daten ohne Wind: keine Anzeige statt „0 km/h“", () => {
    expect(windOf([hour(10), hour(12)], true)).toBeNull();
    const fc = sanitizeForecast({ place: "Eutin", fetchedAt: "2026-10-23T08:00:00Z", current: { temp: 10, code: 3 }, hours: Array.from({ length: 24 }, (_, h) => hour(h)), days: [] });
    expect(fc?.hours[10]).not.toHaveProperty("wind");
    expect(fc?.days[0].wind).toBeNull();
    // neue Daten behalten Wind und Richtung
    const neu = sanitizeForecast({ place: "Eutin", fetchedAt: "2026-10-23T08:00:00Z", current: { temp: 10, code: 3 }, hours: Array.from({ length: 24 }, (_, h) => hour(h, 22, 270, 30)), days: [] });
    expect(neu?.days[0].wind).toEqual({ speed: 22, gust: 30, dir: 270 });
  });
});

describe("Wind in Worten (Seite, VoiceOver und Mia mit denselben Wörtern)", () => {
  const w = { speed: 22, gust: 30, dir: 270 };
  it("Chips: lang „22 km/h aus West“, kurz „22 km/h · W“, Böen erst ab 60", () => {
    expect(windLong(w)).toBe("22 km/h aus West");
    expect(windShort(w)).toBe("22 km/h · W");
    expect(windShort({ speed: 35, gust: 60, dir: 270 })).toBe("35 · W · Böen 60");
    expect(windShort({ speed: 35, gust: 59, dir: null })).toBe("35 km/h");
  });

  it("VoiceOver: „Mäßiger Wind, 22 Kilometer pro Stunde aus Westen“", () => {
    expect(windSpoken(w)).toBe("Mäßiger Wind, 22 Kilometer pro Stunde aus Westen");
    expect(windSpoken({ speed: 80, gust: 110, dir: null })).toBe("Sturm, 80 Kilometer pro Stunde, Böen bis 110 Kilometer pro Stunde");
  });

  it("Mia: „Ist es windig?“, „Woher kommt der Wind morgen?“", () => {
    expect(weatherQuestion("Ist es windig?", "2026-10-23")).toMatchObject({ date: "2026-10-23", wind: true });
    expect(weatherQuestion("Woher kommt der Wind morgen?", "2026-10-23")).toMatchObject({ date: "2026-10-24", label: "Morgen", wind: true });
    expect(weatherQuestion("Wie wird das Wetter morgen?", "2026-10-23")).toMatchObject({ wind: false });
    expect(windAnswer({ speed: 28, gust: 55, dir: 270 }, "Morgen")).toBe("Morgen: Mäßiger Wind, 28 km/h aus Westen.");
    expect(windAnswer({ speed: 32, gust: 85, dir: 270 }, "Heute")).toBe("Heute: Frischer Wind, 32 km/h aus Westen, Böen bis 85 km/h.");
    expect(windAnswer({ speed: 8, gust: 15, dir: 90 }, "Heute")).toBe("Heute: Kaum Wind, 8 km/h aus Osten.");
    expect(windWords({ speed: 64, gust: 90, dir: null })).toBe("Stürmischer Wind, 64 km/h, Böen bis 90 km/h");
  });
});

describe("Jetzt-Karte: Wind nur ab „Stürmisch“ und nur mit Planbezug", () => {
  const D = "2026-10-23";
  const day = (wind: (h: number) => number) => Array.from({ length: 24 }, (_, h) => ({ ...hour(h, wind(h), 270, 90), date: D }));
  const plan = (title: string, time = "16:00") => [{ key: "p", title, time }];

  it("„Stürmisch ab 14 Uhr“ + passende Frage zum Plan", () => {
    const hs = day((h) => (h >= 14 ? 65 : 30));
    expect(stormForPlan(hs, D, 10, plan("Trampolin aufbauen"))).toMatchObject({ key: "p", head: "Stürmisch ab 14 Uhr", detail: "Trampolin sichern?" });
    expect(stormForPlan(hs, D, 10, plan("Grillen bei Oma"))?.detail).toBe("Grill lieber drinnen lassen?");
    expect(stormForPlan(hs, D, 10, plan("Wäsche aufhängen"))?.detail).toBe("Wäsche lieber drinnen trocknen?");
    expect(stormForPlan(hs, D, 10, plan("Mit dem Rad zur Oma"))?.detail).toBe("Heute lieber ohne Rad?");
    expect(stormForPlan(hs, D, 10, plan("Fußball Mathis"))?.detail).toBe("Fußball Mathis lieber drinnen?");
    // A-054: langer Titel nie mit „…“ gekürzt
    expect(stormForPlan(hs, D, 10, plan("Kindergeburtstag im Stadtpark mit allen"))?.detail).toBe("Kindergeburtstag im Stadtpark mit allen lieber drinnen?");
  });

  it("Sturm/Orkan mit eigenem Wort; ab jetzt gerechnet", () => {
    expect(stormForPlan(day((h) => (h >= 12 ? 80 : 30)), D, 10, plan("Garten"))?.head).toBe("Sturm ab 12 Uhr");
    expect(stormForPlan(day(() => 110), D, 10, plan("Garten"))?.head).toBe("Orkan ab 10 Uhr");
  });

  it("unter „Stürmisch“ (61 km/h, auch mit Böen 90), Plan vorher oder ohne Winddaten: nichts", () => {
    expect(stormForPlan(day(() => 61), D, 10, plan("Trampolin"))).toBeNull();
    expect(stormForPlan(day((h) => (h >= 18 ? 70 : 30)), D, 10, plan("Trampolin"))).toBeNull();
    expect(stormForPlan(day(() => 70), D, 10, [])).toBeNull();
    const old = day(() => 70).map((h) => ({ ...h, wind: undefined }));
    expect(stormForPlan(old, D, 10, plan("Trampolin"))).toBeNull();
  });
});

describe("Windsack und Wind-Zeile erst, wenn der Wind auffällt", () => {
  const w = (speed: number, gust = 0) => ({ speed, gust, dir: 270 });
  it("10 km/h → nichts", () => expect(windZeigen(w(10, 16))).toBe(false));
  it("30 km/h → „Frischer Wind“", () => {
    expect(windZeigen(w(30, 40))).toBe(true);
    expect(windLine(w(30, 40)).wort).toBe("Frischer Wind");
  });
  it("Böen 65 bei 20 km/h → zeigen mit „Böen 65“", () => {
    expect(windZeigen(w(20, 65))).toBe(true);
    expect(windLine(w(20, 65)).boeen).toBe("Böen 65");
  });
  it.each([
    [28, 0, false],
    [29, 0, true],
    [20, 59, false],
    [20, 60, true],
  ])("Grenze: %i km/h, Böen %i → %s", (speed, gust, show) => expect(windZeigen(w(speed, gust))).toBe(show));
  it("ohne Winddaten nichts", () => {
    expect(windZeigen(null)).toBe(false);
    expect(windZeigen(undefined)).toBe(false);
  });
});

describe("Wetter-Seite: unter der Schwelle nur klein die Zahl", () => {
  it("Himmel-Karte, Tagesabschnitte und Wochen-Band fragen windZeigen", async () => {
    const { readFileSync } = await import("node:fs");
    const parts = readFileSync("src/components/wetter/WeatherParts.tsx", "utf8");
    const view = readFileSync("src/components/wetter/WeatherView.tsx", "utf8");
    expect(parts).toMatch(/windZeigen\(wind\) && <WindChip/);
    expect(parts).toMatch(/windZeigen\(d\.wind\) && <Windsock/);
    expect(view).toMatch(/windZeigen\(part\.wind\) \? <WindChip[^:]+: <WindZahl/);
  });
});
