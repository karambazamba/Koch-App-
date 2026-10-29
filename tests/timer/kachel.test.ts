import { afterEach, describe, expect, it, vi } from "vitest";
import { atFresh, fakeWindow, noBrowser } from "../helpers";

afterEach(() => noBrowser());

// Früher blendete ein gestarteter Timer die Timer-Kachel ein. Seit A-050 (Tafel
// 143) zeigt ihn der Timer-Kreis oben – die Anordnung ändert sich nie von selbst.
describe("Ein gestarteter Timer ändert die Startseite nicht", () => {
  it("keine Kachel schiebt sich dazu, der Kreis zeigt ihn", async () => {
    fakeWindow();
    vi.resetModules();
    await atFresh("2026-10-22T18:00");
    const { startTimer } = await import("@/lib/timer/actions");
    const { loadHomeTiles } = await import("@/lib/core/homeLayout");
    const vorher = JSON.stringify(loadHomeTiles());
    const first = startTimer({ minutes: 8, name: "Nudeln", step: "Nudeln kochen" }, { quiet: true })!;
    expect(first.timer.name).toBe("Nudeln");
    expect("tileShown" in first).toBe(false);
    expect(JSON.stringify(loadHomeTiles())).toBe(vorher);
  });
});
