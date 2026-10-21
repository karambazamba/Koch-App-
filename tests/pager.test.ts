import { describe, expect, it } from "vitest";
import { swipeDecision } from "@/components/alltag/usePagerSwipe";

const W = 400;

describe("Wischen zwischen Kalender · Heute · Essen", () => {
  it("langsamer Wisch über 25 % der Breite wechselt (früher: Zeitlimit 800 ms)", () => {
    expect(swipeDecision(-0.4 * W, -0.1, W, true, true)).toBe(1);
    expect(swipeDecision(0.3 * W, 0.05, W, true, true)).toBe(-1);
  });

  it("kurzer schneller Wisch wechselt (80 px in 150 ms)", () => {
    expect(swipeDecision(-80, -80 / 150, W, true, true)).toBe(1);
  });

  it("halber Wisch ohne Schwung federt zurück", () => {
    expect(swipeDecision(-0.15 * W, -0.1, W, true, true)).toBe(0);
  });

  it("Schwung gegen die Richtung zählt nicht", () => {
    expect(swipeDecision(-0.2 * W, 0.6, W, true, true)).toBe(0);
  });

  it("am Rand kein Wechsel", () => {
    expect(swipeDecision(0.5 * W, 1, W, false, true)).toBe(0);
    expect(swipeDecision(-0.5 * W, -1, W, true, false)).toBe(0);
  });
});
