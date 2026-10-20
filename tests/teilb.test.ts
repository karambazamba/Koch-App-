import { describe, expect, it } from "vitest";
import { tomorrowLabel } from "@/lib/aufgaben/model";
import { createEntry } from "@/lib/core/entries";
import type { CalendarEntry } from "@/lib/aufgaben/model";
import { EMPTY_SPORT, createTraining, freeStarts, lastTraining, plannedOn } from "@/lib/sport/model";
import type { Forecast, ForecastHour } from "@/lib/wetter/forecast";
import { bestOutdoorDay, dayParts, daySentence, weatherGroup, weatherStartTab } from "@/lib/wetter/view";
import { PHASES } from "@/lib/tagesablauf/phases";
import { HOME_TILES } from "@/lib/core/homeLayout";
import { at } from "./helpers";

const TODAY = "2026-10-21";
const termin = (title: string, date: string, start: string, extra: Record<string, unknown> = {}) =>
  createEntry("termin", { title, date, start, reminder: "aus", repeat: null, ...extra }, { raum: "familie" }) as CalendarEntry;

function forecast(rainFrom?: number): Forecast {
  const hours: ForecastHour[] = [TODAY, "2026-10-22"].flatMap((date) =>
    Array.from({ length: 24 }, (_, hour) => ({ date, hour, temp: 10, code: rainFrom !== undefined && date === TODAY && hour >= rainFrom ? 61 : 3, rain: rainFrom !== undefined && date === TODAY && hour >= rainFrom ? 80 : 5, gust: 10 })),
  );
  return {
    place: "Eutin",
    fetchedAt: `${TODAY}T08:00:00Z`,
    current: { temp: 10, code: 3 },
    hours,
    days: [
      { date: TODAY, code: 61, max: 13, min: 6, rain: 80 },
      { date: "2026-10-22", code: 3, max: 14, min: 7, rain: 20 },
      { date: "2026-10-23", code: 0, max: 19, min: 8, rain: 0 },
      { date: "2026-10-24", code: 80, max: 12, min: 6, rain: 70 },
    ],
  };
}

describe("Der nächste Tag immer mit Wochentag (B4)", () => {
  it("„Morgen · Do“ und die Phase heißt „Morgens“", () => {
    expect(tomorrowLabel("2026-10-22")).toBe("Morgen · Do");
    const morning = PHASES.find((p) => p.id === "morgen")!;
    expect(morning.label).toBe("Morgens");
  });
});

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
    expect(parts[0].tips).not.toContain("☂️ Schirm");
    expect(parts[1].tips).toContain("☂️ Schirm");
    expect(parts[2].tips).toContain("☂️ Schirm");
  });

  it("Satz mit Bezug auf Termine", () => {
    expect(daySentence(forecast(15), TODAY, [{ title: "Kinderarzt", time: "16:00" }], 12)).toBe("Zu Kinderarzt um 16 Uhr regnet es – Schirm mit.");
    expect(daySentence(forecast(), TODAY, [{ title: "Elternabend", time: "19:00" }], 12)).toBe("Für Elternabend bleibt es trocken.");
    expect(daySentence(forecast(15), TODAY, [], 12)).toBe("Ab 15 Uhr Regen, 6 bis 13°.");
  });

  it("bester Tag für draußen und ab 18 Uhr „Morgen“", () => {
    expect(bestOutdoorDay(forecast(), TODAY)?.date).toBe("2026-10-23");
    expect(weatherStartTab(17 * 60 + 59)).toBe("heute");
    expect(weatherStartTab(19 * 60)).toBe("morgen");
  });
});

describe("Sport-Tage (B10)", () => {
  it("freie Zeiten meiden Termine, geplante Tage und „Wie letztes Mal“", () => {
    at(`${TODAY}T12:00`);
    const entries = [termin("Elternabend", "2026-10-23", "18:00", { end: "19:30" }), termin("Laufen", "2026-10-24", "09:00", { label: "Sport" })];
    const starts = freeStarts(entries, "2026-10-23", TODAY, 45);
    expect(starts).not.toContain("18:00");
    expect(starts).not.toContain("19:00");
    expect(starts.length).toBeGreaterThan(0);
    expect(plannedOn(entries, "2026-10-24", TODAY).map((i) => i.title)).toEqual(["Laufen"]);
    const state = { ...EMPTY_SPORT, trainings: [createTraining({ sport: "radfahren", minutes: 60, date: "2026-10-19" }), createTraining({ sport: "laufen", minutes: 30, date: "2026-10-20" })] };
    expect(lastTraining(state, entries, TODAY)).toMatchObject({ sport: "laufen", minutes: 30 });
  });
});
