import { describe, expect, it } from "vitest";
import { currentPhase, type PhaseContext } from "@/lib/tagesablauf/phases";
import { DEFAULT_ROUTINE } from "@/lib/tagesablauf/settings";

const ctx = (minutes: number, extra: Partial<PhaseContext> = {}): PhaseContext => ({
  minutes,
  weekday: 1,
  routine: DEFAULT_ROUTINE,
  mealClock: null,
  cooking: { manualAt: null, timerRunning: false, firstTimerAt: null, lastTimerEnd: null },
  sport: { on: false, training: null },
  workEnd: null,
  pinNew: false,
  ...extra,
});

describe("Tagesphasen", () => {
  it("morgens bis 10 Uhr, danach tagsüber, ab 20 Uhr Feierabend", () => {
    expect(currentPhase(ctx(7 * 60)).def.id).toBe("morgen");
    expect(currentPhase(ctx(12 * 60)).def.id).toBe("tagsueber");
    expect(currentPhase(ctx(21 * 60)).def.id).toBe("feierabend");
  });

  it("Feierabend frühestens nach dem letzten Arbeitstermin", () => {
    expect(currentPhase(ctx(20 * 60 + 30, { workEnd: 21 * 60 })).def.id).not.toBe("feierabend");
    expect(currentPhase(ctx(21 * 60 + 5, { workEnd: 21 * 60 })).def.id).toBe("feierabend");
  });

  it("Kochen gewinnt: 20 Minuten vor dem Essen", () => {
    expect(currentPhase(ctx(18 * 60 + 15, { mealClock: "18:30" })).def.id).toBe("kochen");
    expect(currentPhase(ctx(17 * 60, { mealClock: "18:30" })).def.id).toBe("tagsueber");
  });
});
