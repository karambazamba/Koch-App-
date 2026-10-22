import { describe, expect, it } from "vitest";
import { EMPTY_SPORT, createTraining, weekStatus, weekStreak, type SportState } from "@/lib/sport/model";
import { at } from "../helpers";

const withTrainings = (dates: string[], goal = 2): SportState => ({
  ...EMPTY_SPORT,
  goal,
  trainings: dates.map((date) => createTraining({ sport: "laufen", minutes: 30, date })),
});

describe("Sport: Wochen zählen", () => {
  it("zählt die Woche ab Montag", () => {
    at("2026-10-21T12:00");
    // Mo 19.10. und So 25.10. gehören zur selben Woche, So 18.10. nicht
    const s = withTrainings(["2026-10-18", "2026-10-19", "2026-10-25"]);
    expect(weekStatus(s, [], "2026-10-21").count).toBe(2);
  });

  it("Serie nur in Wochen: geschaffte Wochen hintereinander", () => {
    at("2026-10-21T12:00");
    const s = withTrainings(["2026-10-05", "2026-10-06", "2026-10-12", "2026-10-13"]);
    expect(weekStreak(s, [], "2026-10-21")).toBe(2);
    // Diese Woche geschafft → zählt mit
    const more = withTrainings(["2026-10-12", "2026-10-13", "2026-10-19", "2026-10-20"]);
    expect(weekStreak(more, [], "2026-10-21")).toBe(2);
  });

  it("mehr als das Ziel = Bonus", () => {
    at("2026-10-21T12:00");
    const s = withTrainings(["2026-10-19", "2026-10-20", "2026-10-21"]);
    const w = weekStatus(s, [], "2026-10-21");
    expect(w.reached && w.bonus).toBe(true);
  });
});
