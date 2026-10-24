import { describe, expect, it } from "vitest";
import { swipeAxis, swipeDecision } from "@/components/heute/usePagerSwipe";

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

describe("Richtung früh und eindeutig (Wischen ohne Wackeln)", () => {
  it("unter 6 px noch offen, ab 6 px entschieden", () => {
    expect(swipeAxis(5, 3)).toBe("none");
    expect(swipeAxis(-5, -5)).toBe("none");
    expect(swipeAxis(6, 0)).toBe("x");
    expect(swipeAxis(0, 6)).toBe("y");
  });

  it("waagerecht nur bei |dx| > 1,2 · |dy|, sonst senkrecht", () => {
    expect(swipeAxis(13, 10)).toBe("x");
    expect(swipeAxis(12, 10)).toBe("y");
    expect(swipeAxis(-30, 10)).toBe("x");
    expect(swipeAxis(10, -10)).toBe("y");
  });

  it("diagonaler Wisch 120/40 ist waagerecht – bleibt fest, auch wenn der Finger später senkrecht wandert", () => {
    // Die Hook fragt nur einmal (mode === "none"); danach zählt nur dx
    const steps = Array.from({ length: 10 }, (_, i) => [(120 * (i + 1)) / 10, (40 * (i + 1)) / 10]);
    const first = steps.map(([x, y]) => swipeAxis(x, y)).find((a) => a !== "none");
    expect(first).toBe("x");
  });
});

