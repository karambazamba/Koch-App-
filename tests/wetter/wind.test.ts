// Wind (Tafel 63 B): Windsack-Stufen, Richtung als Vektor-Mittel, 8 Kürzel,
// Tageswert nur aus 7–21 Uhr, ältere Daten ohne Wind, Mia-Antworten.
import { describe, expect, it } from "vitest";
import { buildDays, sanitizeForecast, weatherQuestion, type ForecastHour } from "@/lib/wetter/forecast";
import { dirFrom, dirLong, dirShort, meanDirection, windAnswer, windLevel, windLong, windOf, windShort, windSpoken } from "@/lib/wetter/wind";

const hour = (h: number, wind?: number, dir?: number, gust = 0): ForecastHour => ({ date: "2026-10-23", hour: h, temp: 10, code: 3, rain: 0, gust, mm: 0, sun: 0, cloud: 80, ...(wind === undefined ? {} : { wind }), ...(dir === undefined ? {} : { dir }) });

describe("Windsack: drei Stufen", () => {
  it("Grenzen 19/20 und 39/40 km/h, Böen 59/60", () => {
    expect(windLevel(19)).toBe("leicht");
    expect(windLevel(20)).toBe("windig");
    expect(windLevel(39)).toBe("windig");
    expect(windLevel(40)).toBe("stuermisch");
    expect(windLevel(10, 59)).toBe("leicht");
    expect(windLevel(10, 60)).toBe("stuermisch");
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

describe("Wind in Worten", () => {
  const w = { speed: 22, gust: 30, dir: 270 };
  it("Chips: lang „22 km/h aus West“, kurz „22 km/h · W“, Böen erst ab 50", () => {
    expect(windLong(w)).toBe("22 km/h aus West");
    expect(windShort(w)).toBe("22 km/h · W");
    expect(windShort({ speed: 35, gust: 60, dir: 270 })).toBe("35 · W · Böen 60");
    expect(windShort({ speed: 35, gust: 49, dir: null })).toBe("35 km/h");
  });

  it("VoiceOver: „Wind 22 Kilometer pro Stunde aus Westen, windig“", () => {
    expect(windSpoken(w)).toBe("Wind 22 Kilometer pro Stunde aus Westen, windig");
  });

  it("Mia: „Ist es windig?“, „Woher kommt der Wind morgen?“", () => {
    expect(weatherQuestion("Ist es windig?", "2026-10-23")).toMatchObject({ date: "2026-10-23", wind: true });
    expect(weatherQuestion("Woher kommt der Wind morgen?", "2026-10-23")).toMatchObject({ date: "2026-10-24", label: "Morgen", wind: true });
    expect(weatherQuestion("Wie wird das Wetter morgen?", "2026-10-23")).toMatchObject({ wind: false });
    expect(windAnswer({ speed: 28, gust: 55, dir: 270 }, "Morgen")).toBe("Morgen wird es windig – 28 km/h aus Westen, Böen bis 55 km/h.");
    expect(windAnswer({ speed: 8, gust: 15, dir: 90 }, "Heute")).toBe("Heute weht nur ein leichter Wind – 8 km/h aus Osten.");
  });
});
