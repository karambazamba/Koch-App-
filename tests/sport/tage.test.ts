import { describe, expect, it } from "vitest";
import { EMPTY_SPORT, createTraining, freeStarts, lastTraining, plannedOn } from "@/lib/sport/model";
import { at, termin } from "../helpers";

const TODAY = "2026-10-21";

describe("Sport-Tage (B10)", () => {
  it("freie Zeiten meiden Termine, geplante Tage und „Wie letztes Mal“", () => {
    at(`${TODAY}T12:00`);
    const entries = [termin({ title: "Elternabend", date: "2026-10-23", start: "18:00", end: "19:30" }), termin({ title: "Laufen", date: "2026-10-24", start: "09:00", label: "Sport" })];
    const starts = freeStarts(entries, "2026-10-23", TODAY, 45);
    expect(starts).not.toContain("18:00");
    expect(starts).not.toContain("19:00");
    expect(starts.length).toBeGreaterThan(0);
    expect(plannedOn(entries, "2026-10-24", TODAY).map((i) => i.title)).toEqual(["Laufen"]);
    const state = { ...EMPTY_SPORT, trainings: [createTraining({ sport: "radfahren", minutes: 60, date: "2026-10-19" }), createTraining({ sport: "laufen", minutes: 30, date: "2026-10-20" })] };
    expect(lastTraining(state, entries, TODAY)).toMatchObject({ sport: "laufen", minutes: 30 });
  });
});
