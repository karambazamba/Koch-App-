import { afterEach, describe, expect, it, vi } from "vitest";
import { atFresh, fakeWindow, noBrowser } from "../helpers";

afterEach(() => noBrowser());

// Fehler (gefunden beim Aufräumen, Etappe 8): Nur Timer der Begleitung
// blendeten die Timer-Kachel ein – ein Schritt-Timer aus der Koch-Kachel nicht.
describe("Ein gestarteter Timer blendet die Timer-Kachel ein", () => {
  it("auch aus der Oberfläche, nur einmal gemeldet", async () => {
    fakeWindow();
    vi.resetModules();
    await atFresh("2026-10-22T18:00");
    const { startTimer } = await import("@/lib/timer/actions");
    const { loadHomeTiles } = await import("@/lib/core/homeLayout");
    expect(loadHomeTiles().find((t) => t.id === "timer")?.visible).toBe(false);
    const first = startTimer({ minutes: 8, name: "Nudeln", step: "Nudeln kochen" }, { quiet: true })!;
    expect(first.tileShown).toBe(true);
    expect(loadHomeTiles().find((t) => t.id === "timer")?.visible).toBe(true);
    expect(startTimer({ minutes: 3 }, { quiet: true })!.tileShown).toBe(false);
  });
});
