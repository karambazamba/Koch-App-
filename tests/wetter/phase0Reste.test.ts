// Phase-0-Reste (Wetter, Timer): Stundenleiste der nächsten 12 Stunden,
// Tipp-Chips ohne Emojis, Titel „Wetter“ mit Ort darunter; laufender Timer
// auf der Jetzt-Karte öffnet nie die Fehlerseite /timer.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dayParts, nextHours } from "@/lib/wetter/view";
import type { Forecast, ForecastHour } from "@/lib/wetter/forecast";

const hour = (date: string, h: number, rain = 0, mm = 0): ForecastHour => ({ date, hour: h, temp: 10 + h / 10, code: rain ? 61 : 1, rain, gust: 10, mm, sun: 0, cloud: 50 });
const fc = (): Forecast =>
  ({ hours: [...Array.from({ length: 24 }, (_, h) => hour("2026-10-23", h, h >= 15 ? 80 : 0, h >= 15 ? 1 : 0)), ...Array.from({ length: 24 }, (_, h) => hour("2026-10-24", h))], days: [], current: { temp: 12, code: 1 } }) as unknown as Forecast;

describe("Wetter: Stundenleiste", () => {
  it("12 Stunden ab jetzt, erste heißt „Jetzt“, auch über Mitternacht", () => {
    const h = nextHours(fc(), "2026-10-23", 20, true);
    expect(h).toHaveLength(12);
    expect(h[0].label).toBe("Jetzt");
    expect(h[1].label).toBe("21 Uhr");
    expect(h[4].key).toBe("2026-10-24-0");
  });

  it("morgen ab 7 Uhr, ohne „Jetzt“", () => {
    const h = nextHours(fc(), "2026-10-24", 7, false);
    expect(h[0].label).toBe("7 Uhr");
  });

  it("Tipp-Chips mit Linien-Symbol statt Emoji", () => {
    const tips = dayParts(fc(), "2026-10-23").flatMap((p) => p.tips);
    expect(tips).toContainEqual({ icon: "schirm", text: "Schirm" });
    for (const t of tips) expect(t.text).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("Seite: Titel „Wetter“, Ort klein darunter, Stundenleiste unter der Karte", () => {
    const src = readFileSync("src/components/wetter/WeatherView.tsx", "utf8");
    expect(src).toContain('<PageHeader title="Wetter" subtitle={place}');
    expect(src).toContain("<HourStrip");
  });
});

describe("Timer auf der Jetzt-Karte", () => {
  it("ohne Timer-Kachel das Timer-Fenster, nie /timer", () => {
    const src = readFileSync("src/components/heute/TodayPage.tsx", "utf8");
    expect(src).not.toContain('"/timer"');
    expect(src).toMatch(/setTimerOpen\(true\)/);
  });
});
