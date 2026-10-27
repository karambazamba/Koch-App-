// Pinnwand: „Senden“ statt „Anheften“, danach still „Gesendet“; der Kopf sagt
// immer, dass alles nach 24 Stunden verschwindet.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PINNWAND } from "@/lib/mia/denktmit/seiten/pinnwand";

const read = (p: string) => readFileSync(p, "utf8");

describe("Pinnwand senden", () => {
  it("Knopf „Senden“, danach kleiner Hinweis „Gesendet“", () => {
    const src = read("src/components/pinnwand/PinSheets.tsx");
    expect(src).toMatch(/>\s*Senden\s*</);
    expect(src).not.toMatch(/>\s*Anheften\s*</);
    expect(src).toMatch(/showToast\(\{ text: "Gesendet", small: true/);
  });

  it("Unterzeile immer da", () => {
    const view = read("src/components/pinnwand/PinboardView.tsx");
    expect(view).toContain('"Nachrichten und Sprachnachrichten verschwinden nach 24 Stunden."');
    expect(view).toContain("subtitle={PIN_SUBLINE}");
    expect(view).not.toContain("dayHint");
  });

  it("Mia denkt mit: ohne „anheften“, höchstens 2 Sätze, ohne Gedankenstrich", () => {
    expect(PINNWAND.seite).not.toMatch(/anheften/i);
    expect(PINNWAND.seite.split(/[.!?](\s|$)/).filter((s) => s && s.trim()).length).toBeLessThanOrEqual(2);
    expect(PINNWAND.seite).not.toMatch(/[–—]/);
  });
});
