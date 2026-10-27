import { describe, expect, it } from "vitest";
import type { Forecast, ForecastHour } from "@/lib/wetter/forecast";
import { bestOutdoorDay, dayParts, daySentence, weatherGroup, weatherStartTab } from "@/lib/wetter/view";
import { HOME_TILES } from "@/lib/core/homeLayout";

const TODAY = "2026-10-21";

function forecast(rainFrom?: number): Forecast {
  const hours: ForecastHour[] = [TODAY, "2026-10-22"].flatMap((date) =>
    Array.from({ length: 24 }, (_, hour) => ({ date, hour, temp: 10, code: rainFrom !== undefined && date === TODAY && hour >= rainFrom ? 61 : 3, rain: rainFrom !== undefined && date === TODAY && hour >= rainFrom ? 80 : 5, gust: 10, mm: rainFrom !== undefined && date === TODAY && hour >= rainFrom ? 1.2 : 0, sun: 0, cloud: 80 })),
  );
  return {
    place: "Eutin",
    fetchedAt: `${TODAY}T08:00:00Z`,
    current: { temp: 10, code: 3 },
    hours,
    days: [
      { date: TODAY, code: 61, text: "Regnerisch", max: 13, min: 6, rain: 80, mm: 9, sun: 0, wet: 7 },
      { date: "2026-10-22", code: 3, text: "Wolkig", max: 14, min: 7, rain: 20, mm: 0, sun: 1, wet: 0 },
      { date: "2026-10-23", code: 0, text: "Sonnig", max: 19, min: 8, rain: 0, mm: 0, sun: 8, wet: 0 },
      { date: "2026-10-24", code: 80, text: "Schauer möglich", max: 12, min: 6, rain: 70, mm: 1, sun: 2, wet: 2 },
    ],
  };
}

describe("Wetter (B9)", () => {
  it("Standardgröße S", () => {
    expect(HOME_TILES.find((t) => t.id === "wetter")!.size).toBe("S");
  });

  it("Farbgruppen je Wetterlage", () => {
    expect(weatherGroup(0)).toBe("sonnig");
    expect(weatherGroup(3)).toBe("bewoelkt");
    expect(weatherGroup(61)).toBe("regen");
    expect(weatherGroup(73)).toBe("schnee");
    expect(weatherGroup(95)).toBe("gewitter");
  });

  it("Morgens/Mittags/Abends mit Schirm-Tipp bei Regen", () => {
    const parts = dayParts(forecast(15), TODAY);
    expect(parts.map((p) => p.id)).toEqual(["morgens", "mittags", "abends"]);
    expect(parts[0].tips.map((t) => t.text)).not.toContain("Schirm");
    expect(parts[1].tips.map((t) => t.text)).toContain("Schirm");
    expect(parts[2].tips.map((t) => t.text)).toContain("Schirm");
  });

  it("Satz mit Bezug auf Termine", () => {
    expect(daySentence(forecast(15), TODAY, [{ title: "Kinderarzt", time: "16:00" }], 12)).toBe("Zu Kinderarzt um 16 Uhr regnet es. Schirm mit.");
    expect(daySentence(forecast(), TODAY, [{ title: "Elternabend", time: "19:00" }], 12)).toBe("Für Elternabend bleibt es trocken.");
    expect(daySentence(forecast(15), TODAY, [], 12)).toBe("Ab 15 Uhr Regen, 6 bis 13°.");
  });

  it("bester Tag für draußen und ab 18 Uhr „Morgen“", () => {
    expect(bestOutdoorDay(forecast(), TODAY)?.date).toBe("2026-10-23");
    expect(weatherStartTab(17 * 60 + 59)).toBe("heute");
    expect(weatherStartTab(19 * 60)).toBe("morgen");
  });
});
