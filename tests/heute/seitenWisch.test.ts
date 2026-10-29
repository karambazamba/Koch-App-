// A-059 Punkt 7: Beim Schließen der App (Wisch vom unteren Rand nach oben,
// iPhone ohne Home-Button) sprang die Startseite zu Essen. Seitenwechsel per
// Wischen nur bei klarer Geste; Wechsel direkt vor dem Hintergrund zählt nicht.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RAND_PX } from "@/lib/core/leiste";
import { UNTEN_FREI_PX, WEG_NACH_WISCH_MS, WISCH_MIN_PX, seitenWisch, wischKlar, wischStartErlaubt, wischZuruecknehmen } from "@/lib/heute/seitenWisch";

const H = 852; // iPhone 15 Pro
const SAFE = 34;
const g = (x: number, y: number, dx: number, dy: number) => seitenWisch({ x, y, dx, dy, hoehe: H, safeUnten: SAFE });

describe("Seitenwisch: Entscheidung (rein)", () => {
  it("Start in den untersten 48 px + Safe-Area: nie", () => {
    expect(wischStartErlaubt(200, H - SAFE - UNTEN_FREI_PX - 1, H, SAFE)).toBe(true);
    expect(wischStartErlaubt(200, H - SAFE - UNTEN_FREI_PX, H, SAFE)).toBe(false);
    expect(wischStartErlaubt(200, H - 10, H, SAFE)).toBe(false);
    // ohne Safe-Area (Android, iPhone mit Home-Button): nur die 48 px
    expect(wischStartErlaubt(200, H - 49, H, 0)).toBe(true);
    expect(wischStartErlaubt(200, H - 47, H, 0)).toBe(false);
  });

  it("Start am linken Rand: nie (der ist für Zurück)", () => {
    expect(wischStartErlaubt(RAND_PX, 400, H, SAFE)).toBe(false);
    expect(wischStartErlaubt(RAND_PX + 1, 400, H, SAFE)).toBe(true);
  });

  it("nur klar waagerecht (|dx| ≥ 2·|dy|) und mindestens 60 px", () => {
    expect(wischKlar(-WISCH_MIN_PX, 0)).toBe(true);
    expect(wischKlar(-(WISCH_MIN_PX - 1), 0)).toBe(false);
    expect(wischKlar(120, 60)).toBe(true);
    expect(wischKlar(120, 61)).toBe(false);
    expect(wischKlar(-120, -40)).toBe(true);
  });

  it("App schließen: Wisch von unten schräg nach oben → bleibt", () => {
    expect(g(300, H - 20, -160, -300)).toBe(false);
    expect(g(300, H - 20, -200, -40)).toBe(false); // sogar flach, aber von unten
    expect(g(300, 500, -100, -300)).toBe(false); // mitten drin, aber steil
  });

  it("klarer Seitenwisch mitten auf der Seite → wechselt", () => {
    expect(g(300, 470, -120, 40)).toBe(true);
    expect(g(100, 470, 120, -40)).toBe(true);
  });

  it("Hintergrund binnen 500 ms nach dem Wisch → zurücknehmen, später nicht", () => {
    expect(wischZuruecknehmen(1000, 1000 + WEG_NACH_WISCH_MS)).toBe(true);
    expect(wischZuruecknehmen(1000, 1200)).toBe(true);
    expect(wischZuruecknehmen(1000, 1000 + WEG_NACH_WISCH_MS + 1)).toBe(false);
    expect(wischZuruecknehmen(1000, 900)).toBe(false);
    expect(wischZuruecknehmen(null, 1000)).toBe(false);
  });

  it("der Pager nutzt die Entscheidung, touchcancel wechselt nie, Hintergrund nimmt zurück", () => {
    const code = readFileSync("src/components/heute/usePagerSwipe.ts", "utf8");
    expect(code).toContain("wischStartErlaubt(t.clientX, t.clientY, window.innerHeight, safeUnten())");
    expect(code).toContain('e.type === "touchcancel" || !seitenWisch(');
    expect(code).toContain('document.addEventListener("visibilitychange", onHidden)');
    expect(code).toContain("wischZuruecknehmen(w.am, e.timeStamp)");
  });
});
