import { describe, expect, it } from "vitest";
import { dailyTip } from "@/lib/essen/tips/daily";

const opts = { dish: null, tips: true, weekendIdeas: false, kids: false, persons: 2 };

describe("Tipp des Tages", () => {
  it("bleibt über den Tag gleich und wechselt am nächsten Tag", () => {
    expect(dailyTip("2026-10-20", opts)).toEqual(dailyTip("2026-10-20", opts));
    expect(dailyTip("2026-10-20", opts)?.id).not.toBe(dailyTip("2026-10-21", opts)?.id);
  });

  it("ohne Tipps und Wochenend-Ideen: kein Tipp", () => {
    expect(dailyTip("2026-10-20", { ...opts, tips: false })).toBeNull();
  });

  it("am Wochenende zuerst eine Wochenend-Idee (falls an)", () => {
    expect(dailyTip("2026-10-24", { ...opts, weekendIdeas: true })?.category).toBe("wochenende");
  });
});
